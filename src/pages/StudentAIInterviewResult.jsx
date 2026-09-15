import {
  useEffect,
  useMemo,
  useState,
} from "react";

import {
  useNavigate,
  useParams,
} from "react-router-dom";

import aiInterviewService from "../services/aiInterviewService";

import "../styles/studentProfile.css";

function StudentAIInterviewResult() {
  const navigate = useNavigate();
  const { sessionId } = useParams();

  const [result, setResult] = useState(null);
  const [violations, setViolations] = useState([]);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [resultUnavailable, setResultUnavailable] =
    useState(false);

  useEffect(() => {
    let componentActive = true;

    async function loadResult() {
      try {
        setLoading(true);
        setError("");
        setResultUnavailable(false);

        const interviewResult =
          await aiInterviewService.getResult(
            sessionId
          );

        if (!componentActive) {
          return;
        }

        setResult(interviewResult);

        try {
          const violationHistory =
            await aiInterviewService.getViolationHistory(
              sessionId
            );

          if (!componentActive) {
            return;
          }

          setViolations(
            Array.isArray(violationHistory)
              ? violationHistory
              : []
          );
        } catch (violationError) {
          if (!componentActive) {
            return;
          }

          if (violationError?.status === 401) {
            navigate("/login", {
              replace: true,
            });

            return;
          }

          /*
           * The interview result is still valid even
           * if violation history cannot be refreshed.
           */
          setViolations([]);
        }
      } catch (err) {
        if (!componentActive) {
          return;
        }

        if (err?.status === 401) {
          navigate("/login", {
            replace: true,
          });

          return;
        }

        if (err?.status === 409) {
          setResultUnavailable(true);

          setError(
            err?.message ||
              "Interview result is not available yet."
          );

          return;
        }

        setError(
          err?.message ||
            "Unable to load the AI Interview result."
        );
      } finally {
        if (componentActive) {
          setLoading(false);
        }
      }
    }

    loadResult();

    return () => {
      componentActive = false;
    };
  }, [navigate, sessionId]);

  const answeredPercentage = useMemo(() => {
    if (
      !result ||
      !result.totalQuestions ||
      result.totalQuestions <= 0
    ) {
      return 0;
    }

    return Math.round(
      (Number(result.answeredQuestions || 0) /
        Number(result.totalQuestions)) *
        100
    );
  }, [result]);

  const formatStatus = (status) => {
    if (!status) {
      return "UNKNOWN";
    }

    return String(status).replaceAll("_", " ");
  };

  const formatScore = (value) => {
    if (
      value === null ||
      value === undefined ||
      Number.isNaN(Number(value))
    ) {
      return "0.00";
    }

    return Number(value).toFixed(2);
  };

  const formatDateTime = (value) => {
    if (!value) {
      return "Not available";
    }

    const date = new Date(value);

    if (Number.isNaN(date.getTime())) {
      return value;
    }

    return date.toLocaleString();
  };

  const formatViolationType = (value) => {
    if (!value) {
      return "Unknown Violation";
    }

    return String(value)
      .replaceAll("_", " ")
      .toLowerCase()
      .replace(/\b\w/g, (character) =>
        character.toUpperCase()
      );
  };

  const cardStyle = {
    padding: "18px",
    border:
      "1px solid rgba(96, 165, 250, 0.24)",
    borderRadius: "12px",
    background:
      "rgba(18, 43, 70, 0.65)",
  };

  const cardLabelStyle = {
    display: "block",
    marginBottom: "8px",
    color: "#8fa4ba",
    fontSize: "11px",
    fontWeight: "800",
    letterSpacing: "0.6px",
    textTransform: "uppercase",
  };

  const cardValueStyle = {
    color: "#ffffff",
    fontSize: "20px",
    fontWeight: "850",
    lineHeight: "1.35",
  };

  const smallValueStyle = {
    ...cardValueStyle,
    fontSize: "14px",
  };

  const scoreBarTrackStyle = {
    height: "8px",
    marginTop: "12px",
    overflow: "hidden",
    borderRadius: "999px",
    background:
      "rgba(148, 163, 184, 0.16)",
  };

  const createScoreBarStyle = (
    value,
    maximum
  ) => {
    const numericValue = Math.max(
      0,
      Math.min(
        Number(value || 0),
        maximum
      )
    );

    const width =
      maximum > 0
        ? (numericValue / maximum) * 100
        : 0;

    return {
      width: `${width}%`,
      height: "100%",
      borderRadius: "999px",
      background:
        "linear-gradient(90deg, #2563eb, #7c3aed)",
    };
  };

  const violationCardStyle = {
    padding: "15px",
    border:
      "1px solid rgba(248, 113, 113, 0.22)",
    borderRadius: "11px",
    background:
      "rgba(127, 29, 29, 0.09)",
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
              Interview Result
            </h1>

            <p>
              Review your final AI Interview score,
              weighted evaluation, overall feedback
              and proctoring integrity record.
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
          >
            ← Back to Dashboard
          </button>
        </header>

        {loading && (
          <div
            className="student-profile-loading"
            role="status"
          >
            Loading AI Interview result...
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

        {!loading &&
          resultUnavailable && (
            <div className="student-profile-card">
              <section className="student-profile-section">
                <div className="student-profile-section-header">
                  <h2>
                    Result Not Ready
                  </h2>

                  <p>
                    The backend has not finalized this
                    interview yet. Continue the interview
                    if it is still in progress.
                  </p>
                </div>

                <div className="student-profile-actions">
                  <button
                    type="button"
                    className="student-profile-back"
                    onClick={() =>
                      navigate(
                        "/student/ai-interview"
                      )
                    }
                  >
                    Interview Overview
                  </button>

                  <button
                    type="button"
                    className="student-profile-save"
                    onClick={() =>
                      navigate(
                        `/student/ai-interview/${sessionId}/attempt`
                      )
                    }
                  >
                    Continue Interview
                  </button>
                </div>
              </section>
            </div>
          )}

        {!loading &&
          result && (
            <div className="student-profile-card">
              {/* =========================
                  FINAL OUTCOME
                  ========================= */}

              <section className="student-profile-section">
                <div className="student-profile-section-header">
                  <h2>
                    Final Outcome
                  </h2>

                  <p>
                    The backend evaluates the interview
                    on a 100-point weighted scoring model.
                  </p>
                </div>

                <div className="student-profile-grid">
                  <div style={cardStyle}>
                    <span style={cardLabelStyle}>
                      Total Score
                    </span>

                    <strong style={cardValueStyle}>
                      {formatScore(
                        result.totalScore
                      )}
                      /100
                    </strong>
                  </div>

                  <div style={cardStyle}>
                    <span style={cardLabelStyle}>
                      Pass Requirement
                    </span>

                    <strong style={cardValueStyle}>
                      {formatScore(
                        result.passPercentage
                      )}
                      %
                    </strong>
                  </div>

                  <div style={cardStyle}>
                    <span style={cardLabelStyle}>
                      Result
                    </span>

                    <strong style={cardValueStyle}>
                      {result.passed
                        ? "PASSED"
                        : "NOT PASSED"}
                    </strong>
                  </div>

                  <div style={cardStyle}>
                    <span style={cardLabelStyle}>
                      Submission Status
                    </span>

                    <strong style={smallValueStyle}>
                      {formatStatus(
                        result.status
                      )}
                    </strong>
                  </div>
                </div>

                <div
                  className={
                    result.passed
                      ? "student-profile-success"
                      : "student-profile-error"
                  }
                  style={{
                    marginTop: "18px",
                    marginBottom: "0",
                  }}
                >
                  {result.message}
                </div>
              </section>

              {/* =========================
                  SCORE BREAKDOWN
                  ========================= */}

              <section className="student-profile-section">
                <div className="student-profile-section-header">
                  <h2>
                    Weighted Score Breakdown
                  </h2>

                  <p>
                    CAMPUS-IQ combines technical content,
                    resume/project content, relevance and
                    communication into the final score.
                  </p>
                </div>

                <div className="student-profile-grid">
                  <div style={cardStyle}>
                    <span style={cardLabelStyle}>
                      Technical Score
                    </span>

                    <strong style={cardValueStyle}>
                      {formatScore(
                        result.technicalScore
                      )}
                      /50
                    </strong>

                    <div style={scoreBarTrackStyle}>
                      <div
                        style={createScoreBarStyle(
                          result.technicalScore,
                          50
                        )}
                      />
                    </div>
                  </div>

                  <div style={cardStyle}>
                    <span style={cardLabelStyle}>
                      Resume / Project Score
                    </span>

                    <strong style={cardValueStyle}>
                      {formatScore(
                        result.resumeProjectScore
                      )}
                      /25
                    </strong>

                    <div style={scoreBarTrackStyle}>
                      <div
                        style={createScoreBarStyle(
                          result.resumeProjectScore,
                          25
                        )}
                      />
                    </div>
                  </div>

                  <div style={cardStyle}>
                    <span style={cardLabelStyle}>
                      Relevance Score
                    </span>

                    <strong style={cardValueStyle}>
                      {formatScore(
                        result.relevanceScore
                      )}
                      /15
                    </strong>

                    <div style={scoreBarTrackStyle}>
                      <div
                        style={createScoreBarStyle(
                          result.relevanceScore,
                          15
                        )}
                      />
                    </div>
                  </div>

                  <div style={cardStyle}>
                    <span style={cardLabelStyle}>
                      Communication Score
                    </span>

                    <strong style={cardValueStyle}>
                      {formatScore(
                        result.communicationScore
                      )}
                      /10
                    </strong>

                    <div style={scoreBarTrackStyle}>
                      <div
                        style={createScoreBarStyle(
                          result.communicationScore,
                          10
                        )}
                      />
                    </div>
                  </div>
                </div>
              </section>

              {/* =========================
                  COMPLETION SUMMARY
                  ========================= */}

              <section className="student-profile-section">
                <div className="student-profile-section-header">
                  <h2>
                    Interview Completion
                  </h2>

                  <p>
                    This section shows how many of the
                    selected interview questions received
                    an answer before submission.
                  </p>
                </div>

                <div className="student-profile-grid">
                  <div style={cardStyle}>
                    <span style={cardLabelStyle}>
                      Total Questions
                    </span>

                    <strong style={cardValueStyle}>
                      {result.totalQuestions ?? 0}
                    </strong>
                  </div>

                  <div style={cardStyle}>
                    <span style={cardLabelStyle}>
                      Answered Questions
                    </span>

                    <strong style={cardValueStyle}>
                      {result.answeredQuestions ?? 0}
                    </strong>
                  </div>

                  <div style={cardStyle}>
                    <span style={cardLabelStyle}>
                      Completion
                    </span>

                    <strong style={cardValueStyle}>
                      {answeredPercentage}%
                    </strong>
                  </div>

                  <div style={cardStyle}>
                    <span style={cardLabelStyle}>
                      Submitted At
                    </span>

                    <strong style={smallValueStyle}>
                      {formatDateTime(
                        result.submittedAt
                      )}
                    </strong>
                  </div>
                </div>

                {result.autoSubmitted && (
                  <div
                    className="student-profile-error"
                    style={{
                      marginTop: "18px",
                      marginBottom: "0",
                    }}
                  >
                    This interview was automatically
                    submitted because of timeout or
                    proctoring enforcement.
                  </div>
                )}
              </section>

              {/* =========================
                  AI FEEDBACK
                  ========================= */}

              <section className="student-profile-section">
                <div className="student-profile-section-header">
                  <h2>
                    AI Interview Feedback
                  </h2>

                  <p>
                    This is the overall feedback generated
                    after evaluating the completed interview.
                  </p>
                </div>

                <div
                  style={{
                    ...cardStyle,
                    color: "#dbeafe",
                    fontSize: "13px",
                    lineHeight: "1.8",
                    whiteSpace: "pre-wrap",
                  }}
                >
                  {result.overallFeedback ||
                    "No overall AI feedback is available."}
                </div>
              </section>

              {/* =========================
                  PROCTORING HISTORY
                  ========================= */}

              <section className="student-profile-section">
                <div className="student-profile-section-header">
                  <h2>
                    Proctoring Integrity
                  </h2>

                  <p>
                    Recorded interview violations are shown
                    exactly as stored by the backend.
                  </p>
                </div>

                <div className="student-profile-grid">
                  <div style={cardStyle}>
                    <span style={cardLabelStyle}>
                      Total Violations
                    </span>

                    <strong style={cardValueStyle}>
                      {violations.length}
                    </strong>
                  </div>

                  <div style={cardStyle}>
                    <span style={cardLabelStyle}>
                      Integrity Outcome
                    </span>

                    <strong style={smallValueStyle}>
                      {result.autoSubmitted
                        ? "AUTO-SUBMITTED"
                        : violations.length === 0
                        ? "NO RECORDED VIOLATIONS"
                        : "COMPLETED WITH WARNINGS"}
                    </strong>
                  </div>
                </div>

                {violations.length === 0 ? (
                  <div
                    className="student-profile-success"
                    style={{
                      marginTop: "18px",
                      marginBottom: "0",
                    }}
                  >
                    No proctoring violations were recorded
                    for this interview session.
                  </div>
                ) : (
                  <div
                    style={{
                      display: "grid",
                      gap: "12px",
                      marginTop: "18px",
                    }}
                  >
                    {violations.map(
                      (violation) => (
                        <article
                          key={
                            violation.violationId
                          }
                          style={violationCardStyle}
                        >
                          <div
                            style={{
                              display: "flex",
                              justifyContent:
                                "space-between",
                              gap: "12px",
                              alignItems:
                                "flex-start",
                              flexWrap: "wrap",
                            }}
                          >
                            <div>
                              <strong
                                style={{
                                  color: "#fecaca",
                                  fontSize: "13px",
                                }}
                              >
                                Warning {" "}
                                {violation.warningNumber}
                                {" — "}
                                {formatViolationType(
                                  violation.violationType
                                )}
                              </strong>

                              <p
                                style={{
                                  marginTop: "7px",
                                  color: "#9fb2c5",
                                  fontSize: "12px",
                                  lineHeight: "1.6",
                                }}
                              >
                                {violation.description ||
                                  "No additional description was recorded."}
                              </p>
                            </div>

                            <span
                              style={{
                                color: "#7f96ad",
                                fontSize: "11px",
                                fontWeight: "700",
                              }}
                            >
                              {formatDateTime(
                                violation.detectedAt
                              )}
                            </span>
                          </div>
                        </article>
                      )
                    )}
                  </div>
                )}
              </section>

              {/* =========================
                  ACTIONS
                  ========================= */}

              <div className="student-profile-actions">
                <button
                  type="button"
                  className="student-profile-back"
                  onClick={() =>
                    navigate(
                      "/student/ai-interview"
                    )
                  }
                >
                  Interview Overview
                </button>

                <button
                  type="button"
                  className="student-profile-save"
                  onClick={() =>
                    navigate(
                      "/student/dashboard"
                    )
                  }
                >
                  Return to Dashboard
                </button>
              </div>
            </div>
          )}
      </div>
    </main>
  );
}

export default StudentAIInterviewResult;
