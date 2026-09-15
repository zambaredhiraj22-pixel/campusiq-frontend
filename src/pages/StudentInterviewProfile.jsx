import {
  useEffect,
  useRef,
  useState,
} from "react";

import { useNavigate } from "react-router-dom";

import aiInterviewService, {
  MAX_RESUME_FILE_SIZE,
} from "../services/aiInterviewService";

import "../styles/studentProfile.css";

const EMPTY_PROFILE = {
  resumeFileName: "",
  resumeContentType: "",
  resumeText: "",
  projects: "",
  technologies: "",
};

function StudentInterviewProfile() {
  const navigate = useNavigate();

  const fileInputRef = useRef(null);

  const [formData, setFormData] =
    useState(EMPTY_PROFILE);

  const [selectedFile, setSelectedFile] =
    useState(null);

  const [eligibility, setEligibility] =
    useState(null);

  const [loading, setLoading] =
    useState(true);

  const [uploading, setUploading] =
    useState(false);

  const [saving, setSaving] =
    useState(false);

  const [error, setError] =
    useState("");

  const [success, setSuccess] =
    useState("");

  const handleUnauthorized = (err) => {
    if (err?.status === 401) {
      navigate("/login", {
        replace: true,
      });

      return true;
    }

    return false;
  };

  const applyProfile = (profile) => {
    setFormData({
      resumeFileName:
        profile?.resumeFileName || "",

      resumeContentType:
        profile?.resumeContentType || "",

      resumeText:
        profile?.resumeText || "",

      projects:
        profile?.projects || "",

      technologies:
        profile?.technologies || "",
    });
  };

  const loadEligibility = async () => {
    try {
      const data =
        await aiInterviewService.getEligibility();

      setEligibility(data);
    } catch (err) {
      if (handleUnauthorized(err)) {
        return;
      }

      throw err;
    }
  };

  useEffect(() => {
    let componentActive = true;

    async function loadPage() {
      try {
        setLoading(true);
        setError("");

        try {
          const profile =
            await aiInterviewService.getProfile();

          if (!componentActive) {
            return;
          }

          applyProfile(profile);
        } catch (err) {
          if (!componentActive) {
            return;
          }

          if (handleUnauthorized(err)) {
            return;
          }

          /*
           * 404 is valid here.
           *
           * It simply means the student has
           * not created an AI Interview
           * Profile yet.
           */
          if (err?.status !== 404) {
            throw err;
          }

          setFormData(
            EMPTY_PROFILE
          );
        }

        if (!componentActive) {
          return;
        }

        const eligibilityData =
          await aiInterviewService.getEligibility();

        if (!componentActive) {
          return;
        }

        setEligibility(
          eligibilityData
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
            "Unable to load the AI Interview profile."
        );
      } finally {
        if (componentActive) {
          setLoading(false);
        }
      }
    }

    loadPage();

    return () => {
      componentActive = false;
    };
  }, [navigate]);

  const handleFileChange = (
    event
  ) => {
    setError("");
    setSuccess("");

    const file =
      event.target.files?.[0];

    if (!file) {
      setSelectedFile(null);
      return;
    }

    if (
      !file.name
        .toLowerCase()
        .endsWith(".pdf")
    ) {
      setSelectedFile(null);

      setError(
        "Only PDF resume files are allowed."
      );

      event.target.value = "";

      return;
    }

    if (
      file.size >
      MAX_RESUME_FILE_SIZE
    ) {
      setSelectedFile(null);

      setError(
        "Resume PDF size must not exceed 5 MB."
      );

      event.target.value = "";

      return;
    }

    if (file.size <= 0) {
      setSelectedFile(null);

      setError(
        "The selected PDF is empty."
      );

      event.target.value = "";

      return;
    }

    setSelectedFile(file);
  };

  const handleUploadResume =
    async () => {
      setError("");
      setSuccess("");

      if (!selectedFile) {
        setError(
          "Select your resume PDF first."
        );

        return;
      }

      try {
        setUploading(true);

        const profile =
          await aiInterviewService.uploadResume(
            selectedFile
          );

        applyProfile(profile);

        setSelectedFile(null);

        if (
          fileInputRef.current
        ) {
          fileInputRef.current.value =
            "";
        }

        setSuccess(
          "Resume uploaded successfully. CAMPUS-IQ extracted the readable text from your PDF."
        );

        try {
          await loadEligibility();
        } catch {
          /*
           * Resume upload succeeded.
           * Eligibility refresh failure should
           * not undo the successful upload.
           */
        }
      } catch (err) {
        if (
          handleUnauthorized(err)
        ) {
          return;
        }

        setError(
          err?.message ||
            "Unable to upload the resume PDF."
        );
      } finally {
        setUploading(false);
      }
    };

  const handleChange = (
    event
  ) => {
    const {
      name,
      value,
    } = event.target;

    setFormData(
      (currentData) => ({
        ...currentData,
        [name]: value,
      })
    );

    setError("");
    setSuccess("");
  };

  const handleSaveProfile =
    async (event) => {
      event.preventDefault();

      setError("");
      setSuccess("");

      if (
        !formData.resumeText.trim()
      ) {
        setError(
          "Upload a readable resume PDF before saving the interview profile."
        );

        return;
      }

      try {
        setSaving(true);

        const profile =
          await aiInterviewService.saveProfile(
            {
              resumeFileName:
                formData.resumeFileName,

              resumeContentType:
                formData.resumeContentType,

              resumeText:
                formData.resumeText,

              projects:
                formData.projects,

              technologies:
                formData.technologies,
            }
          );

        applyProfile(profile);

        setSuccess(
          "AI Interview profile saved successfully."
        );

        try {
          await loadEligibility();
        } catch {
          /*
           * Profile save succeeded.
           * Do not replace that success
           * because of a refresh problem.
           */
        }
      } catch (err) {
        if (
          handleUnauthorized(err)
        ) {
          return;
        }

        setError(
          err?.message ||
            "Unable to save the AI Interview profile."
        );
      } finally {
        setSaving(false);
      }
    };

  const formatFileSize = (
    bytes
  ) => {
    if (
      typeof bytes !== "number"
    ) {
      return "";
    }

    const megabytes =
      bytes /
      (1024 * 1024);

    return `${megabytes.toFixed(
      2
    )} MB`;
  };

  const textareaStyle = {
    width: "100%",
    minHeight: "130px",
    padding: "13px 14px",
    border:
      "1px solid rgba(96, 165, 250, 0.24)",
    borderRadius: "10px",
    background:
      "rgba(18, 43, 70, 0.86)",
    color: "#ffffff",
    fontFamily: "inherit",
    fontSize: "13px",
    lineHeight: "1.6",
    resize: "vertical",
    outline: "none",
  };

  const readonlyTextareaStyle = {
    ...textareaStyle,

    minHeight: "220px",

    color: "#93c5fd",

    background:
      "rgba(37, 99, 235, 0.08)",
  };

  const busy =
    loading ||
    uploading ||
    saving;

  const canContinueToInterview =
    Boolean(
      eligibility?.eligible &&
        eligibility
          ?.passedPersonalizedMockTest &&
        eligibility
          ?.interviewProfileAvailable
    );

  return (
    <main className="student-profile-page">
      <div className="student-profile-container">

        <header className="student-profile-header">
          <div className="student-profile-heading">
            <span>
              AI Interview
            </span>

            <h1>
              Interview Profile & Resume
            </h1>

            <p>
              Upload your resume PDF and add
              project and technology details.
              CAMPUS-IQ uses this information
              with your verified skills to
              personalize your AI interview.
            </p>
          </div>

          <button
            type="button"
            className="student-profile-back"
            onClick={() =>
              navigate(
                "/student/dashboard"
              )
            }
            disabled={busy}
          >
            ← Back to Dashboard
          </button>
        </header>

        {loading && (
          <div
            className="student-profile-loading"
            role="status"
          >
            Loading your AI Interview
            profile...
          </div>
        )}

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

        {!loading && (
          <form
            className="student-profile-card"
            onSubmit={
              handleSaveProfile
            }
          >

            {/* =========================
                RESUME PDF
                ========================= */}

            <section className="student-profile-section">

              <div className="student-profile-section-header">
                <h2>
                  Resume PDF
                </h2>

                <p>
                  Upload a text-based PDF.
                  Maximum file size is
                  5 MB. CAMPUS-IQ extracts
                  the resume text
                  automatically.
                </p>
              </div>

              <div className="student-profile-grid">

                <div className="student-profile-field full-width">
                  <label htmlFor="resumeFile">
                    Select Resume PDF
                  </label>

                  <input
                    ref={fileInputRef}
                    id="resumeFile"
                    type="file"
                    accept=".pdf,application/pdf"
                    onChange={
                      handleFileChange
                    }
                    disabled={
                      uploading ||
                      saving
                    }
                  />

                  <span className="student-profile-help">
                    PDF only • Maximum
                    5 MB • The PDF must
                    contain readable text.
                  </span>
                </div>

                {selectedFile && (
                  <div className="student-profile-field full-width">

                    <label>
                      Selected File
                    </label>

                    <input
                      type="text"
                      value={`${selectedFile.name} (${formatFileSize(
                        selectedFile.size
                      )})`}
                      readOnly
                    />

                  </div>
                )}

                <div className="student-profile-field full-width">

                  <button
                    type="button"
                    className="student-profile-save"
                    onClick={
                      handleUploadResume
                    }
                    disabled={
                      !selectedFile ||
                      uploading ||
                      saving
                    }
                  >
                    {uploading
                      ? "Uploading & Reading Resume..."
                      : formData.resumeText
                      ? "Replace Resume PDF"
                      : "Upload Resume PDF"}
                  </button>

                </div>

                {formData.resumeFileName && (
                  <>
                    <div className="student-profile-field">

                      <label>
                        Uploaded Resume
                      </label>

                      <input
                        type="text"
                        value={
                          formData.resumeFileName
                        }
                        readOnly
                      />

                    </div>

                    <div className="student-profile-field">

                      <label>
                        File Type
                      </label>

                      <input
                        type="text"
                        value={
                          formData
                            .resumeContentType ||
                          "application/pdf"
                        }
                        readOnly
                      />

                    </div>
                  </>
                )}

              </div>

            </section>

            {/* =========================
                EXTRACTED RESUME
                ========================= */}

            {formData.resumeText && (
              <section className="student-profile-section">

                <div className="student-profile-section-header">
                  <h2>
                    Extracted Resume Content
                  </h2>

                  <p>
                    This text was extracted
                    directly from your uploaded
                    PDF and will be used for
                    personalized AI Interview
                    question generation.
                  </p>
                </div>

                <div className="student-profile-field full-width">

                  <label htmlFor="resumeText">
                    Resume Text Preview
                  </label>

                  <textarea
                    id="resumeText"
                    value={
                      formData.resumeText
                    }
                    readOnly
                    style={
                      readonlyTextareaStyle
                    }
                  />

                  <span className="student-profile-help">
                    Read-only. To change
                    this content, upload a
                    different resume PDF.
                  </span>

                </div>

              </section>
            )}

            {/* =========================
                PROJECTS
                ========================= */}

            <section className="student-profile-section">

              <div className="student-profile-section-header">
                <h2>
                  Projects
                </h2>

                <p>
                  Add important academic,
                  personal or internship
                  projects. These details can
                  be used for project-based
                  interview questions.
                </p>
              </div>

              <div className="student-profile-field full-width">

                <label htmlFor="projects">
                  Project Details
                </label>

                <textarea
                  id="projects"
                  name="projects"
                  value={
                    formData.projects
                  }
                  onChange={
                    handleChange
                  }
                  maxLength="50000"
                  disabled={saving}
                  placeholder={
                    "Example:\nCAMPUS-IQ — AI-powered placement intelligence platform using Spring Boot, React, MySQL, JWT, ESP32 and AI services."
                  }
                  style={
                    textareaStyle
                  }
                />

                <span className="student-profile-help">
                  Include project name,
                  your role, important
                  features and technologies
                  used.
                </span>

              </div>

            </section>

            {/* =========================
                TECHNOLOGIES
                ========================= */}

            <section className="student-profile-section">

              <div className="student-profile-section-header">
                <h2>
                  Technologies
                </h2>

                <p>
                  Add technologies that you
                  have worked with. Your
                  Faculty-verified skills are
                  also considered separately
                  by the AI Interview backend.
                </p>
              </div>

              <div className="student-profile-field full-width">

                <label htmlFor="technologies">
                  Technology Details
                </label>

                <textarea
                  id="technologies"
                  name="technologies"
                  value={
                    formData.technologies
                  }
                  onChange={
                    handleChange
                  }
                  maxLength="20000"
                  disabled={saving}
                  placeholder={
                    "Example: Java, Spring Boot, MySQL, React, REST API, JWT, Git, ESP32"
                  }
                  style={
                    textareaStyle
                  }
                />

                <span className="student-profile-help">
                  Mention technologies you
                  can confidently discuss
                  during an interview.
                </span>

              </div>

            </section>

            {/* =========================
                INTERVIEW ELIGIBILITY
                ========================= */}

            <section className="student-profile-section">

              <div className="student-profile-section-header">
                <h2>
                  AI Interview Eligibility
                </h2>

                <p>
                  The AI Interview becomes
                  available after the required
                  personalized AI mock-test
                  condition and Interview
                  Profile condition are met.
                </p>
              </div>

              {eligibility ? (
                <div className="student-profile-grid">

                  <div className="student-profile-field">

                    <label>
                      Personalized Mock Test
                    </label>

                    <input
                      type="text"
                      value={
                        eligibility
                          .passedPersonalizedMockTest
                          ? "Passed"
                          : "Not Passed Yet"
                      }
                      readOnly
                    />

                  </div>

                  <div className="student-profile-field">

                    <label>
                      Interview Profile
                    </label>

                    <input
                      type="text"
                      value={
                        eligibility
                          .interviewProfileAvailable
                          ? "Available"
                          : "Not Available"
                      }
                      readOnly
                    />

                  </div>

                  <div className="student-profile-field">

                    <label>
                      Interview Eligibility
                    </label>

                    <input
                      type="text"
                      value={
                        eligibility.eligible
                          ? "ELIGIBLE"
                          : "NOT ELIGIBLE"
                      }
                      readOnly
                    />

                  </div>

                  <div className="student-profile-field">

                    <label>
                      Interview Status
                    </label>

                    <input
                      type="text"
                      value={
                        eligibility
                          .interviewStatus ||
                        "Not Started"
                      }
                      readOnly
                    />

                  </div>

                  {eligibility
                    .qualifyingMockTestTitle && (
                    <div className="student-profile-field">

                      <label>
                        Qualifying Test
                      </label>

                      <input
                        type="text"
                        value={
                          eligibility
                            .qualifyingMockTestTitle
                        }
                        readOnly
                      />

                    </div>
                  )}

                  {eligibility
                    .mockTestPercentage != null && (
                    <div className="student-profile-field">

                      <label>
                        Mock Test Score
                      </label>

                      <input
                        type="text"
                        value={`${Number(
                          eligibility
                            .mockTestPercentage
                        ).toFixed(2)}%`}
                        readOnly
                      />

                    </div>
                  )}

                  <div className="student-profile-field full-width">

                    <label>
                      CAMPUS-IQ Status
                    </label>

                    <input
                      type="text"
                      value={
                        eligibility.message ||
                        "Eligibility information unavailable."
                      }
                      readOnly
                    />

                  </div>

                </div>
              ) : (
                <div className="student-profile-loading">
                  Eligibility information
                  is not available yet.
                </div>
              )}

            </section>

            {/* =========================
                SAVE
                ========================= */}

            <div className="student-profile-actions">

              <button
                type="submit"
                className="student-profile-save"
                disabled={
                  saving ||
                  uploading ||
                  !formData.resumeText
                }
              >
                {saving
                  ? "Saving Interview Profile..."
                  : "Save Interview Profile"}
              </button>

              {canContinueToInterview && (
                <button
                  type="button"
                  className="student-profile-save"
                  onClick={() =>
                    navigate(
                      "/student/ai-interview"
                    )
                  }
                  disabled={busy}
                >
                  Continue to AI Interview
                </button>
              )}

            </div>

          </form>
        )}

      </div>
    </main>
  );
}

export default StudentInterviewProfile;