import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

import apiService from "../services/apiService";
import "../styles/facultyQuestionBank.css";

function StudentMockTests() {
  const navigate = useNavigate();

  const [mockTests, setMockTests] = useState([]);
  const [verifiedSkills, setVerifiedSkills] =
    useState([]);
  const [selectedSkills, setSelectedSkills] =
    useState({});

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let componentActive = true;

    async function loadAssessmentData() {
      try {
        setLoading(true);
        setError("");

        const [mockTestData, skillData] =
          await Promise.all([
            apiService.get(
              "/api/student/mock-tests"
            ),
            apiService.get(
              "/api/student/skills"
            ),
          ]);

        if (!componentActive) {
          return;
        }

        const availableTests =
          Array.isArray(mockTestData)
            ? mockTestData
            : [];

        const approvedSkills =
          Array.isArray(skillData)
            ? skillData.filter(
                (skill) =>
                  skill?.status === "VERIFIED" &&
                  typeof skill?.skillName ===
                    "string" &&
                  skill.skillName.trim() !== ""
              )
            : [];

        setMockTests(availableTests);
        setVerifiedSkills(approvedSkills);

        const defaultSelections = {};

        availableTests.forEach((mockTest) => {
          if (
            mockTest?.personalized !== true &&
            approvedSkills.length > 0
          ) {
            defaultSelections[mockTest.id] =
              approvedSkills[0].skillName;
          }
        });

        setSelectedSkills(defaultSelections);
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

        setError(
          err?.message ||
            "Unable to load available mock tests."
        );
      } finally {
        if (componentActive) {
          setLoading(false);
        }
      }
    }

    loadAssessmentData();

    return () => {
      componentActive = false;
    };
  }, [navigate]);

  const handleSkillChange = (
    mockTestId,
    skillName
  ) => {
    setSelectedSkills((currentSelections) => ({
      ...currentSelections,
      [mockTestId]: skillName,
    }));
  };

  const handleContinue = (mockTest) => {
    setError("");

    if (!mockTest?.id) {
      setError(
        "Mock test information is unavailable."
      );

      return;
    }

    const personalized =
      mockTest.personalized === true;

    /*
     * PERSONALIZED AI TEST
     *
     * Do not ask the student to select one skill.
     * Faculty already selected the verified skills
     * while creating/assigning this test.
     */
    if (personalized) {
      navigate(
        `/student/mock-tests/${mockTest.id}/instructions`,
        {
          state: {
            mockTest,
            selectedSkill: null,
          },
        }
      );

      return;
    }

    /*
     * MANUAL TEST
     *
     * Backend requires one Faculty-verified
     * technical skill.
     */
    const selectedSkill =
      selectedSkills[mockTest.id];

    if (!selectedSkill) {
      setError(
        "Select a Faculty-verified technical skill."
      );

      return;
    }

    navigate(
      `/student/mock-tests/${mockTest.id}/instructions`,
      {
        state: {
          mockTest,
          selectedSkill,
        },
      }
    );
  };

  const getTotalQuestions = (mockTest) => {
    return (
      Number(
        mockTest?.aptitudeQuestionCount || 0
      ) +
      Number(
        mockTest?.reasoningQuestionCount || 0
      ) +
      Number(
        mockTest?.technicalQuestionCount || 0
      )
    );
  };

  const getPersonalizedSkills = (mockTest) => {
    if (!Array.isArray(mockTest?.selectedSkills)) {
      return [];
    }

    return mockTest.selectedSkills.filter(
      (skill) =>
        typeof skill === "string" &&
        skill.trim() !== ""
    );
  };

  const formatAssignedAt = (assignedAt) => {
    if (!assignedAt) {
      return "";
    }

    const date = new Date(assignedAt);

    if (Number.isNaN(date.getTime())) {
      return assignedAt;
    }

    return date.toLocaleString();
  };

  return (
    <main className="question-bank-page">
      <div className="question-bank-container">
        <header className="question-bank-header">
          <div className="question-bank-heading">
            <span>
              Student Assessments
            </span>

            <h1>
              Available Mock Tests
            </h1>

            <p>
              Take manual placement assessments or
              Faculty-assigned personalized AI tests.
            </p>
          </div>

          <button
            type="button"
            className="question-bank-back"
            onClick={() =>
              navigate("/student/dashboard")
            }
          >
            ← Back to Dashboard
          </button>
        </header>

        {error && (
          <div
            className="question-error"
            role="alert"
          >
            {error}
          </div>
        )}

        {loading && (
          <div
            className="question-loading"
            role="status"
          >
            Loading available mock tests...
          </div>
        )}

        {!loading &&
          mockTests.length === 0 && (
            <div className="question-empty">
              No active or assigned mock tests are
              currently available.
            </div>
          )}

        {!loading &&
          mockTests.length > 0 && (
            <div className="question-list">
              {mockTests.map((mockTest) => {
                const personalized =
                  mockTest.personalized === true;

                const personalizedSkills =
                  getPersonalizedSkills(
                    mockTest
                  );

                const manualTestDisabled =
                  !personalized &&
                  verifiedSkills.length === 0;

                const cardKey = personalized
                  ? `personalized-${
                      mockTest.assignmentId ??
                      mockTest.id
                    }`
                  : `manual-${mockTest.id}`;

                return (
                  <article
                    className="question-card"
                    key={cardKey}
                  >
                    <div className="question-card-top">
                      <div className="question-card-badges">
                        <span className="question-badge">
                          ACTIVE
                        </span>

                        <span className="question-badge">
                          {personalized
                            ? "PERSONALIZED AI"
                            : "MANUAL TEST"}
                        </span>

                        <span className="question-badge">
                          {
                            mockTest.durationMinutes
                          }{" "}
                          Minutes
                        </span>

                        <span className="question-badge">
                          Pass:{" "}
                          {
                            mockTest.passPercentage
                          }
                          %
                        </span>
                      </div>

                      <span className="question-badge">
                        Test ID: {mockTest.id}
                      </span>
                    </div>

                    <h3>
                      {mockTest.title}
                    </h3>

                    <div className="question-options-grid">
                      <div className="question-option">
                        Aptitude Questions:{" "}
                        {
                          mockTest
                            .aptitudeQuestionCount
                        }
                      </div>

                      <div className="question-option">
                        Reasoning Questions:{" "}
                        {
                          mockTest
                            .reasoningQuestionCount
                        }
                      </div>

                      <div className="question-option">
                        Technical Questions:{" "}
                        {
                          mockTest
                            .technicalQuestionCount
                        }
                      </div>

                      <div className="question-option correct">
                        Total Questions:{" "}
                        {getTotalQuestions(
                          mockTest
                        )}
                      </div>
                    </div>

                    {personalized ? (
                      <div
                        className="question-form-field"
                        style={{
                          marginTop: "18px",
                        }}
                      >
                        <label>
                          Faculty Selected Verified
                          Skills
                        </label>

                        <div className="question-option correct">
                          {personalizedSkills.length >
                          0
                            ? personalizedSkills.join(
                                ", "
                              )
                            : "Verified skills assigned by Faculty"}
                        </div>

                        {mockTest.assignmentId && (
                          <div
                            className="question-option"
                            style={{
                              marginTop: "10px",
                            }}
                          >
                            Assignment ID:{" "}
                            {
                              mockTest.assignmentId
                            }
                          </div>
                        )}

                        {mockTest.assignedAt && (
                          <div
                            className="question-option"
                            style={{
                              marginTop: "10px",
                            }}
                          >
                            Assigned At:{" "}
                            {formatAssignedAt(
                              mockTest.assignedAt
                            )}
                          </div>
                        )}
                      </div>
                    ) : (
                      <div
                        className="question-form-field"
                        style={{
                          marginTop: "18px",
                        }}
                      >
                        <label
                          htmlFor={`skill-${mockTest.id}`}
                        >
                          Select Verified Technical
                          Skill
                        </label>

                        <select
                          id={`skill-${mockTest.id}`}
                          value={
                            selectedSkills[
                              mockTest.id
                            ] || ""
                          }
                          onChange={(event) =>
                            handleSkillChange(
                              mockTest.id,
                              event.target.value
                            )
                          }
                          disabled={
                            verifiedSkills.length ===
                            0
                          }
                        >
                          {verifiedSkills.length ===
                          0 ? (
                            <option value="">
                              No verified skill
                              available
                            </option>
                          ) : (
                            verifiedSkills.map(
                              (skill) => (
                                <option
                                  value={
                                    skill.skillName
                                  }
                                  key={skill.id}
                                >
                                  {
                                    skill.skillName
                                  }
                                  {" — "}
                                  {
                                    skill.proficiencyLevel
                                  }
                                </option>
                              )
                            )
                          )}
                        </select>

                        {verifiedSkills.length ===
                          0 && (
                          <div
                            className="question-error"
                            style={{
                              marginTop: "10px",
                            }}
                          >
                            A Faculty-verified skill is
                            required for this manual
                            test.
                          </div>
                        )}
                      </div>
                    )}

                    <div className="question-card-actions">
                      <button
                        type="button"
                        className="question-primary-button"
                        onClick={() =>
                          handleContinue(mockTest)
                        }
                        disabled={
                          manualTestDisabled
                        }
                      >
                        View Instructions
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

export default StudentMockTests;