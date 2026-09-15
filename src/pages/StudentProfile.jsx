import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

import apiService from "../services/apiService";
import "../styles/studentProfile.css";

const EMPTY_PROFILE = {
  fullName: "",
  email: "",
  phone: "",
  department: "",
  yearOfStudy: "",
  cgpa: "",
  tenthPercentage: "",
  twelfthPercentage: "",
  diplomaPercentage: "",
  attendancePercentage: "",
};

function StudentProfile() {
  const navigate = useNavigate();

  const [formData, setFormData] =
    useState(EMPTY_PROFILE);

  const [profileExists, setProfileExists] =
    useState(false);

  const [placementReady, setPlacementReady] =
    useState(false);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  useEffect(() => {
    let componentActive = true;

    async function loadProfile() {
      try {
        setLoading(true);
        setError("");

        const profile =
          await apiService.get(
            "/api/student/profile"
          );

        if (!componentActive) {
          return;
        }

        setFormData({
          fullName: profile.fullName ?? "",
          email: profile.email ?? "",
          phone: profile.phone ?? "",
          department: profile.department ?? "",
          yearOfStudy:
            profile.yearOfStudy ?? "",
          cgpa: profile.cgpa ?? "",
          tenthPercentage:
            profile.tenthPercentage ?? "",
          twelfthPercentage:
            profile.twelfthPercentage ?? "",
          diplomaPercentage:
            profile.diplomaPercentage ?? "",
          attendancePercentage:
            profile.attendancePercentage ?? "",
        });

        setPlacementReady(
          profile.placementReady === true
        );

        setProfileExists(true);

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

        if (err.status === 404) {
          setProfileExists(false);
          setFormData(EMPTY_PROFILE);
          return;
        }

        setError(
          err.message ||
            "Unable to load your profile."
        );

      } finally {
        if (componentActive) {
          setLoading(false);
        }
      }
    }

    loadProfile();

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

  const convertToNumber = (value) => {
    if (value === "") {
      return null;
    }

    return Number(value);
  };

  const handleSubmit = async (event) => {
    event.preventDefault();

    setError("");
    setSuccess("");

    const profileRequest = {
      fullName: formData.fullName.trim(),
      email: formData.email.trim(),
      phone: formData.phone.trim(),
      department: formData.department.trim(),
      yearOfStudy:
        formData.yearOfStudy.trim(),

      cgpa: convertToNumber(
        formData.cgpa
      ),

      tenthPercentage: convertToNumber(
        formData.tenthPercentage
      ),

      twelfthPercentage: convertToNumber(
        formData.twelfthPercentage
      ),

      diplomaPercentage: convertToNumber(
        formData.diplomaPercentage
      ),

      attendancePercentage: convertToNumber(
        formData.attendancePercentage
      ),
    };

    try {
      setSaving(true);

      let savedProfile;

      if (profileExists) {
        savedProfile =
          await apiService.put(
            "/api/student/profile",
            profileRequest
          );

      } else {
        savedProfile =
          await apiService.post(
            "/api/student/profile",
            profileRequest
          );
      }

      setProfileExists(true);

      setPlacementReady(
        savedProfile.placementReady === true
      );

      setFormData({
        fullName: savedProfile.fullName ?? "",
        email: savedProfile.email ?? "",
        phone: savedProfile.phone ?? "",
        department:
          savedProfile.department ?? "",
        yearOfStudy:
          savedProfile.yearOfStudy ?? "",
        cgpa: savedProfile.cgpa ?? "",
        tenthPercentage:
          savedProfile.tenthPercentage ?? "",
        twelfthPercentage:
          savedProfile.twelfthPercentage ?? "",
        diplomaPercentage:
          savedProfile.diplomaPercentage ?? "",
        attendancePercentage:
          savedProfile.attendancePercentage ?? "",
      });

      setSuccess(
        profileExists
          ? "Profile updated successfully."
          : "Profile created successfully."
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
          "Unable to save your profile."
      );

    } finally {
      setSaving(false);
    }
  };

  return (
    <main className="student-profile-page">

      <div className="student-profile-container">

        <header className="student-profile-header">

          <div className="student-profile-heading">

            <span>Student Profile</span>

            <h1>
              Personal and Academic Profile
            </h1>

            <p>
              Keep your verified placement information
              accurate and up to date.
            </p>

          </div>

          <button
            type="button"
            className="student-profile-back"
            onClick={() =>
              navigate("/student/dashboard")
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
            Loading your profile...
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
            onSubmit={handleSubmit}
          >

            <section className="student-profile-section">

              <div className="student-profile-section-header">

                <h2>Personal Information</h2>

                <p>
                  Enter your contact and department
                  information.
                </p>

              </div>

              <div className="student-profile-grid">

                <div className="student-profile-field">

                  <label htmlFor="fullName">
                    Full Name
                  </label>

                  <input
                    id="fullName"
                    name="fullName"
                    type="text"
                    value={formData.fullName}
                    onChange={handleChange}
                    maxLength="100"
                    disabled={saving}
                    required
                  />

                </div>

                <div className="student-profile-field">

                  <label htmlFor="email">
                    Email Address
                  </label>

                  <input
                    id="email"
                    name="email"
                    type="email"
                    value={formData.email}
                    onChange={handleChange}
                    maxLength="100"
                    disabled={saving}
                    required
                  />

                </div>

                <div className="student-profile-field">

                  <label htmlFor="phone">
                    Phone Number
                  </label>

                  <input
                    id="phone"
                    name="phone"
                    type="tel"
                    value={formData.phone}
                    onChange={handleChange}
                    pattern="[0-9]{10,15}"
                    maxLength="15"
                    disabled={saving}
                  />

                </div>

                <div className="student-profile-field">

                  <label htmlFor="department">
                    Department
                  </label>

                  <input
                    id="department"
                    name="department"
                    type="text"
                    value={formData.department}
                    onChange={handleChange}
                    maxLength="50"
                    disabled={saving}
                    required
                  />

                </div>

                <div className="student-profile-field">

                  <label htmlFor="yearOfStudy">
                    Year of Study
                  </label>

                  <input
                    id="yearOfStudy"
                    name="yearOfStudy"
                    type="text"
                    value={formData.yearOfStudy}
                    onChange={handleChange}
                    maxLength="20"
                    disabled={saving}
                    required
                  />

                </div>

              </div>

            </section>

            <section className="student-profile-section">

              <div className="student-profile-section-header">

                <h2>Academic Information</h2>

                <p>
                  Enter your verified academic
                  performance information.
                </p>

              </div>

              <div className="student-profile-grid">

                <div className="student-profile-field">

                  <label htmlFor="cgpa">
                    Current CGPA
                  </label>

                  <input
                    id="cgpa"
                    name="cgpa"
                    type="number"
                    min="0"
                    max="10"
                    step="0.01"
                    value={formData.cgpa}
                    onChange={handleChange}
                    disabled={saving}
                  />

                </div>

                <div className="student-profile-field">

                  <label htmlFor="tenthPercentage">
                    10th Percentage
                  </label>

                  <input
                    id="tenthPercentage"
                    name="tenthPercentage"
                    type="number"
                    min="0"
                    max="100"
                    step="0.01"
                    value={
                      formData.tenthPercentage
                    }
                    onChange={handleChange}
                    disabled={saving}
                  />

                </div>

                <div className="student-profile-field">

                  <label htmlFor="twelfthPercentage">
                    12th Percentage
                  </label>

                  <input
                    id="twelfthPercentage"
                    name="twelfthPercentage"
                    type="number"
                    min="0"
                    max="100"
                    step="0.01"
                    value={
                      formData.twelfthPercentage
                    }
                    onChange={handleChange}
                    disabled={saving}
                  />

                </div>

                <div className="student-profile-field">

                  <label htmlFor="diplomaPercentage">
                    Diploma Percentage
                  </label>

                  <input
                    id="diplomaPercentage"
                    name="diplomaPercentage"
                    type="number"
                    min="0"
                    max="100"
                    step="0.01"
                    value={
                      formData.diplomaPercentage
                    }
                    onChange={handleChange}
                    disabled={saving}
                  />

                </div>

                <div className="student-profile-field">

                  <label htmlFor="attendancePercentage">
                    Fingerprint Attendance
                  </label>

                  <input
                    id="attendancePercentage"
                    name="attendancePercentage"
                    type="number"
                    value={
                      formData.attendancePercentage
                    }
                    readOnly
                  />

                  <span className="student-profile-help">
                    Attendance is managed through the
                    ESP32 fingerprint system.
                  </span>

                </div>

                <div className="student-profile-field">

                  <label htmlFor="placementStatus">
                    Placement Status
                  </label>

                  <input
                    id="placementStatus"
                    type="text"
                    value={
                      placementReady
                        ? "Placement Ready"
                        : "Preparation Required"
                    }
                    readOnly
                  />

                </div>

              </div>

            </section>

            <div className="student-profile-actions">

              <button
                type="submit"
                className="student-profile-save"
                disabled={saving}
              >
                {saving
                  ? "Saving Profile..."
                  : profileExists
                    ? "Update Profile"
                    : "Create Profile"}
              </button>

            </div>

          </form>
        )}

      </div>

    </main>
  );
}

export default StudentProfile;