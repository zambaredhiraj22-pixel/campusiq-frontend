import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

import apiService from "../services/apiService";
import "../styles/dashboard.css";
import "../styles/studentProfile.css";

function FacultySkillVerification() {
  const navigate = useNavigate();

  const [pendingSkills, setPendingSkills] =
    useState([]);

  const [loading, setLoading] = useState(true);

  const [processingSkillId, setProcessingSkillId] =
    useState(null);

  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  useEffect(() => {
    let componentActive = true;

    async function loadPendingSkills() {
      try {
        setLoading(true);
        setError("");

        const skillData =
          await apiService.get(
            "/api/faculty/skills/pending"
          );

        if (!componentActive) {
          return;
        }

        setPendingSkills(
          Array.isArray(skillData)
            ? skillData
            : []
        );

      } catch (err) {
        if (!componentActive) {
          return;
        }

        if (err.status === 401) {
          navigate("/login", {
            replace: true,
          });

          return;
        }

        setError(
          err.message ||
            "Unable to load pending skills."
        );

      } finally {
        if (componentActive) {
          setLoading(false);
        }
      }
    }

    loadPendingSkills();

    return () => {
      componentActive = false;
    };
  }, [navigate]);

  const updateSkillStatus = async (
    skill,
    action
  ) => {
    setError("");
    setSuccess("");
    setProcessingSkillId(skill.id);

    try {
      const endpoint =
        `/api/faculty/skills/${skill.id}/${action}`;

      const updatedSkill =
        await apiService.put(endpoint);

      setPendingSkills((currentSkills) =>
        currentSkills.filter(
          (currentSkill) =>
            currentSkill.id !== skill.id
        )
      );

      const actionMessage =
        updatedSkill.status === "VERIFIED"
          ? "verified"
          : "rejected";

      setSuccess(
        `${skill.skillName} for ${
          skill.studentName || skill.username
        } was ${actionMessage} successfully.`
      );

    } catch (err) {
      if (err.status === 401) {
        navigate("/login", {
          replace: true,
        });

        return;
      }

      setError(
        err.message ||
          `Unable to ${action} this skill.`
      );

    } finally {
      setProcessingSkillId(null);
    }
  };

  const formatValue = (value) => {
    if (!value) {
      return "Not available";
    }

    return value
      .toLowerCase()
      .replaceAll("_", " ")
      .replace(/\b\w/g, (letter) =>
        letter.toUpperCase()
      );
  };

  return (
    <main className="student-profile-page">

      <div className="student-profile-container">

        <header className="student-profile-header">

          <div className="student-profile-heading">

            <span>Faculty Verification</span>

            <h1>
              Pending Student Skills
            </h1>

            <p>
              Review student skill evidence before
              approving placement-profile skills.
            </p>

          </div>

          <button
            type="button"
            className="student-profile-back"
            onClick={() =>
              navigate("/faculty/dashboard")
            }
          >
            ← Back to Dashboard
          </button>

        </header>

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

        {loading && (
          <div
            className="dashboard-loading"
            role="status"
          >
            Loading pending skill requests...
          </div>
        )}

        {!loading &&
          pendingSkills.length === 0 && (
            <div className="dashboard-loading">
              There are no pending skill requests.
            </div>
          )}

        {!loading &&
          pendingSkills.length > 0 && (
            <div className="dashboard-action-grid">

              {pendingSkills.map((skill) => {
                const processing =
                  processingSkillId === skill.id;

                return (
                  <article
                    className="dashboard-action-card"
                    key={skill.id}
                  >

                    <div className="dashboard-status">
                      Pending Verification
                    </div>

                    <h3
                      style={{ marginTop: "16px" }}
                    >
                      {skill.skillName}
                    </h3>

                    <p>
                      Student:{" "}
                      {skill.studentName ||
                        "Name not available"}
                    </p>

                    <p>
                      Username:{" "}
                      {skill.username ||
                        "Not available"}
                    </p>

                    <p>
                      Proficiency:{" "}
                      {formatValue(
                        skill.proficiencyLevel
                      )}
                    </p>

                    {skill.evidenceUrl ? (
                      <a
                        className="dashboard-action-link"
                        href={skill.evidenceUrl}
                        target="_blank"
                        rel="noreferrer"
                      >
                        Review evidence →
                      </a>
                    ) : (
                      <span className="dashboard-action-link">
                        No evidence submitted
                      </span>
                    )}

                    <div
                      className="student-profile-actions"
                      style={{
                        marginTop: "20px",
                        justifyContent: "stretch",
                      }}
                    >

                      <button
                        type="button"
                        className="student-profile-save"
                        style={{ flex: 1 }}
                        onClick={() =>
                          updateSkillStatus(
                            skill,
                            "verify"
                          )
                        }
                        disabled={processing}
                      >
                        {processing
                          ? "Processing..."
                          : "Verify"}
                      </button>

                      <button
                        type="button"
                        className="student-profile-back"
                        style={{
                          flex: 1,
                          color: "#fca5a5",
                          borderColor:
                            "rgba(248, 113, 113, 0.35)",
                        }}
                        onClick={() =>
                          updateSkillStatus(
                            skill,
                            "reject"
                          )
                        }
                        disabled={processing}
                      >
                        Reject
                      </button>

                    </div>

                  </article>
                );
              })}

            </div>
          )}

      </div>

    </main>
  );
}

export default FacultySkillVerification;