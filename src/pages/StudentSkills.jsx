import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

import apiService from "../services/apiService";
import "../styles/dashboard.css";
import "../styles/studentProfile.css";

const EMPTY_SKILL = {
  skillName: "",
  proficiencyLevel: "BEGINNER",
  evidenceUrl: "",
};

function StudentSkills() {
  const navigate = useNavigate();

  const [skills, setSkills] = useState([]);
  const [formData, setFormData] =
    useState(EMPTY_SKILL);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  useEffect(() => {
    let componentActive = true;

    async function loadSkills() {
      try {
        setLoading(true);
        setError("");

        const skillData =
          await apiService.get(
            "/api/student/skills"
          );

        if (!componentActive) {
          return;
        }

        setSkills(
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
            "Unable to load your skills."
        );

      } finally {
        if (componentActive) {
          setLoading(false);
        }
      }
    }

    loadSkills();

    return () => {
      componentActive = false;
    };
  }, [navigate]);

  const handleChange = (event) => {
    const { name, value } = event.target;

    setFormData((currentData) => ({
      ...currentData,
      [name]: value,
    }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();

    setError("");
    setSuccess("");

    const skillRequest = {
      skillName: formData.skillName.trim(),

      proficiencyLevel:
        formData.proficiencyLevel,

      evidenceUrl:
        formData.evidenceUrl.trim(),
    };

    try {
      setSaving(true);

      const createdSkill =
        await apiService.post(
          "/api/student/skills",
          skillRequest
        );

      setSkills((currentSkills) => [
        createdSkill,
        ...currentSkills,
      ]);

      setFormData(EMPTY_SKILL);

      setSuccess(
        "Skill submitted for Faculty verification."
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
          "Unable to submit the skill."
      );

    } finally {
      setSaving(false);
    }
  };

  const formatStatus = (status) => {
    if (!status) {
      return "Unknown";
    }

    return status
      .toLowerCase()
      .replace("_", " ")
      .replace(/\b\w/g, (letter) =>
        letter.toUpperCase()
      );
  };

  return (
    <main className="student-profile-page">

      <div className="student-profile-container">

        <header className="student-profile-header">

          <div className="student-profile-heading">

            <span>Verified Skills</span>

            <h1>
              Technical Skills and Evidence
            </h1>

            <p>
              Submit your technical skills for
              Faculty verification.
            </p>

          </div>

          <button
            type="button"
            className="student-profile-back"
            onClick={() =>
              navigate("/student/dashboard")
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

        <form
          className="student-profile-card"
          onSubmit={handleSubmit}
        >

          <section className="student-profile-section">

            <div className="student-profile-section-header">

              <h2>Add a New Skill</h2>

              <p>
                Add relevant placement skills and
                provide evidence when available.
              </p>

            </div>

            <div className="student-profile-grid">

              <div className="student-profile-field">

                <label htmlFor="skillName">
                  Skill Name
                </label>

                <input
                  id="skillName"
                  name="skillName"
                  type="text"
                  placeholder="Example: Java"
                  value={formData.skillName}
                  onChange={handleChange}
                  maxLength="100"
                  disabled={saving}
                  required
                />

              </div>

              <div className="student-profile-field">

                <label htmlFor="proficiencyLevel">
                  Proficiency Level
                </label>

                <select
                  id="proficiencyLevel"
                  name="proficiencyLevel"
                  value={
                    formData.proficiencyLevel
                  }
                  onChange={handleChange}
                  disabled={saving}
                  required
                >
                  <option value="BEGINNER">
                    Beginner
                  </option>

                  <option value="INTERMEDIATE">
                    Intermediate
                  </option>

                  <option value="ADVANCED">
                    Advanced
                  </option>
                </select>

              </div>

              <div className="student-profile-field full-width">

                <label htmlFor="evidenceUrl">
                  Evidence URL
                </label>

                <input
                  id="evidenceUrl"
                  name="evidenceUrl"
                  type="url"
                  placeholder="Certificate or project URL"
                  value={formData.evidenceUrl}
                  onChange={handleChange}
                  maxLength="500"
                  disabled={saving}
                />

                <span className="student-profile-help">
                  Add a certificate, GitHub project or
                  another relevant evidence link.
                </span>

              </div>

            </div>

          </section>

          <div className="student-profile-actions">

            <button
              type="submit"
              className="student-profile-save"
              disabled={saving}
            >
              {saving
                ? "Submitting Skill..."
                : "Submit for Verification"}
            </button>

          </div>

        </form>

        <section
          className="dashboard-section"
          aria-labelledby="student-skills-title"
          style={{ marginTop: "32px" }}
        >

          <div className="dashboard-section-heading">

            <span>Skill Records</span>

            <h2 id="student-skills-title">
              Your submitted skills
            </h2>

            <p>
              Faculty verification status is displayed
              for every submitted skill.
            </p>

          </div>

          {loading && (
            <div
              className="dashboard-loading"
              role="status"
            >
              Loading your skills...
            </div>
          )}

          {!loading && skills.length === 0 && (
            <div className="dashboard-loading">
              No skills have been submitted yet.
            </div>
          )}

          {!loading && skills.length > 0 && (
            <div className="dashboard-action-grid">

              {skills.map((skill) => (
                <article
                  className="dashboard-action-card"
                  key={skill.id}
                >

                  <div className="dashboard-status">
                    {formatStatus(skill.status)}
                  </div>

                  <h3
                    style={{ marginTop: "16px" }}
                  >
                    {skill.skillName}
                  </h3>

                  <p>
                    Proficiency:{" "}
                    {formatStatus(
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
                      View evidence →
                    </a>
                  ) : (
                    <span className="dashboard-action-link">
                      No evidence URL provided
                    </span>
                  )}

                </article>
              ))}

            </div>
          )}

        </section>

      </div>

    </main>
  );
}

export default StudentSkills;