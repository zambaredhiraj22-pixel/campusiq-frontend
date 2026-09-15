import {
  FilesetResolver,
  ObjectDetector,
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

const WASM_ROOT =
  getPublicAssetPath(
    "mediapipe/wasm"
  );

const OBJECT_MODEL =
  getPublicAssetPath(
    "models/efficientdet_lite2_float32.tflite"
  );

const PHONE_CONFIDENCE = 0.15;
const PERSON_CONFIDENCE = 0.35;

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

function normalizeName(value) {
  return String(
    value || ""
  )
    .trim()
    .toLowerCase()
    .replaceAll("_", " ");
}

function isPhoneCategory(name) {
  const normalized =
    normalizeName(name);

  return (
    normalized === "cell phone" ||
    normalized === "mobile phone" ||
    normalized === "phone" ||
    normalized === "cellphone" ||
    normalized.includes("phone")
  );
}

class ObjectDetectionService {
  constructor() {
    this.objectDetector = null;
    this.initializing = false;
    this.initializationPromise = null;
  }

  async initialize() {
    if (this.objectDetector) {
      return this.objectDetector;
    }

    if (
      this.initializing &&
      this.initializationPromise
    ) {
      return this.initializationPromise;
    }

    this.initializing = true;

    this.initializationPromise =
      this.createDetector();

    try {
      await this.initializationPromise;

      return this.objectDetector;
    } finally {
      this.initializing = false;
      this.initializationPromise = null;
    }
  }

  async createDetector() {
    const vision =
      await FilesetResolver.forVisionTasks(
        WASM_ROOT
      );

    const createOptions = (
      delegate
    ) => ({
      baseOptions: {
        modelAssetPath:
          OBJECT_MODEL,
        delegate,
      },

      runningMode:
        "VIDEO",

      displayNamesLocale:
        "en",

      maxResults: 20,

      scoreThreshold: 0.05,
    });

    try {
      this.objectDetector =
        await ObjectDetector.createFromOptions(
          vision,
          createOptions("GPU")
        );
    } catch {
      this.objectDetector =
        await ObjectDetector.createFromOptions(
          vision,
          createOptions("CPU")
        );
    }

    return this.objectDetector;
  }

  isReady() {
    return (
      this.objectDetector !== null
    );
  }

  normalizeBox(
    boundingBox,
    videoWidth,
    videoHeight
  ) {
    if (
      !boundingBox ||
      videoWidth <= 0 ||
      videoHeight <= 0
    ) {
      return null;
    }

    return {
      x: clamp(
        boundingBox.originX /
          videoWidth,
        0,
        1
      ),

      y: clamp(
        boundingBox.originY /
          videoHeight,
        0,
        1
      ),

      width: clamp(
        boundingBox.width /
          videoWidth,
        0,
        1
      ),

      height: clamp(
        boundingBox.height /
          videoHeight,
        0,
        1
      ),
    };
  }

  async analyzeVideo(
    videoElement,
    timestamp =
      performance.now()
  ) {
    if (!videoElement) {
      throw new Error(
        "Video element is required for object detection."
      );
    }

    if (
      videoElement.readyState < 2 ||
      videoElement.videoWidth <= 0 ||
      videoElement.videoHeight <= 0
    ) {
      return {
        ready: false,
        phoneDetected: false,
        personDetected: false,
        personCount: 0,
        phones: [],
        persons: [],
        detections: [],
      };
    }

    if (!this.objectDetector) {
      await this.initialize();
    }

    if (!this.objectDetector) {
      throw new Error(
        "Object detector is not initialized."
      );
    }

    const result =
      this.objectDetector.detectForVideo(
        videoElement,
        timestamp
      );

    const rawDetections =
      Array.isArray(
        result?.detections
      )
        ? result.detections
        : [];

    const processed = [];

    rawDetections.forEach(
      (detection) => {
        const categories =
          Array.isArray(
            detection?.categories
          )
            ? detection.categories
            : [];

        const box =
          this.normalizeBox(
            detection.boundingBox,
            videoElement.videoWidth,
            videoElement.videoHeight
          );

        if (!box) {
          return;
        }

        categories.forEach(
          (category) => {
            const categoryName =
              normalizeName(
                category
                  ?.categoryName ||
                category
                  ?.displayName
              );

            const score =
              Number(
                category?.score ||
                  0
              );

            if (!categoryName) {
              return;
            }

            processed.push({
              category:
                categoryName,

              score,

              box,

              pixelBox: {
                x:
                  detection
                    .boundingBox
                    .originX,

                y:
                  detection
                    .boundingBox
                    .originY,

                width:
                  detection
                    .boundingBox
                    .width,

                height:
                  detection
                    .boundingBox
                    .height,
              },
            });
          }
        );
      }
    );

    const phones =
      processed.filter(
        (detection) =>
          isPhoneCategory(
            detection.category
          ) &&
          detection.score >=
            PHONE_CONFIDENCE
      );

    const persons =
      processed.filter(
        (detection) =>
          detection.category ===
            "person" &&
          detection.score >=
            PERSON_CONFIDENCE
      );

    return {
      ready: true,

      phoneDetected:
        phones.length > 0,

      personDetected:
        persons.length > 0,

      personCount:
        persons.length,

      phones,

      persons,

      detections:
        processed,
    };
  }

  close() {
    if (
      this.objectDetector &&
      typeof this.objectDetector
        .close === "function"
    ) {
      this.objectDetector.close();
    }

    this.objectDetector = null;
  }
}

const objectDetectionService =
  new ObjectDetectionService();

export default objectDetectionService;