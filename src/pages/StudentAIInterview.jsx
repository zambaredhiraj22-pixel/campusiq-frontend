import {
  useEffect,
  useMemo,
  useState,
} from "react";

import {
  useNavigate,
} from "react-router-dom";

import aiInterviewService from "../services/aiInterviewService";

import "../styles/studentProfile.css";

function StudentAIInterview() {
  const navigate = useNavigate();

  const [eligibility, setEligibility] =
    useState(null);

  const [
    preparedInterview,
    setPreparedInterview,
  ] = useState(null);

  const [loading, setLoading] =
    useState(true);

  const [preparing, setPreparing] =
    useState(false);

  const [error, setError] =
    useState("");

  const [success, setSuccess] =
    useState("");

  useEffect(() => {
    let componentActive = true;

    async function loadEligibility() {
      try {
        setLoading(true);
        setError("");

        const data =
          await aiInterviewService
            .getEligibility();

        if (!componentActive) {
          return;
        }

        setEligibility(data);
      } catch (err) {
        if (!componentActive) {
          return;
        }

        if (err?.status === 401) {
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
            "Unable to check AI Interview eligibility."
        );
      } finally {
        if (componentActive) {
          setLoading(false);
        }
      }
    }

    loadEligibility();

    return () => {
      componentActive = false;
    };
  }, [navigate]);

  const interviewSessionId =
    useMemo(() => {
      return (
        preparedInterview
          ?.interviewSessionId ||
        eligibility
          ?.interviewSessionId ||
        null
      );
    }, [
      preparedInterview,
      eligibility,
    ]);

  const interviewStatus =
    useMemo(() => {
      return (
        preparedInterview
          ?.status ||
        eligibility
          ?.interviewStatus ||
        null
      );
    }, [
      preparedInterview,
      eligibility,
    ]);

  const handlePrepareInterview =
    async () => {
      setError("");
      setSuccess("");

      if (!eligibility?.eligible) {
        setError(
          eligibility?.message ||
            "You are not eligible for the AI Interview yet."
        );

        return;
      }

      const mockTestResultId =
        eligibility
          ?.qualifyingMockTestResultId;

      if (!mockTestResultId) {
        setError(
          "Qualifying personalized mock-test result is unavailable."
        );

        return;
      }

      try {
        setPreparing(true);

        const response =
          await aiInterviewService
            .prepareInterview(
              mockTestResultId
            );

        setPreparedInterview(
          response
        );

        setEligibility(
          (currentEligibility) => ({
            ...currentEligibility,

            interviewSessionId:
              response
                .interviewSessionId,

            interviewStatus:
              response.status,
          })
        );

        setSuccess(
          response?.message ||
            "AI Interview prepared successfully."
        );
      } catch (err) {
        if (err?.status === 401) {
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
            "Unable to prepare the AI Interview."
        );
      } finally {
        setPreparing(false);
      }
    };

  const handleContinueToInterview =
    () => {
      setError("");
      setSuccess("");

      if (!interviewSessionId) {
        setError(
          "Prepare the AI Interview first."
        );

        return;
      }

      if (
        interviewStatus !==
          "READY" &&
        interviewStatus !==
          "IN_PROGRESS"
      ) {
        setError(
          "This interview cannot be started in its current state."
        );

        return;
      }

      navigate(
        `/student/ai-interview/${interviewSessionId}/instructions`
      );
    };

  const formatStatus = (
    status
  ) => {
    if (!status) {
      return "NOT PREPARED";
    }

    return status.replaceAll(
      "_",
      " "
    );
  };

  const formatDateTime = (
    value
  ) => {
    if (!value) {
      return "Not available";
    }

    const date =
      new Date(value);

    if (
      Number.isNaN(
        date.getTime()
      )
    ) {
      return value;
    }

    return date.toLocaleString();
  };

  const formatPercentage = (
    value
  ) => {
    if (
      value === null ||
      value === undefined
    ) {
      return "Not available";
    }

    return `${Number(
      value
    ).toFixed(2)}%`;
  };

  const statusCardStyle = {
    padding: "16px",

    border:
      "1px solid rgba(96, 165, 250, 0.24)",

    borderRadius: "12px",

    background:
      "rgba(18, 43, 70, 0.65)",
  };

  const statusLabelStyle = {
    display: "block",

    marginBottom: "8px",

    color: "#8fa4ba",

    fontSize: "11px",

    fontWeight: "700",

    textTransform:
      "uppercase",

    letterSpacing:
      "0.6px",
  };

  const statusValueStyle = {
    color: "#ffffff",

    fontSize: "15px",

    fontWeight: "800",

    lineHeight: "1.5",
  };

  const skillContainerStyle = {
    display: "flex",

    flexWrap: "wrap",

    gap: "8px",

    marginTop: "10px",
  };

  const skillStyle = {
    padding:
      "7px 11px",

    border:
      "1px solid rgba(96, 165, 250, 0.28)",

    borderRadius:
      "999px",

    background:
      "rgba(37, 99, 235, 0.12)",

    color: "#bfdbfe",

    fontSize: "11px",

    fontWeight: "700",
  };

  return (
    <main className="student-profile-page">

      <div className="student-profile-container">

        <header className="student-profile-header">

          <div className="student-profile-heading">

            <span>
              CAMPUS-IQ AI Interview
            </span>

            <h1>
              Personalized AI Interview
            </h1>

            <p>
              Your interview is generated
              from your resume, projects,
              technologies and
              Faculty-verified technical
              skills.
            </p>

          </div>

          <button
            type="button"
            className="student-profile-back"
            onClick={() =>
              navigate(
                "/student/dashboard"
              )
            }
            disabled={
              preparing
            }
          >
            ← Back to Dashboard
          </button>

        </header>

        {loading && (
          <div
            className="student-profile-loading"
            role="status"
          >
            Checking AI Interview
            eligibility...
          </div>
        )}

        {error && (
          <div
            className="student-profile-error"
            role="alert"
          >
            {error}
          </div>
        )}

        {success && (
          <div
            className="student-profile-success"
            role="status"
          >
            {success}
          </div>
        )}

        {!loading &&
          eligibility && (
            <div className="student-profile-card">

              <section className="student-profile-section">

                <div className="student-profile-section-header">

                  <h2>
                    Interview Eligibility
                  </h2>

                  <p>
                    Both the personalized
                    mock-test requirement and
                    Interview Profile
                    requirement must be
                    completed before an
                    interview can be prepared.
                  </p>

                </div>

                <div className="student-profile-grid">

                  <div style={statusCardStyle}>

                    <span style={statusLabelStyle}>
                      Personalized AI Mock Test
                    </span>

                    <strong style={statusValueStyle}>
                      {eligibility
                        .passedPersonalizedMockTest
                        ? "PASSED"
                        : "NOT PASSED"}
                    </strong>

                  </div>

                  <div style={statusCardStyle}>

                    <span style={statusLabelStyle}>
                      Interview Profile
                    </span>

                    <strong style={statusValueStyle}>
                      {eligibility
                        .interviewProfileAvailable
                        ? "AVAILABLE"
                        : "NOT AVAILABLE"}
                    </strong>

                  </div>

                  <div style={statusCardStyle}>

                    <span style={statusLabelStyle}>
                      AI Interview Eligibility
                    </span>

                    <strong style={statusValueStyle}>
                      {eligibility.eligible
                        ? "ELIGIBLE"
                        : "NOT ELIGIBLE"}
                    </strong>

                  </div>

                  <div style={statusCardStyle}>

                    <span style={statusLabelStyle}>
                      Interview Status
                    </span>

                    <strong style={statusValueStyle}>
                      {formatStatus(
                        interviewStatus
                      )}
                    </strong>

                  </div>

                </div>

                <div
                  className={
                    eligibility.eligible
                      ? "student-profile-success"
                      : "student-profile-loading"
                  }
                  style={{
                    marginTop: "18px",
                    marginBottom: "0",
                  }}
                >
                  {eligibility.message}
                </div>

              </section>

              <section className="student-profile-section">

                <div className="student-profile-section-header">

                  <h2>
                    Qualifying Assessment
                  </h2>

                  <p>
                    CAMPUS-IQ uses your latest
                    qualifying passed
                    personalized AI mock test
                    to unlock the interview.
                  </p>

                </div>

                {eligibility
                  .passedPersonalizedMockTest ? (
                  <div className="student-profile-grid">

                    <div style={statusCardStyle}>

                      <span style={statusLabelStyle}>
                        Test
                      </span>

                      <strong style={statusValueStyle}>
                        {eligibility
                          .qualifyingMockTestTitle ||
                          "Personalized AI Mock Test"}
                      </strong>

                    </div>

                    <div style={statusCardStyle}>

                      <span style={statusLabelStyle}>
                        Mock Test Score
                      </span>

                      <strong style={statusValueStyle}>
                        {formatPercentage(
                          eligibility
                            .mockTestPercentage
                        )}
                      </strong>

                    </div>

                    <div style={statusCardStyle}>

                      <span style={statusLabelStyle}>
                        Mock Test ID
                      </span>

                      <strong style={statusValueStyle}>
                        {eligibility
                          .qualifyingMockTestId ??
                          "Not available"}
                      </strong>

                    </div>

                    <div style={statusCardStyle}>

                      <span style={statusLabelStyle}>
                        Result ID
                      </span>

                      <strong style={statusValueStyle}>
                        {eligibility
                          .qualifyingMockTestResultId ??
                          "Not available"}
                      </strong>

                    </div>

                  </div>
                ) : (
                  <div className="student-profile-loading">

                    Pass your personalized AI
                    mock test first.

                  </div>
                )}

              </section>

              <section className="student-profile-section">

                <div className="student-profile-section-header">

                  <h2>
                    Interview Blueprint
                  </h2>

                  <p>
                    The backend generates a
                    larger personalized
                    question pool and randomly
                    selects the final
                    interview questions.
                  </p>

                </div>

                <div className="student-profile-grid">

                  <div style={statusCardStyle}>

                    <span style={statusLabelStyle}>
                      AI Question Pool
                    </span>

                    <strong style={statusValueStyle}>
                      {preparedInterview
                        ?.generatedQuestionCount ??
                        "25"}{" "}
                      Questions
                    </strong>

                  </div>

                  <div style={statusCardStyle}>

                    <span style={statusLabelStyle}>
                      Actual Interview
                    </span>

                    <strong style={statusValueStyle}>
                      {preparedInterview
                        ?.selectedQuestionCount ??
                        "10"}{" "}
                      Questions
                    </strong>

                  </div>

                  <div style={statusCardStyle}>

                    <span style={statusLabelStyle}>
                      Duration
                    </span>

                    <strong style={statusValueStyle}>
                      {preparedInterview
                        ?.durationMinutes ??
                        "30"}{" "}
                      Minutes
                    </strong>

                  </div>

                  <div style={statusCardStyle}>

                    <span style={statusLabelStyle}>
                      Pass Percentage
                    </span>

                    <strong style={statusValueStyle}>
                      {preparedInterview
                        ?.passPercentage ??
                        "65"}
                      %
                    </strong>

                  </div>

                </div>

                <div
                  className="student-profile-loading"
                  style={{
                    marginTop: "18px",
                    marginBottom: "0",
                  }}
                >
                  Final 10 questions:{" "}

                  <strong>
                    5 Technical
                  </strong>

                  {" + "}

                  <strong>
                    3 Resume / Project
                  </strong>

                  {" + "}

                  <strong>
                    2 Behavioral / HR
                  </strong>

                  .
                </div>

              </section>

              {preparedInterview && (
                <section className="student-profile-section">

                  <div className="student-profile-section-header">

                    <h2>
                      Prepared Interview
                    </h2>

                    <p>
                      CAMPUS-IQ has prepared
                      your personalized
                      interview session.
                    </p>

                  </div>

                  <div className="student-profile-grid">

                    <div style={statusCardStyle}>

                      <span style={statusLabelStyle}>
                        Interview Session ID
                      </span>

                      <strong style={statusValueStyle}>
                        {
                          preparedInterview
                            .interviewSessionId
                        }
                      </strong>

                    </div>

                    <div style={statusCardStyle}>

                      <span style={statusLabelStyle}>
                        Status
                      </span>

                      <strong style={statusValueStyle}>
                        {formatStatus(
                          preparedInterview.status
                        )}
                      </strong>

                    </div>

                    <div style={statusCardStyle}>

                      <span style={statusLabelStyle}>
                        Prepared At
                      </span>

                      <strong style={statusValueStyle}>
                        {formatDateTime(
                          preparedInterview.preparedAt
                        )}
                      </strong>

                    </div>

                    <div style={statusCardStyle}>

                      <span style={statusLabelStyle}>
                        Selected Questions
                      </span>

                      <strong style={statusValueStyle}>
                        {
                          preparedInterview
                            .selectedQuestionCount
                        }
                      </strong>

                    </div>

                  </div>

                  <div
                    style={{
                      ...statusCardStyle,
                      marginTop: "18px",
                    }}
                  >

                    <span style={statusLabelStyle}>
                      Faculty-Verified Skills
                    </span>

                    {Array.isArray(
                      preparedInterview
                        .verifiedSkills
                    ) &&
                    preparedInterview
                      .verifiedSkills
                      .length > 0 ? (
                      <div style={skillContainerStyle}>

                        {preparedInterview
                          .verifiedSkills
                          .map(
                            (skill) => (
                              <span
                                key={skill}
                                style={skillStyle}
                              >
                                {skill}
                              </span>
                            )
                          )}

                      </div>
                    ) : (
                      <strong style={statusValueStyle}>
                        No verified skill
                        information available
                      </strong>
                    )}

                  </div>

                </section>
              )}

              <section className="student-profile-section">

                <div className="student-profile-section-header">

                  <h2>
                    Before You Start
                  </h2>

                  <p>
                    You will see a separate
                    instructions and secure
                    device-check page before
                    entering the interview.
                  </p>

                </div>

                <div
                  className="student-profile-loading"
                  style={{
                    marginBottom: "0",
                  }}
                >
                  On the next page, read and
                  accept all proctoring rules,
                  then complete the camera,
                  microphone, face-detection,
                  mobile-phone and
                  second-person detection
                  checks before continuing.
                </div>

              </section>

              <div className="student-profile-actions">

                {!eligibility
                  .interviewProfileAvailable && (
                  <button
                    type="button"
                    className="student-profile-back"
                    onClick={() =>
                      navigate(
                        "/student/ai-interview/profile"
                      )
                    }
                  >
                    Upload Resume / Profile
                  </button>
                )}

                {!eligibility
                  .passedPersonalizedMockTest && (
                  <button
                    type="button"
                    className="student-profile-back"
                    onClick={() =>
                      navigate(
                        "/student/mock-tests"
                      )
                    }
                  >
                    Go to Mock Tests
                  </button>
                )}

                {eligibility.eligible &&
                  !preparedInterview && (
                    <button
                      type="button"
                      className="student-profile-save"
                      onClick={
                        handlePrepareInterview
                      }
                      disabled={preparing}
                    >
                      {preparing
                        ? "Preparing AI Interview..."
                        : interviewSessionId
                          ? "Load Prepared Interview"
                          : "Prepare AI Interview"}
                    </button>
                  )}

                {eligibility.eligible &&
                  preparedInterview &&
                  (
                    interviewStatus ===
                      "READY" ||
                    interviewStatus ===
                      "IN_PROGRESS"
                  ) && (
                    <button
                      type="button"
                      className="student-profile-save"
                      onClick={
                        handleContinueToInterview
                      }
                    >
                      {interviewStatus ===
                      "IN_PROGRESS"
                        ? "Resume via Instructions"
                        : "Continue to Instructions"}
                    </button>
                  )}

                {(
                  interviewStatus ===
                    "COMPLETED" ||
                  interviewStatus ===
                    "AUTO_SUBMITTED"
                ) && (
                  <button
                    type="button"
                    className="student-profile-save"
                    onClick={() =>
                      navigate(
                        `/student/ai-interview/${interviewSessionId}/result`
                      )
                    }
                  >
                    View Interview Result
                  </button>
                )}

              </div>

            </div>
          )}

      </div>

    </main>
  );
}

export default StudentAIInterview;