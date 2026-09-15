import {
  FaceLandmarker,
  FilesetResolver,
} from "@mediapipe/tasks-vision";

function getPublicAssetPath(path) {
  const baseUrl =
    import.meta.env.BASE_URL || "/";

  const normalizedBase =
    baseUrl.endsWith("/")
      ? baseUrl
      : `${baseUrl}/`;

  const normalizedPath =
    path.startsWith("/")
      ? path.substring(1)
      : path;

  return `${normalizedBase}${normalizedPath}`;
}

/*
 * Local MediaPipe files.
 *
 * WASM:
 * public/mediapipe/wasm
 *
 * Model:
 * public/models/face_landmarker.task
 */
const WASM_ROOT =
  getPublicAssetPath(
    "mediapipe/wasm"
  );

const FACE_LANDMARKER_MODEL =
  getPublicAssetPath(
    "models/face_landmarker.task"
  );

/*
 * MediaPipe landmark indexes.
 */
const NOSE_TIP_INDEX = 1;
const LEFT_EYE_INDEX = 33;
const RIGHT_EYE_INDEX = 263;
const FOREHEAD_INDEX = 10;
const CHIN_INDEX = 152;

/*
 * Looking-away thresholds.
 */
const HORIZONTAL_LOOK_THRESHOLD =
  0.32;

const VERTICAL_LOOK_THRESHOLD =
  0.22;

/*
 * Face bounding box ला थोडी extra
 * padding देण्यासाठी.
 */
const FACE_BOX_PADDING =
  0.035;

function clamp(
  value,
  minimum,
  maximum
) {
  return Math.min(
    Math.max(
      value,
      minimum
    ),
    maximum
  );
}

class FaceDetectionService {
  constructor() {
    this.faceLandmarker = null;

    this.initializing = false;

    this.initializationPromise =
      null;
  }

  async initialize() {
    if (this.faceLandmarker) {
      return this.faceLandmarker;
    }

    if (
      this.initializing &&
      this.initializationPromise
    ) {
      return this.initializationPromise;
    }

    this.initializing = true;

    this.initializationPromise =
      this.createLandmarker();

    try {
      await this.initializationPromise;

      return this.faceLandmarker;
    } finally {
      this.initializing = false;

      this.initializationPromise =
        null;
    }
  }

  async createLandmarker() {
    const vision =
      await FilesetResolver
        .forVisionTasks(
          WASM_ROOT
        );

    /*
     * GPU first.
     * GPU fail झाला तर CPU fallback.
     */
    try {
      this.faceLandmarker =
        await FaceLandmarker
          .createFromOptions(
            vision,
            {
              baseOptions: {
                modelAssetPath:
                  FACE_LANDMARKER_MODEL,

                delegate: "GPU",
              },

              runningMode: "VIDEO",

              /*
               * Multiple face detection साठी
               * 2 faces पर्यंत detect करतो.
               */
              numFaces: 2,

              minFaceDetectionConfidence:
                0.6,

              minFacePresenceConfidence:
                0.6,

              minTrackingConfidence:
                0.6,

              outputFaceBlendshapes:
                false,

              outputFacialTransformationMatrixes:
                false,
            }
          );
    } catch (gpuError) {
      console.warn(
        "MediaPipe GPU initialization failed. Falling back to CPU.",
        gpuError
      );

      this.faceLandmarker =
        await FaceLandmarker
          .createFromOptions(
            vision,
            {
              baseOptions: {
                modelAssetPath:
                  FACE_LANDMARKER_MODEL,

                delegate: "CPU",
              },

              runningMode: "VIDEO",

              numFaces: 2,

              minFaceDetectionConfidence:
                0.6,

              minFacePresenceConfidence:
                0.6,

              minTrackingConfidence:
                0.6,

              outputFaceBlendshapes:
                false,

              outputFacialTransformationMatrixes:
                false,
            }
          );
    }

    return this.faceLandmarker;
  }

  isReady() {
    return (
      this.faceLandmarker !== null
    );
  }

  /*
   * एका face च्या landmarks वरून
   * normalized bounding box तयार करतो.
   *
   * x, y, width, height:
   * 0 ते 1 range मध्ये असतात.
   */
  calculateFaceBox(
    landmarks
  ) {
    if (
      !Array.isArray(
        landmarks
      ) ||
      landmarks.length === 0
    ) {
      return null;
    }

    let minX = 1;
    let minY = 1;

    let maxX = 0;
    let maxY = 0;

    landmarks.forEach(
      (landmark) => {
        if (
          !landmark ||
          typeof landmark.x !==
            "number" ||
          typeof landmark.y !==
            "number"
        ) {
          return;
        }

        minX =
          Math.min(
            minX,
            landmark.x
          );

        minY =
          Math.min(
            minY,
            landmark.y
          );

        maxX =
          Math.max(
            maxX,
            landmark.x
          );

        maxY =
          Math.max(
            maxY,
            landmark.y
          );
      }
    );

    /*
     * Face भोवती थोडी padding.
     */
    minX = clamp(
      minX -
        FACE_BOX_PADDING,
      0,
      1
    );

    minY = clamp(
      minY -
        FACE_BOX_PADDING,
      0,
      1
    );

    maxX = clamp(
      maxX +
        FACE_BOX_PADDING,
      0,
      1
    );

    maxY = clamp(
      maxY +
        FACE_BOX_PADDING,
      0,
      1
    );

    const width =
      maxX - minX;

    const height =
      maxY - minY;

    if (
      width <= 0 ||
      height <= 0
    ) {
      return null;
    }

    return {
      x: minX,
      y: minY,
      width,
      height,
    };
  }

  /*
   * Multiple faces असतील तर
   * प्रत्येक face साठी box तयार करतो.
   */
  getFaceBoxes(
    faces
  ) {
    if (
      !Array.isArray(faces)
    ) {
      return [];
    }

    return faces
      .map(
        (landmarks) =>
          this.calculateFaceBox(
            landmarks
          )
      )
      .filter(Boolean);
  }

  async analyzeVideo(
    videoElement,
    timestamp =
      performance.now()
  ) {
    if (!videoElement) {
      throw new Error(
        "Video element is required for face detection."
      );
    }

    /*
     * Video frame अजून तयार नसेल
     * तर violation मानायचा नाही.
     */
    if (
      videoElement.readyState < 2 ||
      videoElement.videoWidth <= 0 ||
      videoElement.videoHeight <= 0
    ) {
      return {
        ready: false,

        faceCount: 0,

        faceBoxes: [],

        primaryFaceBox: null,

        noFace: false,

        multipleFaces: false,

        lookingAway: false,

        direction: "UNKNOWN",
      };
    }

    if (!this.faceLandmarker) {
      await this.initialize();
    }

    if (!this.faceLandmarker) {
      throw new Error(
        "MediaPipe Face Landmarker is not initialized."
      );
    }

    const result =
      this.faceLandmarker
        .detectForVideo(
          videoElement,
          timestamp
        );

    const faces =
      Array.isArray(
        result?.faceLandmarks
      )
        ? result.faceLandmarks
        : [];

    const faceCount =
      faces.length;

    const faceBoxes =
      this.getFaceBoxes(
        faces
      );

    /*
     * =========================
     * NO FACE
     * =========================
     */
    if (faceCount === 0) {
      return {
        ready: true,

        faceCount: 0,

        faceBoxes: [],

        primaryFaceBox: null,

        noFace: true,

        multipleFaces: false,

        lookingAway: false,

        direction: "NO_FACE",
      };
    }

    /*
     * =========================
     * MULTIPLE FACES
     * =========================
     */
    if (faceCount > 1) {
      return {
        ready: true,

        faceCount,

        faceBoxes,

        primaryFaceBox:
          faceBoxes[0] ||
          null,

        noFace: false,

        multipleFaces: true,

        lookingAway: false,

        direction:
          "MULTIPLE_FACES",
      };
    }

    /*
     * Exactly one face.
     */
    const landmarks =
      faces[0];

    const headDirection =
      this.calculateHeadDirection(
        landmarks
      );

    return {
      ready: true,

      faceCount: 1,

      faceBoxes,

      primaryFaceBox:
        faceBoxes[0] ||
        null,

      noFace: false,

      multipleFaces: false,

      lookingAway:
        headDirection
          .lookingAway,

      direction:
        headDirection
          .direction,

      horizontalRatio:
        headDirection
          .horizontalRatio,

      verticalRatio:
        headDirection
          .verticalRatio,
    };
  }

  calculateHeadDirection(
    landmarks
  ) {
    if (
      !Array.isArray(
        landmarks
      ) ||
      landmarks.length <=
        RIGHT_EYE_INDEX
    ) {
      return {
        lookingAway: false,

        direction:
          "UNKNOWN",

        horizontalRatio: 0,

        verticalRatio: 0,
      };
    }

    const nose =
      landmarks[
        NOSE_TIP_INDEX
      ];

    const leftEye =
      landmarks[
        LEFT_EYE_INDEX
      ];

    const rightEye =
      landmarks[
        RIGHT_EYE_INDEX
      ];

    const forehead =
      landmarks[
        FOREHEAD_INDEX
      ];

    const chin =
      landmarks[
        CHIN_INDEX
      ];

    if (
      !nose ||
      !leftEye ||
      !rightEye ||
      !forehead ||
      !chin
    ) {
      return {
        lookingAway: false,

        direction:
          "UNKNOWN",

        horizontalRatio: 0,

        verticalRatio: 0,
      };
    }

    /*
     * =========================
     * LEFT / RIGHT
     * =========================
     */

    const eyeDistance =
      Math.abs(
        rightEye.x -
          leftEye.x
      );

    if (
      eyeDistance <=
      0.0001
    ) {
      return {
        lookingAway: false,

        direction:
          "UNKNOWN",

        horizontalRatio: 0,

        verticalRatio: 0,
      };
    }

    const eyeMidX =
      (
        leftEye.x +
        rightEye.x
      ) / 2;

    const horizontalOffset =
      nose.x -
      eyeMidX;

    const horizontalRatio =
      horizontalOffset /
      eyeDistance;

    /*
     * =========================
     * UP / DOWN
     * =========================
     */

    const faceHeight =
      Math.abs(
        chin.y -
          forehead.y
      );

    let verticalRatio = 0;

    if (
      faceHeight >
      0.0001
    ) {
      const faceMidY =
        (
          forehead.y +
          chin.y
        ) / 2;

      verticalRatio =
        (
          nose.y -
          faceMidY
        ) /
        faceHeight;
    }

    let direction =
      "FORWARD";

    let lookingAway =
      false;

    /*
     * Left / Right
     */
    if (
      horizontalRatio >
      HORIZONTAL_LOOK_THRESHOLD
    ) {
      direction =
        "RIGHT";

      lookingAway =
        true;
    } else if (
      horizontalRatio <
      -HORIZONTAL_LOOK_THRESHOLD
    ) {
      direction =
        "LEFT";

      lookingAway =
        true;
    }

    /*
     * Up / Down
     */
    else if (
      verticalRatio <
      -VERTICAL_LOOK_THRESHOLD
    ) {
      direction =
        "UP";

      lookingAway =
        true;
    } else if (
      verticalRatio >
      VERTICAL_LOOK_THRESHOLD
    ) {
      direction =
        "DOWN";

      lookingAway =
        true;
    }

    return {
      lookingAway,

      direction,

      horizontalRatio,

      verticalRatio,
    };
  }

  close() {
    if (
      this.faceLandmarker &&
      typeof this
        .faceLandmarker
        .close ===
        "function"
    ) {
      this.faceLandmarker
        .close();
    }

    this.faceLandmarker =
      null;
  }
}

const faceDetectionService =
  new FaceDetectionService();

export default faceDetectionService;