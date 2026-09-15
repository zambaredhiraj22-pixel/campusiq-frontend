/*
 * CAMPUS-IQ
 * Suspicious Audio Detection Service
 *
 * Purpose:
 * - Use the microphone stream already opened by cameraService.
 * - Measure surrounding audio level using Web Audio API.
 * - Learn normal/background noise first.
 * - Ignore small normal sounds.
 * - Detect unusually loud / sustained audio activity.
 *
 * IMPORTANT:
 * This is audio-activity detection.
 * It does NOT perform speech-to-text or identify
 * exactly what somebody is saying.
 */

const CALIBRATION_DURATION_MS = 2500;

/*
 * Sound must be sufficiently louder than
 * the learned background-noise level.
 */
const ABOVE_BACKGROUND_DB = 12;

/*
 * Even when the room is extremely quiet,
 * very tiny microphone fluctuations must
 * not become suspicious.
 */
const MINIMUM_SUSPICIOUS_DB = -42;

/*
 * Safe dB limits used internally.
 */
const MIN_DB = -100;
const MAX_DB = 0;

function clamp(value, min, max) {
  return Math.min(
    Math.max(value, min),
    max
  );
}

function calculateMedian(values) {
  if (
    !Array.isArray(values) ||
    values.length === 0
  ) {
    return -60;
  }

  const sorted = [...values].sort(
    (a, b) => a - b
  );

  const middle =
    Math.floor(
      sorted.length / 2
    );

  if (
    sorted.length % 2 === 0
  ) {
    return (
      sorted[middle - 1] +
      sorted[middle]
    ) / 2;
  }

  return sorted[middle];
}

class AudioDetectionService {
  constructor() {
    this.audioContext = null;

    this.sourceNode = null;

    this.analyserNode = null;

    this.timeDomainData = null;

    this.stream = null;

    this.initialized = false;

    this.calibrated = false;

    this.calibrationStartedAt =
      null;

    this.calibrationSamples = [];

    this.noiseFloorDb = -60;
  }

  /*
   * =================================
   * INITIALIZE
   * =================================
   */
  async initialize(stream) {
    if (
      this.initialized &&
      this.stream === stream &&
      this.audioContext &&
      this.analyserNode
    ) {
      if (
        this.audioContext.state ===
        "suspended"
      ) {
        await this.audioContext
          .resume();
      }

      return;
    }

    /*
     * Previous analyser असेल तर
     * clean करून नवीन तयार करतो.
     */
    await this.close();

    if (
      !stream ||
      typeof stream.getAudioTracks !==
        "function"
    ) {
      throw new Error(
        "A valid microphone stream is required."
      );
    }

    const audioTracks =
      stream.getAudioTracks();

    if (
      audioTracks.length === 0
    ) {
      throw new Error(
        "No microphone audio track is available."
      );
    }

    const activeAudioTrack =
      audioTracks.find(
        (track) =>
          track.readyState ===
            "live" &&
          track.enabled !== false
      );

    if (
      !activeAudioTrack
    ) {
      throw new Error(
        "The microphone audio track is not active."
      );
    }

    const AudioContextClass =
      window.AudioContext ||
      window.webkitAudioContext;

    if (!AudioContextClass) {
      throw new Error(
        "Web Audio API is not supported by this browser."
      );
    }

    this.audioContext =
      new AudioContextClass();

    if (
      this.audioContext.state ===
      "suspended"
    ) {
      await this.audioContext
        .resume();
    }

    this.stream = stream;

    /*
     * Existing microphone MediaStream
     * Web Audio API मध्ये connect करतो.
     */
    this.sourceNode =
      this.audioContext
        .createMediaStreamSource(
          stream
        );

    this.analyserNode =
      this.audioContext
        .createAnalyser();

    /*
     * 2048 gives stable enough
     * real-time volume measurement.
     */
    this.analyserNode.fftSize =
      2048;

    this.analyserNode
      .smoothingTimeConstant =
      0.75;

    this.sourceNode.connect(
      this.analyserNode
    );

    this.timeDomainData =
      new Float32Array(
        this.analyserNode.fftSize
      );

    /*
     * Start fresh background-noise
     * calibration.
     */
    this.calibrated = false;

    this.calibrationStartedAt =
      performance.now();

    this.calibrationSamples = [];

    this.noiseFloorDb = -60;

    this.initialized = true;
  }

  /*
   * =================================
   * AUDIO LEVEL
   * =================================
   */
  getCurrentDb() {
    if (
      !this.initialized ||
      !this.analyserNode ||
      !this.timeDomainData
    ) {
      return MIN_DB;
    }

    this.analyserNode
      .getFloatTimeDomainData(
        this.timeDomainData
      );

    let sumSquares = 0;

    for (
      let index = 0;
      index <
      this.timeDomainData.length;
      index++
    ) {
      const sample =
        this.timeDomainData[
          index
        ];

      sumSquares +=
        sample * sample;
    }

    const rms =
      Math.sqrt(
        sumSquares /
          this.timeDomainData.length
      );

    if (
      !Number.isFinite(rms) ||
      rms <= 0.000001
    ) {
      return MIN_DB;
    }

    const db =
      20 *
      Math.log10(rms);

    return clamp(
      db,
      MIN_DB,
      MAX_DB
    );
  }

  /*
   * =================================
   * CALIBRATION
   * =================================
   *
   * First ~2.5 seconds:
   * room चा normal background sound
   * शिकतो.
   */
  processCalibration(db) {
    if (
      this.calibrated
    ) {
      return;
    }

    if (
      this.calibrationStartedAt ===
      null
    ) {
      this.calibrationStartedAt =
        performance.now();
    }

    if (
      Number.isFinite(db) &&
      db > MIN_DB
    ) {
      this.calibrationSamples
        .push(db);
    }

    const elapsed =
      performance.now() -
      this.calibrationStartedAt;

    if (
      elapsed <
      CALIBRATION_DURATION_MS
    ) {
      return;
    }

    /*
     * Median वापरल्यामुळे calibration
     * दरम्यान एखादा छोटा आवाज आला तरी
     * baseline लगेच खराब होत नाही.
     */
    const baseline =
      calculateMedian(
        this.calibrationSamples
      );

    this.noiseFloorDb =
      clamp(
        baseline,
        -75,
        -25
      );

    this.calibrated = true;
  }

  /*
   * =================================
   * ADAPT BACKGROUND NOISE
   * =================================
   *
   * Fan / AC सारखा normal continuous
   * background sound थोडा बदलल्यास
   * noise floor हळूहळू adjust होतो.
   */
  updateNoiseFloor(db) {
    if (
      !this.calibrated ||
      !Number.isFinite(db)
    ) {
      return;
    }

    const threshold =
      this.getSuspiciousThreshold();

    /*
     * Suspicious sound चालू असेल तर
     * त्याला background म्हणून शिकू नये.
     */
    if (
      db >= threshold
    ) {
      return;
    }

    const LEARNING_RATE =
      0.015;

    this.noiseFloorDb =
      (
        this.noiseFloorDb *
        (
          1 -
          LEARNING_RATE
        )
      ) +
      (
        db *
        LEARNING_RATE
      );

    this.noiseFloorDb =
      clamp(
        this.noiseFloorDb,
        -75,
        -25
      );
  }

  /*
   * =================================
   * SUSPICIOUS THRESHOLD
   * =================================
   */
  getSuspiciousThreshold() {
    return Math.max(
      MINIMUM_SUSPICIOUS_DB,

      this.noiseFloorDb +
        ABOVE_BACKGROUND_DB
    );
  }

  /*
   * =================================
   * ANALYZE
   * =================================
   *
   * Call this repeatedly while
   * assessment/interview is running.
   */
  analyze() {
    if (
      !this.initialized ||
      !this.analyserNode
    ) {
      return {
        ready: false,

        calibrated: false,

        suspiciousAudio:
          false,

        db: MIN_DB,

        noiseFloorDb:
          this.noiseFloorDb,

        thresholdDb:
          this.getSuspiciousThreshold(),

        levelPercent: 0,
      };
    }

    const db =
      this.getCurrentDb();

    if (
      !this.calibrated
    ) {
      this.processCalibration(
        db
      );

      return {
        ready: true,

        calibrated:
          this.calibrated,

        suspiciousAudio:
          false,

        db,

        noiseFloorDb:
          this.noiseFloorDb,

        thresholdDb:
          this.getSuspiciousThreshold(),

        levelPercent:
          this.convertDbToPercent(
            db
          ),
      };
    }

    const threshold =
      this.getSuspiciousThreshold();

    const suspiciousAudio =
      db >= threshold;

    if (
      !suspiciousAudio
    ) {
      this.updateNoiseFloor(
        db
      );
    }

    return {
      ready: true,

      calibrated: true,

      suspiciousAudio,

      db,

      noiseFloorDb:
        this.noiseFloorDb,

      thresholdDb:
        threshold,

      levelPercent:
        this.convertDbToPercent(
          db
        ),
    };
  }

  /*
   * UI audio meter साठी
   * 0 - 100 value.
   */
  convertDbToPercent(db) {
    /*
     * -60 dB = almost silent
     * 0 dB   = maximum
     */
    const percent =
      (
        (db + 60) /
        60
      ) *
      100;

    return Math.round(
      clamp(
        percent,
        0,
        100
      )
    );
  }

  /*
   * =================================
   * STATUS
   * =================================
   */
  isReady() {
    return (
      this.initialized &&
      this.audioContext !==
        null &&
      this.analyserNode !==
        null
    );
  }

  isCalibrated() {
    return this.calibrated;
  }

  /*
   * =================================
   * CLEANUP
   * =================================
   */
  async close() {
    this.initialized = false;

    this.calibrated = false;

    this.calibrationStartedAt =
      null;

    this.calibrationSamples = [];

    this.noiseFloorDb = -60;

    try {
      if (
        this.sourceNode
      ) {
        this.sourceNode
          .disconnect();
      }
    } catch {
      // Already disconnected.
    }

    try {
      if (
        this.analyserNode
      ) {
        this.analyserNode
          .disconnect();
      }
    } catch {
      // Already disconnected.
    }

    try {
      if (
        this.audioContext &&
        this.audioContext.state !==
          "closed"
      ) {
        await this.audioContext
          .close();
      }
    } catch {
      // Context may already be closed.
    }

    this.sourceNode = null;

    this.analyserNode = null;

    this.timeDomainData = null;

    this.audioContext = null;

    this.stream = null;
  }
}

const audioDetectionService =
  new AudioDetectionService();

export default audioDetectionService;