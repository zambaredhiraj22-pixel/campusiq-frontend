import { useEffect, useState } from "react";
import {
  Link,
  useNavigate,
} from "react-router-dom";

import apiService from "../services/apiService";
import authService from "../services/authService";
import "../styles/dashboard.css";

function FacultyDashboard() {
  const navigate = useNavigate();

  const currentUser =
    authService.getCurrentUser();

  const [questions, setQuestions] = useState([]);
  const [mockTests, setMockTests] = useState([]);
  const [pendingSkills, setPendingSkills] =
    useState([]);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let componentActive = true;

    async function loadFacultyData() {
      try {
        setLoading(true);
        setError("");

        const results = await Promise.all([
          apiService.get(
            "/api/faculty/questions"
          ),

          apiService.get(
            "/api/faculty/mock-tests"
          ),

          apiService.get(
            "/api/faculty/skills/pending"
          ),
        ]);

        if (!componentActive) {
          return;
        }

        const [
          questionData,
          mockTestData,
          pendingSkillData,
        ] = results;

        setQuestions(
          Array.isArray(questionData)
            ? questionData
            : []
        );

        setMockTests(
          Array.isArray(mockTestData)
            ? mockTestData
            : []
        );

        setPendingSkills(
          Array.isArray(pendingSkillData)
            ? pendingSkillData
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
            "Unable to load Faculty Dashboard."
        );
      } finally {
        if (componentActive) {
          setLoading(false);
        }
      }
    }

    loadFacultyData();

    return () => {
      componentActive = false;
    };
  }, [navigate]);

  const handleLogout = () => {
    authService.logout();

    navigate("/login", {
      replace: true,
    });
  };

  const activeMockTestCount =
    mockTests.filter(
      (mockTest) => mockTest.active === true
    ).length;

  return (
    <div className="dashboard-page">

      <aside className="dashboard-sidebar">

        <div className="dashboard-brand">

          <div className="dashboard-brand-logo">
            🎓
          </div>

          <div>
            <h2>CAMPUS-IQ</h2>

            <p>
              Placement Intelligence Platform
            </p>
          </div>

        </div>

        <p className="dashboard-role">
          Faculty Portal
        </p>

        <nav
          className="dashboard-navigation"
          aria-label="Faculty navigation"
        >

          <a
            className="active"
            href="#overview"
          >
            <span className="dashboard-navigation-icon">
              ◈
            </span>

            Overview
          </a>

          <Link to="/faculty/skills">
            <span className="dashboard-navigation-icon">
              ✓
            </span>

            Skill Verification
          </Link>

          <Link to="/faculty/questions">
            <span className="dashboard-navigation-icon">
              ?
            </span>

            Question Bank
          </Link>

          <Link to="/faculty/mock-tests">
            <span className="dashboard-navigation-icon">
              ◉
            </span>

            Mock Tests
          </Link>

          <a href="#performance">
            <span className="dashboard-navigation-icon">
              %
            </span>

            Student Performance
          </a>

        </nav>

        <div className="dashboard-sidebar-footer">
          <p>
            Verify student evidence and manage
            placement-focused assessments.
          </p>
        </div>

      </aside>

      <main className="dashboard-main">

        <header className="dashboard-topbar">

          <div className="dashboard-welcome">

            <h1>
              Faculty Dashboard
            </h1>

            <p>
              Manage skills, questions and placement
              assessments.
            </p>

          </div>

          <div className="dashboard-user">

            <div className="dashboard-user-details">

              <strong>
                {currentUser?.username ||
                  "Faculty"}
              </strong>

              <span>FACULTY</span>

            </div>

            <button
              type="button"
              className="dashboard-logout-button"
              onClick={handleLogout}
            >
              Logout
            </button>

          </div>

        </header>

        <div
          className="dashboard-content"
          id="overview"
        >

          {loading && (
            <div
              className="dashboard-loading"
              role="status"
            >
              Loading Faculty Dashboard...
            </div>
          )}

          {error && (
            <div
              className="dashboard-error"
              role="alert"
            >
              {error}
            </div>
          )}

          {!loading && !error && (
            <>
              <section
                className="dashboard-section"
                aria-labelledby="faculty-summary-title"
              >

                <div className="dashboard-section-heading">

                  <span>Faculty Overview</span>

                  <h2 id="faculty-summary-title">
                    Assessment management summary
                  </h2>

                  <p>
                    Live information from Faculty
                    question, mock-test and skill APIs.
                  </p>

                </div>

                <div className="dashboard-summary-grid">

                  <article className="dashboard-summary-card">

                    <div className="dashboard-summary-icon">
                      ?
                    </div>

                    <p>Total Questions</p>

                    <strong>
                      {questions.length}
                    </strong>

                  </article>

                  <article className="dashboard-summary-card">

                    <div className="dashboard-summary-icon">
                      ◉
                    </div>

                    <p>Total Mock Tests</p>

                    <strong>
                      {mockTests.length}
                    </strong>

                  </article>

                  <article className="dashboard-summary-card">

                    <div className="dashboard-summary-icon">
                      ✓
                    </div>

                    <p>Active Mock Tests</p>

                    <strong>
                      {activeMockTestCount}
                    </strong>

                  </article>

                  <article className="dashboard-summary-card">

                    <div className="dashboard-summary-icon">
                      !
                    </div>

                    <p>Pending Skill Requests</p>

                    <strong>
                      {pendingSkills.length}
                    </strong>

                  </article>

                </div>

              </section>

              <section
                className="dashboard-section"
                aria-labelledby="faculty-tools-title"
              >

                <div className="dashboard-section-heading">

                  <span>Faculty Tools</span>

                  <h2 id="faculty-tools-title">
                    Manage placement preparation
                  </h2>

                  <p>
                    Review student evidence and create
                    structured placement assessments.
                  </p>

                </div>

                <div className="dashboard-action-grid">

                  <article
                    className="dashboard-action-card"
                    id="skills"
                  >
                    <h3>
                      Verify Student Skills
                    </h3>

                    <p>
                      Review student skill evidence and
                      approve or reject pending
                      verification requests.
                    </p>

                    <Link
                      className="dashboard-action-link"
                      to="/faculty/skills"
                    >
                      {pendingSkills.length} pending
                      requests →
                    </Link>
                  </article>

                  <article
                    className="dashboard-action-card"
                    id="questions"
                  >
                    <h3>Question Bank</h3>

                    <p>
                      Create and manage aptitude,
                      reasoning and technical questions
                      for placement assessments.
                    </p>

                    <Link
                      className="dashboard-action-link"
                      to="/faculty/questions"
                    >
                      Manage {questions.length} questions
                      →
                    </Link>
                  </article>

                  <article
                    className="dashboard-action-card"
                    id="mock-tests"
                  >
                    <h3>Mock Tests</h3>

                    <p>
                      Build placement mock tests using
                      questions from the Faculty
                      Question Bank.
                    </p>

                    <Link
                      className="dashboard-action-link"
                      to="/faculty/mock-tests"
                    >
                      Manage {mockTests.length} tests →
                    </Link>
                  </article>

                  <article
                    className="dashboard-action-card"
                    id="performance"
                  >
                    <h3>
                      Student Performance
                    </h3>

                    <p>
                      Review student assessment
                      performance and placement
                      preparation progress.
                    </p>

                    <span className="dashboard-action-link">
                      View performance →
                    </span>
                  </article>

                  <article className="dashboard-action-card">
                    <h3>
                      Assessment Integrity
                    </h3>

                    <p>
                      Review proctoring status and
                      integrity information associated
                      with student test attempts.
                    </p>

                    <span className="dashboard-action-link">
                      Review integrity →
                    </span>
                  </article>

                  <article className="dashboard-action-card">
                    <h3>
                      Placement Insights
                    </h3>

                    <p>
                      Understand student readiness using
                      academics, attendance, skills and
                      test performance.
                    </p>

                    <span className="dashboard-action-link">
                      View insights →
                    </span>
                  </article>

                </div>

              </section>
            </>
          )}

        </div>

      </main>

    </div>
  );
}

export default FacultyDashboard;