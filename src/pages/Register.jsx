import { useState } from "react";
import { useNavigate } from "react-router-dom";
import "../styles/register.css";

function Register() {
  const navigate = useNavigate();

  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] =
    useState("");

  const [showPassword, setShowPassword] =
    useState(false);

  const [showConfirmPassword, setShowConfirmPassword] =
    useState(false);

  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (event) => {
    event.preventDefault();

    setError("");
    setSuccess("");

    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    const registrationData = {
      username: username,
      password: password,
      confirmPassword: confirmPassword,
    };

    try {
      setLoading(true);

      const response = await fetch(
        "/api/auth/register",
        {
          method: "POST",

          headers: {
            "Content-Type": "application/json",
          },

          body: JSON.stringify(registrationData),
        }
      );

      const data = await response
        .json()
        .catch(() => ({}));

      if (!response.ok) {
        throw new Error(
          data.message || "Registration failed."
        );
      }

      setSuccess(
        data.message ||
          "Registration successful."
      );

      setTimeout(() => {
        navigate("/login");
      }, 1000);

    } catch (err) {
      setError(
        err.message ||
          "Unable to connect to the server."
      );

    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="register-page">

      <div className="register-card">

        <div className="register-brand">

          <div className="register-logo">
            🎓
          </div>

          <h1>CAMPUS-IQ</h1>

          <p>
            AI-Powered Placement Intelligence Platform
            <br />
            and Career Management System
          </p>

        </div>

        <div className="register-heading">

          <h2>Create Student Account</h2>

          <p>
            Register to begin your placement journey
            with CAMPUS-IQ.
          </p>

        </div>

        <form
          className="register-form"
          onSubmit={handleSubmit}
        >

          <div className="register-input-group">

            <label htmlFor="register-username">
              Username
            </label>

            <input
              id="register-username"
              type="text"
              placeholder="Choose a username"
              value={username}
              onChange={(event) =>
                setUsername(event.target.value)
              }
              required
            />

          </div>

          <div className="register-input-group">

            <label htmlFor="register-password">
              Password
            </label>

            <div className="register-password-wrapper">

              <input
                id="register-password"
                type={
                  showPassword
                    ? "text"
                    : "password"
                }
                placeholder="Create a password"
                value={password}
                onChange={(event) =>
                  setPassword(event.target.value)
                }
                required
              />

              <button
                type="button"
                className="register-password-toggle"
                onClick={() =>
                  setShowPassword(!showPassword)
                }
              >
                {showPassword ? "Hide" : "Show"}
              </button>

            </div>

          </div>

          <div className="register-input-group">

            <label htmlFor="confirm-password">
              Confirm Password
            </label>

            <div className="register-password-wrapper">

              <input
                id="confirm-password"
                type={
                  showConfirmPassword
                    ? "text"
                    : "password"
                }
                placeholder="Enter password again"
                value={confirmPassword}
                onChange={(event) =>
                  setConfirmPassword(
                    event.target.value
                  )
                }
                required
              />

              <button
                type="button"
                className="register-password-toggle"
                onClick={() =>
                  setShowConfirmPassword(
                    !showConfirmPassword
                  )
                }
              >
                {showConfirmPassword
                  ? "Hide"
                  : "Show"}
              </button>

            </div>

          </div>

          {error && (
            <div className="register-error">
              {error}
            </div>
          )}

          {success && (
            <div className="register-success">
              {success}
            </div>
          )}

          <button
            type="submit"
            className="register-submit-button"
            disabled={loading}
          >
            {loading
              ? "Creating Account..."
              : "Create Student Account"}
          </button>

        </form>

        <div className="register-login">

          <span>
            Already have an account?
          </span>

          <a href="/login">
            Login
          </a>

        </div>

      </div>

    </div>
  );
}

export default Register;