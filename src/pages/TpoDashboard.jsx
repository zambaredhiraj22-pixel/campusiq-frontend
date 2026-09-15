import { useEffect, useState } from "react";
import {
  Link,
  useNavigate,
} from "react-router-dom";

import apiService from "../services/apiService";
import authService from "../services/authService";
import "../styles/dashboard.css";

function TpoDashboard() {
  const navigate = useNavigate();

  const currentUser =
    authService.getCurrentUser();

  const [companies, setCompanies] =
    useState([]);

  const [
    placementReadyStudents,
    setPlacementReadyStudents,
  ] = useState([]);

  const [loading, setLoading] =
    useState(true);

  const [error, setError] =
    useState("");

  useEffect(() => {
    let componentActive = true;

    async function loadTpoData() {
      try {
        setLoading(true);
        setError("");

        const [
          companyData,
          placementReadyData,
        ] = await Promise.all([
          apiService.get(
            "/api/companies"
          ),

          apiService.get(
            "/api/tpo/placement-ready-students"
          ),
        ]);

        if (!componentActive) {
          return;
        }

        setCompanies(
          Array.isArray(companyData)
            ? companyData
            : []
        );

        setPlacementReadyStudents(
          Array.isArray(
            placementReadyData
          )
            ? placementReadyData
            : []
        );

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
            "Unable to load TPO Dashboard."
        );

      } finally {
        if (componentActive) {
          setLoading(false);
        }
      }
    }

    loadTpoData();

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

  const activeCompanyCount =
    companies.filter(
      (company) =>
        company.active === true
    ).length;

  const today = new Date();

  today.setHours(
    0,
    0,
    0,
    0
  );

  const upcomingDriveCount =
    companies.filter(
      (company) => {
        if (
          !company.active ||
          !company.driveDate
        ) {
          return false;
        }

        const driveDate =
          new Date(
            `${company.driveDate}T00:00:00`
          );

        return driveDate >= today;
      }
    ).length;

  const uniqueJobRoles =
    new Set(
      companies
        .map(
          (company) =>
            company.jobRole
        )
        .filter(Boolean)
    );

  const formatPercentage = (
    value
  ) => {
    if (
      value === null ||
      value === undefined
    ) {
      return "Not available";
    }

    const number =
      Number(value);

    if (Number.isNaN(number)) {
      return String(value);
    }

    return `${number.toFixed(2)}%`;
  };

  const displayValue = (
    value
  ) => {
    if (
      value === null ||
      value === undefined ||
      value === ""
    ) {
      return "Not available";
    }

    return value;
  };

  const studentGridStyle = {
    display: "grid",

    gridTemplateColumns:
      "repeat(auto-fit, minmax(260px, 1fr))",

    gap: "16px",

    marginTop: "18px",
  };

  const studentCardStyle = {
    padding: "18px",

    border:
      "1px solid rgba(96, 165, 250, 0.24)",

    borderRadius: "12px",

    background:
      "rgba(18, 43, 70, 0.65)",
  };

  const labelStyle = {
    color: "#8fa4ba",

    fontSize: "11px",

    fontWeight: "700",

    textTransform:
      "uppercase",

    letterSpacing:
      "0.5px",
  };

  const valueStyle = {
    marginTop: "4px",

    color: "#ffffff",

    fontSize: "14px",

    fontWeight: "700",
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
            <h2>
              CAMPUS-IQ
            </h2>

            <p>
              Placement Intelligence Platform
            </p>
          </div>

        </div>

        <p className="dashboard-role">
          TPO Portal
        </p>

        <nav
          className="dashboard-navigation"
          aria-label="TPO navigation"
        >

          <Link
            className="active"
            to="/tpo/dashboard"
          >
            <span className="dashboard-navigation-icon">
              ◈
            </span>

            Overview
          </Link>

          <Link to="/tpo/companies">

            <span className="dashboard-navigation-icon">
              ◫
            </span>

            Companies
          </Link>

          <Link to="/tpo/company-eligibility">

            <span className="dashboard-navigation-icon">
              ✓
            </span>

            Company Eligibility
          </Link>

          <a href="#students">

            <span className="dashboard-navigation-icon">
              ◉
            </span>

            Placement Ready
          </a>

          <a href="#readiness">

            <span className="dashboard-navigation-icon">
              AI
            </span>

            Readiness Insights
          </a>

          <a href="#notifications">

            <span className="dashboard-navigation-icon">
              ✉
            </span>

            Notifications
          </a>

        </nav>

        <div className="dashboard-sidebar-footer">

          <p>
            Connect verified student
            readiness with suitable
            placement opportunities.
          </p>

        </div>

      </aside>

      {/* ================= MAIN ================= */}

      <main className="dashboard-main">

        <header className="dashboard-topbar">

          <div className="dashboard-welcome">

            <h1>
              TPO Dashboard
            </h1>

            <p>
              Manage placement companies,
              eligibility and
              placement-ready students.
            </p>

          </div>

          <div className="dashboard-user">

            <div className="dashboard-user-details">

              <strong>
                {currentUser?.username ||
                  "TPO"}
              </strong>

              <span>
                TPO
              </span>

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
              Loading TPO Dashboard...
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

          {!loading &&
            !error && (
              <>
                {/* ================= SUMMARY ================= */}

                <section
                  className="dashboard-section"
                  aria-labelledby="tpo-summary-title"
                >

                  <div className="dashboard-section-heading">

                    <span>
                      Placement Overview
                    </span>

                    <h2 id="tpo-summary-title">
                      Placement summary
                    </h2>

                    <p>
                      Live company and
                      placement-ready student
                      information from
                      CAMPUS-IQ.
                    </p>

                  </div>

                  <div className="dashboard-summary-grid">

                    <article className="dashboard-summary-card">

                      <div className="dashboard-summary-icon">
                        ◫
                      </div>

                      <p>
                        Total Companies
                      </p>

                      <strong>
                        {companies.length}
                      </strong>

                    </article>

                    <article className="dashboard-summary-card">

                      <div className="dashboard-summary-icon">
                        ✓
                      </div>

                      <p>
                        Active Companies
                      </p>

                      <strong>
                        {activeCompanyCount}
                      </strong>

                    </article>

                    <article className="dashboard-summary-card">

                      <div className="dashboard-summary-icon">
                        ◉
                      </div>

                      <p>
                        Placement-Ready Students
                      </p>

                      <strong>
                        {
                          placementReadyStudents.length
                        }
                      </strong>

                    </article>

                    <article className="dashboard-summary-card">

                      <div className="dashboard-summary-icon">
                        #
                      </div>

                      <p>
                        Upcoming Drives
                      </p>

                      <strong>
                        {upcomingDriveCount}
                      </strong>

                    </article>

                  </div>

                </section>

                {/* ================= TOOLS ================= */}

                <section
                  className="dashboard-section"
                  aria-labelledby="tpo-tools-title"
                >

                  <div className="dashboard-section-heading">

                    <span>
                      TPO Tools
                    </span>

                    <h2 id="tpo-tools-title">
                      Manage placement opportunities
                    </h2>

                    <p>
                      Manage companies and
                      identify students using
                      verified placement data.
                    </p>

                  </div>

                  <div className="dashboard-action-grid">

                    {/* COMPANY MANAGEMENT */}

                    <article
                      className="dashboard-action-card"
                      id="companies"
                    >

                      <h3>
                        Company Management
                      </h3>

                      <p>
                        Add companies and
                        maintain job roles,
                        packages, locations and
                        placement drive dates.
                      </p>

                      <Link
                        className="dashboard-action-link"
                        to="/tpo/companies"
                      >
                        Manage{" "}
                        {companies.length}{" "}
                        companies →
                      </Link>

                    </article>

                    {/* COMPANY ELIGIBILITY */}

                    <article className="dashboard-action-card">

                      <h3>
                        Company Eligibility
                      </h3>

                      <p>
                        Select a company,
                        review its placement
                        criteria and identify
                        eligible or ineligible
                        students.
                      </p>

                      <Link
                        className="dashboard-action-link"
                        to="/tpo/company-eligibility"
                      >
                        Check company eligibility →
                      </Link>

                    </article>

                    {/* READINESS */}

                    <article
                      className="dashboard-action-card"
                      id="readiness"
                    >

                      <h3>
                        Readiness Insights
                      </h3>

                      <p>
                        Review student
                        preparation using
                        academics, attendance,
                        verified skills,
                        assessments and
                        integrity.
                      </p>

                      <span className="dashboard-action-link">
                        View readiness →
                      </span>

                    </article>

                    {/* NOTIFICATIONS */}

                    <article
                      className="dashboard-action-card"
                      id="notifications"
                    >

                      <h3>
                        Student Notifications
                      </h3>

                      <p>
                        Notify eligible
                        students about
                        placement opportunities
                        and company drives.
                      </p>

                      <span className="dashboard-action-link">
                        Notifications enabled →
                      </span>

                    </article>

                  </div>

                </section>

                {/* ================= PLACEMENT READY STUDENTS ================= */}

                <section
                  className="dashboard-section"
                  id="students"
                  aria-labelledby="placement-ready-title"
                >

                  <div className="dashboard-section-heading">

                    <span>
                      Placement Ready
                    </span>

                    <h2 id="placement-ready-title">
                      Placement-Ready Students (
                      {
                        placementReadyStudents.length
                      }
                      )
                    </h2>

                    <p>
                      Students whose overall
                      CAMPUS-IQ placement-ready
                      status is currently true.
                    </p>

                  </div>

                  {placementReadyStudents.length ===
                  0 ? (
                    <div className="dashboard-loading">

                      No students are currently
                      marked as placement ready.

                    </div>
                  ) : (
                    <div style={studentGridStyle}>

                      {placementReadyStudents.map(
                        (student) => (
                          <article
                            key={
                              student.studentProfileId
                            }
                            style={studentCardStyle}
                          >

                            <div
                              style={{
                                display: "flex",
                                justifyContent:
                                  "space-between",
                                alignItems:
                                  "flex-start",
                                gap: "12px",
                                marginBottom:
                                  "16px",
                              }}
                            >

                              <div>

                                <span style={labelStyle}>
                                  Student
                                </span>

                                <h3
                                  style={{
                                    margin:
                                      "5px 0 0",
                                    color:
                                      "#ffffff",
                                    fontSize:
                                      "18px",
                                  }}
                                >
                                  {displayValue(
                                    student.fullName
                                  )}
                                </h3>

                              </div>

                              <span
                                style={{
                                  padding:
                                    "6px 10px",

                                  borderRadius:
                                    "999px",

                                  background:
                                    "rgba(34, 197, 94, 0.14)",

                                  border:
                                    "1px solid rgba(34, 197, 94, 0.3)",

                                  color:
                                    "#86efac",

                                  fontSize:
                                    "10px",

                                  fontWeight:
                                    "800",
                                }}
                              >
                                PLACEMENT READY
                              </span>

                            </div>

                            <div
                              style={{
                                display: "grid",
                                gridTemplateColumns:
                                  "1fr 1fr",
                                gap: "14px",
                              }}
                            >

                              <div>

                                <span style={labelStyle}>
                                  Profile ID
                                </span>

                                <div style={valueStyle}>
                                  {
                                    student.studentProfileId
                                  }
                                </div>

                              </div>

                              <div>

                                <span style={labelStyle}>
                                  Department
                                </span>

                                <div style={valueStyle}>
                                  {displayValue(
                                    student.department
                                  )}
                                </div>

                              </div>

                              <div>

                                <span style={labelStyle}>
                                  Year
                                </span>

                                <div style={valueStyle}>
                                  {displayValue(
                                    student.yearOfStudy
                                  )}
                                </div>

                              </div>

                              <div>

                                <span style={labelStyle}>
                                  CGPA
                                </span>

                                <div style={valueStyle}>
                                  {displayValue(
                                    student.cgpa
                                  )}
                                </div>

                              </div>

                              <div>

                                <span style={labelStyle}>
                                  Attendance
                                </span>

                                <div style={valueStyle}>
                                  {formatPercentage(
                                    student.attendancePercentage
                                  )}
                                </div>

                              </div>

                              <div>

                                <span style={labelStyle}>
                                  Status
                                </span>

                                <div style={valueStyle}>
                                  {student.placementReady ===
                                  true
                                    ? "READY"
                                    : "NOT READY"}
                                </div>

                              </div>

                            </div>

                            <div
                              style={{
                                marginTop:
                                  "16px",

                                paddingTop:
                                  "14px",

                                borderTop:
                                  "1px solid rgba(148, 163, 184, 0.14)",
                              }}
                            >

                              <span style={labelStyle}>
                                Contact
                              </span>

                              <div style={valueStyle}>
                                {displayValue(
                                  student.email
                                )}
                              </div>

                              <div
                                style={{
                                  ...valueStyle,
                                  marginTop:
                                    "5px",
                                }}
                              >
                                {displayValue(
                                  student.phone
                                )}
                              </div>

                            </div>

                          </article>
                        )
                      )}

                    </div>
                  )}

                </section>

                {/* ================= COMPANY SNAPSHOT ================= */}

                <section className="dashboard-section">

                  <div className="dashboard-section-heading">

                    <span>
                      Company Snapshot
                    </span>

                    <h2>
                      Current placement activity
                    </h2>

                  </div>

                  <div className="dashboard-summary-grid">

                    <article className="dashboard-summary-card">

                      <p>
                        Available Job Roles
                      </p>

                      <strong>
                        {uniqueJobRoles.size}
                      </strong>

                    </article>

                    <article className="dashboard-summary-card">

                      <p>
                        Active Companies
                      </p>

                      <strong>
                        {activeCompanyCount}
                      </strong>

                    </article>

                    <article className="dashboard-summary-card">

                      <p>
                        Upcoming Drives
                      </p>

                      <strong>
                        {upcomingDriveCount}
                      </strong>

                    </article>

                    <article className="dashboard-summary-card">

                      <p>
                        Ready Students
                      </p>

                      <strong>
                        {
                          placementReadyStudents.length
                        }
                      </strong>

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

export default TpoDashboard;