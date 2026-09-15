import {
  useEffect,
  useRef,
  useState,
} from "react";

import {
  useLocation,
  useNavigate,
} from "react-router-dom";

import cameraService from "../services/cameraService";

import "../styles/proctoring.css";

function StudentTestInstructions() {
  const location = useLocation();
  const navigate = useNavigate();

  const videoRef = useRef(null);

  const componentActiveRef =
    useRef(true);

  const cameraRequestRunningRef =
    useRef(false);

  const mockTest =
    location.state?.mockTest;

  const selectedSkill =
    location.state?.selectedSkill;

  const personalized =
    mockTest?.personalized === true;

  const personalizedSkills =
    Array.isArray(
      mockTest?.selectedSkills
    )
      ? mockTest.selectedSkills
      : [];

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
    permissionLoading,
    setPermissionLoading,
  ] = useState(false);

  const [
    acceptedRules,
    setAcceptedRules,
  ] = useState(false);

  const [
    error,
    setError,
  ] = useState("");

  useEffect(() => {
    componentActiveRef.current =
      true;

    return () => {
      componentActiveRef.current =
        false;

      cameraService.stopCamera();
    };
  }, []);

  const handleCameraPermission =
    async () => {
      if (
        cameraRequestRunningRef.current
      ) {
        return;
      }

      cameraRequestRunningRef.current =
        true;

      setPermissionLoading(true);
      setError("");
      setCameraStatus("pending");

      setCameraMessage(
        "Waiting for camera and microphone permission..."
      );

      try {
        const stream =
          await cameraService
            .startCamera();

        if (
          !componentActiveRef.current
        ) {
          stream
            .getTracks()
            .forEach(
              (track) => {
                track.stop();
              }
            );

          return;
        }

        if (!videoRef.current) {
          throw new Error(
            "Camera preview is not available."
          );
        }

        await cameraService
          .attachToVideo(
            videoRef.current
          );

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
      } catch (requestError) {
        cameraService.stopCamera();

        if (
          !componentActiveRef.current
        ) {
          return;
        }

        setCameraStatus(
          "denied"
        );

        setCameraMessage(
          "Camera and microphone check failed."
        );

        setError(
          requestError?.message ||
            "Unable to access camera and microphone."
        );
      } finally {
        cameraRequestRunningRef.current =
          false;

        if (
          componentActiveRef.current
        ) {
          setPermissionLoading(
            false
          );
        }
      }
    };

  const handleBack = () => {
    cameraService.stopCamera();

    navigate(
      "/student/mock-tests"
    );
  };

  const handleContinue = () => {
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

    if (!acceptedRules) {
      setError(
        "Accept the assessment rules before continuing."
      );

      return;
    }

    cameraService.stopCamera();

    navigate(
      `/student/mock-tests/${mockTest.id}/attempt`,
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

  if (
    !mockTest ||
    (
      !personalized &&
      !selectedSkill
    )
  ) {
    return (
      <div className="proctoring-page">

        <div className="proctoring-container">

          <div className="proctoring-card">

            <div className="proctoring-error">
              Test information is unavailable.
              Please select the mock test again.
            </div>

            <button
              type="button"
              className="proctoring-secondary-button"
              onClick={() =>
                navigate(
                  "/student/mock-tests"
                )
              }
            >
              Return to Mock Tests
            </button>

          </div>

        </div>

      </div>
    );
  }

  const totalQuestions =
    Number(
      mockTest
        .aptitudeQuestionCount ||
        0
    ) +
    Number(
      mockTest
        .reasoningQuestionCount ||
        0
    ) +
    Number(
      mockTest
        .technicalQuestionCount ||
        0
    );

  const permissionCompleted =
    cameraStatus ===
    "granted";

  const skillDisplay =
    personalized
      ? personalizedSkills.length >
        0
        ? personalizedSkills.join(
            ", "
          )
        : "Faculty assigned verified skills"
      : selectedSkill;

  return (
    <div className="proctoring-page">

      <div className="proctoring-container">

        <header className="proctoring-header">

          <div className="proctoring-heading">

            <span>
              SECURE ASSESSMENT
            </span>

            <h1>
              Test Instructions
            </h1>

            <p>
              Read every proctoring rule
              carefully and complete the
              device check before starting
              the assessment.
            </p>

          </div>

          <button
            type="button"
            className="proctoring-back-button"
            onClick={
              handleBack
            }
          >
            Back to Mock Tests
          </button>

        </header>

        <main className="proctoring-instruction-grid">

          <section className="proctoring-card">

            <div className="proctoring-card-header">

              <h2>
                {mockTest.title}
              </h2>

              <p>
                Verify the assessment details
                and proctoring rules before
                continuing.
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
                  Total Questions
                </span>

                <strong>
                  {totalQuestions}
                </strong>

              </div>

              <div className="proctoring-detail">

                <span>
                  Duration
                </span>

                <strong>
                  {mockTest.durationMinutes}{" "}
                  minutes
                </strong>

              </div>

              <div className="proctoring-detail">

                <span>
                  Pass Percentage
                </span>

                <strong>
                  {mockTest.passPercentage}%
                </strong>

              </div>

              <div className="proctoring-detail">

                <span>
                  Technical Skill
                </span>

                <strong>
                  {skillDisplay}
                </strong>

              </div>

            </div>

            <div className="proctoring-rules">

              <div className="proctoring-rule">

                <div className="proctoring-rule-icon">
                  1
                </div>

                <p>
                  Keep your face clearly
                  visible and look toward the
                  screen throughout the test.
                </p>

              </div>

              <div className="proctoring-rule">

                <div className="proctoring-rule-icon">
                  2
                </div>

                <p>
                  Only the student may remain
                  in the assessment area. A
                  detected second person's
                  body, torso, shoulder or
                  partial body may create a
                  proctoring warning.
                </p>

              </div>

              <div className="proctoring-rule">

                <div className="proctoring-rule-icon">
                  3
                </div>

                <p>
                  Keep mobile phones and other
                  electronic devices away from
                  the assessment area. Any
                  detected phone will be
                  treated as a proctoring
                  violation.
                </p>

              </div>

              <div className="proctoring-rule">

                <div className="proctoring-rule-icon">
                  4
                </div>

                <p>
                  The first distinct mobile
                  phone detection creates a
                  warning. If a phone leaves
                  the camera frame and is
                  detected again, the second
                  detection immediately
                  auto-submits the test.
                </p>

              </div>

              <div className="proctoring-rule">

                <div className="proctoring-rule-icon">
                  5
                </div>

                <p>
                  Two or more faces
                  continuously detected for
                  about 2.5 seconds will
                  immediately auto-submit the
                  test.
                </p>

              </div>

              <div className="proctoring-rule">

                <div className="proctoring-rule-icon">
                  6
                </div>

                <p>
                  Do not switch browser tabs,
                  exit fullscreen, copy,
                  paste, cut or use
                  right-click during the
                  assessment.
                </p>

              </div>

              <div className="proctoring-rule">

                <div className="proctoring-rule-icon">
                  7
                </div>

                <p>
                  No face, looking away,
                  suspicious sustained audio,
                  second-person detection and
                  other normal violations use
                  the warning system. The
                  third normal warning
                  triggers automatic
                  submission.
                </p>

              </div>

              <div className="proctoring-rule">

                <div className="proctoring-rule-icon">
                  8
                </div>

                <p>
                  Camera and microphone must
                  remain active until the test
                  is completed or submitted.
                </p>

              </div>

            </div>

          </section>

          <aside className="proctoring-card">

            <div className="proctoring-card-header">

              <h2>
                Device Check
              </h2>

              <p>
                Allow camera and microphone
                access before continuing.
              </p>

            </div>

            <div className="proctoring-camera">

              <video
                ref={videoRef}
                autoPlay
                muted
                playsInline
              />

              {!permissionCompleted && (
                <div className="proctoring-camera-placeholder">

                  <strong>
                    Camera Preview
                  </strong>

                  <p>
                    Your preview appears after
                    permission is granted.
                  </p>

                </div>
              )}

              {permissionCompleted && (
                <div className="proctoring-camera-label">
                  Camera + Microphone Ready
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

            {error && (
              <div className="proctoring-error">
                {error}
              </div>
            )}

            <div className="proctoring-information">
              This step checks camera and
              microphone availability. Full AI
              proctoring starts when you enter
              the test.
            </div>

            <div className="proctoring-actions">

              <button
                type="button"
                className="proctoring-secondary-button"
                onClick={
                  handleCameraPermission
                }
                disabled={
                  permissionLoading
                }
              >
                {permissionLoading
                  ? "Checking Devices..."
                  : permissionCompleted
                    ? "Check Again"
                    : "Allow Camera and Microphone"}
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
                I have read and accepted
                all assessment and
                proctoring rules.

              </label>

              <button
                type="button"
                className="proctoring-primary-button"
                onClick={
                  handleContinue
                }
                disabled={
                  permissionLoading ||
                  !permissionCompleted ||
                  !acceptedRules
                }
              >
                Continue to Test
              </button>

            </div>

          </aside>

        </main>

      </div>

    </div>
  );
}

export default StudentTestInstructions;