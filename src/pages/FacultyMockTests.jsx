import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";

import FacultyMockTestRetakePanel from
  "../components/FacultyMockTestRetakePanel";
import apiService from "../services/apiService";
import "../styles/facultyQuestionBank.css";

const EMPTY_MANUAL_TEST = {
  title: "",
  aptitudeQuestionCount: "5",
  reasoningQuestionCount: "5",
  technicalQuestionCount: "10",
  durationMinutes: "30",
  active: true,
};

const EMPTY_AI_TEST = {
  studentProfileId: "",
  title: "",
  durationMinutes: "60",
};

const AI_TOTAL_QUESTIONS = 60;
const AI_APTITUDE_QUESTIONS = 15;
const AI_REASONING_QUESTIONS = 15;
const AI_TECHNICAL_QUESTIONS = 30;

function FacultyMockTests() {
  const navigate = useNavigate();

  const [mockTests, setMockTests] = useState([]);
  const [verifiedSkills, setVerifiedSkills] = useState([]);

  const [manualFormData, setManualFormData] =
    useState(EMPTY_MANUAL_TEST);

  const [aiFormData, setAiFormData] =
    useState(EMPTY_AI_TEST);

  const [selectedAiSkills, setSelectedAiSkills] =
    useState([]);

  const [generatedQuestions, setGeneratedQuestions] =
    useState([]);

  const [approvedQuestionIds, setApprovedQuestionIds] =
    useState([]);

  const [loading, setLoading] = useState(true);

  const [savingManual, setSavingManual] =
    useState(false);

  const [generatingAi, setGeneratingAi] =
    useState(false);

  const [approvingAi, setApprovingAi] =
    useState(false);

  const [creatingAi, setCreatingAi] =
    useState(false);

  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const handleUnauthorized = (err) => {
    if (err?.status === 401) {
      navigate("/login", {
        replace: true,
      });

      return true;
    }

    return false;
  };

  const loadMockTests = async () => {
    const data = await apiService.get(
      "/api/faculty/mock-tests"
    );

    setMockTests(
      Array.isArray(data)
        ? data
        : []
    );
  };

  useEffect(() => {
    let componentActive = true;

    async function loadPageData() {
      try {
        setLoading(true);
        setError("");

        const [
          mockTestData,
          verifiedSkillData,
        ] = await Promise.all([
          apiService.get(
            "/api/faculty/mock-tests"
          ),

          apiService.get(
            "/api/faculty/skills/verified"
          ),
        ]);

        if (!componentActive) {
          return;
        }

        setMockTests(
          Array.isArray(mockTestData)
            ? mockTestData
            : []
        );

        setVerifiedSkills(
          Array.isArray(verifiedSkillData)
            ? verifiedSkillData.filter(
                (skill) =>
                  skill?.status === "VERIFIED" &&
                  skill?.studentProfileId != null &&
                  typeof skill?.skillName ===
                    "string" &&
                  skill.skillName.trim() !== ""
              )
            : []
        );
      } catch (err) {
        if (!componentActive) {
          return;
        }

        if (handleUnauthorized(err)) {
          return;
        }

        setError(
          err?.message ||
            "Unable to load mock-test data."
        );
      } finally {
        if (componentActive) {
          setLoading(false);
        }
      }
    }

    loadPageData();

    return () => {
      componentActive = false;
    };
  }, [navigate]);

  const studentsWithVerifiedSkills =
    useMemo(() => {
      const studentMap = new Map();

      verifiedSkills.forEach((skill) => {
        const studentId =
          skill.studentProfileId;

        if (!studentMap.has(studentId)) {
          studentMap.set(studentId, {
            studentProfileId: studentId,

            studentName:
              skill.studentName ||
              `Student ${studentId}`,

            username:
              skill.username || "",

            skills: [],
          });
        }

        const student =
          studentMap.get(studentId);

        const alreadyAdded =
          student.skills.some(
            (existingSkill) =>
              existingSkill.skillName
                .trim()
                .toLowerCase() ===
              skill.skillName
                .trim()
                .toLowerCase()
          );

        if (!alreadyAdded) {
          student.skills.push(skill);
        }
      });

      return Array.from(
        studentMap.values()
      ).sort(
        (
          firstStudent,
          secondStudent
        ) =>
          firstStudent.studentName.localeCompare(
            secondStudent.studentName
          )
      );
    }, [verifiedSkills]);

  const selectedStudent = useMemo(() => {
    if (!aiFormData.studentProfileId) {
      return null;
    }

    return (
      studentsWithVerifiedSkills.find(
        (student) =>
          String(
            student.studentProfileId
          ) ===
          String(
            aiFormData.studentProfileId
          )
      ) || null
    );
  }, [
    aiFormData.studentProfileId,
    studentsWithVerifiedSkills,
  ]);

  const aiQuestionCounts = useMemo(() => {
    return generatedQuestions.reduce(
      (counts, question) => {
        if (
          question?.category ===
          "APTITUDE"
        ) {
          counts.aptitude += 1;
        } else if (
          question?.category ===
          "REASONING"
        ) {
          counts.reasoning += 1;
        } else if (
          question?.category ===
          "TECHNICAL"
        ) {
          counts.technical += 1;
        }

        return counts;
      },
      {
        aptitude: 0,
        reasoning: 0,
        technical: 0,
      }
    );
  }, [generatedQuestions]);

  const aiQuestionsApproved =
    approvedQuestionIds.length ===
    AI_TOTAL_QUESTIONS;

  const handleManualChange = (
    event
  ) => {
    const {
      name,
      value,
      type,
      checked,
    } = event.target;

    setManualFormData(
      (currentData) => ({
        ...currentData,

        [name]:
          type === "checkbox"
            ? checked
            : value,
      })
    );
  };

  const convertToCount = (value) => {
    return Number.parseInt(
      value,
      10
    );
  };

  const handleManualSubmit =
    async (event) => {
      event.preventDefault();

      setError("");
      setSuccess("");

      const aptitudeCount =
        convertToCount(
          manualFormData
            .aptitudeQuestionCount
        );

      const reasoningCount =
        convertToCount(
          manualFormData
            .reasoningQuestionCount
        );

      const technicalCount =
        convertToCount(
          manualFormData
            .technicalQuestionCount
        );

      const duration =
        convertToCount(
          manualFormData.durationMinutes
        );

      const countsAreValid = [
        aptitudeCount,
        reasoningCount,
        technicalCount,
      ].every(
        (count) =>
          Number.isInteger(count) &&
          count >= 0
      );

      if (!countsAreValid) {
        setError(
          "Question counts must be zero or positive whole numbers."
        );

        return;
      }

      const totalQuestions =
        aptitudeCount +
        reasoningCount +
        technicalCount;

      if (totalQuestions <= 0) {
        setError(
          "The mock test must contain at least one question."
        );

        return;
      }

      if (
        !Number.isInteger(duration) ||
        duration <= 0
      ) {
        setError(
          "Duration must be greater than zero."
        );

        return;
      }

      const mockTestRequest = {
        title:
          manualFormData.title.trim(),

        aptitudeQuestionCount:
          aptitudeCount,

        reasoningQuestionCount:
          reasoningCount,

        technicalQuestionCount:
          technicalCount,

        durationMinutes:
          duration,

        active:
          manualFormData.active,
      };

      try {
        setSavingManual(true);

        const createdMockTest =
          await apiService.post(
            "/api/faculty/mock-tests",
            mockTestRequest
          );

        setMockTests(
          (currentMockTests) => [
            createdMockTest,
            ...currentMockTests,
          ]
        );

        setManualFormData(
          EMPTY_MANUAL_TEST
        );

        setSuccess(
          "Manual mock test created successfully."
        );
      } catch (err) {
        if (
          handleUnauthorized(err)
        ) {
          return;
        }

        setError(
          err?.message ||
            "Unable to create the manual mock test."
        );
      } finally {
        setSavingManual(false);
      }
    };

  const resetAiQuestionWorkflow =
    () => {
      setGeneratedQuestions([]);
      setApprovedQuestionIds([]);
    };

  const handleAiStudentChange = (
    event
  ) => {
    const studentProfileId =
      event.target.value;

    setAiFormData(
      (currentData) => ({
        ...currentData,
        studentProfileId,
      })
    );

    setSelectedAiSkills([]);

    resetAiQuestionWorkflow();

    setError("");
    setSuccess("");
  };

  const handleAiFormChange = (
    event
  ) => {
    const {
      name,
      value,
    } = event.target;

    setAiFormData(
      (currentData) => ({
        ...currentData,
        [name]: value,
      })
    );
  };

  const handleAiSkillToggle = (
    skillName
  ) => {
    if (
      generatedQuestions.length > 0 ||
      aiQuestionsApproved
    ) {
      return;
    }

    setSelectedAiSkills(
      (currentSkills) => {
        const exists =
          currentSkills.some(
            (skill) =>
              skill.toLowerCase() ===
              skillName.toLowerCase()
          );

        if (exists) {
          return currentSkills.filter(
            (skill) =>
              skill.toLowerCase() !==
              skillName.toLowerCase()
          );
        }

        return [
          ...currentSkills,
          skillName,
        ];
      }
    );
  };

  const validateAiSelection = () => {
    const studentProfileId =
      Number(
        aiFormData.studentProfileId
      );

    if (
      !Number.isInteger(
        studentProfileId
      ) ||
      studentProfileId <= 0
    ) {
      setError(
        "Select a student who has Faculty-verified skills."
      );

      return null;
    }

    if (
      selectedAiSkills.length === 0
    ) {
      setError(
        "Select at least one verified technical skill."
      );

      return null;
    }

    return studentProfileId;
  };

  const handleGenerateAiQuestions =
    async () => {
      setError("");
      setSuccess("");

      const studentProfileId =
        validateAiSelection();

      if (!studentProfileId) {
        return;
      }

      try {
        setGeneratingAi(true);

        setApprovedQuestionIds([]);

        const generated =
          await apiService.post(
            "/api/faculty/ai/questions/generate",
            {
              studentProfileId,

              selectedSkills:
                selectedAiSkills,
            }
          );

        if (
          !Array.isArray(generated) ||
          generated.length !==
            AI_TOTAL_QUESTIONS
        ) {
          throw new Error(
            "AI generation must return exactly 60 questions."
          );
        }

        const editableQuestions =
          generated.map(
            (question) => ({
              questionText:
                question?.questionText ||
                "",

              optionA:
                question?.optionA || "",

              optionB:
                question?.optionB || "",

              optionC:
                question?.optionC || "",

              optionD:
                question?.optionD || "",

              correctOption: (
                question?.correctOption ||
                ""
              ).toUpperCase(),

              category:
                question?.category || "",

              technicalSkill:
                question?.category ===
                "TECHNICAL"
                  ? question
                      ?.technicalSkill ||
                    ""
                  : null,
            })
          );

        setGeneratedQuestions(
          editableQuestions
        );

        setSuccess(
          "60 AI questions generated. Review and edit them before approval."
        );
      } catch (err) {
        if (
          handleUnauthorized(err)
        ) {
          return;
        }

        setGeneratedQuestions([]);
        setApprovedQuestionIds([]);

        setError(
          err?.message ||
            "Unable to generate AI questions."
        );
      } finally {
        setGeneratingAi(false);
      }
    };

  const handleAiQuestionChange = (
    questionIndex,
    field,
    value
  ) => {
    if (aiQuestionsApproved) {
      return;
    }

    setGeneratedQuestions(
      (currentQuestions) =>
        currentQuestions.map(
          (question, index) => {
            if (
              index !== questionIndex
            ) {
              return question;
            }

            return {
              ...question,

              [field]:
                field ===
                "correctOption"
                  ? value.toUpperCase()
                  : value,
            };
          }
        )
    );
  };

  const buildApprovalQuestions =
    () => {
      return generatedQuestions.map(
        (question) => ({
          questionText:
            question.questionText.trim(),

          optionA:
            question.optionA.trim(),

          optionB:
            question.optionB.trim(),

          optionC:
            question.optionC.trim(),

          optionD:
            question.optionD.trim(),

          correctOption:
            question.correctOption
              .trim()
              .toUpperCase(),

          category:
            question.category,

          technicalSkill:
            question.category ===
            "TECHNICAL"
              ? question.technicalSkill
                  ?.trim() || ""
              : null,
        })
      );
    };

  const validateGeneratedQuestions = (
    questions
  ) => {
    if (
      questions.length !==
      AI_TOTAL_QUESTIONS
    ) {
      return "Exactly 60 AI questions are required before approval.";
    }

    const aptitudeCount =
      questions.filter(
        (question) =>
          question.category ===
          "APTITUDE"
      ).length;

    const reasoningCount =
      questions.filter(
        (question) =>
          question.category ===
          "REASONING"
      ).length;

    const technicalCount =
      questions.filter(
        (question) =>
          question.category ===
          "TECHNICAL"
      ).length;

    if (
      aptitudeCount !==
        AI_APTITUDE_QUESTIONS ||
      reasoningCount !==
        AI_REASONING_QUESTIONS ||
      technicalCount !==
        AI_TECHNICAL_QUESTIONS
    ) {
      return "AI questions must remain 15 Aptitude, 15 Reasoning and 30 Technical.";
    }

    for (
      let index = 0;
      index < questions.length;
      index += 1
    ) {
      const question =
        questions[index];

      if (
        !question.questionText ||
        !question.optionA ||
        !question.optionB ||
        !question.optionC ||
        !question.optionD
      ) {
        return `Question ${
          index + 1
        } must contain question text and all four options.`;
      }

      if (
        ![
          "A",
          "B",
          "C",
          "D",
        ].includes(
          question.correctOption
        )
      ) {
        return `Question ${
          index + 1
        } must have correct option A, B, C or D.`;
      }

      const normalizedOptions =
        new Set([
          question.optionA
            .trim()
            .toLowerCase(),

          question.optionB
            .trim()
            .toLowerCase(),

          question.optionC
            .trim()
            .toLowerCase(),

          question.optionD
            .trim()
            .toLowerCase(),
        ]);

      if (
        normalizedOptions.size !== 4
      ) {
        return `Question ${
          index + 1
        } must have four different answer options.`;
      }

      if (
        question.category ===
          "TECHNICAL" &&
        !question.technicalSkill
      ) {
        return `Question ${
          index + 1
        } is technical and must keep its assigned verified skill.`;
      }
    }

    return "";
  };

  const handleApproveAiQuestions =
    async () => {
      setError("");
      setSuccess("");

      const studentProfileId =
        validateAiSelection();

      if (!studentProfileId) {
        return;
      }

      const questions =
        buildApprovalQuestions();

      const validationError =
        validateGeneratedQuestions(
          questions
        );

      if (validationError) {
        setError(validationError);

        return;
      }

      try {
        setApprovingAi(true);

        const approved =
          await apiService.post(
            "/api/faculty/ai/questions/approve",
            {
              studentProfileId,

              selectedSkills:
                selectedAiSkills,

              questions,
            }
          );

        if (
          !Array.isArray(approved) ||
          approved.length !==
            AI_TOTAL_QUESTIONS
        ) {
          throw new Error(
            "Question approval must return exactly 60 saved questions."
          );
        }

        const questionIds =
          approved.map(
            (question) =>
              question?.id
          );

        const validIds =
          questionIds.every(
            (questionId) =>
              Number.isInteger(
                Number(questionId)
              ) &&
              Number(questionId) > 0
          );

        if (!validIds) {
          throw new Error(
            "Approved question IDs are missing from the server response."
          );
        }

        setApprovedQuestionIds(
          questionIds.map(Number)
        );

        setGeneratedQuestions(
          approved.map(
            (question) => ({
              questionText:
                question?.questionText ||
                "",

              optionA:
                question?.optionA || "",

              optionB:
                question?.optionB || "",

              optionC:
                question?.optionC || "",

              optionD:
                question?.optionD || "",

              correctOption: (
                question?.correctOption ||
                ""
              ).toUpperCase(),

              category:
                question?.category || "",

              technicalSkill:
                question?.category ===
                "TECHNICAL"
                  ? question
                      ?.technicalSkill ||
                    ""
                  : null,
            })
          )
        );

        setSuccess(
          "All 60 questions are approved and saved in the official Question Bank. Now create and assign the personalized test."
        );
      } catch (err) {
        if (
          handleUnauthorized(err)
        ) {
          return;
        }

        setError(
          err?.message ||
            "Unable to approve the AI questions."
        );
      } finally {
        setApprovingAi(false);
      }
    };

  const handleCreateAiMockTest =
    async () => {
      setError("");
      setSuccess("");

      const studentProfileId =
        validateAiSelection();

      if (!studentProfileId) {
        return;
      }

      if (!aiQuestionsApproved) {
        setError(
          "Approve all 60 AI questions before creating the personalized test."
        );

        return;
      }

      const title =
        aiFormData.title.trim();

      if (!title) {
        setError(
          "Enter a title for the personalized AI mock test."
        );

        return;
      }

      const durationMinutes =
        Number.parseInt(
          aiFormData.durationMinutes,
          10
        );

      if (
        !Number.isInteger(
          durationMinutes
        ) ||
        durationMinutes < 1 ||
        durationMinutes > 180
      ) {
        setError(
          "AI test duration must be between 1 and 180 minutes."
        );

        return;
      }

      try {
        setCreatingAi(true);

        const created =
          await apiService.post(
            "/api/faculty/ai/mock-tests/create",
            {
              studentProfileId,

              title,

              selectedSkills:
                selectedAiSkills,

              questionIds:
                approvedQuestionIds,

              durationMinutes,
            }
          );

        await loadMockTests();

        const createdTitle =
          created?.title || title;

        setAiFormData(
          EMPTY_AI_TEST
        );

        setSelectedAiSkills([]);
        setGeneratedQuestions([]);
        setApprovedQuestionIds([]);

        setSuccess(
          `Personalized AI mock test "${createdTitle}" created and assigned successfully.`
        );
      } catch (err) {
        if (
          handleUnauthorized(err)
        ) {
          return;
        }

        setError(
          err?.message ||
            "Unable to create the personalized AI mock test."
        );
      } finally {
        setCreatingAi(false);
      }
    };

  const handleDiscardAiDraft =
    () => {
      setGeneratedQuestions([]);
      setApprovedQuestionIds([]);

      setError("");

      setSuccess(
        "AI question draft cleared. You can change the student or skills and generate a new batch."
      );
    };

  const getTotalQuestions = (
    mockTest
  ) => {
    return (
      Number(
        mockTest
          ?.aptitudeQuestionCount || 0
      ) +
      Number(
        mockTest
          ?.reasoningQuestionCount || 0
      ) +
      Number(
        mockTest
          ?.technicalQuestionCount || 0
      )
    );
  };

  const pageBusy =
    savingManual ||
    generatingAi ||
    approvingAi ||
    creatingAi;

  return (
    <main className="question-bank-page">
      <div className="question-bank-container">
        <header className="question-bank-header">
          <div className="question-bank-heading">
            <span>
              Faculty Mock Tests
            </span>

            <h1>
              Placement Assessment Management
            </h1>

            <p>
              Create manual mock tests or build a
              student-specific 60-question AI
              assessment from Faculty-verified
              skills.
            </p>
          </div>

          <button
            type="button"
            className="question-bank-back"
            onClick={() =>
              navigate(
                "/faculty/dashboard"
              )
            }
            disabled={pageBusy}
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

        {success && (
          <div
            className="question-success"
            role="status"
          >
            {success}
          </div>
        )}

        {/* ================= MANUAL TEST ================= */}

        <form
          className="question-form-card"
          onSubmit={
            handleManualSubmit
          }
        >
          <div className="question-form-header">
            <h2>
              Create Manual Mock Test
            </h2>

            <p>
              Existing manual flow:
              configure the aptitude,
              reasoning and technical
              question counts. Students
              choose one Faculty-verified
              technical skill before
              starting.
            </p>
          </div>

          <div className="question-form-grid">
            <div className="question-form-field full-width">
              <label htmlFor="manual-title">
                Test Title
              </label>

              <input
                id="manual-title"
                name="title"
                type="text"
                placeholder="Example: Placement Mock Test 1"
                value={
                  manualFormData.title
                }
                onChange={
                  handleManualChange
                }
                disabled={
                  savingManual
                }
                required
              />
            </div>

            <div className="question-form-field">
              <label htmlFor="aptitudeQuestionCount">
                Aptitude Questions
              </label>

              <input
                id="aptitudeQuestionCount"
                name="aptitudeQuestionCount"
                type="number"
                min="0"
                value={
                  manualFormData
                    .aptitudeQuestionCount
                }
                onChange={
                  handleManualChange
                }
                disabled={
                  savingManual
                }
                required
              />
            </div>

            <div className="question-form-field">
              <label htmlFor="reasoningQuestionCount">
                Reasoning Questions
              </label>

              <input
                id="reasoningQuestionCount"
                name="reasoningQuestionCount"
                type="number"
                min="0"
                value={
                  manualFormData
                    .reasoningQuestionCount
                }
                onChange={
                  handleManualChange
                }
                disabled={
                  savingManual
                }
                required
              />
            </div>

            <div className="question-form-field">
              <label htmlFor="technicalQuestionCount">
                Technical Questions
              </label>

              <input
                id="technicalQuestionCount"
                name="technicalQuestionCount"
                type="number"
                min="0"
                value={
                  manualFormData
                    .technicalQuestionCount
                }
                onChange={
                  handleManualChange
                }
                disabled={
                  savingManual
                }
                required
              />
            </div>

            <div className="question-form-field">
              <label htmlFor="manual-durationMinutes">
                Duration in Minutes
              </label>

              <input
                id="manual-durationMinutes"
                name="durationMinutes"
                type="number"
                min="1"
                value={
                  manualFormData
                    .durationMinutes
                }
                onChange={
                  handleManualChange
                }
                disabled={
                  savingManual
                }
                required
              />
            </div>

            <div className="question-form-field full-width">
              <label htmlFor="active">
                Test Availability
              </label>

              <label
                htmlFor="active"
                style={{
                  minHeight: "49px",
                  padding: "0 14px",
                  display: "flex",
                  alignItems: "center",
                  gap: "10px",
                  border:
                    "1px solid rgba(96, 165, 250, 0.24)",
                  borderRadius:
                    "10px",
                  background:
                    "rgba(18, 43, 70, 0.86)",
                  cursor:
                    "pointer",
                }}
              >
                <input
                  id="active"
                  name="active"
                  type="checkbox"
                  checked={
                    manualFormData.active
                  }
                  onChange={
                    handleManualChange
                  }
                  disabled={
                    savingManual
                  }
                  style={{
                    width: "18px",
                    height: "18px",
                  }}
                />

                Make this manual mock
                test active
              </label>
            </div>
          </div>

          <div className="question-form-actions">
            <button
              type="submit"
              className="question-primary-button"
              disabled={
                savingManual
              }
            >
              {savingManual
                ? "Creating Manual Test..."
                : "Create Manual Test"}
            </button>
          </div>
        </form>

        {/* ================= AI TEST ================= */}

        <section
          className="question-form-card"
          aria-labelledby="ai-test-title"
        >
          <div className="question-form-header">
            <span className="question-badge">
              PERSONALIZED AI
            </span>

            <h2 id="ai-test-title">
              Create with AI
            </h2>

            <p>
              Select one student and one or
              more of that student's
              Faculty-verified skills.
              CAMPUS-IQ generates exactly
              15 Aptitude, 15 Reasoning and
              30 Technical questions.
              Review the full batch before
              approving and assigning it.
            </p>
          </div>

          {loading ? (
            <div
              className="question-loading"
              role="status"
            >
              Loading verified student
              skills...
            </div>
          ) : studentsWithVerifiedSkills
              .length === 0 ? (
            <div className="question-empty">
              No students currently have
              Faculty-verified technical
              skills. Verify a student skill
              before creating a personalized
              AI test.
            </div>
          ) : (
            <>
              <div className="question-form-grid">
                <div className="question-form-field full-width">
                  <label htmlFor="ai-student">
                    Student
                  </label>

                  <select
                    id="ai-student"
                    value={
                      aiFormData
                        .studentProfileId
                    }
                    onChange={
                      handleAiStudentChange
                    }
                    disabled={
                      generatingAi ||
                      approvingAi ||
                      creatingAi ||
                      generatedQuestions
                        .length > 0
                    }
                  >
                    <option value="">
                      Select student
                    </option>

                    {studentsWithVerifiedSkills.map(
                      (student) => (
                        <option
                          key={
                            student
                              .studentProfileId
                          }
                          value={
                            student
                              .studentProfileId
                          }
                        >
                          {
                            student.studentName
                          }
                          {student.username
                            ? ` (${student.username})`
                            : ""}
                        </option>
                      )
                    )}
                  </select>
                </div>

                {selectedStudent && (
                  <div className="question-form-field full-width">
                    <label>
                      Select
                      Faculty-Verified
                      Technical Skills
                    </label>

                    <div
                      style={{
                        display:
                          "grid",

                        gridTemplateColumns:
                          "repeat(auto-fit, minmax(190px, 1fr))",

                        gap: "10px",
                      }}
                    >
                      {selectedStudent.skills.map(
                        (skill) => {
                          const checked =
                            selectedAiSkills.some(
                              (
                                selectedSkill
                              ) =>
                                selectedSkill.toLowerCase() ===
                                skill.skillName.toLowerCase()
                            );

                          return (
                            <label
                              key={
                                skill.id
                              }
                              style={{
                                minHeight:
                                  "54px",

                                padding:
                                  "10px 12px",

                                display:
                                  "flex",

                                alignItems:
                                  "center",

                                gap: "10px",

                                border:
                                  "1px solid rgba(96, 165, 250, 0.24)",

                                borderRadius:
                                  "10px",

                                background:
                                  "rgba(18, 43, 70, 0.86)",

                                cursor:
                                  generatedQuestions.length >
                                  0
                                    ? "not-allowed"
                                    : "pointer",
                              }}
                            >
                              <input
                                type="checkbox"
                                checked={
                                  checked
                                }
                                disabled={
                                  generatingAi ||
                                  approvingAi ||
                                  creatingAi ||
                                  generatedQuestions.length >
                                    0
                                }
                                onChange={() =>
                                  handleAiSkillToggle(
                                    skill.skillName
                                  )
                                }
                                style={{
                                  width:
                                    "18px",
                                  height:
                                    "18px",
                                }}
                              />

                              <span>
                                <strong>
                                  {
                                    skill.skillName
                                  }
                                </strong>

                                {skill.proficiencyLevel
                                  ? ` — ${skill.proficiencyLevel}`
                                  : ""}
                              </span>
                            </label>
                          );
                        }
                      )}
                    </div>
                  </div>
                )}

                <div className="question-form-field full-width">
                  <label htmlFor="ai-title">
                    Personalized Test
                    Title
                  </label>

                  <input
                    id="ai-title"
                    name="title"
                    type="text"
                    placeholder="Example: Dhiraj - Java Spring Boot Assessment"
                    value={
                      aiFormData.title
                    }
                    onChange={
                      handleAiFormChange
                    }
                    disabled={
                      creatingAi
                    }
                  />
                </div>

                <div className="question-form-field">
                  <label htmlFor="ai-durationMinutes">
                    Duration in Minutes
                  </label>

                  <input
                    id="ai-durationMinutes"
                    name="durationMinutes"
                    type="number"
                    min="1"
                    max="180"
                    value={
                      aiFormData
                        .durationMinutes
                    }
                    onChange={
                      handleAiFormChange
                    }
                    disabled={
                      creatingAi
                    }
                  />
                </div>

                <div className="question-form-field">
                  <label>
                    Fixed AI Blueprint
                  </label>

                  <div className="question-option correct">
                    60 Marks / 60 Questions
                    — 15 Aptitude + 15
                    Reasoning + 30 Technical
                    — Pass 45%
                  </div>
                </div>
              </div>

              <div className="question-form-actions">
                {generatedQuestions
                  .length === 0 && (
                  <button
                    type="button"
                    className="question-primary-button"
                    onClick={
                      handleGenerateAiQuestions
                    }
                    disabled={
                      generatingAi ||
                      !aiFormData
                        .studentProfileId ||
                      selectedAiSkills
                        .length === 0
                    }
                  >
                    {generatingAi
                      ? "Generating 60 Questions..."
                      : "Generate 60 Questions with AI"}
                  </button>
                )}

                {generatedQuestions
                  .length > 0 &&
                  !aiQuestionsApproved && (
                    <>
                      <button
                        type="button"
                        className="question-secondary-button"
                        onClick={
                          handleDiscardAiDraft
                        }
                        disabled={
                          generatingAi ||
                          approvingAi
                        }
                      >
                        Discard Draft
                      </button>

                      <button
                        type="button"
                        className="question-secondary-button"
                        onClick={
                          handleGenerateAiQuestions
                        }
                        disabled={
                          generatingAi ||
                          approvingAi
                        }
                      >
                        {generatingAi
                          ? "Regenerating..."
                          : "Regenerate All 60"}
                      </button>

                      <button
                        type="button"
                        className="question-primary-button"
                        onClick={
                          handleApproveAiQuestions
                        }
                        disabled={
                          approvingAi
                        }
                      >
                        {approvingAi
                          ? "Approving Questions..."
                          : "Approve 60 Questions"}
                      </button>
                    </>
                  )}

                {aiQuestionsApproved && (
                  <button
                    type="button"
                    className="question-primary-button"
                    onClick={
                      handleCreateAiMockTest
                    }
                    disabled={
                      creatingAi
                    }
                  >
                    {creatingAi
                      ? "Creating & Assigning Test..."
                      : "Create & Assign Personalized Test"}
                  </button>
                )}
              </div>
            </>
          )}

          {/* ============= AI QUESTION REVIEW ============= */}

          {generatedQuestions.length >
            0 && (
            <section
              aria-labelledby="ai-question-review-title"
              style={{
                marginTop: "28px",
              }}
            >
              <div className="question-list-header">
                <span>
                  {aiQuestionsApproved
                    ? "APPROVED QUESTION BANK BATCH"
                    : "FACULTY REVIEW REQUIRED"}
                </span>

                <h2 id="ai-question-review-title">
                  AI Question Review (
                  {
                    generatedQuestions.length
                  }
                  /60)
                </h2>

                <p>
                  Aptitude:{" "}
                  {
                    aiQuestionCounts.aptitude
                  }
                  /15
                  {" | "}
                  Reasoning:{" "}
                  {
                    aiQuestionCounts.reasoning
                  }
                  /15
                  {" | "}
                  Technical:{" "}
                  {
                    aiQuestionCounts.technical
                  }
                  /30
                </p>

                {!aiQuestionsApproved && (
                  <p>
                    You may edit question
                    text, options and the
                    correct answer. Category
                    and technical skill are
                    locked so the required
                    15/15/30 blueprint and
                    multi-skill balance are
                    not accidentally broken.
                  </p>
                )}
              </div>

              <div className="question-list">
                {generatedQuestions.map(
                  (
                    question,
                    index
                  ) => (
                    <article
                      className="question-card"
                      key={`${question.category}-${index}`}
                    >
                      <div className="question-card-top">
                        <div className="question-card-badges">
                          <span className="question-badge">
                            Question{" "}
                            {index + 1}
                          </span>

                          <span className="question-badge">
                            {
                              question.category
                            }
                          </span>

                          {question.category ===
                            "TECHNICAL" && (
                            <span className="question-badge">
                              {
                                question.technicalSkill
                              }
                            </span>
                          )}
                        </div>

                        {aiQuestionsApproved && (
                          <span className="question-badge">
                            APPROVED
                          </span>
                        )}
                      </div>

                      <div className="question-form-grid">
                        <div className="question-form-field full-width">
                          <label
                            htmlFor={`ai-question-${index}`}
                          >
                            Question Text
                          </label>

                          <textarea
                            id={`ai-question-${index}`}
                            rows="3"
                            value={
                              question.questionText
                            }
                            disabled={
                              aiQuestionsApproved
                            }
                            onChange={(
                              event
                            ) =>
                              handleAiQuestionChange(
                                index,
                                "questionText",
                                event.target
                                  .value
                              )
                            }
                          />
                        </div>

                        {[
                          "A",
                          "B",
                          "C",
                          "D",
                        ].map(
                          (
                            optionLetter
                          ) => {
                            const field =
                              `option${optionLetter}`;

                            return (
                              <div
                                className="question-form-field"
                                key={
                                  field
                                }
                              >
                                <label
                                  htmlFor={`ai-${field}-${index}`}
                                >
                                  Option{" "}
                                  {
                                    optionLetter
                                  }
                                </label>

                                <input
                                  id={`ai-${field}-${index}`}
                                  type="text"
                                  value={
                                    question[
                                      field
                                    ] ||
                                    ""
                                  }
                                  disabled={
                                    aiQuestionsApproved
                                  }
                                  onChange={(
                                    event
                                  ) =>
                                    handleAiQuestionChange(
                                      index,
                                      field,
                                      event
                                        .target
                                        .value
                                    )
                                  }
                                />
                              </div>
                            );
                          }
                        )}

                        <div className="question-form-field">
                          <label
                            htmlFor={`ai-correct-${index}`}
                          >
                            Correct Option
                          </label>

                          <select
                            id={`ai-correct-${index}`}
                            value={
                              question.correctOption
                            }
                            disabled={
                              aiQuestionsApproved
                            }
                            onChange={(
                              event
                            ) =>
                              handleAiQuestionChange(
                                index,
                                "correctOption",
                                event
                                  .target
                                  .value
                              )
                            }
                          >
                            <option value="A">
                              A
                            </option>

                            <option value="B">
                              B
                            </option>

                            <option value="C">
                              C
                            </option>

                            <option value="D">
                              D
                            </option>
                          </select>
                        </div>

                        <div className="question-form-field">
                          <label>
                            Question Source
                          </label>

                          <div className="question-option correct">
                            {question.category ===
                            "TECHNICAL"
                              ? `${question.category} — ${question.technicalSkill}`
                              : question.category}
                          </div>
                        </div>
                      </div>
                    </article>
                  )
                )}
              </div>
            </section>
          )}
        </section>

        {/* ================= CREATED TESTS ================= */}

        <section
          aria-labelledby="mock-test-list-title"
        >
          <div className="question-list-header">
            <span>
              Assessment Records
            </span>

            <h2 id="mock-test-list-title">
              Created Mock Tests (
              {mockTests.length})
            </h2>

            <p>
              Review both manual and
              personalized AI placement
              assessments.
            </p>
          </div>

          {loading && (
            <div
              className="question-loading"
              role="status"
            >
              Loading mock tests...
            </div>
          )}

          {!loading &&
            mockTests.length === 0 && (
              <div className="question-empty">
                No mock tests are
                available.
              </div>
            )}

          {!loading &&
            mockTests.length > 0 && (
              <div className="question-list">
                {mockTests.map(
                  (mockTest) => {
                    const personalized =
                      mockTest
                        ?.personalized ===
                      true;

                    const testSkills =
                      Array.isArray(
                        mockTest
                          ?.selectedSkills
                      )
                        ? mockTest.selectedSkills
                        : [];

                    return (
                      <article
                        className="question-card"
                        key={
                          mockTest.id
                        }
                      >
                        <div className="question-card-top">
                          <div className="question-card-badges">
                            <span className="question-badge">
                              {mockTest.active
                                ? "ACTIVE"
                                : "INACTIVE"}
                            </span>

                            <span className="question-badge">
                              {personalized
                                ? "PERSONALIZED AI"
                                : "MANUAL"}
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
                            ID:{" "}
                            {
                              mockTest.id
                            }
                          </span>
                        </div>

                        <h3>
                          {
                            mockTest.title
                          }
                        </h3>

                        {personalized &&
                          testSkills.length >
                            0 && (
                            <div
                              className="question-option correct"
                              style={{
                                marginBottom:
                                  "12px",
                              }}
                            >
                              Verified Skills:{" "}
                              {testSkills.join(
                                ", "
                              )}
                            </div>
                          )}

                        <div className="question-options-grid">
                          <div className="question-option">
                            Aptitude:{" "}
                            {
                              mockTest
                                .aptitudeQuestionCount
                            }
                          </div>

                          <div className="question-option">
                            Reasoning:{" "}
                            {
                              mockTest
                                .reasoningQuestionCount
                            }
                          </div>

                          <div className="question-option">
                            Technical:{" "}
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
                      </article>
                    );
                  }
                )}
              </div>
            )}
        </section>
           <FacultyMockTestRetakePanel
          onUnauthorized={handleUnauthorized}
        />
      </div>
    </main>
  );
}

export default FacultyMockTests;