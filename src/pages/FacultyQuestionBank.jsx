import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

import apiService from "../services/apiService";
import "../styles/facultyQuestionBank.css";

const EMPTY_QUESTION = {
  questionText: "",
  optionA: "",
  optionB: "",
  optionC: "",
  optionD: "",
  correctOption: "A",
  category: "APTITUDE",
  technicalSkill: "",
};

function FacultyQuestionBank() {
  const navigate = useNavigate();

  const [questions, setQuestions] = useState([]);

  const [formData, setFormData] =
    useState(EMPTY_QUESTION);

  const [editingQuestionId, setEditingQuestionId] =
    useState(null);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [deletingQuestionId, setDeletingQuestionId] =
    useState(null);

  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  useEffect(() => {
    let componentActive = true;

    async function loadQuestions() {
      try {
        setLoading(true);
        setError("");

        const questionData =
          await apiService.get(
            "/api/faculty/questions"
          );

        if (!componentActive) {
          return;
        }

        setQuestions(
          Array.isArray(questionData)
            ? questionData
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
            "Unable to load the Question Bank."
        );

      } finally {
        if (componentActive) {
          setLoading(false);
        }
      }
    }

    loadQuestions();

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

  const resetForm = () => {
    setFormData(EMPTY_QUESTION);
    setEditingQuestionId(null);
  };

  const handleSubmit = async (event) => {
    event.preventDefault();

    setError("");
    setSuccess("");

    const questionRequest = {
      questionText:
        formData.questionText.trim(),

      optionA: formData.optionA.trim(),
      optionB: formData.optionB.trim(),
      optionC: formData.optionC.trim(),
      optionD: formData.optionD.trim(),

      correctOption: formData.correctOption,
      category: formData.category,

      technicalSkill:
        formData.category === "TECHNICAL"
          ? formData.technicalSkill.trim()
          : "",
    };

    try {
      setSaving(true);

      if (editingQuestionId) {
        const updatedQuestion =
          await apiService.put(
            `/api/faculty/questions/${editingQuestionId}`,
            questionRequest
          );

        setQuestions((currentQuestions) =>
          currentQuestions.map((question) =>
            question.id === editingQuestionId
              ? updatedQuestion
              : question
          )
        );

        setSuccess(
          "Question updated successfully."
        );

      } else {
        const createdQuestion =
          await apiService.post(
            "/api/faculty/questions",
            questionRequest
          );

        setQuestions((currentQuestions) => [
          createdQuestion,
          ...currentQuestions,
        ]);

        setSuccess(
          "Question added successfully."
        );
      }

      resetForm();

    } catch (err) {
      if (err.status === 401) {
        navigate("/login", {
          replace: true,
        });

        return;
      }

      setError(
        err.message ||
          "Unable to save the question."
      );

    } finally {
      setSaving(false);
    }
  };

  const handleEdit = (question) => {
    setEditingQuestionId(question.id);

    setFormData({
      questionText:
        question.questionText ?? "",

      optionA: question.optionA ?? "",
      optionB: question.optionB ?? "",
      optionC: question.optionC ?? "",
      optionD: question.optionD ?? "",

      correctOption:
        question.correctOption ?? "A",

      category:
        question.category ?? "APTITUDE",

      technicalSkill:
        question.technicalSkill ?? "",
    });

    setError("");
    setSuccess("");

    window.scrollTo({
      top: 0,
      behavior: "smooth",
    });
  };

  const handleDelete = async (question) => {
    const confirmed = window.confirm(
      `Delete this question?\n\n${question.questionText}`
    );

    if (!confirmed) {
      return;
    }

    setError("");
    setSuccess("");
    setDeletingQuestionId(question.id);

    try {
      await apiService.delete(
        `/api/faculty/questions/${question.id}`
      );

      setQuestions((currentQuestions) =>
        currentQuestions.filter(
          (currentQuestion) =>
            currentQuestion.id !== question.id
        )
      );

      if (editingQuestionId === question.id) {
        resetForm();
      }

      setSuccess(
        "Question deleted successfully."
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
          "Unable to delete the question."
      );

    } finally {
      setDeletingQuestionId(null);
    }
  };

  const formatCategory = (category) => {
    if (!category) {
      return "Unknown";
    }

    return category
      .toLowerCase()
      .replaceAll("_", " ")
      .replace(/\b\w/g, (letter) =>
        letter.toUpperCase()
      );
  };

  const getOptions = (question) => [
    {
      key: "A",
      value: question.optionA,
    },
    {
      key: "B",
      value: question.optionB,
    },
    {
      key: "C",
      value: question.optionC,
    },
    {
      key: "D",
      value: question.optionD,
    },
  ];

  return (
    <main className="question-bank-page">

      <div className="question-bank-container">

        <header className="question-bank-header">

          <div className="question-bank-heading">

            <span>Faculty Question Bank</span>

            <h1>
              Placement Assessment Questions
            </h1>

            <p>
              Create and manage aptitude, reasoning
              and technical questions.
            </p>

          </div>

          <button
            type="button"
            className="question-bank-back"
            onClick={() =>
              navigate("/faculty/dashboard")
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

        {success && (
          <div
            className="question-success"
            role="status"
          >
            {success}
          </div>
        )}

        <form
          className="question-form-card"
          onSubmit={handleSubmit}
        >

          <div className="question-form-header">

            <h2>
              {editingQuestionId
                ? "Edit Question"
                : "Add New Question"}
            </h2>

            <p>
              All four options and the correct answer
              are required.
            </p>

          </div>

          <div className="question-form-grid">

            <div className="question-form-field full-width">

              <label htmlFor="questionText">
                Question
              </label>

              <textarea
                id="questionText"
                name="questionText"
                placeholder="Enter the assessment question"
                value={formData.questionText}
                onChange={handleChange}
                disabled={saving}
                required
              />

            </div>

            <div className="question-form-field">

              <label htmlFor="optionA">
                Option A
              </label>

              <input
                id="optionA"
                name="optionA"
                type="text"
                value={formData.optionA}
                onChange={handleChange}
                disabled={saving}
                required
              />

            </div>

            <div className="question-form-field">

              <label htmlFor="optionB">
                Option B
              </label>

              <input
                id="optionB"
                name="optionB"
                type="text"
                value={formData.optionB}
                onChange={handleChange}
                disabled={saving}
                required
              />

            </div>

            <div className="question-form-field">

              <label htmlFor="optionC">
                Option C
              </label>

              <input
                id="optionC"
                name="optionC"
                type="text"
                value={formData.optionC}
                onChange={handleChange}
                disabled={saving}
                required
              />

            </div>

            <div className="question-form-field">

              <label htmlFor="optionD">
                Option D
              </label>

              <input
                id="optionD"
                name="optionD"
                type="text"
                value={formData.optionD}
                onChange={handleChange}
                disabled={saving}
                required
              />

            </div>

            <div className="question-form-field">

              <label htmlFor="correctOption">
                Correct Option
              </label>

              <select
                id="correctOption"
                name="correctOption"
                value={formData.correctOption}
                onChange={handleChange}
                disabled={saving}
                required
              >
                <option value="A">Option A</option>
                <option value="B">Option B</option>
                <option value="C">Option C</option>
                <option value="D">Option D</option>
              </select>

            </div>

            <div className="question-form-field">

              <label htmlFor="category">
                Category
              </label>

              <select
                id="category"
                name="category"
                value={formData.category}
                onChange={handleChange}
                disabled={saving}
                required
              >
                <option value="APTITUDE">
                  Aptitude
                </option>

                <option value="REASONING">
                  Reasoning
                </option>

                <option value="TECHNICAL">
                  Technical
                </option>
              </select>

            </div>

            {formData.category === "TECHNICAL" && (
              <div className="question-form-field full-width">

                <label htmlFor="technicalSkill">
                  Technical Skill
                </label>

                <input
                  id="technicalSkill"
                  name="technicalSkill"
                  type="text"
                  placeholder="Example: Java, Python or DBMS"
                  value={formData.technicalSkill}
                  onChange={handleChange}
                  disabled={saving}
                  required
                />

              </div>
            )}

          </div>

          <div className="question-form-actions">

            {editingQuestionId && (
              <button
                type="button"
                className="question-secondary-button"
                onClick={resetForm}
                disabled={saving}
              >
                Cancel Edit
              </button>
            )}

            <button
              type="submit"
              className="question-primary-button"
              disabled={saving}
            >
              {saving
                ? "Saving Question..."
                : editingQuestionId
                  ? "Update Question"
                  : "Add Question"}
            </button>

          </div>

        </form>

        <section aria-labelledby="question-list-title">

          <div className="question-list-header">

            <span>Available Questions</span>

            <h2 id="question-list-title">
              Question Bank ({questions.length})
            </h2>

            <p>
              Review, update or delete existing
              placement questions.
            </p>

          </div>

          {loading && (
            <div
              className="question-loading"
              role="status"
            >
              Loading Question Bank...
            </div>
          )}

          {!loading && questions.length === 0 && (
            <div className="question-empty">
              No questions are available.
            </div>
          )}

          {!loading && questions.length > 0 && (
            <div className="question-list">

              {questions.map((question) => (
                <article
                  className="question-card"
                  key={question.id}
                >

                  <div className="question-card-top">

                    <div className="question-card-badges">

                      <span className="question-badge">
                        {formatCategory(
                          question.category
                        )}
                      </span>

                      {question.technicalSkill && (
                        <span className="question-badge">
                          {question.technicalSkill}
                        </span>
                      )}

                    </div>

                    <span className="question-badge">
                      ID: {question.id}
                    </span>

                  </div>

                  <h3>{question.questionText}</h3>

                  <div className="question-options-grid">

                    {getOptions(question).map(
                      (option) => (
                        <div
                          className={
                            option.key ===
                            question.correctOption
                              ? "question-option correct"
                              : "question-option"
                          }
                          key={option.key}
                        >
                          {option.key}. {option.value}

                          {option.key ===
                            question.correctOption &&
                            " ✓"}
                        </div>
                      )
                    )}

                  </div>

                  <div className="question-card-actions">

                    <button
                      type="button"
                      className="question-secondary-button"
                      onClick={() =>
                        handleEdit(question)
                      }
                      disabled={
                        deletingQuestionId ===
                        question.id
                      }
                    >
                      Edit
                    </button>

                    <button
                      type="button"
                      className="question-delete-button"
                      onClick={() =>
                        handleDelete(question)
                      }
                      disabled={
                        deletingQuestionId ===
                        question.id
                      }
                    >
                      {deletingQuestionId ===
                      question.id
                        ? "Deleting..."
                        : "Delete"}
                    </button>

                  </div>

                </article>
              ))}

            </div>
          )}

        </section>

      </div>

    </main>
  );
}

export default FacultyQuestionBank;