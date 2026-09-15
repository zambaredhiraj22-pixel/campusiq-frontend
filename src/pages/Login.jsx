import { useState } from "react";
import { useNavigate } from "react-router-dom";

import authService from "../services/authService";
import "../styles/login.css";

const DASHBOARD_ROUTES = {
  STUDENT: "/student/dashboard",
  FACULTY: "/faculty/dashboard",
  TPO: "/tpo/dashboard",
  ADMIN: "/admin/dashboard",
};

function Login() {
  const navigate = useNavigate();

  const [username, setUsername] =
    useState("");

  const [password, setPassword] =
    useState("");

  const [showPassword, setShowPassword] =
    useState(false);

  const [error, setError] =
    useState("");

  const [loading, setLoading] =
    useState(false);

  const handleSubmit = async (event) => {
    event.preventDefault();

    setError("");

    try {
      setLoading(true);

      const loginResponse =
        await authService.login(
          username,
          password
        );

      const dashboardPath =
        DASHBOARD_ROUTES[
          loginResponse.role
        ];

      if (!dashboardPath) {
        authService.logout();

        throw new Error(
          "Your account role is not supported by this application."
        );
      }

      navigate(
        dashboardPath,
        {
          replace: true,
        }
      );
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
    <div className="login-page">

      <div className="login-card">

        <div className="login-brand">

          <div className="login-logo">
            🎓
          </div>

          <h1>
            CAMPUS-IQ
          </h1>

          <p>
            AI-Powered Placement Intelligence Platform
            <br />
            and Career Management System
          </p>

        </div>

        <div className="login-heading">

          <h2>
            Welcome Back
          </h2>

          <p>
            Login to continue to your
            CAMPUS-IQ account
          </p>

        </div>

        <form
          className="login-form"
          onSubmit={handleSubmit}
        >

          <div className="login-input-group">

            <label htmlFor="username">
              Username
            </label>

            <input
              id="username"
              name="username"
              type="text"
              placeholder="Enter your username"
              value={username}
              onChange={(event) =>
                setUsername(
                  event.target.value
                )
              }
              autoComplete="username"
              disabled={loading}
              required
            />

          </div>

          <div className="login-input-group">

            <label htmlFor="password">
              Password
            </label>

            <div className="login-password-wrapper">

              <input
                id="password"
                name="password"
                type={
                  showPassword
                    ? "text"
                    : "password"
                }
                placeholder="Enter your password"
                value={password}
                onChange={(event) =>
                  setPassword(
                    event.target.value
                  )
                }
                autoComplete="current-password"
                disabled={loading}
                required
              />

              <button
                type="button"
                className="login-password-toggle"
                onClick={() =>
                  setShowPassword(
                    (currentValue) =>
                      !currentValue
                  )
                }
                aria-label={
                  showPassword
                    ? "Hide password"
                    : "Show password"
                }
                disabled={loading}
              >
                {showPassword
                  ? "Hide"
                  : "Show"}
              </button>

            </div>

          </div>

          {error && (
            <div
              className="login-error"
              role="alert"
            >
              {error}
            </div>
          )}

          <button
            type="submit"
            className="login-submit-button"
            disabled={loading}
          >
            {loading
              ? "Logging in..."
              : "Login"}
          </button>

        </form>

        <div className="login-register">

          <span>
            Don't have an account?
          </span>

          <a href="/register">
            Student Registration
          </a>

          <a href="/faculty/register">
            Faculty Registration
          </a>

          <a href="/tpo/register">
            TPO Registration
          </a>

        </div>

        <div className="login-highlights">

          <span>
            Verified Skills
          </span>

          <span>
            Secure Assessments
          </span>

          <span>
            AI Readiness
          </span>

        </div>

      </div>

    </div>
  );
}

export default Login;