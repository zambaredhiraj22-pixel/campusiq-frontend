import { useEffect, useState } from "react";
import {
  Link,
  useNavigate,
} from "react-router-dom";

import apiService from "../services/apiService";
import authService from "../services/authService";
import "../styles/dashboard.css";

function StudentDashboard() {
  const navigate = useNavigate();

  const currentUser =
    authService.getCurrentUser();

  const [profile, setProfile] =
    useState(null);

  const [readiness, setReadiness] =
    useState(null);

  const [loading, setLoading] =
    useState(true);

  const [error, setError] =
    useState("");

  useEffect(() => {
    let componentActive = true;

    async function loadDashboardData() {
      try {
        setLoading(true);
        setError("");

        const profileData =
          await apiService.get(
            "/api/student/profile"
          );

        if (!componentActive) {
          return;
        }

        setProfile(profileData);

        const readinessData =
          await apiService.get(
            `/api/readiness/${profileData.id}`
          );

        if (!componentActive) {
          return;
        }

        setReadiness(readinessData);
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
            "Unable to load dashboard data."
        );
      } finally {
        if (componentActive) {
          setLoading(false);
        }
      }
    }

    loadDashboardData();

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

  const displayValue = (
    value,
    fallback = "Not available"
  ) => {
    if (
      value === null ||
      value === undefined ||
      value === ""
    ) {
      return fallback;
    }

    return value;
  };

  return (
    <div className="dashboard-page">

      {/* ================= SIDEBAR ================= */}

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
          Student Portal
        </p>

        <nav
          className="dashboard-navigation"
          aria-label="Student navigation"
        >

          <Link
            className="active"
            to="/student/dashboard"
          >
            <span className="dashboard-navigation-icon">
              ◈
            </span>

            Overview
          </Link>

          <Link to="/student/profile">
            <span className="dashboard-navigation-icon">
              ◉
            </span>

            Profile
          </Link>

          <Link to="/student/skills">
            <span className="dashboard-navigation-icon">
              ◆
            </span>

            Skills
          </Link>

          <Link to="/student/mock-tests">
            <span className="dashboard-navigation-icon">
              ✓
            </span>

            Mock Tests
          </Link>

          <Link to="/student/ai-interview/profile">
            <span className="dashboard-navigation-icon">
              AI
            </span>

            AI Interview
          </Link>

          <Link to="/student/attendance">
            <span className="dashboard-navigation-icon">
              ◎
            </span>

            Attendance
          </Link>

          <a href="#readiness">
            <span className="dashboard-navigation-icon">
              AI
            </span>

            AI Readiness
          </a>

          <a href="#eligibility">
            <span className="dashboard-navigation-icon">
              ◫
            </span>

            Company Eligibility
          </a>

        </nav>

        <div className="dashboard-sidebar-footer">
          <p>
            CAMPUS-IQ connects verified student
            data with placement opportunities.
          </p>
        </div>

      </aside>

      {/* ================= MAIN ================= */}

      <main className="dashboard-main">

        <header className="dashboard-topbar">

          <div className="dashboard-welcome">

            <h1>
              Welcome,{" "}
              {profile?.fullName ||
                currentUser?.username ||
                "Student"}
            </h1>

            <p>
              Track your placement preparation
              and readiness.
            </p>

          </div>

          <div className="dashboard-user">

            <div className="dashboard-user-details">

              <strong>
                {currentUser?.username ||
                  "Student"}
              </strong>

              <span>STUDENT</span>

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
              Loading your placement dashboard...
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
              {/* ================= SUMMARY ================= */}

              <section
                className="dashboard-section"
                aria-labelledby="summary-title"
              >

                <div className="dashboard-section-heading">

                  <span>
                    Student Overview
                  </span>

                  <h2 id="summary-title">
                    Placement readiness summary
                  </h2>

                  <p>
                    This information comes from
                    your verified CAMPUS-IQ
                    records.
                  </p>

                </div>

                <div className="dashboard-summary-grid">

                  <article className="dashboard-summary-card">

                    <div className="dashboard-summary-icon">
                      CG
                    </div>

                    <p>
                      Current CGPA
                    </p>

                    <strong>
                      {displayValue(
                        profile?.cgpa
                      )}
                    </strong>

                  </article>

                  <article className="dashboard-summary-card">

                    <div className="dashboard-summary-icon">
                      %
                    </div>

                    <p>
                      Fingerprint Attendance
                    </p>

                    <strong>
                      {profile?.attendancePercentage !=
                      null
                        ? `${profile.attendancePercentage}%`
                        : "Not available"}
                    </strong>

                  </article>

                  <article className="dashboard-summary-card">

                    <div className="dashboard-summary-icon">
                      AI
                    </div>

                    <p>
                      Readiness Score
                    </p>

                    <strong>
                      {readiness?.readinessScore !=
                      null
                        ? `${readiness.readinessScore}%`
                        : "Not available"}
                    </strong>

                  </article>

                  <article className="dashboard-summary-card">

                    <div className="dashboard-summary-icon">
                      ✓
                    </div>

                    <p>
                      Readiness Status
                    </p>

                    <strong>
                      {displayValue(
                        readiness?.readinessStatus
                      )}
                    </strong>

                  </article>

                </div>

              </section>

              {/* ================= PLACEMENT TOOLS ================= */}

              <section
                className="dashboard-section"
                aria-labelledby="tools-title"
              >

                <div className="dashboard-section-heading">

                  <span>
                    Placement Tools
                  </span>

                  <h2 id="tools-title">
                    Continue your placement journey
                  </h2>

                  <p>
                    Use verified records and
                    assessments to improve your
                    placement readiness.
                  </p>

                </div>

                <div className="dashboard-action-grid">

                  {/* PROFILE */}

                  <article className="dashboard-action-card">

                    <h3>
                      Profile & Skills
                    </h3>

                    <p>
                      Maintain your academic
                      profile, add technical
                      skills and track Faculty
                      verification.
                    </p>

                    <Link
                      className="dashboard-action-link"
                      to="/student/profile"
                    >
                      Manage profile →
                    </Link>

                    <Link
                      className="dashboard-action-link"
                      to="/student/skills"
                    >
                      Manage skills →
                    </Link>

                  </article>

                  {/* MOCK TEST */}

                  <article className="dashboard-action-card">

                    <h3>
                      Mock Tests
                    </h3>

                    <p>
                      Take aptitude, reasoning
                      and technical assessments
                      including personalized AI
                      tests.
                    </p>

                    <Link
                      className="dashboard-action-link"
                      to="/student/mock-tests"
                    >
                      View assessments →
                    </Link>

                  </article>

                  {/* AI INTERVIEW */}

                  <article className="dashboard-action-card">

                    <h3>
                      Resume & AI Interview
                    </h3>

                    <p>
                      Upload your resume PDF,
                      add projects and
                      technologies, check
                      eligibility and attend
                      your personalized AI
                      interview.
                    </p>

                    <Link
                      className="dashboard-action-link"
                      to="/student/ai-interview/profile"
                    >
                      Interview Profile →
                    </Link>

                    <Link
                      className="dashboard-action-link"
                      to="/student/ai-interview"
                    >
                      AI Interview →
                    </Link>

                  </article>

                  {/* ATTENDANCE */}

                  <article className="dashboard-action-card">

                    <h3>
                      Biometric Attendance
                    </h3>

                    <p>
                      View your fingerprint
                      attendance percentage
                      recorded by the ESP32
                      biometric attendance
                      system.
                    </p>

                    <Link
                      className="dashboard-action-link"
                      to="/student/attendance"
                    >
                      View attendance →
                    </Link>

                  </article>

                  {/* AI READINESS */}

                  <article
                    className="dashboard-action-card"
                    id="readiness"
                  >

                    <h3>
                      AI Readiness
                    </h3>

                    <p>
                      Understand your
                      strengths, weak areas and
                      personalized placement
                      recommendations.
                    </p>

                    <span className="dashboard-action-link">
                      View recommendations →
                    </span>

                  </article>

                  {/* COMPANY ELIGIBILITY */}

                  <article
                    className="dashboard-action-card"
                    id="eligibility"
                  >

                    <h3>
                      Company Eligibility
                    </h3>

                    <p>
                      Check your eligibility
                      against company-specific
                      placement criteria.
                    </p>

                    <span className="dashboard-action-link">
                      Check eligibility →
                    </span>

                  </article>

                  {/* INTEGRITY */}

                  <article className="dashboard-action-card">

                    <h3>
                      Assessment Integrity
                    </h3>

                    <p>
                      Your mock tests and AI
                      interviews use secure
                      proctoring to maintain
                      assessment integrity.
                    </p>

                    <span className="dashboard-action-link">
                      Proctoring enabled
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

export default StudentDashboard;