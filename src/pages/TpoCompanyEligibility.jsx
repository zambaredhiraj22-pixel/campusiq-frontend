import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";

import apiService from "../services/apiService";
import "../styles/dashboard.css";

function TpoCompanyEligibility() {
  const navigate = useNavigate();

  const [companies, setCompanies] = useState([]);
  const [selectedCompanyId, setSelectedCompanyId] = useState("");
  const [criteria, setCriteria] = useState(null);
  const [eligibilityResults, setEligibilityResults] = useState([]);

  const [loading, setLoading] = useState(true);
  const [checking, setChecking] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  useEffect(() => {
    let componentActive = true;

    async function loadCompanies() {
      try {
        setLoading(true);
        setError("");

        const data = await apiService.get("/api/companies");

        if (!componentActive) {
          return;
        }

        const companyList = Array.isArray(data) ? data : [];

        setCompanies(companyList);

        if (companyList.length > 0) {
          setSelectedCompanyId(String(companyList[0].id));
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

        setError(
          err?.message ||
            "Unable to load company information."
        );
      } finally {
        if (componentActive) {
          setLoading(false);
        }
      }
    }

    loadCompanies();

    return () => {
      componentActive = false;
    };
  }, [navigate]);

  const selectedCompany = useMemo(() => {
    if (!selectedCompanyId) {
      return null;
    }

    return (
      companies.find(
        (company) =>
          String(company.id) ===
          String(selectedCompanyId)
      ) || null
    );
  }, [companies, selectedCompanyId]);

  const eligibleStudents = useMemo(() => {
    return eligibilityResults.filter(
      (student) => student?.eligible === true
    );
  }, [eligibilityResults]);

  const notEligibleStudents = useMemo(() => {
    return eligibilityResults.filter(
      (student) => student?.eligible !== true
    );
  }, [eligibilityResults]);

  const handleCompanyChange = (event) => {
    setSelectedCompanyId(event.target.value);
    setCriteria(null);
    setEligibilityResults([]);
    setError("");
    setSuccess("");
  };

  const handleCheckEligibility = async () => {
    setError("");
    setSuccess("");

    const companyId = Number(selectedCompanyId);

    if (
      !Number.isSafeInteger(companyId) ||
      companyId <= 0
    ) {
      setError("Select a valid company first.");
      return;
    }

    try {
      setChecking(true);

      const [criteriaData, eligibilityData] =
        await Promise.all([
          apiService.get(
            `/api/companies/${companyId}/eligibility`
          ),
          apiService.get(
            `/api/eligibility/companies/${companyId}/students`
          ),
        ]);

      setCriteria(criteriaData || null);

      setEligibilityResults(
        Array.isArray(eligibilityData)
          ? eligibilityData
          : []
      );

      const eligibleCount = Array.isArray(
        eligibilityData
      )
        ? eligibilityData.filter(
            (student) => student?.eligible === true
          ).length
        : 0;

      setSuccess(
        `Eligibility evaluation completed. ${eligibleCount} student(s) are eligible for ${
          selectedCompany?.companyName || "this company"
        }.`
      );
    } catch (err) {
      if (err?.status === 401) {
        navigate("/login", {
          replace: true,
        });

        return;
      }

      setCriteria(null);
      setEligibilityResults([]);

      setError(
        err?.message ||
          "Unable to evaluate students for this company. Make sure eligibility criteria have been configured."
      );
    } finally {
      setChecking(false);
    }
  };

  const displayValue = (value) => {
    if (
      value === null ||
      value === undefined ||
      value === ""
    ) {
      return "Not configured";
    }

    return value;
  };

  const formatPercentage = (value) => {
    if (
      value === null ||
      value === undefined
    ) {
      return "Not configured";
    }

    return `${value}%`;
  };

  const formatCollection = (value) => {
    if (!Array.isArray(value) || value.length === 0) {
      return "None configured";
    }

    return value.join(", ");
  };

  const cardStyle = {
    padding: "18px",
    border: "1px solid rgba(96, 165, 250, 0.24)",
    borderRadius: "12px",
    background: "rgba(18, 43, 70, 0.65)",
  };

  const labelStyle = {
    display: "block",
    marginBottom: "7px",
    color: "#8fa4ba",
    fontSize: "11px",
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: "0.5px",
  };

  const valueStyle = {
    color: "#ffffff",
    fontSize: "14px",
    fontWeight: "700",
    lineHeight: "1.5",
  };

  const resultGridStyle = {
    display: "grid",
    gridTemplateColumns:
      "repeat(auto-fit, minmax(300px, 1fr))",
    gap: "16px",
    marginTop: "18px",
  };

  return (
    <div className="dashboard-page">
      <aside className="dashboard-sidebar">
        <div className="dashboard-brand">
          <div className="dashboard-brand-logo">
            🎓
          </div>

          <div>
            <h2>CAMPUS-IQ</h2>
            <p>Placement Intelligence Platform</p>
          </div>
        </div>

        <p className="dashboard-role">TPO Portal</p>

        <nav
          className="dashboard-navigation"
          aria-label="TPO navigation"
        >
          <button
            type="button"
            className="active"
            onClick={() =>
              navigate("/tpo/dashboard")
            }
            style={{
              width: "100%",
              border: "0",
              textAlign: "left",
              cursor: "pointer",
            }}
          >
            <span className="dashboard-navigation-icon">
              ←
            </span>
            TPO Dashboard
          </button>
        </nav>

        <div className="dashboard-sidebar-footer">
          <p>
            Evaluate students against each company's
            configured placement criteria.
          </p>
        </div>
      </aside>

      <main className="dashboard-main">
        <header className="dashboard-topbar">
          <div className="dashboard-welcome">
            <h1>Company Eligibility</h1>
            <p>
              Check every student against the selected
              company's real CAMPUS-IQ eligibility rules.
            </p>
          </div>

          <button
            type="button"
            className="dashboard-logout-button"
            onClick={() => navigate("/tpo/dashboard")}
          >
            Back to Dashboard
          </button>
        </header>

        <div className="dashboard-content">
          {loading && (
            <div
              className="dashboard-loading"
              role="status"
            >
              Loading companies...
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

          {success && (
            <div
              className="dashboard-loading"
              role="status"
            >
              {success}
            </div>
          )}

          {!loading && (
            <>
              <section className="dashboard-section">
                <div className="dashboard-section-heading">
                  <span>Company Selection</span>
                  <h2>Select a placement company</h2>
                  <p>
                    CAMPUS-IQ will evaluate all student
                    eligibility records for the selected
                    company.
                  </p>
                </div>

                {companies.length === 0 ? (
                  <div className="dashboard-loading">
                    No companies are available. Create a
                    company and configure its eligibility
                    criteria first.
                  </div>
                ) : (
                  <div
                    style={{
                      ...cardStyle,
                      display: "grid",
                      gridTemplateColumns:
                        "minmax(240px, 1fr) auto",
                      gap: "14px",
                      alignItems: "end",
                    }}
                  >
                    <div>
                      <label
                        htmlFor="company-select"
                        style={labelStyle}
                      >
                        Company
                      </label>

                      <select
                        id="company-select"
                        value={selectedCompanyId}
                        onChange={handleCompanyChange}
                        disabled={checking}
                        style={{
                          width: "100%",
                          minHeight: "46px",
                          padding: "0 12px",
                          border:
                            "1px solid rgba(96, 165, 250, 0.24)",
                          borderRadius: "10px",
                          background:
                            "rgba(18, 43, 70, 0.86)",
                          color: "#ffffff",
                        }}
                      >
                        {companies.map((company) => (
                          <option
                            key={company.id}
                            value={company.id}
                          >
                            {company.companyName} — {company.jobRole}
                          </option>
                        ))}
                      </select>
                    </div>

                    <button
                      type="button"
                      className="dashboard-logout-button"
                      onClick={handleCheckEligibility}
                      disabled={
                        checking || !selectedCompanyId
                      }
                    >
                      {checking
                        ? "Checking..."
                        : "Check Eligibility"}
                    </button>
                  </div>
                )}
              </section>

              {selectedCompany && (
                <section className="dashboard-section">
                  <div className="dashboard-section-heading">
                    <span>Selected Company</span>
                    <h2>{selectedCompany.companyName}</h2>
                  </div>

                  <div className="dashboard-summary-grid">
                    <article className="dashboard-summary-card">
                      <p>Job Role</p>
                      <strong>
                        {displayValue(
                          selectedCompany.jobRole
                        )}
                      </strong>
                    </article>

                    <article className="dashboard-summary-card">
                      <p>Package</p>
                      <strong>
                        {selectedCompany.packageLpa != null
                          ? `${selectedCompany.packageLpa} LPA`
                          : "Not available"}
                      </strong>
                    </article>

                    <article className="dashboard-summary-card">
                      <p>Location</p>
                      <strong>
                        {displayValue(
                          selectedCompany.location
                        )}
                      </strong>
                    </article>

                    <article className="dashboard-summary-card">
                      <p>Status</p>
                      <strong>
                        {selectedCompany.active
                          ? "ACTIVE"
                          : "INACTIVE"}
                      </strong>
                    </article>
                  </div>
                </section>
              )}

              {criteria && (
                <section className="dashboard-section">
                  <div className="dashboard-section-heading">
                    <span>Eligibility Rules</span>
                    <h2>Configured company criteria</h2>
                    <p>
                      These are the exact criteria used by
                      the backend eligibility engine.
                    </p>
                  </div>

                  <div className="dashboard-summary-grid">
                    <article className="dashboard-summary-card">
                      <p>Minimum 10th</p>
                      <strong>
                        {formatPercentage(
                          criteria.minimum10thPercentage
                        )}
                      </strong>
                    </article>

                    <article className="dashboard-summary-card">
                      <p>Minimum 12th</p>
                      <strong>
                        {formatPercentage(
                          criteria.minimum12thPercentage
                        )}
                      </strong>
                    </article>

                    <article className="dashboard-summary-card">
                      <p>Minimum Diploma</p>
                      <strong>
                        {formatPercentage(
                          criteria.minimumDiplomaPercentage
                        )}
                      </strong>
                    </article>

                    <article className="dashboard-summary-card">
                      <p>Minimum CGPA</p>
                      <strong>
                        {displayValue(
                          criteria.minimumCgpa
                        )}
                      </strong>
                    </article>

                    <article className="dashboard-summary-card">
                      <p>Minimum Attendance</p>
                      <strong>
                        {formatPercentage(
                          criteria.minimumAttendancePercentage
                        )}
                      </strong>
                    </article>

                    <article className="dashboard-summary-card">
                      <p>Minimum Mock Test</p>
                      <strong>
                        {formatPercentage(
                          criteria.minimumMockTestScore
                        )}
                      </strong>
                    </article>
                  </div>

                  <div
                    style={{
                      ...cardStyle,
                      marginTop: "16px",
                    }}
                  >
                    <span style={labelStyle}>
                      Allowed Departments
                    </span>
                    <div style={valueStyle}>
                      {formatCollection(
                        criteria.allowedDepartments
                      )}
                    </div>

                    <span
                      style={{
                        ...labelStyle,
                        marginTop: "16px",
                      }}
                    >
                      Required Verified Skills
                    </span>
                    <div style={valueStyle}>
                      {formatCollection(
                        criteria.requiredSkills
                      )}
                    </div>
                  </div>
                </section>
              )}

              {eligibilityResults.length > 0 && (
                <section className="dashboard-section">
                  <div className="dashboard-section-heading">
                    <span>Evaluation Results</span>
                    <h2>
                      Student eligibility (
                      {eligibilityResults.length})
                    </h2>
                    <p>
                      The backend evaluates academics,
                      attendance, verified skills and the
                      latest mock-test score for every
                      student.
                    </p>
                  </div>

                  <div className="dashboard-summary-grid">
                    <article className="dashboard-summary-card">
                      <p>Total Evaluated</p>
                      <strong>
                        {eligibilityResults.length}
                      </strong>
                    </article>

                    <article className="dashboard-summary-card">
                      <p>Eligible</p>
                      <strong>
                        {eligibleStudents.length}
                      </strong>
                    </article>

                    <article className="dashboard-summary-card">
                      <p>Not Eligible</p>
                      <strong>
                        {notEligibleStudents.length}
                      </strong>
                    </article>

                    <article className="dashboard-summary-card">
                      <p>Company</p>
                      <strong>
                        {selectedCompany?.companyName ||
                          "Not available"}
                      </strong>
                    </article>
                  </div>

                  <div style={resultGridStyle}>
                    {eligibilityResults.map(
                      (student) => (
                        <article
                          key={`${student.companyId}-${student.studentId}`}
                          style={cardStyle}
                        >
                          <div
                            style={{
                              display: "flex",
                              justifyContent:
                                "space-between",
                              alignItems: "flex-start",
                              gap: "12px",
                              marginBottom: "16px",
                            }}
                          >
                            <div>
                              <span style={labelStyle}>
                                Student Profile ID
                              </span>
                              <strong style={valueStyle}>
                                {student.studentId}
                              </strong>
                            </div>

                            <span
                              style={{
                                padding: "6px 10px",
                                borderRadius: "999px",
                                background:
                                  student.eligible
                                    ? "rgba(34, 197, 94, 0.14)"
                                    : "rgba(239, 68, 68, 0.14)",
                                border:
                                  student.eligible
                                    ? "1px solid rgba(34, 197, 94, 0.3)"
                                    : "1px solid rgba(239, 68, 68, 0.3)",
                                color:
                                  student.eligible
                                    ? "#86efac"
                                    : "#fca5a5",
                                fontSize: "10px",
                                fontWeight: "800",
                              }}
                            >
                              {student.eligible
                                ? "ELIGIBLE"
                                : "NOT ELIGIBLE"}
                            </span>
                          </div>

                          <div
                            style={{
                              marginBottom: "16px",
                            }}
                          >
                            <span style={labelStyle}>
                              Result
                            </span>
                            <div style={valueStyle}>
                              {student.message}
                            </div>
                          </div>

                          <div
                            style={{
                              paddingTop: "14px",
                              borderTop:
                                "1px solid rgba(148, 163, 184, 0.14)",
                            }}
                          >
                            <span style={labelStyle}>
                              Passed Criteria
                            </span>

                            {Array.isArray(
                              student.passedCriteria
                            ) &&
                            student.passedCriteria.length >
                              0 ? (
                              <ul
                                style={{
                                  margin: "8px 0 0",
                                  paddingLeft: "20px",
                                  color: "#bbf7d0",
                                  fontSize: "12px",
                                  lineHeight: "1.7",
                                }}
                              >
                                {student.passedCriteria.map(
                                  (item, index) => (
                                    <li
                                      key={`passed-${student.studentId}-${index}`}
                                    >
                                      {item}
                                    </li>
                                  )
                                )}
                              </ul>
                            ) : (
                              <div style={valueStyle}>
                                None
                              </div>
                            )}
                          </div>

                          <div
                            style={{
                              marginTop: "16px",
                            }}
                          >
                            <span style={labelStyle}>
                              Failed Criteria
                            </span>

                            {Array.isArray(
                              student.failedCriteria
                            ) &&
                            student.failedCriteria.length >
                              0 ? (
                              <ul
                                style={{
                                  margin: "8px 0 0",
                                  paddingLeft: "20px",
                                  color: "#fecaca",
                                  fontSize: "12px",
                                  lineHeight: "1.7",
                                }}
                              >
                                {student.failedCriteria.map(
                                  (item, index) => (
                                    <li
                                      key={`failed-${student.studentId}-${index}`}
                                    >
                                      {item}
                                    </li>
                                  )
                                )}
                              </ul>
                            ) : (
                              <div style={valueStyle}>
                                None
                              </div>
                            )}
                          </div>
                        </article>
                      )
                    )}
                  </div>
                </section>
              )}
            </>
          )}
        </div>
      </main>
    </div>
  );
}

export default TpoCompanyEligibility;
