import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import {
  useNavigate,
  useParams,
} from "react-router-dom";

import aiInterviewService from "../services/aiInterviewService";
import interviewSpeechService from "../services/interviewSpeechService";
import cameraService from "../services/cameraService";
import faceDetectionService from "../services/faceDetectionService";
import objectDetectionService from "../services/objectDetectionService";

import "../styles/proctoring.css";

const FACE_SCAN_INTERVAL_MS = 700;

const FACE_VIOLATION_DURATIONS = {
  NO_FACE: 4000,
  MULTIPLE_FACES: 2500,
  LOOKING_AWAY: 4000,
};

const OBJECT_SCAN_INTERVAL_MS = 500;
const OBJECT_REARM_CLEAR_MS = 1200;

function getServerOffset(serverTime) {
  const value =
    new Date(
      serverTime || ""
    ).getTime();

  return Number.isNaN(value)
    ? 0
    : value - Date.now();
}

function getRemainingSeconds(
  expiresAt,
  offset = 0
) {
  const expiry =
    new Date(
      expiresAt || ""
    ).getTime();

  if (
    Number.isNaN(expiry)
  ) {
    return null;
  }

  return Math.max(
    0,
    Math.ceil(
      (
        expiry -
        (
          Date.now() +
          offset
        )
      ) / 1000
    )
  );
}

function formatTime(seconds) {
  if (
    seconds === null
  ) {
    return "--:--";
  }

  const minutes =
    Math.floor(
      seconds / 60
    );

  const remaining =
    seconds % 60;

  return `${String(
    minutes
  ).padStart(
    2,
    "0"
  )}:${String(
    remaining
  ).padStart(
    2,
    "0"
  )}`;
}

function formatType(type) {
  return type
    ? type.replaceAll(
        "_",
        " "
      )
    : "INTERVIEW";
}

function StudentAIInterviewAttempt() {
  const {
    sessionId,
  } = useParams();

  const navigate =
    useNavigate();

  const interviewSessionId =
    useMemo(
      () => {
        const value =
          Number(
            sessionId
          );

        return (
          Number.isSafeInteger(
            value
          ) &&
          value > 0
        )
          ? value
          : null;
      },
      [sessionId]
    );

  const instructionsKey =
    useMemo(
      () =>
        interviewSessionId
          ? `campusiq_ai_interview_instructions_${interviewSessionId}`
          : null,
      [
        interviewSessionId,
      ]
    );

  const videoRef =
    useRef(null);

  const mountedRef =
    useRef(true);

  const secureActiveRef =
    useRef(false);

  const submitRunningRef =
    useRef(false);

  const timeoutHandledRef =
    useRef(false);

  const violationRunningRef =
    useRef(false);

  const faceAnalysisRunningRef =
    useRef(false);

  const objectAnalysisRunningRef =
    useRef(false);

  const detectedFaceCountRef =
    useRef(0);

  const spokenQuestionRef =
    useRef(null);

  const recognitionQuestionRef =
    useRef(null);

  const lastViolationRef =
    useRef({});

  const serverOffsetRef =
    useRef(0);

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

  const [
    eligibility,
    setEligibility,
  ] = useState(null);

  const [
    interview,
    setInterview,
  ] = useState(null);

  const [
    answers,
    setAnswers,
  ] = useState({});

  const [
    savedAnswers,
    setSavedAnswers,
  ] = useState({});

  const [
    loading,
    setLoading,
  ] = useState(true);

  const [
    starting,
    setStarting,
  ] = useState(false);

  const [
    saving,
    setSaving,
  ] = useState(false);

  const [
    submitting,
    setSubmitting,
  ] = useState(false);

  const [
    secureMode,
    setSecureMode,
  ] = useState(false);

  const [
    currentIndex,
    setCurrentIndex,
  ] = useState(0);

  const [
    remainingSeconds,
    setRemainingSeconds,
  ] = useState(null);

  const [
    warningCount,
    setWarningCount,
  ] = useState(0);

  const [
    faceStatus,
    setFaceStatus,
  ] = useState({
    state: "pending",

    text:
      "Face monitoring is waiting to start.",
  });

  const [
    faceBoxes,
    setFaceBoxes,
  ] = useState([]);

  const [
    objectStatus,
    setObjectStatus,
  ] = useState({
    state: "pending",

    text:
      "Phone and person monitoring is waiting to start.",
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
    speaking,
    setSpeaking,
  ] = useState(false);

  const [
    listening,
    setListening,
  ] = useState(false);

  const [
    interimTranscript,
    setInterimTranscript,
  ] = useState("");

  const [
    speechMessage,
    setSpeechMessage,
  ] = useState(
    "Voice interview is ready."
  );

  const [
    speechSupported,
    setSpeechSupported,
  ] = useState(true);

  const [
    fullscreenLost,
    setFullscreenLost,
  ] = useState(false);

  const [
    error,
    setError,
  ] = useState("");

  const [
    message,
    setMessage,
  ] = useState("");

  const [
    warningMessage,
    setWarningMessage,
  ] = useState("");

  const questions =
    useMemo(
      () => {
        if (
          !Array.isArray(
            interview?.questions
          )
        ) {
          return [];
        }

        return [
          ...interview.questions,
        ].sort(
          (
            first,
            second
          ) =>
            Number(
              first
                ?.interviewOrder ||
                0
            ) -
            Number(
              second
                ?.interviewOrder ||
                0
            )
        );
      },
      [interview]
    );

  const currentQuestion =
    questions[
      currentIndex
    ] || null;

  const answeredCount =
    useMemo(
      () =>
        questions.filter(
          (question) =>
            Boolean(
              savedAnswers[
                question
                  .questionId
              ]?.trim()
            )
        ).length,
      [
        questions,
        savedAnswers,
      ]
    );

  const handleUnauthorized =
    useCallback(
      (err) => {
        if (
          err?.status ===
          401
        ) {
          navigate(
            "/login",
            {
              replace: true,
            }
          );

          return true;
        }

        return false;
      },
      [navigate]
    );

  const applyInterview =
    useCallback(
      (data) => {
        if (!data) {
          return;
        }

        setInterview(
          data
        );

        setWarningCount(
          Number(
            data.warningCount ||
              0
          )
        );

        serverOffsetRef.current =
          getServerOffset(
            data.serverTime
          );

        setRemainingSeconds(
          getRemainingSeconds(
            data.expiresAt,
            serverOffsetRef.current
          )
        );

        const restored =
          {};

        (
          data.questions ||
          []
        ).forEach(
          (question) => {
            restored[
              question.questionId
            ] =
              question.savedAnswer ||
              "";
          }
        );

        setAnswers(
          restored
        );

        setSavedAnswers(
          restored
        );
      },
      []
    );

  const resetFaceEpisodes =
    useCallback(
      () => {
        faceEpisodesRef.current =
          {
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
      },
      []
    );

  const resetObjectEpisodes =
    useCallback(
      () => {
        objectEpisodesRef.current =
          {
            PHONE_DETECTED: {
              reported: false,
              reporting: false,
              clearSince:
                null,
            },

            SECOND_PERSON_DETECTED:
              {
                reported: false,
                reporting: false,
                clearSince:
                  null,
              },
          };
      },
      []
    );

  const leaveSecureEnvironment =
    useCallback(
      async () => {
        secureActiveRef.current =
          false;

        setSecureMode(
          false
        );

        cameraService
          .stopCamera();

        faceDetectionService
          .close();

        objectDetectionService
          .close();

        interviewSpeechService
          .close();

        recognitionQuestionRef.current =
          null;

        spokenQuestionRef.current =
          null;

        detectedFaceCountRef.current =
          0;

        resetFaceEpisodes();

        resetObjectEpisodes();

        setFaceBoxes([]);

        setPhoneDetections(
          []
        );

        setPersonDetections(
          []
        );

        setSpeaking(
          false
        );

        setListening(
          false
        );

        setInterimTranscript(
          ""
        );

        setSpeechMessage(
          "Voice interview is not active."
        );

        setFaceStatus({
          state:
            "pending",

          text:
            "Face monitoring is not active.",
        });

        setObjectStatus({
          state:
            "pending",

          text:
            "Phone and person monitoring is not active.",
        });

        setFullscreenLost(
          false
        );

        try {
          if (
            document
              .fullscreenElement &&
            document
              .exitFullscreen
          ) {
            await document
              .exitFullscreen();
          }
        } catch {
        }
      },
      [
        resetFaceEpisodes,
        resetObjectEpisodes,
      ]
    );

  const goToResult =
    useCallback(
      async () => {
        await leaveSecureEnvironment();

        if (
          instructionsKey
        ) {
          sessionStorage
            .removeItem(
              instructionsKey
            );
        }

        navigate(
          `/student/ai-interview/${interviewSessionId}/result`,
          {
            replace: true,
          }
        );
      },
      [
        interviewSessionId,
        instructionsKey,
        leaveSecureEnvironment,
        navigate,
      ]
    );

  useEffect(
    () => {
      if (
        !interviewSessionId ||
        !instructionsKey
      ) {
        return;
      }

      if (
        sessionStorage
          .getItem(
            instructionsKey
          ) !==
        "accepted"
      ) {
        navigate(
          `/student/ai-interview/${interviewSessionId}/instructions`,
          {
            replace:
              true,
          }
        );
      }
    },
    [
      interviewSessionId,
      instructionsKey,
      navigate,
    ]
  );

  useEffect(
    () => {
      mountedRef.current =
        true;

      return () => {
        mountedRef.current =
          false;

        secureActiveRef.current =
          false;

        cameraService
          .stopCamera();

        faceDetectionService
          .close();

        objectDetectionService
          .close();

        interviewSpeechService
          .close();

        if (
          document
            .fullscreenElement &&
          document
            .exitFullscreen
        ) {
          document
            .exitFullscreen()
            .catch(
              () => {}
            );
        }
      };
    },
    []
  );

  useEffect(
    () => {
      let active =
        true;

      async function loadSession() {
        if (
          !interviewSessionId ||
          !instructionsKey
        ) {
          setError(
            "Invalid AI Interview session ID."
          );

          setLoading(
            false
          );

          return;
        }

        if (
          sessionStorage
            .getItem(
              instructionsKey
            ) !==
          "accepted"
        ) {
          setLoading(
            false
          );

          return;
        }

        try {
          const eligibilityData =
            await aiInterviewService
              .getEligibility();

          if (
            !active
          ) {
            return;
          }

          if (
            Number(
              eligibilityData
                ?.interviewSessionId
            ) !==
            interviewSessionId
          ) {
            throw new Error(
              "This AI Interview session is not available for the current student."
            );
          }

          setEligibility(
            eligibilityData
          );

          if (
            eligibilityData
              .interviewStatus ===
              "COMPLETED" ||
            eligibilityData
              .interviewStatus ===
              "AUTO_SUBMITTED"
          ) {
            navigate(
              `/student/ai-interview/${interviewSessionId}/result`,
              {
                replace:
                  true,
              }
            );

            return;
          }

          if (
            eligibilityData
              .interviewStatus ===
            "IN_PROGRESS"
          ) {
            const data =
              await aiInterviewService
                .getInterview(
                  interviewSessionId
                );

            if (
              active
            ) {
              applyInterview(
                data
              );
            }
          }
        } catch (
          err
        ) {
          if (
            active &&
            !handleUnauthorized(
              err
            )
          ) {
            setError(
              err?.message ||
                "Unable to load the AI Interview session."
            );
          }
        } finally {
          if (
            active
          ) {
            setLoading(
              false
            );
          }
        }
      }

      loadSession();

      return () => {
        active =
          false;
      };
    },
    [
      interviewSessionId,
      instructionsKey,
      applyInterview,
      handleUnauthorized,
      navigate,
    ]
  );

  useEffect(
    () => {
      if (
        !videoRef.current
      ) {
        return;
      }

      const stream =
        cameraService
          .getStream();

      if (
        !stream
      ) {
        return;
      }

      cameraService
        .attachToVideo(
          videoRef.current
        )
        .catch(
          () => {
            if (
              mountedRef.current
            ) {
              setError(
                "Unable to display the camera preview."
              );
            }
          }
        );
    },
    [
      secureMode,
      interview,
    ]
  );

  const handleStartOrResume =
    async () => {
      setError("");

      setMessage("");

      setWarningMessage(
        ""
      );

      if (
        !interviewSessionId
      ) {
        setError(
          "AI Interview session is unavailable."
        );

        return;
      }

      if (
        !instructionsKey ||
        sessionStorage
          .getItem(
            instructionsKey
          ) !==
          "accepted"
      ) {
        navigate(
          `/student/ai-interview/${interviewSessionId}/instructions`,
          {
            replace:
              true,
          }
        );

        return;
      }

      try {
        setStarting(
          true
        );

        if (
          !document
            .fullscreenElement
        ) {
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
        }

        await cameraService
          .startCamera();

        if (
          !cameraService
            .isCameraActive() ||
          !cameraService
            .isMicrophoneActive()
        ) {
          throw new Error(
            "Camera and microphone must remain active."
          );
        }

        if (
          videoRef.current
        ) {
          await cameraService
            .attachToVideo(
              videoRef.current
            );
        }

        await faceDetectionService
          .initialize();

        await objectDetectionService
          .initialize();

        resetFaceEpisodes();

        resetObjectEpisodes();

        setFaceBoxes([]);

        setPhoneDetections(
          []
        );

        setPersonDetections(
          []
        );

        interviewSpeechService
          .close();

        recognitionQuestionRef.current =
          null;

        spokenQuestionRef.current =
          null;

        setSpeaking(
          false
        );

        setListening(
          false
        );

        setInterimTranscript(
          ""
        );

        setFaceStatus({
          state:
            "pending",

          text:
            "Face monitoring is starting...",
        });

        setObjectStatus({
          state:
            "pending",

          text:
            "Phone and person monitoring is starting...",
        });

        setSpeechMessage(
          "Voice interview ready. The AI will read each question aloud."
        );

        setSpeechSupported(
          interviewSpeechService
            .isRecognitionSupported() &&
            interviewSpeechService
              .isSpeechSupported()
        );

        const data =
          await aiInterviewService
            .startInterview(
              interviewSessionId
            );

        applyInterview(
          data
        );

        timeoutHandledRef.current =
          false;

        secureActiveRef.current =
          true;

        setSecureMode(
          true
        );

        setFullscreenLost(
          false
        );

        setCurrentIndex(
          0
        );

        setMessage(
          eligibility
            ?.interviewStatus ===
            "IN_PROGRESS"
            ? "Secure AI Interview resumed successfully."
            : "Secure AI Interview started successfully."
        );
      } catch (
        err
      ) {
        secureActiveRef.current =
          false;

        setSecureMode(
          false
        );

        cameraService
          .stopCamera();

        faceDetectionService
          .close();

        objectDetectionService
          .close();

        interviewSpeechService
          .close();

        setFaceBoxes([]);

        setPhoneDetections(
          []
        );

        setPersonDetections(
          []
        );

        setSpeaking(
          false
        );

        setListening(
          false
        );

        setInterimTranscript(
          ""
        );

        if (
          document
            .fullscreenElement &&
          document
            .exitFullscreen
        ) {
          document
            .exitFullscreen()
            .catch(
              () => {}
            );
        }

        if (
          !handleUnauthorized(
            err
          )
        ) {
          setError(
            err?.message ||
              "Unable to start the secure AI Interview."
          );
        }
      } finally {
        if (
          mountedRef.current
        ) {
          setStarting(
            false
          );
        }
      }
    };

  const reportViolation =
    useCallback(
      async (
        type,
        description
      ) => {
        if (
          !secureActiveRef
            .current ||
          submitRunningRef
            .current ||
          violationRunningRef
            .current
        ) {
          return null;
        }

        const now =
          Date.now();

        const previous =
          lastViolationRef
            .current[
            type
          ] || 0;

        if (
          now -
            previous <
          1000
        ) {
          return null;
        }

        lastViolationRef
          .current[
          type
        ] = now;

        violationRunningRef.current =
          true;

        try {
          const response =
            await aiInterviewService
              .reportViolation(
                interviewSessionId,
                type,
                description
              );

          setWarningCount(
            Number(
              response
                ?.warningNumber ||
                0
            )
          );

          setWarningMessage(
            response?.message ||
              "Proctoring violation recorded."
          );

          if (
            response
              ?.autoSubmitted ===
              true ||
            response
              ?.interviewStatus ===
              "AUTO_SUBMITTED"
          ) {
            await goToResult();
          }

          return response;
        } catch (
          err
        ) {
          if (
            handleUnauthorized(
              err
            )
          ) {
            return null;
          }

          if (
            err?.status ===
            409
          ) {
            try {
              await aiInterviewService
                .getResult(
                  interviewSessionId
                );

              await goToResult();

              return null;
            } catch {
            }
          }

          setError(
            err?.message ||
              "Unable to record the proctoring violation."
          );

          return null;
        } finally {
          violationRunningRef.current =
            false;
        }
      },
      [
        interviewSessionId,
        goToResult,
        handleUnauthorized,
      ]
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
            .current[
            type
          ];

        if (
          !active
        ) {
          faceEpisodesRef
            .current[
            type
          ] = {
            since: null,
            reported:
              false,
          };

          return;
        }

        const now =
          performance
            .now();

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
          now -
            episode.since >=
            FACE_VIOLATION_DURATIONS[
              type
            ]
        ) {
          episode.reported =
            true;

          reportViolation(
            type,
            description
          );
        }
      },
      [
        reportViolation,
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
            .current[
            type
          ];

        const now =
          performance
            .now();

        if (
          active
        ) {
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
            reportViolation(
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

                if (
                  response
                ) {
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
      [
        reportViolation,
      ]
    );

  useEffect(
    () => {
      if (
        !secureMode ||
        !interview
      ) {
        return undefined;
      }

      const analyzeFace =
        async () => {
          if (
            faceAnalysisRunningRef
              .current ||
            !videoRef.current ||
            !secureActiveRef
              .current
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
              !mountedRef.current ||
              !analysis?.ready
            ) {
              return;
            }

            detectedFaceCountRef.current =
              Number(
                analysis
                  .faceCount ||
                  0
              );

            setFaceBoxes(
              Array.isArray(
                analysis
                  .faceBoxes
              )
                ? analysis
                    .faceBoxes
                : []
            );

            if (
              analysis
                .noFace
            ) {
              setFaceStatus({
                state:
                  "denied",

                text:
                  "No face detected. Return to the camera view.",
              });

              processFaceEpisode(
                "NO_FACE",
                true,
                "No face was continuously visible during the AI Interview for at least 4 seconds."
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
              analysis
                .multipleFaces
            ) {
              setFaceStatus({
                state:
                  "denied",

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
                `Multiple faces (${analysis.faceCount}) were continuously visible during the AI Interview for at least 2.5 seconds.`
              );

              processFaceEpisode(
                "LOOKING_AWAY",
                false,
                ""
              );

              return;
            }

            if (
              analysis
                .lookingAway
            ) {
              setFaceStatus({
                state:
                  "pending",

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
                `The student continuously looked ${analysis.direction?.toLowerCase() || "away"} during the AI Interview for at least 4 seconds.`
              );

              return;
            }

            setFaceStatus({
              state:
                "granted",

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
          } catch (
            err
          ) {
            console.error(
              "AI Interview face analysis failed:",
              err
            );

            detectedFaceCountRef.current =
              0;

            setFaceBoxes(
              []
            );

            setFaceStatus({
              state:
                "denied",

              text:
                "AI face detection stopped unexpectedly.",
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

      return () =>
        window.clearInterval(
          timer
        );
    },
    [
      secureMode,
      interview,
      processFaceEpisode,
    ]
  );

  useEffect(
    () => {
      if (
        !secureMode ||
        !interview
      ) {
        return undefined;
      }

      const analyzeObjects =
        async () => {
          if (
            objectAnalysisRunningRef
              .current ||
            !videoRef.current ||
            !secureActiveRef
              .current
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
              !mountedRef.current ||
              !analysis?.ready
            ) {
              return;
            }

            const phones =
              Array.isArray(
                analysis
                  .phones
              )
                ? analysis
                    .phones
                : [];

            const persons =
              Array.isArray(
                analysis
                  .persons
              )
                ? analysis
                    .persons
                : [];

            setPhoneDetections(
              phones
            );

            setPersonDetections(
              persons
            );

            const phoneDetected =
              phones.length >
              0;

            const secondPersonDetected =
              persons.length >=
                2 &&
              detectedFaceCountRef.current <
                2;

            if (
              phoneDetected
            ) {
              const confidence =
                Math.max(
                  ...phones.map(
                    (
                      detection
                    ) =>
                      Number(
                        detection
                          .score ||
                          0
                      )
                  )
                );

              setObjectStatus({
                state:
                  "denied",

                text:
                  `Mobile phone detected (${Math.round(confidence * 100)}% confidence).`,
              });
            } else if (
              secondPersonDetected
            ) {
              setObjectStatus({
                state:
                  "denied",

                text:
                  "Another person's body or partial body was detected near the student.",
              });
            } else {
              setObjectStatus({
                state:
                  "granted",

                text:
                  "No prohibited mobile phone or second person detected.",
              });
            }

            processObjectEpisode(
              "PHONE_DETECTED",
              phoneDetected,
              "A mobile phone was detected in the AI Interview camera frame."
            );

            processObjectEpisode(
              "SECOND_PERSON_DETECTED",
              secondPersonDetected,
              "Another person's body or partial body was detected near the student during the AI Interview."
            );
          } catch (
            err
          ) {
            console.error(
              "AI Interview object detection failed:",
              err
            );

            setPhoneDetections(
              []
            );

            setPersonDetections(
              []
            );

            setObjectStatus({
              state:
                "denied",

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

      return () =>
        window.clearInterval(
          timer
        );
    },
    [
      secureMode,
      interview,
      processObjectEpisode,
    ]
  );

  const stopVoiceCapture =
    useCallback(
      () => {
        interviewSpeechService
          .stopListening();

        recognitionQuestionRef.current =
          null;

        setListening(
          false
        );

        setInterimTranscript(
          ""
        );

        setSpeechMessage(
          "Voice answer recording stopped."
        );
      },
      []
    );

  const speakCurrentQuestion =
    useCallback(
      async () => {
        if (
          !secureMode ||
          !currentQuestion ||
          submitting
        ) {
          return;
        }

        if (
          !interviewSpeechService
            .isSpeechSupported()
        ) {
          setSpeechSupported(
            false
          );

          setError(
            "Question voice playback is not supported by this browser. Use the latest Chrome or Edge."
          );

          return;
        }

        interviewSpeechService
          .cancelListening();

        recognitionQuestionRef.current =
          null;

        setListening(
          false
        );

        setInterimTranscript(
          ""
        );

        setError("");

        setSpeaking(
          true
        );

        setSpeechMessage(
          "AI interviewer is asking the question..."
        );

        try {
          await interviewSpeechService
            .speak(
              `Question ${currentIndex + 1}. ${currentQuestion.questionText}`,
              {
                lang:
                  "en-IN",

                rate:
                  0.92,

                pitch:
                  1,

                volume:
                  1,
              }
            );

          if (
            mountedRef.current
          ) {
            setSpeechMessage(
              "Question finished. Click Start Answer and speak your response."
            );
          }
        } catch (
          err
        ) {
          if (
            mountedRef.current &&
            !String(
              err?.message ||
                ""
            )
              .toLowerCase()
              .includes(
                "cancel"
              )
          ) {
            setError(
              err?.message ||
                "Unable to play the interview question."
            );
          }
        } finally {
          if (
            mountedRef.current
          ) {
            setSpeaking(
              false
            );
          }
        }
      },
      [
        secureMode,
        currentQuestion,
        currentIndex,
        submitting,
      ]
    );

  const handleStartAnswer =
    useCallback(
      () => {
        if (
          !currentQuestion ||
          saving ||
          submitting ||
          fullscreenLost
        ) {
          return;
        }

        if (
          !interviewSpeechService
            .isRecognitionSupported()
        ) {
          setSpeechSupported(
            false
          );

          setError(
            "Speech recognition is not supported by this browser. Use the latest Chrome or Edge."
          );

          return;
        }

        interviewSpeechService
          .stopSpeaking();

        setSpeaking(
          false
        );

        setError("");

        setMessage("");

        setInterimTranscript(
          ""
        );

        const questionId =
          currentQuestion
            .questionId;

        recognitionQuestionRef.current =
          questionId;

        try {
          interviewSpeechService
            .startListening({
              lang:
                "en-IN",

              onInterim:
                (
                  transcript
                ) => {
                  if (
                    mountedRef.current &&
                    recognitionQuestionRef.current ===
                      questionId
                  ) {
                    setInterimTranscript(
                      transcript
                    );
                  }
                },

              onFinal:
                (
                  transcript
                ) => {
                  if (
                    !mountedRef.current ||
                    recognitionQuestionRef.current !==
                      questionId
                  ) {
                    return;
                  }

                  const clean =
                    String(
                      transcript ||
                        ""
                    ).trim();

                  if (
                    !clean
                  ) {
                    return;
                  }

                  setAnswers(
                    (
                      current
                    ) => {
                      const existing =
                        String(
                          current[
                            questionId
                          ] || ""
                        ).trim();

                      const combined =
                        existing
                          ? `${existing} ${clean}`
                          : clean;

                      return {
                        ...current,

                        [questionId]:
                          combined.slice(
                            0,
                            20000
                          ),
                      };
                    }
                  );

                  setInterimTranscript(
                    ""
                  );
                },

              onError:
                (
                  speechError
                ) => {
                  if (
                    !mountedRef.current
                  ) {
                    return;
                  }

                  setListening(
                    false
                  );

                  recognitionQuestionRef.current =
                    null;

                  setInterimTranscript(
                    ""
                  );

                  if (
                    speechError ===
                      "no-speech" ||
                    speechError ===
                      "aborted"
                  ) {
                    setSpeechMessage(
                      "Voice recording stopped. Click Start Answer to continue speaking."
                    );

                    return;
                  }

                  setError(
                    `Microphone speech recognition error: ${speechError}.`
                  );
                },

              onEnd:
                () => {
                  if (
                    !mountedRef.current
                  ) {
                    return;
                  }

                  setListening(
                    false
                  );

                  recognitionQuestionRef.current =
                    null;

                  setInterimTranscript(
                    ""
                  );

                  setSpeechMessage(
                    "Voice recording stopped. Review the transcript, then save your answer."
                  );
                },
            });

          setListening(
            true
          );

          setSpeechMessage(
            "Listening... Speak your answer clearly."
          );
        } catch (
          err
        ) {
          recognitionQuestionRef.current =
            null;

          setListening(
            false
          );

          setInterimTranscript(
            ""
          );

          setError(
            err?.message ||
              "Unable to start speech recognition."
          );
        }
      },
      [
        currentQuestion,
        saving,
        submitting,
        fullscreenLost,
      ]
    );

  const handleStopAnswer =
    useCallback(
      () => {
        stopVoiceCapture();
      },
      [
        stopVoiceCapture,
      ]
    );

  const handleClearAnswer =
    useCallback(
      () => {
        if (
          !currentQuestion ||
          listening ||
          saving ||
          submitting
        ) {
          return;
        }

        setAnswers(
          (
            current
          ) => ({
            ...current,

            [currentQuestion
              .questionId]:
              "",
          })
        );

        setInterimTranscript(
          ""
        );

        setMessage("");

        setSpeechMessage(
          "Transcript cleared. Click Start Answer to record again."
        );
      },
      [
        currentQuestion,
        listening,
        saving,
        submitting,
      ]
    );

  useEffect(
    () => {
      if (
        !secureMode ||
        !currentQuestion
      ) {
        return undefined;
      }

      const questionKey =
        `${currentQuestion.questionId}:${currentIndex}`;

      if (
        spokenQuestionRef.current ===
        questionKey
      ) {
        return undefined;
      }

      spokenQuestionRef.current =
        questionKey;

      const timer =
        window.setTimeout(
          () => {
            speakCurrentQuestion();
          },
          500
        );

      return () =>
        window.clearTimeout(
          timer
        );
    },
    [
      secureMode,
      currentQuestion,
      currentIndex,
      speakCurrentQuestion,
    ]
  );

  useEffect(
    () => {
      if (
        !secureMode
      ) {
        return undefined;
      }

      const visibilityHandler =
        () => {
          if (
            document.hidden
          ) {
            reportViolation(
              "TAB_SWITCH",
              "Student switched away from the AI Interview tab."
            );
          }
        };

      const fullscreenHandler =
        () => {
          if (
            !secureActiveRef
              .current
          ) {
            return;
          }

          if (
            document
              .fullscreenElement
          ) {
            setFullscreenLost(
              false
            );

            return;
          }

          setFullscreenLost(
            true
          );

          reportViolation(
            "FULLSCREEN_EXIT",
            "Student exited fullscreen mode during the AI Interview."
          );
        };

      const restrictedHandler =
        (
          event
        ) => {
          event.preventDefault();

          reportViolation(
            "COPY_PASTE_ATTEMPT",
            `Restricted ${event.type} action was attempted during the AI Interview.`
          );
        };

      const keyboardHandler =
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

          if (
            restricted
          ) {
            event.preventDefault();

            reportViolation(
              "COPY_PASTE_ATTEMPT",
              "Restricted clipboard keyboard shortcut was attempted during the AI Interview."
            );
          }
        };

      document
        .addEventListener(
          "visibilitychange",
          visibilityHandler
        );

      document
        .addEventListener(
          "fullscreenchange",
          fullscreenHandler
        );

      document
        .addEventListener(
          "webkitfullscreenchange",
          fullscreenHandler
        );

      document
        .addEventListener(
          "copy",
          restrictedHandler
        );

      document
        .addEventListener(
          "paste",
          restrictedHandler
        );

      document
        .addEventListener(
          "cut",
          restrictedHandler
        );

      document
        .addEventListener(
          "contextmenu",
          restrictedHandler
        );

      document
        .addEventListener(
          "keydown",
          keyboardHandler
        );

      return () => {
        document
          .removeEventListener(
            "visibilitychange",
            visibilityHandler
          );

        document
          .removeEventListener(
            "fullscreenchange",
            fullscreenHandler
          );

        document
          .removeEventListener(
            "webkitfullscreenchange",
            fullscreenHandler
          );

        document
          .removeEventListener(
            "copy",
            restrictedHandler
          );

        document
          .removeEventListener(
            "paste",
            restrictedHandler
          );

        document
          .removeEventListener(
            "cut",
            restrictedHandler
          );

        document
          .removeEventListener(
            "contextmenu",
            restrictedHandler
          );

        document
          .removeEventListener(
            "keydown",
            keyboardHandler
          );
      };
    },
    [
      secureMode,
      reportViolation,
    ]
  );

  useEffect(
    () => {
      if (
        !secureMode
      ) {
        return undefined;
      }

      const healthCheck =
        window.setInterval(
          () => {
            if (
              secureActiveRef
                .current &&
              (
                !cameraService
                  .isCameraActive() ||
                !cameraService
                  .isMicrophoneActive()
              )
            ) {
              reportViolation(
                "CAMERA_OFF",
                "Camera or microphone became inactive during the AI Interview."
              );
            }
          },
          3000
        );

      return () =>
        window.clearInterval(
          healthCheck
        );
    },
    [
      secureMode,
      reportViolation,
    ]
  );

  const finishInterview =
    useCallback(
      async () => {
        if (
          !interviewSessionId ||
          submitRunningRef
            .current
        ) {
          return;
        }

        submitRunningRef.current =
          true;

        setSubmitting(
          true
        );

        setError("");

        try {
          secureActiveRef.current =
            false;

          interviewSpeechService
            .close();

          recognitionQuestionRef.current =
            null;

          setSpeaking(
            false
          );

          setListening(
            false
          );

          setInterimTranscript(
            ""
          );

          await aiInterviewService
            .submitInterview(
              interviewSessionId
            );

          await goToResult();
        } catch (
          err
        ) {
          secureActiveRef.current =
            true;

          timeoutHandledRef.current =
            false;

          if (
            !handleUnauthorized(
              err
            )
          ) {
            setError(
              err?.message ||
                "Unable to submit the AI Interview."
            );
          }
        } finally {
          submitRunningRef.current =
            false;

          if (
            mountedRef.current
          ) {
            setSubmitting(
              false
            );
          }
        }
      },
      [
        interviewSessionId,
        goToResult,
        handleUnauthorized,
      ]
    );

  useEffect(
    () => {
      if (
        !secureMode ||
        !interview
          ?.expiresAt
      ) {
        return undefined;
      }

      const updateTimer =
        () => {
          const seconds =
            getRemainingSeconds(
              interview
                .expiresAt,
              serverOffsetRef
                .current
            );

          setRemainingSeconds(
            seconds
          );

          if (
            seconds ===
              0 &&
            !timeoutHandledRef
              .current
          ) {
            timeoutHandledRef.current =
              true;

            finishInterview();
          }
        };

      updateTimer();

      const timer =
        window.setInterval(
          updateTimer,
          1000
        );

      return () =>
        window.clearInterval(
          timer
        );
    },
    [
      secureMode,
      interview?.expiresAt,
      finishInterview,
    ]
  );

  useEffect(
    () => {
      if (
        !secureMode
      ) {
        return undefined;
      }

      const beforeUnload =
        (
          event
        ) => {
          event.preventDefault();

          event.returnValue =
            "";
        };

      window
        .addEventListener(
          "beforeunload",
          beforeUnload
        );

      return () =>
        window
          .removeEventListener(
            "beforeunload",
            beforeUnload
          );
    },
    [
      secureMode,
    ]
  );

  const handleRestoreFullscreen =
    async () => {
      try {
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

        setFullscreenLost(
          false
        );
      } catch (
        err
      ) {
        setError(
          err?.message ||
            "Unable to restore fullscreen mode."
        );
      }
    };

  const saveCurrentAnswer =
    async () => {
      if (
        !currentQuestion
      ) {
        return true;
      }

      const questionId =
        currentQuestion
          .questionId;

      const answer =
        answers[
          questionId
        ]?.trim() ||
        "";

      const alreadySaved =
        savedAnswers[
          questionId
        ]?.trim() ||
        "";

      if (
        !answer
      ) {
        setError(
          "Speak your answer before saving this question."
        );

        return false;
      }

      if (
        answer ===
        alreadySaved
      ) {
        return true;
      }

      try {
        setSaving(
          true
        );

        setError("");

        const response =
          await aiInterviewService
            .saveAnswer(
              interviewSessionId,
              questionId,
              answer
            );

        const savedText =
          response
            ?.answerText ||
          answer;

        setAnswers(
          (
            current
          ) => ({
            ...current,

            [questionId]:
              savedText,
          })
        );

        setSavedAnswers(
          (
            current
          ) => ({
            ...current,

            [questionId]:
              savedText,
          })
        );

        setMessage(
          `Question ${currentIndex + 1} saved.`
        );

        return true;
      } catch (
        err
      ) {
        if (
          !handleUnauthorized(
            err
          )
        ) {
          setError(
            err?.message ||
              "Unable to save the interview answer."
          );
        }

        return false;
      } finally {
        setSaving(
          false
        );
      }
    };

  const moveToQuestion =
    async (
      nextIndex
    ) => {
      if (
        nextIndex ===
          currentIndex ||
        nextIndex < 0 ||
        nextIndex >=
          questions.length ||
        saving ||
        submitting ||
        fullscreenLost ||
        listening ||
        speaking
      ) {
        return;
      }

      const currentText =
        currentQuestion
          ? answers[
              currentQuestion
                .questionId
            ]?.trim() ||
            ""
          : "";

      const savedText =
        currentQuestion
          ? savedAnswers[
              currentQuestion
                .questionId
            ]?.trim() ||
            ""
          : "";

      if (
        currentText !==
        savedText
      ) {
        const saved =
          await saveCurrentAnswer();

        if (
          !saved
        ) {
          return;
        }
      }

      setError("");

      setMessage("");

      interviewSpeechService
        .stopSpeaking();

      setSpeaking(
        false
      );

      spokenQuestionRef.current =
        null;

      setCurrentIndex(
        nextIndex
      );
    };

  const handleSaveAndNext =
    async () => {
      if (
        fullscreenLost ||
        listening ||
        speaking
      ) {
        return;
      }

      const saved =
        await saveCurrentAnswer();

      if (
        saved &&
        currentIndex <
          questions.length -
            1
      ) {
        interviewSpeechService
          .stopSpeaking();

        setSpeaking(
          false
        );

        spokenQuestionRef.current =
          null;

        setCurrentIndex(
          (
            index
          ) =>
            index + 1
        );
      }
    };

  const handleManualSubmit =
    async () => {
      if (
        fullscreenLost ||
        listening ||
        speaking
      ) {
        return;
      }

      const currentText =
        currentQuestion
          ? answers[
              currentQuestion
                .questionId
            ]?.trim() ||
            ""
          : "";

      const savedText =
        currentQuestion
          ? savedAnswers[
              currentQuestion
                .questionId
            ]?.trim() ||
            ""
          : "";

      if (
        currentText !==
        savedText
      ) {
        const saved =
          await saveCurrentAnswer();

        if (
          !saved
        ) {
          return;
        }
      }

      const latestAnsweredCount =
        questions.filter(
          (
            question
          ) =>
            Boolean(
              (
                question
                  .questionId ===
                currentQuestion
                  ?.questionId
                  ? answers[
                      question
                        .questionId
                    ]
                  : savedAnswers[
                      question
                        .questionId
                    ]
              )?.trim()
            )
        ).length;

      const unanswered =
        questions.length -
        latestAnsweredCount;

      const confirmed =
        window.confirm(
          unanswered > 0
            ? `You still have ${unanswered} unanswered question(s). Submit anyway?`
            : "Submit your AI Interview now?"
        );

      if (
        confirmed
      ) {
        await finishInterview();
      }
    };

  const getOverlayStyle =
    (
      box
    ) => {
      const video =
        videoRef.current;

      if (
        !video ||
        !box ||
        video.videoWidth <=
          0 ||
        video.videoHeight <=
          0 ||
        video.clientWidth <=
          0 ||
        video.clientHeight <=
          0
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
        sourceWidth *
        scale;

      const renderedHeight =
        sourceHeight *
        scale;

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

      let mirrored =
        false;

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
          mirrored =
            new DOMMatrixReadOnly(
              transform
            ).a < 0;
        }
      } catch {
        mirrored =
          false;
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
          left +
            width
        );

      const visibleBottom =
        Math.min(
          containerHeight,
          top +
            height
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
        visibleWidth <=
          0 ||
        visibleHeight <=
          0
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

        zIndex:
          6,

        pointerEvents:
          "none",

        boxSizing:
          "border-box",
      };
    };

  const renderFaceBoxes =
    () => {
      if (
        !secureMode ||
        faceBoxes.length ===
          0
      ) {
        return null;
      }

      const multiple =
        faceBoxes.length >
        1;

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

          if (
            !style
          ) {
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

                  top:
                    "5px",

                  left:
                    "5px",

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
                    900,

                  whiteSpace:
                    "nowrap",
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
      if (
        !secureMode
      ) {
        return null;
      }

      const phoneBoxes =
        phoneDetections
          .map(
            (
              detection,
              index
            ) => {
              const style =
                getOverlayStyle(
                  detection
                    .box
                );

              if (
                !style
              ) {
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

                      top:
                        "4px",

                      left:
                        "4px",

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
                        900,

                      whiteSpace:
                        "nowrap",
                    }}
                  >
                    MOBILE PHONE{" "}
                    {Math.round(
                      detection
                        .score *
                        100
                    )}
                    %
                  </span>
                </div>
              );
            }
          );

      const sortedPersons =
        [
          ...personDetections,
        ].sort(
          (
            first,
            second
          ) =>
            (
              second
                .box
                .width *
              second
                .box
                .height
            ) -
            (
              first
                .box
                .width *
              first
                .box
                .height
            )
        );

      const extraPersonBoxes =
        sortedPersons.length >=
          2
          ? sortedPersons
              .slice(
                1
              )
              .map(
                (
                  detection,
                  index
                ) => {
                  const style =
                    getOverlayStyle(
                      detection
                        .box
                    );

                  if (
                    !style
                  ) {
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

                          top:
                            "4px",

                          left:
                            "4px",

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
                            900,

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

  const renderVoiceStatus =
    () => {
      const state =
        !speechSupported
          ? "denied"
          : listening
            ? "granted"
            : speaking
              ? "pending"
              : "granted";

      return (
        <div
          className={
            `proctoring-status ${state}`
          }
        >
          <span>
            {!speechSupported
              ? "!"
              : listening
                ? "🎤"
                : speaking
                  ? "🔊"
                  : "✓"}
          </span>

          <p>
            {speechMessage}
          </p>
        </div>
      );
    };

  const textareaStyle =
    {
      width:
        "100%",

      minHeight:
        "190px",

      marginTop:
        "18px",

      padding:
        "15px",

      border:
        "1px solid rgba(96, 165, 250, 0.22)",

      borderRadius:
        "11px",

      background:
        "rgba(6, 20, 38, 0.48)",

      color:
        "#ffffff",

      fontFamily:
        "inherit",

      fontSize:
        "13px",

      lineHeight:
        "1.65",

      resize:
        "vertical",

      outline:
        "none",
    };

  if (
    loading
  ) {
    return (
      <main
        className="proctoring-page"
      >
        <div
          className="proctoring-container"
        >
          <div
            className="proctoring-information"
          >
            Loading your AI Interview session...
          </div>
        </div>
      </main>
    );
  }

  if (
    !interviewSessionId ||
    (
      error &&
      !eligibility
    )
  ) {
    return (
      <main
        className="proctoring-page"
      >
        <div
          className="proctoring-container"
        >
          <section
            className="proctoring-card"
          >
            <div
              className="proctoring-error"
            >
              {error ||
                "AI Interview session is unavailable."}
            </div>

            <button
              type="button"
              className="proctoring-secondary-button"
              onClick={
                () =>
                  navigate(
                    "/student/ai-interview"
                  )
              }
            >
              Return to AI Interview
            </button>
          </section>
        </div>
      </main>
    );
  }

  if (
    !secureMode
  ) {
    const resuming =
      eligibility
        ?.interviewStatus ===
        "IN_PROGRESS" ||
      interview
        ?.status ===
        "IN_PROGRESS";

    return (
      <main
        className="proctoring-page"
      >
        <div
          className="proctoring-container"
        >
          <section
            className="proctoring-card"
            style={{
              maxWidth:
                "720px",

              margin:
                "40px auto",
            }}
          >
            <div
              className="proctoring-card-header"
            >
              <span>
                INSTRUCTIONS ACCEPTED
              </span>

              <h2>
                {resuming
                  ? "Resume Secure AI Interview"
                  : "Start Secure AI Interview"}
              </h2>

              <p>
                Your instructions and device check are complete.
                Click below to enter fullscreen and activate live
                proctoring.
              </p>
            </div>

            {error && (
              <div
                className="proctoring-error"
              >
                {error}
              </div>
            )}

            <div
              className="proctoring-camera"
            >
              <video
                ref={
                  videoRef
                }
                autoPlay
                muted
                playsInline
              />

              <div
                className="proctoring-camera-placeholder"
              >
                <strong>
                  Secure Monitoring
                </strong>

                <p>
                  Camera preview starts when the interview begins.
                </p>
              </div>
            </div>

            <div
              className="proctoring-information"
            >
              Starting the interview activates fullscreen,
              camera, microphone, face detection,
              mobile-phone detection and second-person
              detection. Student speech is allowed because
              this is a voice interview.
            </div>

            <div
              className="proctoring-actions"
            >
              <button
                type="button"
                className="proctoring-secondary-button"
                onClick={
                  () =>
                    navigate(
                      `/student/ai-interview/${interviewSessionId}/instructions`
                    )
                }
                disabled={
                  starting
                }
              >
                Back to Instructions
              </button>

              <button
                type="button"
                className="proctoring-primary-button"
                onClick={
                  handleStartOrResume
                }
                disabled={
                  starting
                }
              >
                {starting
                  ? resuming
                    ? "Resuming Secure Interview..."
                    : "Starting Secure Interview..."
                  : resuming
                    ? "Enter Fullscreen & Resume"
                    : "Enter Fullscreen & Start"}
              </button>
            </div>
          </section>
        </div>
      </main>
    );
  }

  return (
    <main
      className="proctoring-page"
    >
      <div
        className="proctoring-container"
      >
        <header
          className="proctoring-test-header"
        >
          <div>
            <h1>
              Personalized AI Interview
            </h1>

            <p>
              Question{" "}
              {currentIndex + 1}
              /
              {questions.length}

              {" • "}

              Saved{" "}
              {answeredCount}
              /
              {questions.length}
            </p>
          </div>

          <div
            className="proctoring-timer"
          >
            {formatTime(
              remainingSeconds
            )}
          </div>
        </header>

        {message && (
          <div
            className="proctoring-information"
          >
            {message}
          </div>
        )}

        {warningMessage && (
          <div
            className="proctoring-error"
          >
            {warningMessage}
          </div>
        )}

        {error && (
          <div
            className="proctoring-error"
            role="alert"
          >
            {error}
          </div>
        )}

        <div
          className="proctoring-test-layout"
        >
          <section>
            {currentQuestion ? (
              <article
                className="proctoring-question-card"
              >
                <div
                  className="proctoring-question-meta"
                >
                  <span>
                    {formatType(
                      currentQuestion
                        .questionType
                    )}
                  </span>

                  <span>
                    Question{" "}
                    {currentQuestion
                      .interviewOrder ||
                      currentIndex +
                        1}
                  </span>
                </div>

                <h2>
                  {currentQuestion
                    .questionText}
                </h2>

                {currentQuestion
                  .technicalSkill && (
                  <div
                    className="proctoring-information"
                    style={{
                      marginTop:
                        "16px",

                      marginBottom:
                        0,
                    }}
                  >
                    Verified Skill:{" "}
                    {currentQuestion
                      .technicalSkill}
                  </div>
                )}

                <div
                  className="proctoring-information"
                  style={{
                    marginTop:
                      "16px",

                    marginBottom:
                      "12px",
                  }}
                >
                  AI interviewer speaks each question aloud.
                  Click Start Answer, speak clearly, then stop
                  recording and review the transcript before saving.
                </div>

                <div
                  className="proctoring-question-actions"
                  style={{
                    marginTop:
                      "12px",

                    marginBottom:
                      "4px",
                  }}
                >
                  <button
                    type="button"
                    className="proctoring-secondary-button"
                    onClick={
                      speakCurrentQuestion
                    }
                    disabled={
                      speaking ||
                      listening ||
                      saving ||
                      submitting ||
                      fullscreenLost ||
                      !speechSupported
                    }
                  >
                    {speaking
                      ? "AI Speaking..."
                      : "🔊 Replay Question"}
                  </button>

                  {!listening ? (
                    <button
                      type="button"
                      className="proctoring-primary-button"
                      onClick={
                        handleStartAnswer
                      }
                      disabled={
                        speaking ||
                        saving ||
                        submitting ||
                        fullscreenLost ||
                        !speechSupported
                      }
                    >
                      🎤 Start Answer
                    </button>
                  ) : (
                    <button
                      type="button"
                      className="proctoring-primary-button"
                      onClick={
                        handleStopAnswer
                      }
                      disabled={
                        saving ||
                        submitting
                      }
                    >
                      ■ Stop Answer
                    </button>
                  )}

                  <button
                    type="button"
                    className="proctoring-secondary-button"
                    onClick={
                      handleClearAnswer
                    }
                    disabled={
                      listening ||
                      speaking ||
                      saving ||
                      submitting ||
                      fullscreenLost ||
                      !(
                        answers[
                          currentQuestion
                            .questionId
                        ] ||
                        ""
                      ).trim()
                    }
                  >
                    Clear Transcript
                  </button>
                </div>

                {interimTranscript && (
                  <div
                    className="proctoring-information"
                    style={{
                      marginTop:
                        "10px",

                      marginBottom:
                        0,
                    }}
                  >
                    Listening:{" "}
                    {interimTranscript}
                  </div>
                )}

                <textarea
                  value={
                    answers[
                      currentQuestion
                        .questionId
                    ] ||
                    ""
                  }
                  readOnly
                  maxLength={
                    20000
                  }
                  placeholder="Your spoken answer transcript will appear here..."
                  style={
                    textareaStyle
                  }
                />

                <div
                  className="proctoring-question-actions"
                >
                  <button
                    type="button"
                    className="proctoring-secondary-button"
                    onClick={
                      () =>
                        moveToQuestion(
                          currentIndex -
                            1
                        )
                    }
                    disabled={
                      currentIndex ===
                        0 ||
                      saving ||
                      submitting ||
                      fullscreenLost ||
                      listening ||
                      speaking
                    }
                  >
                    Previous
                  </button>

                  <button
                    type="button"
                    className="proctoring-primary-button"
                    onClick={
                      handleSaveAndNext
                    }
                    disabled={
                      saving ||
                      submitting ||
                      fullscreenLost ||
                      listening ||
                      speaking ||
                      !(
                        answers[
                          currentQuestion
                            .questionId
                        ] ||
                        ""
                      ).trim()
                    }
                  >
                    {saving
                      ? "Saving..."
                      : currentIndex ===
                          questions.length -
                            1
                        ? "Save Answer"
                        : "Save & Next"}
                  </button>
                </div>
              </article>
            ) : (
              <div
                className="proctoring-error"
              >
                No interview questions are available.
              </div>
            )}
          </section>

          <aside
            className="proctoring-side-panel"
          >
            <div
              className="proctoring-card"
            >
              <div
                className="proctoring-card-header"
              >
                <h2>
                  Live Proctoring
                </h2>

                <p>
                  Face, phone, person and browser monitoring
                  are active. The microphone is used for your
                  spoken interview answers.
                </p>
              </div>

              <div
                className="proctoring-camera"
              >
                <video
                  ref={
                    videoRef
                  }
                  autoPlay
                  muted
                  playsInline
                />

                {renderFaceBoxes()}

                {renderObjectBoxes()}

                <div
                  className="proctoring-camera-label"
                >
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

              {renderVoiceStatus()}
            </div>

            <div
              className="proctoring-warning-count"
            >
              <strong>
                {warningCount} / 3
              </strong>

              <span>
                PROCTORING WARNINGS
              </span>
            </div>

            <div
              className="proctoring-card"
            >
              <div
                className="proctoring-card-header"
              >
                <h2>
                  Questions
                </h2>

                <p>
                  Select a question.
                  Unsaved spoken transcript is saved first.
                </p>
              </div>

              <div
                style={{
                  display:
                    "grid",

                  gridTemplateColumns:
                    "repeat(5, 1fr)",

                  gap:
                    "8px",
                }}
              >
                {questions.map(
                  (
                    question,
                    index
                  ) => (
                    <button
                      key={
                        question
                          .questionId
                      }
                      type="button"
                      className={
                        index ===
                        currentIndex
                          ? "proctoring-primary-button"
                          : "proctoring-secondary-button"
                      }
                      style={{
                        minHeight:
                          "40px",

                        padding:
                          0,

                        opacity:
                          savedAnswers[
                            question
                              .questionId
                          ]?.trim()
                            ? 1
                            : 0.68,
                      }}
                      onClick={
                        () =>
                          moveToQuestion(
                            index
                          )
                      }
                      disabled={
                        saving ||
                        submitting ||
                        fullscreenLost ||
                        listening ||
                        speaking
                      }
                      title={
                        savedAnswers[
                          question
                            .questionId
                        ]?.trim()
                          ? "Saved"
                          : "Not answered"
                      }
                    >
                      {index + 1}
                    </button>
                  )
                )}
              </div>
            </div>

            <button
              type="button"
              className="proctoring-primary-button"
              onClick={
                handleManualSubmit
              }
              disabled={
                submitting ||
                questions.length ===
                  0 ||
                fullscreenLost ||
                listening ||
                speaking
              }
            >
              {submitting
                ? "Submitting & Evaluating..."
                : "Submit AI Interview"}
            </button>
          </aside>
        </div>

        {fullscreenLost && (
          <div
            className="proctoring-overlay"
          >
            <div
              className="proctoring-popup"
            >
              <div
                className="proctoring-popup-icon"
              >
                !
              </div>

              <h2>
                Fullscreen Exited
              </h2>

              <p>
                A fullscreen violation has been recorded.
                Return to fullscreen before continuing.
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
      </div>
    </main>
  );
}

export default StudentAIInterviewAttempt;