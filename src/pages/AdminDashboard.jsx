import {
  useCallback,
  useEffect,
  useState,
} from "react";

import { useNavigate } from "react-router-dom";

import adminUserService from "../services/adminUserService";
import authService from "../services/authService";

function AdminDashboard() {
  const navigate = useNavigate();

  const [pendingUsers, setPendingUsers] =
    useState([]);

  const [staffUsers, setStaffUsers] =
    useState([]);

  const [loading, setLoading] =
    useState(true);

  const [busyUserId, setBusyUserId] =
    useState(null);

  const [error, setError] =
    useState("");

  const [message, setMessage] =
    useState("");

  const loadAdminData =
    useCallback(async () => {
      try {
        setLoading(true);
        setError("");

        const [
          pendingResponse,
          staffResponse,
        ] = await Promise.all([
          adminUserService.getPendingUsers(),
          adminUserService.getStaffUsers(),
        ]);

        setPendingUsers(
          Array.isArray(pendingResponse)
            ? pendingResponse
            : []
        );

        setStaffUsers(
          Array.isArray(staffResponse)
            ? staffResponse
            : []
        );
      } catch (err) {
        setError(
          err.message ||
            "Unable to load administrator data."
        );
      } finally {
        setLoading(false);
      }
    }, []);

  useEffect(() => {
    loadAdminData();
  }, [loadAdminData]);

  const handleApprove =
    async (user) => {
      const confirmed =
        window.confirm(
          `Approve ${user.role} account "${user.username}"?`
        );

      if (!confirmed) {
        return;
      }

      try {
        setBusyUserId(user.id);
        setError("");
        setMessage("");

        await adminUserService
          .approveUser(user.id);

        setMessage(
          `${user.username} has been approved successfully.`
        );

        await loadAdminData();
      } catch (err) {
        setError(
          err.message ||
            "Unable to approve the account."
        );
      } finally {
        setBusyUserId(null);
      }
    };

  const handleReject =
    async (user) => {
      const confirmed =
        window.confirm(
          `Reject ${user.role} account "${user.username}"?`
        );

      if (!confirmed) {
        return;
      }

      try {
        setBusyUserId(user.id);
        setError("");
        setMessage("");

        await adminUserService
          .rejectUser(user.id);

        setMessage(
          `${user.username} has been rejected.`
        );

        await loadAdminData();
      } catch (err) {
        setError(
          err.message ||
            "Unable to reject the account."
        );
      } finally {
        setBusyUserId(null);
      }
    };

  const handleLogout = () => {
    authService.logout();

    navigate(
      "/login",
      {
        replace: true,
      }
    );
  };

  const getStatusStyle = (
    accountStatus
  ) => {
    if (
      accountStatus === "ACTIVE"
    ) {
      return {
        background:
          "rgba(34, 197, 94, 0.14)",
        color:
          "#15803d",
      };
    }

    if (
      accountStatus === "REJECTED"
    ) {
      return {
        background:
          "rgba(239, 68, 68, 0.14)",
        color:
          "#b91c1c",
      };
    }

    return {
      background:
        "rgba(245, 158, 11, 0.16)",
      color:
        "#b45309",
    };
  };

  const pageStyle = {
    minHeight: "100vh",
    background:
      "linear-gradient(135deg, #f5f8ff 0%, #eef4ff 100%)",
    padding: "32px",
    fontFamily:
      "Inter, Arial, sans-serif",
    color: "#14213d",
  };

  const containerStyle = {
    maxWidth: "1180px",
    margin: "0 auto",
  };

  const headerStyle = {
    display: "flex",
    alignItems: "center",
    justifyContent:
      "space-between",
    gap: "20px",
    marginBottom: "28px",
  };

  const cardStyle = {
    background: "#ffffff",
    borderRadius: "18px",
    padding: "24px",
    boxShadow:
      "0 12px 35px rgba(15, 23, 42, 0.08)",
    marginBottom: "24px",
  };

  const tableWrapperStyle = {
    overflowX: "auto",
  };

  const tableStyle = {
    width: "100%",
    borderCollapse:
      "collapse",
    minWidth: "700px",
  };

  const tableHeaderStyle = {
    textAlign: "left",
    padding: "14px 12px",
    borderBottom:
      "1px solid #e5e7eb",
    color: "#64748b",
    fontSize: "13px",
  };

  const tableCellStyle = {
    padding: "16px 12px",
    borderBottom:
      "1px solid #eef2f7",
    fontSize: "14px",
  };

  const primaryButtonStyle = {
    border: "none",
    borderRadius: "9px",
    padding: "9px 15px",
    background: "#2563eb",
    color: "#ffffff",
    fontWeight: "700",
    cursor: "pointer",
  };

  const approveButtonStyle = {
    ...primaryButtonStyle,
    background: "#16a34a",
  };

  const rejectButtonStyle = {
    ...primaryButtonStyle,
    background: "#dc2626",
  };

  const logoutButtonStyle = {
    ...primaryButtonStyle,
    background: "#0f172a",
  };

  return (
    <div style={pageStyle}>
      <div style={containerStyle}>

        <header style={headerStyle}>

          <div>
            <p
              style={{
                margin: 0,
                color: "#2563eb",
                fontWeight: "800",
                fontSize: "13px",
                letterSpacing: "1px",
              }}
            >
              CAMPUS-IQ ADMIN
            </p>

            <h1
              style={{
                margin:
                  "8px 0 6px",
                fontSize: "30px",
              }}
            >
              Account Approval Dashboard
            </h1>

            <p
              style={{
                margin: 0,
                color: "#64748b",
              }}
            >
              Review Faculty and TPO
              registrations before allowing
              platform access.
            </p>
          </div>

          <button
            type="button"
            style={logoutButtonStyle}
            onClick={handleLogout}
          >
            Logout
          </button>

        </header>

        {error && (
          <div
            style={{
              ...cardStyle,
              padding: "15px 18px",
              color: "#b91c1c",
              background: "#fff1f2",
            }}
          >
            {error}
          </div>
        )}

        {message && (
          <div
            style={{
              ...cardStyle,
              padding: "15px 18px",
              color: "#15803d",
              background: "#f0fdf4",
            }}
          >
            {message}
          </div>
        )}

        <section style={cardStyle}>

          <div
            style={{
              display: "flex",
              justifyContent:
                "space-between",
              alignItems: "center",
              marginBottom: "20px",
            }}
          >
            <div>

              <h2
                style={{
                  margin:
                    "0 0 6px",
                }}
              >
                Pending Registrations
              </h2>

              <p
                style={{
                  margin: 0,
                  color: "#64748b",
                }}
              >
                Faculty and TPO accounts
                waiting for approval.
              </p>

            </div>

            <strong
              style={{
                fontSize: "22px",
                color: "#2563eb",
              }}
            >
              {pendingUsers.length}
            </strong>

          </div>

          {loading ? (
            <p>
              Loading pending registrations...
            </p>
          ) : pendingUsers.length ===
            0 ? (
            <div
              style={{
                padding: "30px",
                textAlign: "center",
                color: "#64748b",
                background: "#f8fafc",
                borderRadius: "12px",
              }}
            >
              No Faculty or TPO
              registrations are pending.
            </div>
          ) : (
            <div style={tableWrapperStyle}>

              <table style={tableStyle}>

                <thead>
                  <tr>
                    <th style={tableHeaderStyle}>
                      ID
                    </th>

                    <th style={tableHeaderStyle}>
                      Username
                    </th>

                    <th style={tableHeaderStyle}>
                      Role
                    </th>

                    <th style={tableHeaderStyle}>
                      Status
                    </th>

                    <th style={tableHeaderStyle}>
                      Action
                    </th>
                  </tr>
                </thead>

                <tbody>

                  {pendingUsers.map(
                    (user) => (
                      <tr key={user.id}>

                        <td style={tableCellStyle}>
                          {user.id}
                        </td>

                        <td style={tableCellStyle}>
                          <strong>
                            {user.username}
                          </strong>
                        </td>

                        <td style={tableCellStyle}>
                          {user.role}
                        </td>

                        <td style={tableCellStyle}>

                          <span
                            style={{
                              ...getStatusStyle(
                                user.accountStatus
                              ),
                              display:
                                "inline-block",
                              padding:
                                "6px 10px",
                              borderRadius:
                                "999px",
                              fontWeight:
                                "800",
                              fontSize:
                                "12px",
                            }}
                          >
                            {user.accountStatus}
                          </span>

                        </td>

                        <td style={tableCellStyle}>

                          <div
                            style={{
                              display:
                                "flex",
                              gap: "8px",
                            }}
                          >

                            <button
                              type="button"
                              style={{
                                ...approveButtonStyle,
                                opacity:
                                  busyUserId ===
                                  user.id
                                    ? 0.6
                                    : 1,
                              }}
                              disabled={
                                busyUserId ===
                                user.id
                              }
                              onClick={() =>
                                handleApprove(
                                  user
                                )
                              }
                            >
                              {busyUserId ===
                              user.id
                                ? "Processing..."
                                : "Approve"}
                            </button>

                            <button
                              type="button"
                              style={{
                                ...rejectButtonStyle,
                                opacity:
                                  busyUserId ===
                                  user.id
                                    ? 0.6
                                    : 1,
                              }}
                              disabled={
                                busyUserId ===
                                user.id
                              }
                              onClick={() =>
                                handleReject(
                                  user
                                )
                              }
                            >
                              Reject
                            </button>

                          </div>

                        </td>

                      </tr>
                    )
                  )}

                </tbody>

              </table>

            </div>
          )}

        </section>

        <section style={cardStyle}>

          <div
            style={{
              marginBottom: "20px",
            }}
          >

            <h2
              style={{
                margin:
                  "0 0 6px",
              }}
            >
              Faculty & TPO Accounts
            </h2>

            <p
              style={{
                margin: 0,
                color: "#64748b",
              }}
            >
              Current staff registration
              status across CAMPUS-IQ.
            </p>

          </div>

          {loading ? (
            <p>
              Loading staff accounts...
            </p>
          ) : staffUsers.length ===
            0 ? (
            <div
              style={{
                padding: "30px",
                textAlign: "center",
                color: "#64748b",
                background: "#f8fafc",
                borderRadius: "12px",
              }}
            >
              No Faculty or TPO accounts
              are available.
            </div>
          ) : (
            <div style={tableWrapperStyle}>

              <table style={tableStyle}>

                <thead>
                  <tr>
                    <th style={tableHeaderStyle}>
                      ID
                    </th>

                    <th style={tableHeaderStyle}>
                      Username
                    </th>

                    <th style={tableHeaderStyle}>
                      Role
                    </th>

                    <th style={tableHeaderStyle}>
                      Status
                    </th>
                  </tr>
                </thead>

                <tbody>

                  {staffUsers.map(
                    (user) => (
                      <tr key={user.id}>

                        <td style={tableCellStyle}>
                          {user.id}
                        </td>

                        <td style={tableCellStyle}>
                          <strong>
                            {user.username}
                          </strong>
                        </td>

                        <td style={tableCellStyle}>
                          {user.role}
                        </td>

                        <td style={tableCellStyle}>

                          <span
                            style={{
                              ...getStatusStyle(
                                user.accountStatus
                              ),
                              display:
                                "inline-block",
                              padding:
                                "6px 10px",
                              borderRadius:
                                "999px",
                              fontWeight:
                                "800",
                              fontSize:
                                "12px",
                            }}
                          >
                            {user.accountStatus}
                          </span>

                        </td>

                      </tr>
                    )
                  )}

                </tbody>

              </table>

            </div>
          )}

        </section>

      </div>
    </div>
  );
}

export default AdminDashboard;