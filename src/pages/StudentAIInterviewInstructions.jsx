import {
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
import cameraService from "../services/cameraService";
import faceDetectionService from "../services/faceDetectionService";
import objectDetectionService from "../services/objectDetectionService";

import "../styles/proctoring.css";

function StudentAIInterviewInstructions() {
  const { sessionId } = useParams();

  const navigate = useNavigate();

  const videoRef = useRef(null);

  const mountedRef = useRef(true);

  const requestRunningRef =
    useRef(false);

  const interviewSessionId =
    useMemo(() => {
      const value =
        Number(sessionId);

      return (
        Number.isSafeInteger(
          value
        ) &&
        value > 0
      )
        ? value
        : null;
    }, [sessionId]);

  const [
    eligibility,
    setEligibility,
  ] = useState(null);

  const [
    loading,
    setLoading,
  ] = useState(true);

  const [
    permissionLoading,
    setPermissionLoading,
  ] = useState(false);

  const [
    cameraStatus,
    setCameraStatus,
  ] = useState("pending");

  const [
    cameraMessage,
    setCameraMessage,
  ] = useState(
    "Camera and microphone permission has not been checked."
  );

  const [
    aiStatus,
    setAiStatus,
  ] = useState("pending");

  const [
    aiMessage,
    setAiMessage,
  ] = useState(
    "AI proctoring models have not been checked."
  );

  const [
    acceptedRules,
    setAcceptedRules,
  ] = useState(false);

  const [
    error,
    setError,
  ] = useState("");

  useEffect(() => {
    mountedRef.current =
      true;

    return () => {
      mountedRef.current =
        false;

      cameraService.stopCamera();

      faceDetectionService.close();

      objectDetectionService.close();
    };
  }, []);

  useEffect(() => {
    let active = true;

    async function loadEligibility() {
      if (
        !interviewSessionId
      ) {
        setError(
          "Invalid AI Interview session ID."
        );

        setLoading(false);

        return;
      }

      try {
        const data =
          await aiInterviewService
            .getEligibility();

        if (!active) {
          return;
        }

        if (
          Number(
            data?.interviewSessionId
          ) !==
          interviewSessionId
        ) {
          throw new Error(
            "This AI Interview session is not available for the current student."
          );
        }

        if (
          data?.interviewStatus ===
            "COMPLETED" ||
          data?.interviewStatus ===
            "AUTO_SUBMITTED"
        ) {
          navigate(
            `/student/ai-interview/${interviewSessionId}/result`,
            {
              replace: true,
            }
          );

          return;
        }

        setEligibility(data);
      } catch (err) {
        if (
          err?.status === 401
        ) {
          navigate(
            "/login",
            {
              replace: true,
            }
          );

          return;
        }

        setError(
          err?.message ||
            "Unable to load AI Interview information."
        );
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    }

    loadEligibility();

    return () => {
      active = false;
    };
  }, [
    interviewSessionId,
    navigate,
  ]);

  useEffect(() => {
    const stream =
      cameraService.getStream();

    if (
      !stream ||
      !videoRef.current ||
      cameraStatus !==
        "granted"
    ) {
      return;
    }

    cameraService
      .attachToVideo(
        videoRef.current
      )
      .catch(() => {
        if (
          mountedRef.current
        ) {
          setError(
            "Unable to display the camera preview."
          );
        }
      });
  }, [cameraStatus]);

  const handleDeviceCheck =
    async () => {
      if (
        requestRunningRef.current
      ) {
        return;
      }

      requestRunningRef.current =
        true;

      setPermissionLoading(true);

      setError("");

      setCameraStatus("pending");

      setAiStatus("pending");

      setCameraMessage(
        "Waiting for camera and microphone permission..."
      );

      setAiMessage(
        "Checking AI proctoring models..."
      );

      try {
        const stream =
          await cameraService
            .startCamera();

        if (
          !mountedRef.current
        ) {
          stream
            .getTracks()
            .forEach(
              (track) =>
                track.stop()
            );

          return;
        }

        if (!videoRef.current) {
          throw new Error(
            "Camera preview is unavailable."
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
            "Both camera and microphone must be active."
          );
        }

        setCameraStatus(
          "granted"
        );

        setCameraMessage(
          "Camera and microphone are working correctly."
        );

        await faceDetectionService
          .initialize();

        await objectDetectionService
          .initialize();

        if (
          !faceDetectionService
            .isReady() ||
          !objectDetectionService
            .isReady()
        ) {
          throw new Error(
            "AI proctoring models could not be initialized."
          );
        }

        setAiStatus(
          "granted"
        );

        setAiMessage(
          "Face, mobile-phone and second-person detection are ready."
        );
      } catch (err) {
        cameraService.stopCamera();

        faceDetectionService.close();

        objectDetectionService.close();

        if (
          !mountedRef.current
        ) {
          return;
        }

        setCameraStatus(
          "denied"
        );

        setAiStatus(
          "denied"
        );

        setCameraMessage(
          "Device check failed."
        );

        setAiMessage(
          "AI proctoring check failed."
        );

        setError(
          err?.message ||
            "Unable to complete the secure device check."
        );
      } finally {
        requestRunningRef.current =
          false;

        if (
          mountedRef.current
        ) {
          setPermissionLoading(
            false
          );
        }
      }
    };

  const handleContinue =
    () => {
      setError("");

      if (
        cameraStatus !==
        "granted"
      ) {
        setError(
          "Complete the camera and microphone check first."
        );

        return;
      }

      if (
        aiStatus !==
        "granted"
      ) {
        setError(
          "Complete the AI proctoring check first."
        );

        return;
      }

      if (!acceptedRules) {
        setError(
          "Read and accept all AI Interview rules before continuing."
        );

        return;
      }

      sessionStorage.setItem(
        `campusiq_ai_interview_instructions_${interviewSessionId}`,
        "accepted"
      );

      cameraService.stopCamera();

      faceDetectionService.close();

      objectDetectionService.close();

      navigate(
        `/student/ai-interview/${interviewSessionId}/attempt`
      );
    };

  const handleBack =
    () => {
      cameraService.stopCamera();

      faceDetectionService.close();

      objectDetectionService.close();

      navigate(
        "/student/ai-interview"
      );
    };

  if (loading) {
    return (
      <main className="proctoring-page">

        <div className="proctoring-container">

          <div className="proctoring-information">
            Loading AI Interview instructions...
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
      <main className="proctoring-page">

        <div className="proctoring-container">

          <section className="proctoring-card">

            <div className="proctoring-error">
              {error ||
                "AI Interview session is unavailable."}
            </div>

            <button
              type="button"
              className="proctoring-secondary-button"
              onClick={
                handleBack
              }
            >
              Back to AI Interview
            </button>

          </section>

        </div>

      </main>
    );
  }

  const deviceReady =
    cameraStatus ===
      "granted" &&
    aiStatus ===
      "granted";

  return (
    <main className="proctoring-page">

      <div className="proctoring-container">

        <header className="proctoring-header">

          <div className="proctoring-heading">

            <span>
              SECURE AI INTERVIEW
            </span>

            <h1>
              Interview Instructions
            </h1>

            <p>
              Read all instructions carefully
              before starting your AI
              Interview.
            </p>

          </div>

          <button
            type="button"
            className="proctoring-back-button"
            onClick={
              handleBack
            }
            disabled={
              permissionLoading
            }
          >
            Back to AI Interview
          </button>

        </header>

        <main className="proctoring-instruction-grid">

          <section className="proctoring-card">

            <div className="proctoring-card-header">

              <h2>
                AI Interview Rules
              </h2>

              <p>
                Violating these rules may
                generate warnings or
                automatically submit the
                interview.
              </p>

            </div>

            <div className="proctoring-test-details">

              <div className="proctoring-detail">

                <span>
                  Session ID
                </span>

                <strong>
                  {interviewSessionId}
                </strong>

              </div>

              <div className="proctoring-detail">

                <span>
                  Status
                </span>

                <strong>
                  {eligibility
                    ?.interviewStatus ||
                    "READY"}
                </strong>

              </div>

              <div className="proctoring-detail">

                <span>
                  Questions
                </span>

                <strong>
                  10
                </strong>

              </div>

              <div className="proctoring-detail">

                <span>
                  Duration
                </span>

                <strong>
                  30 Minutes
                </strong>

              </div>

              <div className="proctoring-detail">

                <span>
                  Pass Percentage
                </span>

                <strong>
                  35%
                </strong>

              </div>

            </div>

            <div className="proctoring-rules">

              {[
                "Keep your face clearly visible in the camera throughout the interview.",

                "Sit alone in the assessment area. No other person should remain near you.",

                "If another person's body, torso, shoulder or partial body is detected, a proctoring warning may be recorded.",

                "Keep mobile phones and other electronic devices away from the assessment area. Any detected phone will be treated as a proctoring violation.",

                "The first distinct mobile-phone detection creates a warning.",

                "After the phone leaves the camera frame, detecting a phone again immediately auto-submits the interview.",

                "Two or more faces continuously visible for about 2.5 seconds immediately auto-submit the interview.",

                "Do not continuously look away from the screen. Looking away for about 4 seconds creates a warning.",

                "If your face is not visible for about 4 seconds, a NO_FACE warning may be recorded.",

                "Do not switch tabs or leave the active AI Interview window.",

                "Do not exit fullscreen mode while the interview is in progress.",

                "Copy, paste, cut and restricted clipboard actions are not allowed.",

                "Suspicious sustained audio may generate a proctoring warning.",

                "Camera and microphone must remain active throughout the complete interview.",

                "Normal proctoring violations follow the warning system. The third normal warning automatically submits the interview.",

                "Answer each interview question in your own words. Saved answers are evaluated after submission.",
              ].map(
                (
                  rule,
                  index
                ) => (
                  <div
                    className="proctoring-rule"
                    key={rule}
                  >

                    <div className="proctoring-rule-icon">
                      {index + 1}
                    </div>

                    <p>
                      {rule}
                    </p>

                  </div>
                )
              )}

            </div>

          </section>

          <aside className="proctoring-card">

            <div className="proctoring-card-header">

              <h2>
                Secure Device Check
              </h2>

              <p>
                Camera, microphone and AI
                monitoring must be ready
                before continuing.
              </p>

            </div>

            <div className="proctoring-camera">

              <video
                ref={videoRef}
                autoPlay
                muted
                playsInline
              />

              {cameraStatus !==
                "granted" && (
                <div className="proctoring-camera-placeholder">

                  <strong>
                    Camera Preview
                  </strong>

                  <p>
                    Preview appears after
                    camera permission is
                    granted.
                  </p>

                </div>
              )}

              {cameraStatus ===
                "granted" && (
                <div className="proctoring-camera-label">
                  Device Check Active
                </div>
              )}

            </div>

            <div
              className={
                `proctoring-status ${cameraStatus}`
              }
            >

              <span>
                {cameraStatus ===
                "granted"
                  ? "✓"
                  : cameraStatus ===
                      "denied"
                    ? "!"
                    : "○"}
              </span>

              <p>
                {cameraMessage}
              </p>

            </div>

            <div
              className={
                `proctoring-status ${aiStatus}`
              }
            >

              <span>
                {aiStatus ===
                "granted"
                  ? "✓"
                  : aiStatus ===
                      "denied"
                    ? "!"
                    : "○"}
              </span>

              <p>
                {aiMessage}
              </p>

            </div>

            {error && (
              <div className="proctoring-error">
                {error}
              </div>
            )}

            <div className="proctoring-information">
              This page checks your devices
              before the interview. Full
              fullscreen proctoring begins
              after you continue to the
              interview.
            </div>

            <div className="proctoring-actions">

              <button
                type="button"
                className="proctoring-secondary-button"
                onClick={
                  handleDeviceCheck
                }
                disabled={
                  permissionLoading
                }
              >
                {permissionLoading
                  ? "Checking Security..."
                  : deviceReady
                    ? "Check Again"
                    : "Check Camera, Microphone & AI"}
              </button>

              <label>

                <input
                  type="checkbox"
                  checked={
                    acceptedRules
                  }
                  onChange={(
                    event
                  ) =>
                    setAcceptedRules(
                      event.target
                        .checked
                    )
                  }
                />

                {" "}
                I have read and accepted all
                AI Interview and proctoring
                rules.

              </label>

              <button
                type="button"
                className="proctoring-primary-button"
                onClick={
                  handleContinue
                }
                disabled={
                  permissionLoading ||
                  !deviceReady ||
                  !acceptedRules
                }
              >
                Continue to AI Interview
              </button>

            </div>

          </aside>

        </main>

      </div>

    </main>
  );
}

export default StudentAIInterviewInstructions;