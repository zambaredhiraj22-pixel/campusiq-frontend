import {
  useEffect,
  useState,
} from "react";

import {
  Link,
  useNavigate,
} from "react-router-dom";

import apiService from "../services/apiService";
import authService from "../services/authService";

import "../styles/dashboard.css";

const EMPTY_COMPANY = {
  companyName: "",
  jobRole: "",
  packageLpa: "",
  location: "",
  driveDate: "",
  active: true,
};

const EMPTY_CRITERIA = {
  minimum10thPercentage: "",
  minimum12thPercentage: "",
  minimumDiplomaPercentage: "",
  minimumCgpa: "",
  minimumAttendancePercentage: "",
  minimumMockTestScore: "",
  allowedDepartments: "",
  requiredSkills: "",
};

function TpoCompanies() {
  const navigate = useNavigate();

  const currentUser =
    authService.getCurrentUser();

  const [companies, setCompanies] =
    useState([]);

  const [formData, setFormData] =
    useState(EMPTY_COMPANY);

  const [selectedCompany, setSelectedCompany] =
    useState(null);

  const [criteriaForm, setCriteriaForm] =
    useState(EMPTY_CRITERIA);

  const [loading, setLoading] =
    useState(true);

  const [saving, setSaving] =
    useState(false);

  const [criteriaLoading, setCriteriaLoading] =
    useState(false);

  const [criteriaSaving, setCriteriaSaving] =
    useState(false);

  const [error, setError] =
    useState("");

  const [success, setSuccess] =
    useState("");

  const handleUnauthorized = (err) => {
    if (err?.status === 401) {
      authService.logout();

      navigate("/login", {
        replace: true,
      });

      return true;
    }

    return false;
  };

  const loadCompanies = async () => {
    try {
      setLoading(true);
      setError("");

      const data =
        await apiService.get(
          "/api/companies"
        );

      setCompanies(
        Array.isArray(data)
          ? data
          : []
      );
    } catch (err) {
      if (handleUnauthorized(err)) {
        return;
      }

      setError(
        err?.message ||
          "Unable to load companies."
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadCompanies();
  }, []);

  const handleCompanyChange = (
    event
  ) => {
    const {
      name,
      value,
      type,
      checked,
    } = event.target;

    setFormData(
      (current) => ({
        ...current,

        [name]:
          type === "checkbox"
            ? checked
            : value,
      })
    );

    setError("");
    setSuccess("");
  };

  const handleCriteriaChange = (
    event
  ) => {
    const {
      name,
      value,
    } = event.target;

    setCriteriaForm(
      (current) => ({
        ...current,
        [name]: value,
      })
    );

    setError("");
    setSuccess("");
  };

  const handleCreateCompany =
    async (event) => {
      event.preventDefault();

      setError("");
      setSuccess("");

      if (
        !formData.companyName.trim()
      ) {
        setError(
          "Company name is required."
        );

        return;
      }

      if (
        !formData.jobRole.trim()
      ) {
        setError(
          "Job role is required."
        );

        return;
      }

      if (
        formData.packageLpa === ""
      ) {
        setError(
          "Package is required."
        );

        return;
      }

      if (
        !formData.location.trim()
      ) {
        setError(
          "Location is required."
        );

        return;
      }

      if (!formData.driveDate) {
        setError(
          "Drive date is required."
        );

        return;
      }

      const packageLpa =
        Number(
          formData.packageLpa
        );

      if (
        Number.isNaN(packageLpa) ||
        packageLpa < 0
      ) {
        setError(
          "Enter a valid package in LPA."
        );

        return;
      }

      const requestBody = {
        companyName:
          formData.companyName.trim(),

        jobRole:
          formData.jobRole.trim(),

        packageLpa,

        location:
          formData.location.trim(),

        driveDate:
          formData.driveDate,

        active:
          formData.active,
      };

      try {
        setSaving(true);

        await apiService.post(
          "/api/companies",
          requestBody
        );

        setFormData(
          EMPTY_COMPANY
        );

        setSuccess(
          "Company created successfully."
        );

        await loadCompanies();
      } catch (err) {
        if (
          handleUnauthorized(err)
        ) {
          return;
        }

        setError(
          err?.message ||
            "Unable to create company."
        );
      } finally {
        setSaving(false);
      }
    };

  const openCriteria = async (
    company
  ) => {
    setSelectedCompany(
      company
    );

    setCriteriaForm(
      EMPTY_CRITERIA
    );

    setError("");
    setSuccess("");

    try {
      setCriteriaLoading(
        true
      );

      const data =
        await apiService.get(
          `/api/companies/${company.id}/eligibility`
        );

      setCriteriaForm({
        minimum10thPercentage:
          data?.minimum10thPercentage ??
          "",

        minimum12thPercentage:
          data?.minimum12thPercentage ??
          "",

        minimumDiplomaPercentage:
          data?.minimumDiplomaPercentage ??
          "",

        minimumCgpa:
          data?.minimumCgpa ??
          "",

        minimumAttendancePercentage:
          data?.minimumAttendancePercentage ??
          "",

        minimumMockTestScore:
          data?.minimumMockTestScore ??
          "",

        allowedDepartments:
          Array.isArray(
            data?.allowedDepartments
          )
            ? data.allowedDepartments.join(
                ", "
              )
            : "",

        requiredSkills:
          Array.isArray(
            data?.requiredSkills
          )
            ? data.requiredSkills.join(
                ", "
              )
            : "",
      });

      setSuccess(
        `Existing eligibility criteria loaded for ${company.companyName}.`
      );
    } catch (err) {
      if (
        handleUnauthorized(err)
      ) {
        return;
      }

      if (
        err?.status === 404
      ) {
        setCriteriaForm(
          EMPTY_CRITERIA
        );

        setSuccess(
          `No eligibility criteria exist for ${company.companyName}. Add the criteria below.`
        );

        return;
      }

      setError(
        err?.message ||
          "Unable to load eligibility criteria."
      );
    } finally {
      setCriteriaLoading(
        false
      );
    }
  };

  const parseNumber = (
    value
  ) => {
    if (
      value === "" ||
      value === null ||
      value === undefined
    ) {
      return null;
    }

    const number =
      Number(value);

    return Number.isNaN(number)
      ? null
      : number;
  };

  const parseCommaSeparatedValues = (
    value
  ) => {
    return value
      .split(",")
      .map(
        (item) =>
          item.trim()
      )
      .filter(Boolean);
  };

  const handleSaveCriteria =
    async (event) => {
      event.preventDefault();

      if (!selectedCompany) {
        setError(
          "Select a company first."
        );

        return;
      }

      setError("");
      setSuccess("");

      const requestBody = {
        minimum10thPercentage:
          parseNumber(
            criteriaForm.minimum10thPercentage
          ),

        minimum12thPercentage:
          parseNumber(
            criteriaForm.minimum12thPercentage
          ),

        minimumDiplomaPercentage:
          parseNumber(
            criteriaForm.minimumDiplomaPercentage
          ),

        minimumCgpa:
          parseNumber(
            criteriaForm.minimumCgpa
          ),

        minimumAttendancePercentage:
          parseNumber(
            criteriaForm.minimumAttendancePercentage
          ),

        minimumMockTestScore:
          parseNumber(
            criteriaForm.minimumMockTestScore
          ),

        allowedDepartments:
          parseCommaSeparatedValues(
            criteriaForm.allowedDepartments
          ),

        requiredSkills:
          parseCommaSeparatedValues(
            criteriaForm.requiredSkills
          ),
      };

      if (
        requestBody.minimum10thPercentage ===
          null ||
        requestBody.minimum12thPercentage ===
          null ||
        requestBody.minimumDiplomaPercentage ===
          null ||
        requestBody.minimumCgpa ===
          null ||
        requestBody.minimumAttendancePercentage ===
          null ||
        requestBody.minimumMockTestScore ===
          null
      ) {
        setError(
          "Enter all academic, attendance and mock-test eligibility values."
        );

        return;
      }

      if (
        requestBody.allowedDepartments
          .length === 0
      ) {
        setError(
          "Enter at least one allowed department."
        );

        return;
      }

      if (
        requestBody.requiredSkills
          .length === 0
      ) {
        setError(
          "Enter at least one required verified skill."
        );

        return;
      }

      try {
        setCriteriaSaving(
          true
        );

        await apiService.put(
          `/api/companies/${selectedCompany.id}/eligibility`,
          requestBody
        );

        setSuccess(
          `Eligibility criteria saved successfully for ${selectedCompany.companyName}.`
        );

      } catch (err) {
        if (
          handleUnauthorized(err)
        ) {
          return;
        }

        setError(
          err?.message ||
            "Unable to save eligibility criteria."
        );
      } finally {
        setCriteriaSaving(
          false
        );
      }
    };

  const handleLogout = () => {
    authService.logout();

    navigate("/login", {
      replace: true,
    });
  };

  const inputStyle = {
    width: "100%",
    padding: "12px 14px",
    border:
      "1px solid rgba(96, 165, 250, 0.24)",
    borderRadius: "10px",
    background:
      "rgba(18, 43, 70, 0.86)",
    color: "#ffffff",
    fontFamily: "inherit",
    fontSize: "13px",
    outline: "none",
  };

  const labelStyle = {
    display: "block",
    marginBottom: "7px",
    color: "#8fa4ba",
    fontSize: "11px",
    fontWeight: "700",
    textTransform:
      "uppercase",
    letterSpacing: "0.5px",
  };

  const companyGridStyle = {
    display: "grid",
    gridTemplateColumns:
      "repeat(auto-fit, minmax(260px, 1fr))",
    gap: "16px",
    marginTop: "18px",
  };

  const cardStyle = {
    padding: "18px",
    border:
      "1px solid rgba(96, 165, 250, 0.24)",
    borderRadius: "12px",
    background:
      "rgba(18, 43, 70, 0.65)",
  };

  return (
    <div className="dashboard-page">

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

          <Link to="/tpo/dashboard">

            <span className="dashboard-navigation-icon">
              ◈
            </span>

            Overview
          </Link>

          <Link
            className="active"
            to="/tpo/companies"
          >

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

          <Link to="/tpo/dashboard#students">

            <span className="dashboard-navigation-icon">
              ◉
            </span>

            Placement Ready
          </Link>

        </nav>

      </aside>

      <main className="dashboard-main">

        <header className="dashboard-topbar">

          <div className="dashboard-welcome">

            <h1>
              Company Management
            </h1>

            <p>
              Add companies and configure
              company-specific eligibility
              criteria.
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
              onClick={
                handleLogout
              }
            >
              Logout
            </button>

          </div>

        </header>

        <div className="dashboard-content">

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
              className="student-profile-success"
              role="status"
            >
              {success}
            </div>
          )}

          <section className="dashboard-section">

            <div className="dashboard-section-heading">

              <span>
                Add Company
              </span>

              <h2>
                Create placement company
              </h2>

              <p>
                Enter company and
                placement-drive details.
              </p>

            </div>

            <form
              onSubmit={
                handleCreateCompany
              }
              style={{
                ...cardStyle,

                display: "grid",

                gridTemplateColumns:
                  "repeat(auto-fit, minmax(220px, 1fr))",

                gap: "16px",
              }}
            >

              <div>
                <label
                  style={labelStyle}
                  htmlFor="companyName"
                >
                  Company Name
                </label>

                <input
                  id="companyName"
                  name="companyName"
                  type="text"
                  value={
                    formData.companyName
                  }
                  onChange={
                    handleCompanyChange
                  }
                  style={inputStyle}
                  disabled={saving}
                  placeholder="Example: TCS"
                />
              </div>

              <div>
                <label
                  style={labelStyle}
                  htmlFor="jobRole"
                >
                  Job Role
                </label>

                <input
                  id="jobRole"
                  name="jobRole"
                  type="text"
                  value={
                    formData.jobRole
                  }
                  onChange={
                    handleCompanyChange
                  }
                  style={inputStyle}
                  disabled={saving}
                  placeholder="Software Engineer"
                />
              </div>

              <div>
                <label
                  style={labelStyle}
                  htmlFor="packageLpa"
                >
                  Package LPA
                </label>

                <input
                  id="packageLpa"
                  name="packageLpa"
                  type="number"
                  min="0"
                  step="0.01"
                  value={
                    formData.packageLpa
                  }
                  onChange={
                    handleCompanyChange
                  }
                  style={inputStyle}
                  disabled={saving}
                  placeholder="6.5"
                />
              </div>

              <div>
                <label
                  style={labelStyle}
                  htmlFor="location"
                >
                  Location
                </label>

                <input
                  id="location"
                  name="location"
                  type="text"
                  value={
                    formData.location
                  }
                  onChange={
                    handleCompanyChange
                  }
                  style={inputStyle}
                  disabled={saving}
                  placeholder="Pune"
                />
              </div>

              <div>
                <label
                  style={labelStyle}
                  htmlFor="driveDate"
                >
                  Drive Date
                </label>

                <input
                  id="driveDate"
                  name="driveDate"
                  type="date"
                  value={
                    formData.driveDate
                  }
                  onChange={
                    handleCompanyChange
                  }
                  style={inputStyle}
                  disabled={saving}
                />
              </div>

              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "10px",
                  paddingTop: "25px",
                }}
              >

                <input
                  id="active"
                  name="active"
                  type="checkbox"
                  checked={
                    formData.active
                  }
                  onChange={
                    handleCompanyChange
                  }
                  disabled={saving}
                />

                <label
                  htmlFor="active"
                  style={{
                    color: "#ffffff",
                    fontWeight: "700",
                  }}
                >
                  Active Company
                </label>

              </div>

              <div
                style={{
                  gridColumn:
                    "1 / -1",
                }}
              >

                <button
                  type="submit"
                  className="dashboard-logout-button"
                  disabled={saving}
                  style={{
                    minWidth:
                      "180px",
                  }}
                >
                  {saving
                    ? "Creating Company..."
                    : "Add Company"}
                </button>

              </div>

            </form>

          </section>

          <section className="dashboard-section">

            <div className="dashboard-section-heading">

              <span>
                Companies
              </span>

              <h2>
                Existing companies (
                {companies.length})
              </h2>

              <p>
                Select a company to
                configure its placement
                eligibility criteria.
              </p>

            </div>

            {loading ? (
              <div className="dashboard-loading">
                Loading companies...
              </div>
            ) : companies.length ===
              0 ? (
              <div className="dashboard-loading">
                No companies are available.
              </div>
            ) : (
              <div style={companyGridStyle}>

                {companies.map(
                  (company) => (
                    <article
                      key={company.id}
                      style={cardStyle}
                    >

                      <div
                        style={{
                          display:
                            "flex",

                          justifyContent:
                            "space-between",

                          gap: "12px",
                        }}
                      >

                        <div>

                          <span
                            style={
                              labelStyle
                            }
                          >
                            Company
                          </span>

                          <h3
                            style={{
                              margin:
                                "5px 0 0",

                              color:
                                "#ffffff",
                            }}
                          >
                            {
                              company.companyName
                            }
                          </h3>

                        </div>

                        <span
                          style={{
                            color:
                              company.active
                                ? "#86efac"
                                : "#fca5a5",

                            fontWeight:
                              "800",

                            fontSize:
                              "11px",
                          }}
                        >
                          {company.active
                            ? "ACTIVE"
                            : "INACTIVE"}
                        </span>

                      </div>

                      <div
                        style={{
                          marginTop:
                            "18px",

                          display:
                            "grid",

                          gap: "12px",
                        }}
                      >

                        <div>
                          <span
                            style={
                              labelStyle
                            }
                          >
                            Job Role
                          </span>

                          <strong>
                            {company.jobRole ||
                              "Not available"}
                          </strong>
                        </div>

                        <div>
                          <span
                            style={
                              labelStyle
                            }
                          >
                            Package
                          </span>

                          <strong>
                            {company.packageLpa ??
                              "Not available"}{" "}
                            LPA
                          </strong>
                        </div>

                        <div>
                          <span
                            style={
                              labelStyle
                            }
                          >
                            Location
                          </span>

                          <strong>
                            {company.location ||
                              "Not available"}
                          </strong>
                        </div>

                        <div>
                          <span
                            style={
                              labelStyle
                            }
                          >
                            Drive Date
                          </span>

                          <strong>
                            {company.driveDate ||
                              "Not available"}
                          </strong>
                        </div>

                      </div>

                      <button
                        type="button"
                        className="dashboard-logout-button"
                        onClick={() =>
                          openCriteria(
                            company
                          )
                        }
                        disabled={
                          criteriaLoading
                        }
                        style={{
                          marginTop:
                            "18px",
                        }}
                      >
                        Configure Eligibility
                      </button>

                    </article>
                  )
                )}

              </div>
            )}

          </section>

          {selectedCompany && (
            <section className="dashboard-section">

              <div className="dashboard-section-heading">

                <span>
                  Eligibility Criteria
                </span>

                <h2>
                  {
                    selectedCompany.companyName
                  }
                  {" — "}
                  {
                    selectedCompany.jobRole
                  }
                </h2>

                <p>
                  Configure the exact
                  criteria students must
                  satisfy for this company.
                </p>

              </div>

              {criteriaLoading ? (
                <div className="dashboard-loading">
                  Loading eligibility
                  criteria...
                </div>
              ) : (
                <form
                  onSubmit={
                    handleSaveCriteria
                  }
                  style={{
                    ...cardStyle,

                    display:
                      "grid",

                    gridTemplateColumns:
                      "repeat(auto-fit, minmax(220px, 1fr))",

                    gap: "16px",
                  }}
                >

                  <div>
                    <label
                      style={
                        labelStyle
                      }
                      htmlFor="minimum10thPercentage"
                    >
                      Minimum 10th %
                    </label>

                    <input
                      id="minimum10thPercentage"
                      name="minimum10thPercentage"
                      type="number"
                      min="0"
                      max="100"
                      step="0.01"
                      value={
                        criteriaForm.minimum10thPercentage
                      }
                      onChange={
                        handleCriteriaChange
                      }
                      style={
                        inputStyle
                      }
                    />
                  </div>

                  <div>
                    <label
                      style={
                        labelStyle
                      }
                      htmlFor="minimum12thPercentage"
                    >
                      Minimum 12th %
                    </label>

                    <input
                      id="minimum12thPercentage"
                      name="minimum12thPercentage"
                      type="number"
                      min="0"
                      max="100"
                      step="0.01"
                      value={
                        criteriaForm.minimum12thPercentage
                      }
                      onChange={
                        handleCriteriaChange
                      }
                      style={
                        inputStyle
                      }
                    />
                  </div>

                  <div>
                    <label
                      style={
                        labelStyle
                      }
                      htmlFor="minimumDiplomaPercentage"
                    >
                      Minimum Diploma %
                    </label>

                    <input
                      id="minimumDiplomaPercentage"
                      name="minimumDiplomaPercentage"
                      type="number"
                      min="0"
                      max="100"
                      step="0.01"
                      value={
                        criteriaForm.minimumDiplomaPercentage
                      }
                      onChange={
                        handleCriteriaChange
                      }
                      style={
                        inputStyle
                      }
                    />
                  </div>

                  <div>
                    <label
                      style={
                        labelStyle
                      }
                      htmlFor="minimumCgpa"
                    >
                      Minimum CGPA
                    </label>

                    <input
                      id="minimumCgpa"
                      name="minimumCgpa"
                      type="number"
                      min="0"
                      max="10"
                      step="0.01"
                      value={
                        criteriaForm.minimumCgpa
                      }
                      onChange={
                        handleCriteriaChange
                      }
                      style={
                        inputStyle
                      }
                    />
                  </div>

                  <div>
                    <label
                      style={
                        labelStyle
                      }
                      htmlFor="minimumAttendancePercentage"
                    >
                      Minimum Attendance %
                    </label>

                    <input
                      id="minimumAttendancePercentage"
                      name="minimumAttendancePercentage"
                      type="number"
                      min="0"
                      max="100"
                      step="0.01"
                      value={
                        criteriaForm.minimumAttendancePercentage
                      }
                      onChange={
                        handleCriteriaChange
                      }
                      style={
                        inputStyle
                      }
                    />
                  </div>

                  <div>
                    <label
                      style={
                        labelStyle
                      }
                      htmlFor="minimumMockTestScore"
                    >
                      Minimum Mock Test %
                    </label>

                    <input
                      id="minimumMockTestScore"
                      name="minimumMockTestScore"
                      type="number"
                      min="0"
                      max="100"
                      step="0.01"
                      value={
                        criteriaForm.minimumMockTestScore
                      }
                      onChange={
                        handleCriteriaChange
                      }
                      style={
                        inputStyle
                      }
                    />
                  </div>

                  <div
                    style={{
                      gridColumn:
                        "1 / -1",
                    }}
                  >
                    <label
                      style={
                        labelStyle
                      }
                      htmlFor="allowedDepartments"
                    >
                      Allowed Departments
                    </label>

                    <input
                      id="allowedDepartments"
                      name="allowedDepartments"
                      type="text"
                      value={
                        criteriaForm.allowedDepartments
                      }
                      onChange={
                        handleCriteriaChange
                      }
                      style={
                        inputStyle
                      }
                      placeholder="Example: BCS, E&TC, CS, IT"
                    />
                  </div>

                  <div
                    style={{
                      gridColumn:
                        "1 / -1",
                    }}
                  >
                    <label
                      style={
                        labelStyle
                      }
                      htmlFor="requiredSkills"
                    >
                      Required Verified Skills
                    </label>

                    <input
                      id="requiredSkills"
                      name="requiredSkills"
                      type="text"
                      value={
                        criteriaForm.requiredSkills
                      }
                      onChange={
                        handleCriteriaChange
                      }
                      style={
                        inputStyle
                      }
                      placeholder="Example: Java, Spring Boot, My Sql"
                    />
                  </div>

                  <div
                    style={{
                      gridColumn:
                        "1 / -1",

                      display:
                        "flex",

                      gap: "12px",

                      flexWrap:
                        "wrap",
                    }}
                  >

                    <button
                      type="submit"
                      className="dashboard-logout-button"
                      disabled={
                        criteriaSaving
                      }
                    >
                      {criteriaSaving
                        ? "Saving Criteria..."
                        : "Save Eligibility Criteria"}
                    </button>

                    <button
                      type="button"
                      className="dashboard-logout-button"
                      onClick={() =>
                        navigate(
                          "/tpo/company-eligibility"
                        )
                      }
                    >
                      Go to Company Eligibility
                    </button>

                  </div>

                </form>
              )}

            </section>
          )}

        </div>

      </main>

    </div>
  );
}

export default TpoCompanies;