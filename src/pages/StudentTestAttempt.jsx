import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import {
  useLocation,
  useNavigate,
  useParams,
} from "react-router-dom";

import audioDetectionService from "../services/audioDetectionService";
import cameraService from "../services/cameraService";
import faceDetectionService from "../services/faceDetectionService";
import objectDetectionService from "../services/objectDetectionService";
import testAttemptService from "../services/testAttemptService";

import "../styles/proctoring.css";

const FACE_SCAN_INTERVAL_MS = 700;

const FACE_VIOLATION_DURATIONS = {
  NO_FACE: 4000,
  MULTIPLE_FACES: 2500,
  LOOKING_AWAY: 4000,
};

const AUDIO_SCAN_INTERVAL_MS = 250;
const SUSPICIOUS_AUDIO_DURATION_MS = 3000;
const AUDIO_REARM_QUIET_MS = 2000;

const OBJECT_SCAN_INTERVAL_MS = 500;
const OBJECT_REARM_CLEAR_MS = 1200;

const BROWSER_VIOLATION_COOLDOWN_MS = 3000;

function getClockOffset(serverTime) {
  if (!serverTime) {
    return 0;
  }

  const value =
    new Date(serverTime).getTime();

  if (Number.isNaN(value)) {
    return 0;
  }

  return value - Date.now();
}

function getRemainingSeconds(
  expiresAt,
  clockOffsetMs = 0
) {
  if (!expiresAt) {
    return null;
  }

  const expiry =
    new Date(expiresAt).getTime();

  if (Number.isNaN(expiry)) {
    return null;
  }

  return Math.max(
    0,
    Math.ceil(
      (
        expiry -
        (
          Date.now() +
          clockOffsetMs
        )
      ) / 1000
    )
  );
}

function formatTime(seconds) {
  if (seconds === null) {
    return "--:--";
  }

  const minutes =
    Math.floor(seconds / 60);

  const remaining =
    seconds % 60;

  return `${String(minutes).padStart(
    2,
    "0"
  )}:${String(remaining).padStart(
    2,
    "0"
  )}`;
}

function StudentTestAttempt() {
  const { mockTestId } =
    useParams();

  const location =
    useLocation();

  const navigate =
    useNavigate();

  const videoRef =
    useRef(null);

  const componentActiveRef =
    useRef(true);

  const automaticSubmitStarted =
    useRef(false);

  const faceAnalysisRunningRef =
    useRef(false);

  const audioAnalysisRunningRef =
    useRef(false);

  const objectAnalysisRunningRef =
    useRef(false);

  const detectedFaceCountRef =
    useRef(0);

  const allowFullscreenExitRef =
    useRef(false);

  const fullscreenViolationArmedRef =
    useRef(true);

  const cameraOffViolationReportedRef =
    useRef(false);

  const browserViolationTimesRef =
    useRef({});

  const faceEpisodesRef =
    useRef({
      NO_FACE: {
        since: null,
        reported: false,
      },

      MULTIPLE_FACES: {
        since: null,
        reported: false,
      },

      LOOKING_AWAY: {
        since: null,
        reported: false,
      },
    });

  const audioEpisodeRef =
    useRef({
      since: null,
      reported: false,
      reporting: false,
      quietSince: null,
    });

  const objectEpisodesRef =
    useRef({
      PHONE_DETECTED: {
        reported: false,
        reporting: false,
        clearSince: null,
      },

      SECOND_PERSON_DETECTED: {
        reported: false,
        reporting: false,
        clearSince: null,
      },
    });

  const mockTest =
    location.state?.mockTest ??
    null;

  const personalized =
    mockTest?.personalized ===
    true;

  const personalizedSkills =
    Array.isArray(
      mockTest?.selectedSkills
    )
      ? mockTest.selectedSkills
      : [];

  const [
    attempt,
    setAttempt,
  ] = useState(null);

  const [
    result,
    setResult,
  ] = useState(null);

  const [
    starting,
    setStarting,
  ] = useState(false);

  const [
    submitting,
    setSubmitting,
  ] = useState(false);

  const [
    savingQuestionId,
    setSavingQuestionId,
  ] = useState(null);

  const [
    remainingSeconds,
    setRemainingSeconds,
  ] = useState(null);

  const [
    clockOffsetMs,
    setClockOffsetMs,
  ] = useState(0);

  const [
    currentQuestionIndex,
    setCurrentQuestionIndex,
  ] = useState(0);

  const [
    warningCount,
    setWarningCount,
  ] = useState(0);

  const [
    securityReady,
    setSecurityReady,
  ] = useState(false);

  const [
    securityLoading,
    setSecurityLoading,
  ] = useState(false);

  const [
    fullscreenLost,
    setFullscreenLost,
  ] = useState(false);

  const [
    cameraLost,
    setCameraLost,
  ] = useState(false);

  const [
    faceStatus,
    setFaceStatus,
  ] = useState({
    state: "pending",
    text:
      "Face detection is not active yet.",
  });

  const [
    faceBoxes,
    setFaceBoxes,
  ] = useState([]);

  const [
    audioStatus,
    setAudioStatus,
  ] = useState({
    state: "pending",
    text:
      "Audio monitoring is not active yet.",
  });

  const [
    audioLevel,
    setAudioLevel,
  ] = useState(0);

  const [
    objectStatus,
    setObjectStatus,
  ] = useState({
    state: "pending",
    text:
      "Phone and person detection is not active yet.",
  });

  const [
    phoneDetections,
    setPhoneDetections,
  ] = useState([]);

  const [
    personDetections,
    setPersonDetections,
  ] = useState([]);

  const [
    error,
    setError,
  ] = useState("");

  const [
    message,
    setMessage,
  ] = useState("");

  const [
    violationMessage,
    setViolationMessage,
  ] = useState("");

  const selectedSkill =
    useMemo(() => {
      const stateSkill =
        typeof location.state
          ?.selectedSkill ===
          "string"
          ? location.state
              .selectedSkill
              .trim()
          : "";

      if (stateSkill) {
        return stateSkill;
      }

      const params =
        new URLSearchParams(
          location.search
        );

      return (
        params
          .get("selectedSkill")
          ?.trim() || ""
      );
    }, [
      location.state,
      location.search,
    ]);

  const testAttemptId =
    attempt?.testAttemptId ??
    attempt?.id ??
    null;

  const questions =
    Array.isArray(
      attempt?.questions
    )
      ? attempt.questions
      : [];

  const currentQuestion =
    questions[
      currentQuestionIndex
    ] ?? null;

  const storageKey =
    `campusiq_test_attempt_${mockTestId}`;

  const clearMessages = () => {
    setError("");
    setMessage("");
    setViolationMessage("");
  };

  const resetFaceEpisodes =
    useCallback(() => {
      faceEpisodesRef.current = {
        NO_FACE: {
          since: null,
          reported: false,
        },

        MULTIPLE_FACES: {
          since: null,
          reported: false,
        },

        LOOKING_AWAY: {
          since: null,
          reported: false,
        },
      };
    }, []);

  const resetAudioEpisode =
    useCallback(() => {
      audioEpisodeRef.current = {
        since: null,
        reported: false,
        reporting: false,
        quietSince: null,
      };
    }, []);

  const resetObjectEpisodes =
    useCallback(() => {
      objectEpisodesRef.current = {
        PHONE_DETECTED: {
          reported: false,
          reporting: false,
          clearSince: null,
        },

        SECOND_PERSON_DETECTED: {
          reported: false,
          reporting: false,
          clearSince: null,
        },
      };
    }, []);

  useEffect(() => {
    if (
      !securityReady ||
      !videoRef.current
    ) {
      return undefined;
    }

    const stream =
      cameraService.getStream();

    if (!stream) {
      return undefined;
    }

    const videoElement =
      videoRef.current;

    let cancelled = false;

    const attachStream =
      async () => {
        try {
          if (
            videoElement.srcObject !==
            stream
          ) {
            videoElement.srcObject =
              stream;
          }

          await videoElement.play();
        } catch (err) {
          if (
            !cancelled &&
            componentActiveRef.current
          ) {
            setError(
              err?.message ||
                "Unable to display the live camera preview."
            );
          }
        }
      };

    attachStream();

    return () => {
      cancelled = true;
    };
  }, [
    securityReady,
    testAttemptId,
    result,
  ]);

  const stopSecureEnvironment =
    useCallback(
      async (
        exitFullscreen = false
      ) => {
        setSecurityReady(false);

        cameraService.stopCamera();

        faceDetectionService.close();

        objectDetectionService.close();

        await audioDetectionService
          .close()
          .catch(() => {});

        detectedFaceCountRef.current =
          0;

        resetFaceEpisodes();
        resetAudioEpisode();
        resetObjectEpisodes();

        setFaceBoxes([]);
        setPhoneDetections([]);
        setPersonDetections([]);

        setFaceStatus({
          state: "pending",
          text:
            "Face detection is not active.",
        });

        setAudioStatus({
          state: "pending",
          text:
            "Audio monitoring is not active.",
        });

        setObjectStatus({
          state: "pending",
          text:
            "Phone and person detection is not active.",
        });

        setAudioLevel(0);

        if (
          exitFullscreen &&
          document.fullscreenElement
        ) {
          try {
            allowFullscreenExitRef.current =
              true;

            await document
              .exitFullscreen();
          } catch {
          } finally {
            window.setTimeout(
              () => {
                allowFullscreenExitRef.current =
                  false;
              },
              300
            );
          }
        }
      },
      [
        resetFaceEpisodes,
        resetAudioEpisode,
        resetObjectEpisodes,
      ]
    );

  useEffect(() => {
    componentActiveRef.current =
      true;

    return () => {
      componentActiveRef.current =
        false;

      cameraService.stopCamera();

      faceDetectionService.close();

      objectDetectionService.close();

      audioDetectionService
        .close()
        .catch(() => {});

      if (
        document.fullscreenElement
      ) {
        allowFullscreenExitRef.current =
          true;

        document
          .exitFullscreen()
          .catch(() => {});
      }
    };
  }, []);

  const fetchResultAfterClosure =
    useCallback(
      async (
        attemptId,
        completionMessage =
          "Test completed."
      ) => {
        try {
          const resultData =
            await testAttemptService
              .getResult(
                attemptId
              );

          if (
            !componentActiveRef.current
          ) {
            return;
          }

          setResult(
            resultData
          );

          setMessage(
            completionMessage
          );

          sessionStorage.removeItem(
            storageKey
          );

          await stopSecureEnvironment(
            true
          );
        } catch (err) {
          if (
            componentActiveRef.current
          ) {
            setError(
              err?.message ||
                "Unable to load the completed test result."
            );
          }
        }
      },
      [
        storageKey,
        stopSecureEnvironment,
      ]
    );

  const syncWarningStatus =
    useCallback(
      async (
        attemptId
      ) => {
        try {
          const status =
            await testAttemptService
              .getStatus(
                attemptId
              );

          if (
            !componentActiveRef.current
          ) {
            return;
          }

          setWarningCount(
            Number(
              status?.warningCount ||
                0
            )
          );

          if (
            status?.completed ||
            status?.autoSubmitted
          ) {
            automaticSubmitStarted.current =
              true;

            await fetchResultAfterClosure(
              attemptId,
              status?.autoSubmitted
                ? "Your test was automatically submitted because of a proctoring violation."
                : "This test attempt is already completed."
            );
          }
        } catch (err) {
          console.warn(
            "Unable to sync attempt status:",
            err
          );
        }
      },
      [
        fetchResultAfterClosure,
      ]
    );

  const loadExistingAttempt =
    useCallback(
      async (
        attemptId
      ) => {
        try {
          const data =
            await testAttemptService
              .getAttempt(
                attemptId
              );

          if (
            !componentActiveRef.current
          ) {
            return;
          }

          const offset =
            getClockOffset(
              data?.serverTime
            );

          setClockOffsetMs(
            offset
          );

          setAttempt(
            data
          );

          setRemainingSeconds(
            getRemainingSeconds(
              data?.expiresAt,
              offset
            )
          );

          setMessage(
            "Existing test attempt restored. Re-enable secure monitoring to continue."
          );

          await syncWarningStatus(
            attemptId
          );
        } catch (err) {
          try {
            await fetchResultAfterClosure(
              attemptId,
              "Your previous test attempt has already finished."
            );
          } catch {
            sessionStorage.removeItem(
              storageKey
            );
          }
        }
      },
      [
        storageKey,
        syncWarningStatus,
        fetchResultAfterClosure,
      ]
    );

  useEffect(() => {
    const existingAttemptId =
      sessionStorage.getItem(
        storageKey
      );

    if (existingAttemptId) {
      loadExistingAttempt(
        existingAttemptId
      );
    }
  }, [
    storageKey,
    loadExistingAttempt,
  ]);

  const finishTest =
    useCallback(
      async (
        automatic = false
      ) => {
        if (
          !testAttemptId ||
          submitting ||
          result
        ) {
          return;
        }

        try {
          setSubmitting(true);
          setError("");

          await testAttemptService
            .submitTest(
              testAttemptId,
              mockTestId,
              []
            );

          const resultData =
            await testAttemptService
              .getResult(
                testAttemptId
              );

          if (
            !componentActiveRef.current
          ) {
            return;
          }

          setResult(
            resultData
          );

          sessionStorage.removeItem(
            storageKey
          );

          setMessage(
            automatic
              ? "Time is over. Your saved answers were submitted automatically."
              : "Test submitted successfully."
          );

          await stopSecureEnvironment(
            true
          );
        } catch (err) {
          if (
            componentActiveRef.current
          ) {
            setError(
              err?.message ||
                "Unable to submit the test."
            );

            automaticSubmitStarted.current =
              false;
          }
        } finally {
          if (
            componentActiveRef.current
          ) {
            setSubmitting(
              false
            );
          }
        }
      },
      [
        testAttemptId,
        submitting,
        result,
        mockTestId,
        storageKey,
        stopSecureEnvironment,
      ]
    );

  useEffect(() => {
    if (
      !attempt?.expiresAt ||
      result
    ) {
      return undefined;
    }

    const updateTimer = () => {
      const seconds =
        getRemainingSeconds(
          attempt.expiresAt,
          clockOffsetMs
        );

      setRemainingSeconds(
        seconds
      );

      if (
        seconds === 0 &&
        !automaticSubmitStarted.current
      ) {
        automaticSubmitStarted.current =
          true;

        finishTest(true);
      }
    };

    updateTimer();

    const timer =
      window.setInterval(
        updateTimer,
        1000
      );

    return () => {
      window.clearInterval(
        timer
      );
    };
  }, [
    attempt?.expiresAt,
    clockOffsetMs,
    result,
    finishTest,
  ]);

  const recordViolation =
    useCallback(
      async (
        violationType,
        description
      ) => {
        if (
          !testAttemptId ||
          result ||
          submitting
        ) {
          return null;
        }

        try {
          const response =
            await testAttemptService
              .reportViolation(
                testAttemptId,
                violationType,
                description
              );

          if (
            !componentActiveRef.current
          ) {
            return response;
          }

          setWarningCount(
            Number(
              response?.warningNumber ||
                0
            )
          );

          setViolationMessage(
            response?.message ||
              "Proctoring violation recorded."
          );

          if (
            response?.autoSubmitted
          ) {
            automaticSubmitStarted.current =
              true;

            await fetchResultAfterClosure(
              testAttemptId,
              response?.message ||
                "The test was automatically submitted."
            );
          }

          return response;
        } catch (err) {
          if (
            componentActiveRef.current
          ) {
            setError(
              err?.message ||
                "Unable to record the proctoring violation."
            );
          }

          return null;
        }
      },
      [
        testAttemptId,
        result,
        submitting,
        fetchResultAfterClosure,
      ]
    );

  const reportBrowserViolation =
    useCallback(
      (
        violationType,
        description
      ) => {
        const now =
          Date.now();

        const previous =
          browserViolationTimesRef
            .current[
            violationType
          ] || 0;

        if (
          now -
            previous <
          BROWSER_VIOLATION_COOLDOWN_MS
        ) {
          return;
        }

        browserViolationTimesRef
          .current[
          violationType
        ] = now;

        return recordViolation(
          violationType,
          description
        );
      },
      [recordViolation]
    );

  const resetFaceEpisode =
    useCallback(
      (type) => {
        faceEpisodesRef.current[
          type
        ] = {
          since: null,
          reported: false,
        };
      },
      []
    );

  const processFaceEpisode =
    useCallback(
      (
        type,
        active,
        description
      ) => {
        const episode =
          faceEpisodesRef
            .current[type];

        if (!active) {
          resetFaceEpisode(
            type
          );

          return;
        }

        const now =
          performance.now();

        if (
          episode.since ===
          null
        ) {
          episode.since =
            now;

          return;
        }

        const duration =
          FACE_VIOLATION_DURATIONS[
            type
          ];

        if (
          !episode.reported &&
          now -
            episode.since >=
            duration
        ) {
          episode.reported =
            true;

          recordViolation(
            type,
            description
          );
        }
      },
      [
        recordViolation,
        resetFaceEpisode,
      ]
    );

  const processAudioEpisode =
    useCallback(
      (
        suspicious
      ) => {
        const episode =
          audioEpisodeRef.current;

        const now =
          performance.now();

        if (suspicious) {
          episode.quietSince =
            null;

          if (
            episode.since ===
            null
          ) {
            episode.since =
              now;

            return;
          }

          if (
            !episode.reported &&
            !episode.reporting &&
            now -
              episode.since >=
              SUSPICIOUS_AUDIO_DURATION_MS
          ) {
            episode.reporting =
              true;

            Promise.resolve(
              recordViolation(
                "SUSPICIOUS_AUDIO",
                "Sustained suspicious audio activity was detected for at least 3 seconds."
              )
            )
              .then(
                (
                  response
                ) => {
                  episode.reporting =
                    false;

                  if (response) {
                    episode.reported =
                      true;
                  } else {
                    episode.since =
                      performance.now();
                  }
                }
              )
              .catch(
                () => {
                  episode.reporting =
                    false;

                  episode.since =
                    performance.now();
                }
              );
          }

          return;
        }

        if (
          !episode.reported
        ) {
          episode.since =
            null;

          episode.quietSince =
            null;

          return;
        }

        if (
          episode.quietSince ===
          null
        ) {
          episode.quietSince =
            now;

          return;
        }

        if (
          now -
            episode.quietSince >=
            AUDIO_REARM_QUIET_MS
        ) {
          resetAudioEpisode();
        }
      },
      [
        recordViolation,
        resetAudioEpisode,
      ]
    );

  const processObjectEpisode =
    useCallback(
      (
        type,
        active,
        description
      ) => {
        const episode =
          objectEpisodesRef
            .current[type];

        const now =
          performance.now();

        if (active) {
          episode.clearSince =
            null;

          if (
            episode.reported ||
            episode.reporting
          ) {
            return;
          }

          episode.reporting =
            true;

          Promise.resolve(
            recordViolation(
              type,
              description
            )
          )
            .then(
              (
                response
              ) => {
                episode.reporting =
                  false;

                if (response) {
                  episode.reported =
                    true;
                }
              }
            )
            .catch(
              () => {
                episode.reporting =
                  false;
              }
            );

          return;
        }

        if (
          !episode.reported
        ) {
          episode.clearSince =
            null;

          return;
        }

        if (
          episode.clearSince ===
          null
        ) {
          episode.clearSince =
            now;

          return;
        }

        if (
          now -
            episode.clearSince >=
            OBJECT_REARM_CLEAR_MS
        ) {
          episode.reported =
            false;

          episode.reporting =
            false;

          episode.clearSince =
            null;
        }
      },
      [recordViolation]
    );

  useEffect(() => {
    if (
      !securityReady ||
      !attempt ||
      result
    ) {
      return undefined;
    }

    const analyzeFace =
      async () => {
        if (
          faceAnalysisRunningRef.current ||
          !videoRef.current ||
          !securityReady
        ) {
          return;
        }

        faceAnalysisRunningRef.current =
          true;

        try {
          const analysis =
            await faceDetectionService
              .analyzeVideo(
                videoRef.current
              );

          if (
            !componentActiveRef.current ||
            !analysis?.ready
          ) {
            return;
          }

          detectedFaceCountRef.current =
            Number(
              analysis.faceCount ||
                0
            );

          setFaceBoxes(
            Array.isArray(
              analysis.faceBoxes
            )
              ? analysis.faceBoxes
              : []
          );

          if (analysis.noFace) {
            setFaceStatus({
              state: "denied",
              text:
                "No face detected. Return to the camera view.",
            });

            processFaceEpisode(
              "NO_FACE",
              true,
              "No face was continuously visible in the camera for at least 4 seconds."
            );

            processFaceEpisode(
              "MULTIPLE_FACES",
              false,
              ""
            );

            processFaceEpisode(
              "LOOKING_AWAY",
              false,
              ""
            );

            return;
          }

          if (
            analysis.multipleFaces
          ) {
            setFaceStatus({
              state: "denied",
              text:
                `${analysis.faceCount} faces detected. Only the student may remain in frame.`,
            });

            processFaceEpisode(
              "NO_FACE",
              false,
              ""
            );

            processFaceEpisode(
              "MULTIPLE_FACES",
              true,
              `Multiple faces (${analysis.faceCount}) were continuously visible for at least 2.5 seconds.`
            );

            processFaceEpisode(
              "LOOKING_AWAY",
              false,
              ""
            );

            return;
          }

          if (
            analysis.lookingAway
          ) {
            setFaceStatus({
              state: "pending",
              text:
                `Looking ${analysis.direction?.toLowerCase() || "away"}. Please face the screen.`,
            });

            processFaceEpisode(
              "NO_FACE",
              false,
              ""
            );

            processFaceEpisode(
              "MULTIPLE_FACES",
              false,
              ""
            );

            processFaceEpisode(
              "LOOKING_AWAY",
              true,
              `The student continuously looked ${analysis.direction?.toLowerCase() || "away"} for at least 4 seconds.`
            );

            return;
          }

          setFaceStatus({
            state: "granted",
            text:
              "One face detected and facing the screen.",
          });

          processFaceEpisode(
            "NO_FACE",
            false,
            ""
          );

          processFaceEpisode(
            "MULTIPLE_FACES",
            false,
            ""
          );

          processFaceEpisode(
            "LOOKING_AWAY",
            false,
            ""
          );
        } catch (err) {
          console.error(
            "Face analysis failed:",
            err
          );

          detectedFaceCountRef.current =
            0;

          setFaceBoxes([]);

          setFaceStatus({
            state: "denied",
            text:
              "Face detection stopped unexpectedly.",
          });
        } finally {
          faceAnalysisRunningRef.current =
            false;
        }
      };

    analyzeFace();

    const timer =
      window.setInterval(
        analyzeFace,
        FACE_SCAN_INTERVAL_MS
      );

    return () => {
      window.clearInterval(
        timer
      );
    };
  }, [
    securityReady,
    attempt,
    result,
    processFaceEpisode,
  ]);

  useEffect(() => {
    if (
      !securityReady ||
      !attempt ||
      result
    ) {
      return undefined;
    }

    const analyzeObjects =
      async () => {
        if (
          objectAnalysisRunningRef.current ||
          !videoRef.current ||
          !securityReady
        ) {
          return;
        }

        objectAnalysisRunningRef.current =
          true;

        try {
          const analysis =
            await objectDetectionService
              .analyzeVideo(
                videoRef.current
              );

          if (
            !componentActiveRef.current ||
            !analysis?.ready
          ) {
            return;
          }

          const phones =
            Array.isArray(
              analysis.phones
            )
              ? analysis.phones
              : [];

          const persons =
            Array.isArray(
              analysis.persons
            )
              ? analysis.persons
              : [];

          setPhoneDetections(
            phones
          );

          setPersonDetections(
            persons
          );

          const phoneDetected =
            phones.length > 0;

          const secondPersonDetected =
            persons.length >= 2 &&
            detectedFaceCountRef.current <
              2;

          if (phoneDetected) {
            const highestPhoneScore =
              Math.max(
                ...phones.map(
                  (
                    detection
                  ) =>
                    Number(
                      detection.score ||
                        0
                    )
                )
              );

            setObjectStatus({
              state: "denied",
              text:
                `Mobile phone detected (${Math.round(
                  highestPhoneScore *
                    100
                )}% confidence).`,
            });
          } else if (
            secondPersonDetected
          ) {
            setObjectStatus({
              state: "denied",
              text:
                "Another person's body or partial body was detected near the student.",
            });
          } else {
            setObjectStatus({
              state: "granted",
              text:
                "No prohibited mobile phone or second person detected.",
            });
          }

          processObjectEpisode(
            "PHONE_DETECTED",
            phoneDetected,
            "A mobile phone was detected in the assessment camera frame."
          );

          processObjectEpisode(
            "SECOND_PERSON_DETECTED",
            secondPersonDetected,
            "Another person's body or partial body was detected near the student during the assessment."
          );
        } catch (err) {
          console.error(
            "Object detection failed:",
            err
          );

          setPhoneDetections([]);
          setPersonDetections([]);

          setObjectStatus({
            state: "denied",
            text:
              "Phone and person detection stopped unexpectedly.",
          });
        } finally {
          objectAnalysisRunningRef.current =
            false;
        }
      };

    analyzeObjects();

    const timer =
      window.setInterval(
        analyzeObjects,
        OBJECT_SCAN_INTERVAL_MS
      );

    return () => {
      window.clearInterval(
        timer
      );
    };
  }, [
    securityReady,
    attempt,
    result,
    processObjectEpisode,
  ]);

  useEffect(() => {
    if (
      !securityReady ||
      result
    ) {
      return undefined;
    }

    const analyzeAudio =
      () => {
        if (
          audioAnalysisRunningRef.current ||
          !securityReady
        ) {
          return;
        }

        audioAnalysisRunningRef.current =
          true;

        try {
          const analysis =
            audioDetectionService
              .analyze();

          if (
            !componentActiveRef.current
          ) {
            return;
          }

          if (!analysis?.ready) {
            setAudioStatus({
              state: "pending",
              text:
                "Waiting for microphone audio monitoring...",
            });

            setAudioLevel(0);

            return;
          }

          setAudioLevel(
            Number(
              analysis.levelPercent ||
                0
            )
          );

          if (
            !analysis.calibrated
          ) {
            setAudioStatus({
              state: "pending",
              text:
                "Calibrating normal background audio. Keep the room quiet.",
            });

            resetAudioEpisode();

            return;
          }

          if (
            analysis.suspiciousAudio
          ) {
            setAudioStatus({
              state: "pending",
              text:
                "Unusual audio detected. Keep the assessment environment quiet.",
            });

            processAudioEpisode(
              true
            );

            return;
          }

          setAudioStatus({
            state: "granted",
            text:
              "Audio monitoring active. Background sound is within the normal range.",
          });

          processAudioEpisode(
            false
          );
        } catch (err) {
          console.error(
            "Audio analysis failed:",
            err
          );

          setAudioStatus({
            state: "denied",
            text:
              "Audio monitoring stopped unexpectedly.",
          });

          setAudioLevel(0);
        } finally {
          audioAnalysisRunningRef.current =
            false;
        }
      };

    analyzeAudio();

    const timer =
      window.setInterval(
        analyzeAudio,
        AUDIO_SCAN_INTERVAL_MS
      );

    return () => {
      window.clearInterval(
        timer
      );
    };
  }, [
    securityReady,
    result,
    processAudioEpisode,
    resetAudioEpisode,
  ]);

  useEffect(() => {
    if (
      !securityReady ||
      !attempt ||
      result
    ) {
      return undefined;
    }

    const handleVisibilityChange =
      () => {
        if (
          document.hidden
        ) {
          reportBrowserViolation(
            "TAB_SWITCH",
            "Student switched away from the active assessment tab."
          );
        }
      };

    const checkFullscreen =
      () => {
        if (
          document.fullscreenElement
        ) {
          setFullscreenLost(
            false
          );

          fullscreenViolationArmedRef.current =
            true;

          return;
        }

        if (
          allowFullscreenExitRef.current
        ) {
          return;
        }

        setFullscreenLost(
          true
        );

        if (
          fullscreenViolationArmedRef.current
        ) {
          fullscreenViolationArmedRef.current =
            false;

          Promise.resolve(
            reportBrowserViolation(
              "FULLSCREEN_EXIT",
              "Student exited fullscreen mode during the assessment."
            )
          ).then(
            (
              response
            ) => {
              if (
                !response &&
                !document
                  .fullscreenElement &&
                !allowFullscreenExitRef.current
              ) {
                fullscreenViolationArmedRef.current =
                  true;
              }
            }
          );
        }
      };

    const handleRestrictedAction =
      (
        event
      ) => {
        event.preventDefault();

        reportBrowserViolation(
          "COPY_PASTE_ATTEMPT",
          `Restricted ${event.type} action detected during the assessment.`
        );
      };

    const handleKeyboard =
      (
        event
      ) => {
        const restricted =
          (
            event.ctrlKey ||
            event.metaKey
          ) &&
          [
            "c",
            "v",
            "x",
          ].includes(
            event.key
              .toLowerCase()
          );

        if (restricted) {
          event.preventDefault();

          reportBrowserViolation(
            "COPY_PASTE_ATTEMPT",
            "Restricted clipboard keyboard shortcut detected during the assessment."
          );
        }
      };

    document.addEventListener(
      "visibilitychange",
      handleVisibilityChange
    );

    document.addEventListener(
      "fullscreenchange",
      checkFullscreen
    );

    document.addEventListener(
      "webkitfullscreenchange",
      checkFullscreen
    );

    document.addEventListener(
      "copy",
      handleRestrictedAction
    );

    document.addEventListener(
      "paste",
      handleRestrictedAction
    );

    document.addEventListener(
      "cut",
      handleRestrictedAction
    );

    document.addEventListener(
      "contextmenu",
      handleRestrictedAction
    );

    document.addEventListener(
      "keydown",
      handleKeyboard
    );

    const watchdog =
      window.setInterval(
        checkFullscreen,
        500
      );

    return () => {
      document.removeEventListener(
        "visibilitychange",
        handleVisibilityChange
      );

      document.removeEventListener(
        "fullscreenchange",
        checkFullscreen
      );

      document.removeEventListener(
        "webkitfullscreenchange",
        checkFullscreen
      );

      document.removeEventListener(
        "copy",
        handleRestrictedAction
      );

      document.removeEventListener(
        "paste",
        handleRestrictedAction
      );

      document.removeEventListener(
        "cut",
        handleRestrictedAction
      );

      document.removeEventListener(
        "contextmenu",
        handleRestrictedAction
      );

      document.removeEventListener(
        "keydown",
        handleKeyboard
      );

      window.clearInterval(
        watchdog
      );
    };
  }, [
    securityReady,
    attempt,
    result,
    reportBrowserViolation,
  ]);

  useEffect(() => {
    if (
      !securityReady ||
      !attempt ||
      result
    ) {
      return undefined;
    }

    const checkDevices =
      () => {
        const cameraActive =
          cameraService
            .isCameraActive();

        const microphoneActive =
          cameraService
            .isMicrophoneActive();

        if (
          !cameraActive ||
          !microphoneActive
        ) {
          setCameraLost(
            true
          );

          if (
            !cameraOffViolationReportedRef.current
          ) {
            cameraOffViolationReportedRef.current =
              true;

            recordViolation(
              "CAMERA_OFF",
              !cameraActive &&
              !microphoneActive
                ? "Camera and microphone became unavailable during the assessment."
                : !cameraActive
                  ? "Camera became unavailable during the assessment."
                  : "Microphone became unavailable during the assessment."
            );
          }
        } else {
          setCameraLost(
            false
          );

          cameraOffViolationReportedRef.current =
            false;
        }
      };

    checkDevices();

    const timer =
      window.setInterval(
        checkDevices,
        1500
      );

    return () => {
      window.clearInterval(
        timer
      );
    };
  }, [
    securityReady,
    attempt,
    result,
    recordViolation,
  ]);

  useEffect(() => {
    if (
      !securityReady ||
      !testAttemptId ||
      result
    ) {
      return undefined;
    }

    const timer =
      window.setInterval(
        () => {
          syncWarningStatus(
            testAttemptId
          );
        },
        1500
      );

    return () => {
      window.clearInterval(
        timer
      );
    };
  }, [
    securityReady,
    testAttemptId,
    result,
    syncWarningStatus,
  ]);

  const requestFullscreen =
    async () => {
      if (
        document.fullscreenElement
      ) {
        return;
      }

      if (
        !document
          .documentElement
          .requestFullscreen
      ) {
        throw new Error(
          "Fullscreen mode is not supported by this browser."
        );
      }

      await document
        .documentElement
        .requestFullscreen();
    };

  const startSecureMonitoring =
    async () => {
      const stream =
        await cameraService
          .startCamera();

      if (
        !componentActiveRef.current
      ) {
        stream
          .getTracks()
          .forEach(
            (
              track
            ) => track.stop()
          );

        return;
      }

      if (
        !videoRef.current
      ) {
        throw new Error(
          "Camera preview is not available."
        );
      }

      await cameraService
        .attachToVideo(
          videoRef.current
        );

      if (
        !cameraService
          .isCameraActive() ||
        !cameraService
          .isMicrophoneActive()
      ) {
        throw new Error(
          "Both camera and microphone must remain active."
        );
      }

      setFaceStatus({
        state: "pending",
        text:
          "Loading face detection...",
      });

      await faceDetectionService
        .initialize();

      setObjectStatus({
        state: "pending",
        text:
          "Loading phone and person detection...",
      });

      await objectDetectionService
        .initialize();

      setAudioStatus({
        state: "pending",
        text:
          "Starting audio monitoring...",
      });

      await audioDetectionService
        .initialize(
          stream
        );

      resetFaceEpisodes();
      resetAudioEpisode();
      resetObjectEpisodes();

      setFaceBoxes([]);
      setPhoneDetections([]);
      setPersonDetections([]);

      setFaceStatus({
        state: "pending",
        text:
          "Face detection active.",
      });

      setObjectStatus({
        state: "pending",
        text:
          "Phone and second-person detection active.",
      });

      setAudioStatus({
        state: "pending",
        text:
          "Audio monitoring started. Background calibration is running.",
      });
    };

  const enableSecureEnvironment =
    async () => {
      setSecurityLoading(
        true
      );

      setError("");
      setViolationMessage("");

      try {
        await requestFullscreen();

        await startSecureMonitoring();

        cameraOffViolationReportedRef.current =
          false;

        fullscreenViolationArmedRef.current =
          true;

        setFullscreenLost(
          false
        );

        setCameraLost(
          false
        );

        setSecurityReady(
          true
        );

        return true;
      } catch (err) {
        cameraService.stopCamera();

        faceDetectionService.close();

        objectDetectionService.close();

        await audioDetectionService
          .close()
          .catch(() => {});

        setSecurityReady(
          false
        );

        setError(
          err?.message ||
            "Unable to enable secure assessment mode."
        );

        return false;
      } finally {
        if (
          componentActiveRef.current
        ) {
          setSecurityLoading(
            false
          );
        }
      }
    };

  const handleStartTest =
    async () => {
      clearMessages();

      if (
        !personalized &&
        !selectedSkill
      ) {
        setError(
          "Technical skill is missing."
        );

        return;
      }

      try {
        setStarting(true);

        const secure =
          await enableSecureEnvironment();

        if (!secure) {
          return;
        }

        const data =
          await testAttemptService
            .startTest(
              mockTestId,
              personalized
                ? null
                : selectedSkill
            );

        if (
          !componentActiveRef.current
        ) {
          return;
        }

        const offset =
          getClockOffset(
            data?.serverTime
          );

        setClockOffsetMs(
          offset
        );

        setAttempt(
          data
        );

        setResult(
          null
        );

        setWarningCount(
          0
        );

        setCurrentQuestionIndex(
          0
        );

        automaticSubmitStarted.current =
          false;

        const newAttemptId =
          data?.testAttemptId ??
          data?.id;

        if (newAttemptId) {
          sessionStorage.setItem(
            storageKey,
            String(
              newAttemptId
            )
          );
        }

        setRemainingSeconds(
          getRemainingSeconds(
            data?.expiresAt,
            offset
          )
        );

        setMessage(
          "Secure test started. Face, phone, person and audio monitoring are active."
        );
      } catch (err) {
        await stopSecureEnvironment(
          true
        );

        setError(
          err?.message ||
            "Unable to start the test."
        );
      } finally {
        if (
          componentActiveRef.current
        ) {
          setStarting(
            false
          );
        }
      }
    };

  const handleResumeSecureTest =
    async () => {
      clearMessages();

      const secure =
        await enableSecureEnvironment();

      if (secure) {
        setMessage(
          "Secure monitoring restored."
        );

        if (testAttemptId) {
          await syncWarningStatus(
            testAttemptId
          );
        }
      }
    };

  const handleRestoreFullscreen =
    async () => {
      try {
        await requestFullscreen();

        setFullscreenLost(
          false
        );

        fullscreenViolationArmedRef.current =
          true;
      } catch (err) {
        setError(
          err?.message ||
            "Unable to restore fullscreen mode."
        );
      }
    };

  const handleRestoreCamera =
    async () => {
      setSecurityLoading(
        true
      );

      try {
        await startSecureMonitoring();

        cameraOffViolationReportedRef.current =
          false;

        setCameraLost(
          false
        );

        setSecurityReady(
          true
        );
      } catch (err) {
        setError(
          err?.message ||
            "Unable to restore secure monitoring."
        );
      } finally {
        setSecurityLoading(
          false
        );
      }
    };

  const handleAnswerChange =
    async (
      questionId,
      selectedOption
    ) => {
      if (
        !testAttemptId ||
        submitting ||
        result ||
        !securityReady ||
        fullscreenLost ||
        cameraLost
      ) {
        return;
      }

      try {
        setSavingQuestionId(
          questionId
        );

        await testAttemptService
          .saveAnswer(
            testAttemptId,
            questionId,
            selectedOption
          );

        setAttempt(
          (
            previous
          ) => ({
            ...previous,

            questions:
              previous.questions.map(
                (
                  question
                ) =>
                  question.id ===
                  questionId
                    ? {
                        ...question,
                        selectedOption,
                      }
                    : question
              ),
          })
        );
      } catch (err) {
        setError(
          err?.message ||
            "Unable to save the answer."
        );
      } finally {
        setSavingQuestionId(
          null
        );
      }
    };

  const handleManualSubmit =
    async () => {
      const confirmed =
        window.confirm(
          "Are you sure you want to submit your test?"
        );

      if (confirmed) {
        await finishTest(
          false
        );
      }
    };

  const handleBackToInstructions =
    () => {
      if (!mockTest) {
        navigate(
          "/student/mock-tests"
        );

        return;
      }

      navigate(
        `/student/mock-tests/${mockTestId}/instructions`,
        {
          state: {
            mockTest,
            selectedSkill:
              personalized
                ? null
                : selectedSkill,
          },
        }
      );
    };

  const answeredQuestions =
    questions.filter(
      (
        question
      ) =>
        question.selectedOption !==
          null &&
        question.selectedOption !==
          undefined &&
        question.selectedOption !==
          ""
    ).length;

  const skillDisplay =
    attempt?.selectedSkill ||
    (
      personalizedSkills.length >
      0
        ? personalizedSkills.join(
            ", "
          )
        : selectedSkill ||
          "Faculty assigned verified skills"
    );

  const getOverlayStyle =
    (
      box
    ) => {
      const video =
        videoRef.current;

      if (
        !video ||
        !box ||
        video.videoWidth <= 0 ||
        video.videoHeight <= 0 ||
        video.clientWidth <= 0 ||
        video.clientHeight <= 0
      ) {
        return null;
      }

      const sourceWidth =
        video.videoWidth;

      const sourceHeight =
        video.videoHeight;

      const containerWidth =
        video.clientWidth;

      const containerHeight =
        video.clientHeight;

      const scale =
        Math.max(
          containerWidth /
            sourceWidth,
          containerHeight /
            sourceHeight
        );

      const renderedWidth =
        sourceWidth * scale;

      const renderedHeight =
        sourceHeight * scale;

      const cropX =
        (
          renderedWidth -
          containerWidth
        ) / 2;

      const cropY =
        (
          renderedHeight -
          containerHeight
        ) / 2;

      const originalLeft =
        box.x *
          renderedWidth -
        cropX;

      const top =
        box.y *
          renderedHeight -
        cropY;

      const width =
        box.width *
        renderedWidth;

      const height =
        box.height *
        renderedHeight;

      let mirrored = false;

      try {
        const transform =
          window
            .getComputedStyle(
              video
            )
            .transform;

        if (
          transform &&
          transform !==
            "none"
        ) {
          const matrix =
            new DOMMatrixReadOnly(
              transform
            );

          mirrored =
            matrix.a < 0;
        }
      } catch {
        mirrored = false;
      }

      const left =
        mirrored
          ? containerWidth -
            (
              originalLeft +
              width
            )
          : originalLeft;

      const visibleLeft =
        Math.max(
          0,
          left
        );

      const visibleTop =
        Math.max(
          0,
          top
        );

      const visibleRight =
        Math.min(
          containerWidth,
          left + width
        );

      const visibleBottom =
        Math.min(
          containerHeight,
          top + height
        );

      const visibleWidth =
        Math.max(
          0,
          visibleRight -
            visibleLeft
        );

      const visibleHeight =
        Math.max(
          0,
          visibleBottom -
            visibleTop
        );

      if (
        visibleWidth <= 0 ||
        visibleHeight <= 0
      ) {
        return null;
      }

      return {
        position:
          "absolute",

        left:
          `${visibleLeft}px`,

        top:
          `${visibleTop}px`,

        width:
          `${visibleWidth}px`,

        height:
          `${visibleHeight}px`,

        zIndex: 6,

        pointerEvents:
          "none",

        boxSizing:
          "border-box",
      };
    };

  const renderFaceBoxes =
    () => {
      if (
        !securityReady ||
        faceBoxes.length === 0
      ) {
        return null;
      }

      const multiple =
        faceBoxes.length > 1;

      const lookingAway =
        faceStatus.text
          ?.toLowerCase()
          .startsWith(
            "looking "
          );

      return faceBoxes.map(
        (
          box,
          index
        ) => {
          const style =
            getOverlayStyle(
              box
            );

          if (!style) {
            return null;
          }

          const color =
            multiple
              ? "#ef4444"
              : lookingAway
                ? "#f59e0b"
                : "#22c55e";

          const label =
            multiple
              ? `FACE ${index + 1}`
              : lookingAway
                ? "LOOKING AWAY"
                : "FACE DETECTED";

          return (
            <div
              key={
                `face-${index}`
              }
              style={{
                ...style,

                border:
                  `3px solid ${color}`,

                borderRadius:
                  "10px",
              }}
            >
              <span
                style={{
                  position:
                    "absolute",

                  top: "5px",
                  left: "5px",

                  padding:
                    "4px 7px",

                  borderRadius:
                    "6px",

                  background:
                    color,

                  color:
                    "#ffffff",

                  fontSize:
                    "9px",

                  fontWeight:
                    "900",
                }}
              >
                {label}
              </span>
            </div>
          );
        }
      );
    };

  const renderObjectBoxes =
    () => {
      if (!securityReady) {
        return null;
      }

      const phoneBoxes =
        phoneDetections.map(
          (
            detection,
            index
          ) => {
            const style =
              getOverlayStyle(
                detection.box
              );

            if (!style) {
              return null;
            }

            return (
              <div
                key={
                  `phone-${index}`
                }
                style={{
                  ...style,

                  border:
                    "4px solid #ef4444",

                  borderRadius:
                    "8px",

                  boxShadow:
                    "0 0 18px rgba(239,68,68,0.75)",
                }}
              >
                <span
                  style={{
                    position:
                      "absolute",

                    top: "4px",
                    left: "4px",

                    padding:
                      "4px 7px",

                    borderRadius:
                      "5px",

                    background:
                      "#ef4444",

                    color:
                      "#ffffff",

                    fontSize:
                      "9px",

                    fontWeight:
                      "900",

                    whiteSpace:
                      "nowrap",
                  }}
                >
                  MOBILE PHONE{" "}
                  {Math.round(
                    detection.score *
                      100
                  )}
                  %
                </span>
              </div>
            );
          }
        );

      const sortedPersons =
        [...personDetections]
          .sort(
            (
              first,
              second
            ) =>
              (
                second.box.width *
                second.box.height
              ) -
              (
                first.box.width *
                first.box.height
              )
          );

      const extraPersonBoxes =
        sortedPersons.length >= 2
          ? sortedPersons
              .slice(1)
              .map(
                (
                  detection,
                  index
                ) => {
                  const style =
                    getOverlayStyle(
                      detection.box
                    );

                  if (!style) {
                    return null;
                  }

                  return (
                    <div
                      key={
                        `second-person-${index}`
                      }
                      style={{
                        ...style,

                        border:
                          "4px solid #f97316",

                        borderRadius:
                          "10px",

                        boxShadow:
                          "0 0 18px rgba(249,115,22,0.65)",
                      }}
                    >
                      <span
                        style={{
                          position:
                            "absolute",

                          top: "4px",
                          left: "4px",

                          padding:
                            "4px 7px",

                          borderRadius:
                            "5px",

                          background:
                            "#f97316",

                          color:
                            "#ffffff",

                          fontSize:
                            "9px",

                          fontWeight:
                            "900",

                          whiteSpace:
                            "nowrap",
                        }}
                      >
                        SECOND PERSON
                      </span>
                    </div>
                  );
                }
              )
          : [];

      return (
        <>
          {phoneBoxes}
          {extraPersonBoxes}
        </>
      );
    };

  const renderAudioStatus =
    () => (
      <>
        <div
          className={
            `proctoring-status ${audioStatus.state}`
          }
        >
          <span>
            {audioStatus.state ===
            "granted"
              ? "✓"
              : audioStatus.state ===
                  "denied"
                ? "!"
                : "○"}
          </span>

          <p>
            {audioStatus.text}
          </p>
        </div>

        <div
          style={{
            marginTop:
              "10px",
          }}
        >
          <div
            style={{
              display:
                "flex",

              justifyContent:
                "space-between",

              marginBottom:
                "6px",

              fontSize:
                "11px",

              opacity:
                0.8,
            }}
          >
            <span>
              Microphone Activity
            </span>

            <span>
              {audioLevel}%
            </span>
          </div>

          <div
            style={{
              width:
                "100%",

              height:
                "7px",

              borderRadius:
                "10px",

              overflow:
                "hidden",

              background:
                "rgba(255,255,255,0.12)",
            }}
          >
            <div
              style={{
                width:
                  `${Math.min(
                    100,
                    Math.max(
                      0,
                      audioLevel
                    )
                  )}%`,

                height:
                  "100%",

                background:
                  "currentColor",

                transition:
                  "width 0.2s ease",
              }}
            />
          </div>
        </div>
      </>
    );

  if (!attempt) {
    return (
      <div className="proctoring-page">

        <div className="proctoring-container">

          <header className="proctoring-header">

            <div className="proctoring-heading">

              <span>
                SECURE ASSESSMENT
              </span>

              <h1>
                Ready to Start Test
              </h1>

              <p>
                Keep the background clear,
                stay alone, and keep all
                mobile phones and electronic
                devices away.
              </p>

            </div>

            <button
              type="button"
              className="proctoring-back-button"
              onClick={
                handleBackToInstructions
              }
              disabled={
                starting ||
                securityLoading
              }
            >
              Back to Instructions
            </button>

          </header>

          <main className="proctoring-instruction-grid">

            <section className="proctoring-card">

              <div className="proctoring-card-header">

                <h2>
                  {mockTest?.title ||
                    "Placement Mock Test"}
                </h2>

                <p>
                  Secure monitoring must
                  initialize before the
                  test timer starts.
                </p>

              </div>

              <div className="proctoring-test-details">

                <div className="proctoring-detail">

                  <span>
                    Test Type
                  </span>

                  <strong>
                    {personalized
                      ? "Personalized AI Test"
                      : "Manual Mock Test"}
                  </strong>

                </div>

                <div className="proctoring-detail">

                  <span>
                    Technical Skill
                  </span>

                  <strong>
                    {personalized
                      ? personalizedSkills.length >
                        0
                        ? personalizedSkills.join(
                            ", "
                          )
                        : "Faculty assigned skills"
                      : selectedSkill ||
                        "Not selected"}
                  </strong>

                </div>

              </div>

              {error && (
                <div className="proctoring-error">
                  {error}
                </div>
              )}

              <div className="proctoring-actions">

                <button
                  type="button"
                  className="proctoring-primary-button"
                  onClick={
                    handleStartTest
                  }
                  disabled={
                    starting ||
                    securityLoading ||
                    (
                      !personalized &&
                      !selectedSkill
                    )
                  }
                >
                  {starting ||
                  securityLoading
                    ? "Enabling Secure Test..."
                    : "Start Secure Test"}
                </button>

              </div>

            </section>

            <aside className="proctoring-card">

              <div className="proctoring-card-header">

                <h2>
                  Live Camera
                </h2>

              </div>

              <div className="proctoring-camera">

                <video
                  ref={videoRef}
                  autoPlay
                  muted
                  playsInline
                />

                {renderFaceBoxes()}
                {renderObjectBoxes()}

                <div className="proctoring-camera-label">

                  {securityReady
                    ? "AI Monitoring Active"
                    : "Camera Preview"}

                </div>

              </div>

              <div
                className={
                  `proctoring-status ${faceStatus.state}`
                }
              >
                <span>
                  {faceStatus.state ===
                  "granted"
                    ? "✓"
                    : faceStatus.state ===
                        "denied"
                      ? "!"
                      : "○"}
                </span>

                <p>
                  {faceStatus.text}
                </p>
              </div>

              <div
                className={
                  `proctoring-status ${objectStatus.state}`
                }
              >
                <span>
                  {objectStatus.state ===
                  "granted"
                    ? "✓"
                    : objectStatus.state ===
                        "denied"
                      ? "!"
                      : "○"}
                </span>

                <p>
                  {objectStatus.text}
                </p>
              </div>

              {renderAudioStatus()}

            </aside>

          </main>

        </div>

      </div>
    );
  }

  if (result) {
    return (
      <div className="proctoring-page">

        <div className="proctoring-container">

          <section className="proctoring-card">

            <div className="proctoring-card-header">

              <span>
                TEST COMPLETED
              </span>

              <h2>
                Assessment Result
              </h2>

            </div>

            {message && (
              <div className="proctoring-information">
                {message}
              </div>
            )}

            {result.percentage !==
              undefined && (
              <div className="proctoring-detail">

                <span>
                  Percentage
                </span>

                <strong>
                  {Number(
                    result.percentage
                  ).toFixed(
                    2
                  )}
                  %
                </strong>

              </div>
            )}

            {result.correctAnswers !==
              undefined &&
              result.totalQuestions !==
                undefined && (
                <div className="proctoring-detail">

                  <span>
                    Correct Answers
                  </span>

                  <strong>
                    {result.correctAnswers}
                    {" / "}
                    {result.totalQuestions}
                  </strong>

                </div>
              )}

            {typeof result.passed ===
              "boolean" && (
              <div className="proctoring-detail">

                <span>
                  Result
                </span>

                <strong>
                  {result.passed
                    ? "PASSED"
                    : "FAILED"}
                </strong>

              </div>
            )}

            <div
              className="proctoring-actions"
              style={{
                marginTop:
                  "20px",
              }}
            >
              <button
                type="button"
                className="proctoring-primary-button"
                onClick={() =>
                  navigate(
                    "/student/mock-tests"
                  )
                }
              >
                Back to Mock Tests
              </button>
            </div>

          </section>

        </div>

      </div>
    );
  }

  return (
    <div className="proctoring-page">

      <div className="proctoring-container">

        <header className="proctoring-test-header">

          <div>

            <h1>
              {attempt.title ||
                "Placement Mock Test"}
            </h1>

            <p>
              Technical Skill:{" "}

              <strong>
                {skillDisplay}
              </strong>
            </p>

          </div>

          <div className="proctoring-timer">
            {formatTime(
              remainingSeconds
            )}
          </div>

        </header>

        {message && (
          <div className="proctoring-information">
            {message}
          </div>
        )}

        {violationMessage && (
          <div className="proctoring-error">
            {violationMessage}
          </div>
        )}

        {error && (
          <div className="proctoring-error">
            {error}
          </div>
        )}

        <main className="proctoring-test-layout">

          <section>

            {questions.length === 0 ? (
              <div className="proctoring-question-card">
                No questions are available.
              </div>
            ) : currentQuestion ? (
              <article className="proctoring-question-card">

                <div className="proctoring-question-meta">

                  <span>
                    Question{" "}
                    {currentQuestionIndex +
                      1}
                    {" / "}
                    {questions.length}
                  </span>

                  <span>
                    {currentQuestion.category ||
                      "QUESTION"}

                    {currentQuestion
                      .technicalSkill
                      ? ` • ${currentQuestion.technicalSkill}`
                      : ""}
                  </span>

                </div>

                <h2>
                  {
                    currentQuestion
                      .questionText
                  }
                </h2>

                <div className="proctoring-options">

                  {[
                    {
                      key: "A",
                      text:
                        currentQuestion.optionA,
                    },
                    {
                      key: "B",
                      text:
                        currentQuestion.optionB,
                    },
                    {
                      key: "C",
                      text:
                        currentQuestion.optionC,
                    },
                    {
                      key: "D",
                      text:
                        currentQuestion.optionD,
                    },
                  ].map(
                    (
                      option
                    ) => (
                      <label
                        key={
                          option.key
                        }
                        className={
                          `proctoring-option ${
                            currentQuestion
                              .selectedOption ===
                            option.key
                              ? "selected"
                              : ""
                          }`
                        }
                      >
                        <input
                          type="radio"
                          name={
                            `question-${currentQuestion.id}`
                          }
                          value={
                            option.key
                          }
                          checked={
                            currentQuestion
                              .selectedOption ===
                            option.key
                          }
                          disabled={
                            submitting ||
                            !securityReady ||
                            fullscreenLost ||
                            cameraLost ||
                            savingQuestionId ===
                              currentQuestion.id
                          }
                          onChange={() =>
                            handleAnswerChange(
                              currentQuestion.id,
                              option.key
                            )
                          }
                        />

                        <span>
                          <strong>
                            {option.key}.
                          </strong>{" "}
                          {option.text}
                        </span>
                      </label>
                    )
                  )}

                </div>

                {savingQuestionId ===
                  currentQuestion.id && (
                  <div className="proctoring-information">
                    Saving answer...
                  </div>
                )}

                <div className="proctoring-question-actions">

                  <button
                    type="button"
                    className="proctoring-secondary-button"
                    onClick={() =>
                      setCurrentQuestionIndex(
                        (
                          index
                        ) =>
                          Math.max(
                            0,
                            index - 1
                          )
                      )
                    }
                    disabled={
                      currentQuestionIndex ===
                      0
                    }
                  >
                    Previous
                  </button>

                  {currentQuestionIndex <
                  questions.length -
                    1 ? (
                    <button
                      type="button"
                      className="proctoring-primary-button"
                      onClick={() =>
                        setCurrentQuestionIndex(
                          (
                            index
                          ) =>
                            Math.min(
                              questions.length -
                                1,
                              index + 1
                            )
                        )
                      }
                    >
                      Next
                    </button>
                  ) : (
                    <button
                      type="button"
                      className="proctoring-primary-button"
                      onClick={
                        handleManualSubmit
                      }
                      disabled={
                        submitting
                      }
                    >
                      {submitting
                        ? "Submitting..."
                        : "Submit Test"}
                    </button>
                  )}

                </div>

              </article>
            ) : null}

          </section>

          <aside className="proctoring-side-panel">

            <section className="proctoring-card">

              <div className="proctoring-card-header">

                <h2>
                  Live Proctoring
                </h2>

                <p>
                  Face, phone, person,
                  microphone and browser
                  monitoring are active.
                </p>

              </div>

              <div className="proctoring-camera">

                <video
                  ref={videoRef}
                  autoPlay
                  muted
                  playsInline
                />

                {renderFaceBoxes()}
                {renderObjectBoxes()}

                <div className="proctoring-camera-label">
                  AI Monitoring Active
                </div>

              </div>

              <div
                className={
                  `proctoring-status ${faceStatus.state}`
                }
              >
                <span>
                  {faceStatus.state ===
                  "granted"
                    ? "✓"
                    : faceStatus.state ===
                        "denied"
                      ? "!"
                      : "○"}
                </span>

                <p>
                  {faceStatus.text}
                </p>
              </div>

              <div
                className={
                  `proctoring-status ${objectStatus.state}`
                }
              >
                <span>
                  {objectStatus.state ===
                  "granted"
                    ? "✓"
                    : objectStatus.state ===
                        "denied"
                      ? "!"
                      : "○"}
                </span>

                <p>
                  {objectStatus.text}
                </p>
              </div>

              {renderAudioStatus()}

            </section>

            <div className="proctoring-warning-count">

              <strong>
                {warningCount} / 3
              </strong>

              <span>
                PROCTORING WARNINGS
              </span>

            </div>

            <section className="proctoring-card">

              <div className="proctoring-test-details">

                <div className="proctoring-detail">

                  <span>
                    Answered
                  </span>

                  <strong>
                    {answeredQuestions}
                    {" / "}
                    {questions.length}
                  </strong>

                </div>

                <div className="proctoring-detail">

                  <span>
                    Pass Percentage
                  </span>

                  <strong>
                    {attempt.passPercentage}%
                  </strong>

                </div>

              </div>

              <div
                className="proctoring-actions"
                style={{
                  marginTop:
                    "15px",
                }}
              >
                <button
                  type="button"
                  className="proctoring-secondary-button"
                  onClick={
                    handleManualSubmit
                  }
                  disabled={
                    submitting ||
                    questions.length ===
                      0
                  }
                >
                  {submitting
                    ? "Submitting..."
                    : "Submit Test"}
                </button>
              </div>

            </section>

          </aside>

        </main>

        {attempt &&
          !securityReady &&
          !result && (
          <div className="proctoring-overlay">

            <div className="proctoring-popup">

              <div className="proctoring-popup-icon">
                !
              </div>

              <h2>
                Secure Monitoring Required
              </h2>

              <p>
                Restore camera, microphone,
                fullscreen and AI monitoring
                to continue.
              </p>

              <div className="proctoring-actions">

                <button
                  type="button"
                  className="proctoring-primary-button"
                  onClick={
                    handleResumeSecureTest
                  }
                  disabled={
                    securityLoading
                  }
                >
                  {securityLoading
                    ? "Restoring Security..."
                    : "Resume Secure Test"}
                </button>

              </div>

            </div>

          </div>
        )}

        {fullscreenLost &&
          securityReady &&
          !result && (
          <div className="proctoring-overlay">

            <div className="proctoring-popup">

              <div className="proctoring-popup-icon">
                !
              </div>

              <h2>
                Fullscreen Exited
              </h2>

              <p>
                A fullscreen violation was
                recorded.
              </p>

              <button
                type="button"
                className="proctoring-primary-button"
                onClick={
                  handleRestoreFullscreen
                }
              >
                Return to Fullscreen
              </button>

            </div>

          </div>
        )}

        {cameraLost &&
          securityReady &&
          !result && (
          <div className="proctoring-overlay">

            <div className="proctoring-popup">

              <div className="proctoring-popup-icon">
                !
              </div>

              <h2>
                Camera / Microphone Lost
              </h2>

              <p>
                Restore secure devices
                before continuing.
              </p>

              <button
                type="button"
                className="proctoring-primary-button"
                onClick={
                  handleRestoreCamera
                }
                disabled={
                  securityLoading
                }
              >
                {securityLoading
                  ? "Restoring..."
                  : "Restore Camera & Microphone"}
              </button>

            </div>

          </div>
        )}

      </div>

    </div>
  );
}

export default StudentTestAttempt;