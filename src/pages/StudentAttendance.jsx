import {
  useCallback,
  useEffect,
  useState,
} from "react";

import { useNavigate } from "react-router-dom";

import apiService from "../services/apiService";

import "../styles/studentProfile.css";

function StudentAttendance() {
  const navigate = useNavigate();

  const [profile, setProfile] =
    useState(null);

  const [loading, setLoading] =
    useState(true);

  const [refreshing, setRefreshing] =
    useState(false);

  const [error, setError] =
    useState("");

  const [success, setSuccess] =
    useState("");

  const handleUnauthorized = useCallback(
    (err) => {
      if (err?.status === 401) {
        navigate("/login", {
          replace: true,
        });

        return true;
      }

      return false;
    },
    [navigate]
  );

  const loadAttendance = useCallback(
    async (showRefreshMessage = false) => {
      try {
        setError("");

        if (showRefreshMessage) {
          setRefreshing(true);
          setSuccess("");
        }

        const profileData =
          await apiService.get(
            "/api/student/profile"
          );

        setProfile(profileData);

        if (showRefreshMessage) {
          setSuccess(
            "Attendance information refreshed successfully."
          );
        }
      } catch (err) {
        if (handleUnauthorized(err)) {
          return;
        }

        if (err?.status === 404) {
          setError(
            "Create your student profile before viewing attendance."
          );

          setProfile(null);

          return;
        }

        setError(
          err?.message ||
            "Unable to load attendance information."
        );
      } finally {
        if (showRefreshMessage) {
          setRefreshing(false);
        }
      }
    },
    [handleUnauthorized]
  );

  useEffect(() => {
    let componentActive = true;

    async function loadPage() {
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
      } catch (err) {
        if (!componentActive) {
          return;
        }

        if (handleUnauthorized(err)) {
          return;
        }

        if (err?.status === 404) {
          setError(
            "Create your student profile before viewing attendance."
          );

          return;
        }

        setError(
          err?.message ||
            "Unable to load attendance information."
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
  }, [handleUnauthorized]);

  const formatPercentage = (value) => {
    if (
      value === null ||
      value === undefined ||
      value === ""
    ) {
      return "Not available";
    }

    const percentage =
      Number(value);

    if (
      Number.isNaN(percentage)
    ) {
      return String(value);
    }

    return `${percentage.toFixed(2)}%`;
  };

  const attendancePercentage =
    profile?.attendancePercentage;

  const percentageNumber =
    attendancePercentage !== null &&
    attendancePercentage !== undefined
      ? Number(attendancePercentage)
      : null;

  const hasValidPercentage =
    percentageNumber !== null &&
    !Number.isNaN(percentageNumber);

  const cardStyle = {
    padding: "18px",

    border:
      "1px solid rgba(96, 165, 250, 0.24)",

    borderRadius: "12px",

    background:
      "rgba(18, 43, 70, 0.65)",
  };

  const labelStyle = {
    display: "block",

    marginBottom: "8px",

    color: "#8fa4ba",

    fontSize: "11px",

    fontWeight: "700",

    textTransform: "uppercase",

    letterSpacing: "0.6px",
  };

  const valueStyle = {
    color: "#ffffff",

    fontSize: "17px",

    fontWeight: "800",

    lineHeight: "1.5",
  };

  const percentageStyle = {
    color: "#ffffff",

    fontSize: "36px",

    fontWeight: "900",

    lineHeight: "1.2",
  };

  const progressTrackStyle = {
    width: "100%",

    height: "14px",

    marginTop: "16px",

    overflow: "hidden",

    borderRadius: "999px",

    background:
      "rgba(148, 163, 184, 0.18)",
  };

  const progressFillStyle = {
    width: hasValidPercentage
      ? `${Math.min(
          Math.max(
            percentageNumber,
            0
          ),
          100
        )}%`
      : "0%",

    height: "100%",

    borderRadius: "999px",

    background:
      "linear-gradient(90deg, #2563eb, #38bdf8)",

    transition:
      "width 0.3s ease",
  };

  return (
    <main className="student-profile-page">
      <div className="student-profile-container">

        <header className="student-profile-header">

          <div className="student-profile-heading">

            <span>
              Biometric Attendance
            </span>

            <h1>
              Fingerprint Attendance
            </h1>

            <p>
              View your current attendance
              percentage calculated from
              CAMPUS-IQ fingerprint attendance
              records and attendance sessions.
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
            disabled={
              loading ||
              refreshing
            }
          >
            ← Back to Dashboard
          </button>

        </header>

        {loading && (
          <div
            className="student-profile-loading"
            role="status"
          >
            Loading biometric attendance...
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

        {!loading && profile && (
          <div className="student-profile-card">

            {/* =========================
                STUDENT INFORMATION
                ========================= */}

            <section className="student-profile-section">

              <div className="student-profile-section-header">

                <h2>
                  Student Information
                </h2>

                <p>
                  Attendance is linked to your
                  CAMPUS-IQ student profile.
                </p>

              </div>

              <div className="student-profile-grid">

                <div style={cardStyle}>

                  <span style={labelStyle}>
                    Student
                  </span>

                  <strong style={valueStyle}>
                    {profile.fullName ||
                      "Not available"}
                  </strong>

                </div>

                <div style={cardStyle}>

                  <span style={labelStyle}>
                    Username
                  </span>

                  <strong style={valueStyle}>
                    {profile.username ||
                      "Not available"}
                  </strong>

                </div>

                <div style={cardStyle}>

                  <span style={labelStyle}>
                    Department
                  </span>

                  <strong style={valueStyle}>
                    {profile.department ||
                      "Not available"}
                  </strong>

                </div>

                <div style={cardStyle}>

                  <span style={labelStyle}>
                    Year of Study
                  </span>

                  <strong style={valueStyle}>
                    {profile.yearOfStudy ||
                      "Not available"}
                  </strong>

                </div>

              </div>

            </section>

            {/* =========================
                ATTENDANCE SUMMARY
                ========================= */}

            <section className="student-profile-section">

              <div className="student-profile-section-header">

                <h2>
                  Attendance Summary
                </h2>

                <p>
                  This percentage is maintained
                  by the fingerprint attendance
                  backend.
                </p>

              </div>

              <div
                style={{
                  ...cardStyle,
                  padding: "24px",
                }}
              >

                <span style={labelStyle}>
                  Current Attendance Percentage
                </span>

                <strong style={percentageStyle}>
                  {formatPercentage(
                    attendancePercentage
                  )}
                </strong>

                <div
                  style={progressTrackStyle}
                  aria-label="Attendance percentage"
                >
                  <div
                    style={
                      progressFillStyle
                    }
                  />
                </div>

                <p
                  style={{
                    marginTop: "14px",
                    marginBottom: "0",
                    color: "#9fb3c8",
                    fontSize: "12px",
                    lineHeight: "1.6",
                  }}
                >
                  CAMPUS-IQ recalculates this
                  value after fingerprint
                  attendance is successfully
                  marked.
                </p>

              </div>

            </section>

            {/* =========================
                ATTENDANCE PROCESS
                ========================= */}

            <section className="student-profile-section">

              <div className="student-profile-section-header">

                <h2>
                  How Attendance Works
                </h2>

                <p>
                  Your percentage is generated
                  from the biometric attendance
                  workflow already implemented
                  in CAMPUS-IQ.
                </p>

              </div>

              <div className="student-profile-grid">

                <div style={cardStyle}>

                  <span style={labelStyle}>
                    Step 1
                  </span>

                  <strong style={valueStyle}>
                    Fingerprint Match
                  </strong>

                  <p
                    style={{
                      color: "#9fb3c8",
                      fontSize: "12px",
                      lineHeight: "1.6",
                    }}
                  >
                    ESP32 and the fingerprint
                    sensor identify the enrolled
                    fingerprint template.
                  </p>

                </div>

                <div style={cardStyle}>

                  <span style={labelStyle}>
                    Step 2
                  </span>

                  <strong style={valueStyle}>
                    Attendance Record
                  </strong>

                  <p
                    style={{
                      color: "#9fb3c8",
                      fontSize: "12px",
                      lineHeight: "1.6",
                    }}
                  >
                    CAMPUS-IQ stores the
                    student attendance record
                    for the attendance date.
                  </p>

                </div>

                <div style={cardStyle}>

                  <span style={labelStyle}>
                    Step 3
                  </span>

                  <strong style={valueStyle}>
                    Duplicate Prevention
                  </strong>

                  <p
                    style={{
                      color: "#9fb3c8",
                      fontSize: "12px",
                      lineHeight: "1.6",
                    }}
                  >
                    The same student cannot
                    create another attendance
                    record for the same date.
                  </p>

                </div>

                <div style={cardStyle}>

                  <span style={labelStyle}>
                    Step 4
                  </span>

                  <strong style={valueStyle}>
                    Percentage Update
                  </strong>

                  <p
                    style={{
                      color: "#9fb3c8",
                      fontSize: "12px",
                      lineHeight: "1.6",
                    }}
                  >
                    Present records are divided
                    by total attendance sessions
                    and the percentage is saved
                    to the student profile.
                  </p>

                </div>

              </div>

            </section>

            {/* =========================
                SYSTEM INFORMATION
                ========================= */}

            <section className="student-profile-section">

              <div className="student-profile-section-header">

                <h2>
                  Biometric System
                </h2>

                <p>
                  Attendance is generated from
                  the CAMPUS-IQ hardware
                  attendance module.
                </p>

              </div>

              <div className="student-profile-grid">

                <div style={cardStyle}>

                  <span style={labelStyle}>
                    Attendance Method
                  </span>

                  <strong style={valueStyle}>
                    Fingerprint Biometric
                  </strong>

                </div>

                <div style={cardStyle}>

                  <span style={labelStyle}>
                    Controller
                  </span>

                  <strong style={valueStyle}>
                    ESP32
                  </strong>

                </div>

                <div style={cardStyle}>

                  <span style={labelStyle}>
                    Attendance Source
                  </span>

                  <strong style={valueStyle}>
                    CAMPUS-IQ Backend
                  </strong>

                </div>

                <div style={cardStyle}>

                  <span style={labelStyle}>
                    Placement Ready
                  </span>

                  <strong style={valueStyle}>
                    {profile.placementReady === true
                      ? "YES"
                      : "NO"}
                  </strong>

                </div>

              </div>

            </section>

            {/* =========================
                REFRESH
                ========================= */}

            <div className="student-profile-actions">

              <button
                type="button"
                className="student-profile-save"
                onClick={() =>
                  loadAttendance(true)
                }
                disabled={refreshing}
              >
                {refreshing
                  ? "Refreshing Attendance..."
                  : "Refresh Attendance"}
              </button>

            </div>

          </div>
        )}

      </div>
    </main>
  );
}

export default StudentAttendance;