import {
  useCallback,
  useEffect,
  useState,
} from "react";

import mockTestRetakeService from
  "../services/mockTestRetakeService";

function FacultyMockTestRetakePanel({
  onUnauthorized,
}) {
  const [retakeStatuses, setRetakeStatuses] =
    useState([]);

  const [loading, setLoading] =
    useState(true);

  const [grantingAssignmentId,
    setGrantingAssignmentId] =
    useState(null);

  const [error, setError] =
    useState("");

  const [success, setSuccess] =
    useState("");

  const handleError = useCallback(
    (requestError, fallbackMessage) => {
      if (
        requestError?.status === 401 &&
        typeof onUnauthorized === "function"
      ) {
        onUnauthorized(requestError);
        return;
      }

      setError(
        requestError?.message ||
          fallbackMessage
      );
    },
    [onUnauthorized]
  );

  const loadRetakeStatuses =
    useCallback(async () => {
      try {
        setLoading(true);
        setError("");

        const data =
          await mockTestRetakeService
            .getRetakeStatuses();

        setRetakeStatuses(data);
      } catch (requestError) {
        handleError(
          requestError,
          "Unable to load mock-test retake requests."
        );
      } finally {
        setLoading(false);
      }
    }, [handleError]);

  useEffect(() => {
    loadRetakeStatuses();
  }, [loadRetakeStatuses]);

  const allowRetake =
    async (assignmentId) => {
      try {
        setGrantingAssignmentId(
          assignmentId
        );

        setError("");
        setSuccess("");

        const updatedStatus =
          await mockTestRetakeService
            .allowRetake(assignmentId);

        setRetakeStatuses(
          (currentStatuses) =>
            currentStatuses.map(
              (status) =>
                status.assignmentId ===
                updatedStatus.assignmentId
                  ? updatedStatus
                  : status
            )
        );

        setSuccess(
          `Retake permission granted to ${
            updatedStatus.studentName ||
            updatedStatus.username ||
            "the student"
          }.`
        );
      } catch (requestError) {
        handleError(
          requestError,
          "Unable to grant retake permission."
        );
      } finally {
        setGrantingAssignmentId(null);
      }
    };

  const getStatusText = (status) => {
    if (
      status.status ===
      "RETAKE_ALLOWED"
    ) {
      return "Retake Allowed";
    }

    if (
      status.status ===
      "FACULTY_PERMISSION_REQUIRED"
    ) {
      return "Permission Required";
    }

    if (
      status.status ===
      "FIRST_ATTEMPT_AVAILABLE"
    ) {
      return "First Attempt Available";
    }

    return status.status || "Unknown";
  };

  return (
    <section
      style={{
        marginTop: "32px",
        padding: "24px",
        borderRadius: "18px",
        border:
          "1px solid rgba(148, 163, 184, 0.22)",
        background:
          "rgba(15, 23, 42, 0.72)",
        boxShadow:
          "0 18px 45px rgba(2, 6, 23, 0.2)",
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent:
            "space-between",
          gap: "16px",
          flexWrap: "wrap",
          marginBottom: "20px",
        }}
      >
        <div>
          <p
            style={{
              margin: "0 0 6px",
              color: "#818cf8",
              fontSize: "13px",
              fontWeight: "700",
              letterSpacing: "0.08em",
              textTransform: "uppercase",
            }}
          >
            Retake Management
          </p>

          <h2
            style={{
              margin: 0,
              color: "#f8fafc",
              fontSize: "24px",
            }}
          >
            Student Mock-Test Retakes
          </h2>

          <p
            style={{
              margin: "8px 0 0",
              color: "#94a3b8",
              lineHeight: "1.6",
            }}
          >
            Grant one-time permission to a
            student who has already completed
            a personalized mock test.
          </p>
        </div>

        <button
          type="button"
          onClick={loadRetakeStatuses}
          disabled={
            loading ||
            grantingAssignmentId !== null
          }
          style={{
            padding: "10px 18px",
            border: "none",
            borderRadius: "10px",
            background: "#334155",
            color: "#f8fafc",
            fontWeight: "700",
            cursor:
              loading ||
              grantingAssignmentId !== null
                ? "not-allowed"
                : "pointer",
            opacity:
              loading ||
              grantingAssignmentId !== null
                ? 0.65
                : 1,
          }}
        >
          {loading ? "Loading..." : "Refresh"}
        </button>
      </div>

      {error && (
        <div
          style={{
            marginBottom: "16px",
            padding: "12px 14px",
            borderRadius: "10px",
            border:
              "1px solid rgba(248, 113, 113, 0.35)",
            background:
              "rgba(127, 29, 29, 0.28)",
            color: "#fecaca",
          }}
        >
          {error}
        </div>
      )}

      {success && (
        <div
          style={{
            marginBottom: "16px",
            padding: "12px 14px",
            borderRadius: "10px",
            border:
              "1px solid rgba(74, 222, 128, 0.35)",
            background:
              "rgba(20, 83, 45, 0.28)",
            color: "#bbf7d0",
          }}
        >
          {success}
        </div>
      )}

      {!loading &&
        retakeStatuses.length === 0 && (
          <div
            style={{
              padding: "22px",
              borderRadius: "12px",
              border:
                "1px dashed rgba(148, 163, 184, 0.3)",
              color: "#94a3b8",
              textAlign: "center",
            }}
          >
            No completed personalized mock
            tests require retake management.
          </div>
        )}

      {retakeStatuses.length > 0 && (
        <div
          style={{
            overflowX: "auto",
          }}
        >
          <table
            style={{
              width: "100%",
              minWidth: "850px",
              borderCollapse: "collapse",
            }}
          >
            <thead>
              <tr>
                {[
                  "Student",
                  "Mock Test",
                  "Attempts",
                  "Status",
                  "Last Permission",
                  "Action",
                ].map((heading) => (
                  <th
                    key={heading}
                    style={{
                      padding: "13px 12px",
                      borderBottom:
                        "1px solid rgba(148, 163, 184, 0.22)",
                      color: "#cbd5e1",
                      textAlign: "left",
                      fontSize: "13px",
                    }}
                  >
                    {heading}
                  </th>
                ))}
              </tr>
            </thead>

            <tbody>
              {retakeStatuses.map(
                (status) => {
                  const permissionAvailable =
                    status.retakeCredits > 0;

                  const granting =
                    grantingAssignmentId ===
                    status.assignmentId;

                  return (
                    <tr
                      key={
                        status.assignmentId
                      }
                    >
                      <td
                        style={{
                          padding: "14px 12px",
                          borderBottom:
                            "1px solid rgba(148, 163, 184, 0.12)",
                          color: "#f8fafc",
                        }}
                      >
                        <strong>
                          {status.studentName ||
                            "Student"}
                        </strong>

                        <div
                          style={{
                            marginTop: "4px",
                            color: "#94a3b8",
                            fontSize: "13px",
                          }}
                        >
                          {status.username ||
                            `Profile ID: ${status.studentProfileId}`}
                        </div>
                      </td>

                      <td
                        style={{
                          padding: "14px 12px",
                          borderBottom:
                            "1px solid rgba(148, 163, 184, 0.12)",
                          color: "#e2e8f0",
                        }}
                      >
                        {status.mockTestTitle ||
                          `Mock Test ${status.mockTestId}`}
                      </td>

                      <td
                        style={{
                          padding: "14px 12px",
                          borderBottom:
                            "1px solid rgba(148, 163, 184, 0.12)",
                          color: "#e2e8f0",
                        }}
                      >
                        {
                          status.completedAttemptCount
                        }
                      </td>

                      <td
                        style={{
                          padding: "14px 12px",
                          borderBottom:
                            "1px solid rgba(148, 163, 184, 0.12)",
                        }}
                      >
                        <span
                          style={{
                            display:
                              "inline-flex",
                            padding:
                              "6px 10px",
                            borderRadius:
                              "999px",
                            background:
                              permissionAvailable
                                ? "rgba(34, 197, 94, 0.16)"
                                : "rgba(245, 158, 11, 0.16)",
                            color:
                              permissionAvailable
                                ? "#86efac"
                                : "#fcd34d",
                            fontSize: "12px",
                            fontWeight: "700",
                          }}
                        >
                          {getStatusText(
                            status
                          )}
                        </span>
                      </td>

                      <td
                        style={{
                          padding: "14px 12px",
                          borderBottom:
                            "1px solid rgba(148, 163, 184, 0.12)",
                          color: "#cbd5e1",
                          fontSize: "13px",
                        }}
                      >
                        {status.lastRetakeGrantedAt
                          ? new Date(
                              status.lastRetakeGrantedAt
                            ).toLocaleString()
                          : "Not granted"}
                      </td>

                      <td
                        style={{
                          padding: "14px 12px",
                          borderBottom:
                            "1px solid rgba(148, 163, 184, 0.12)",
                        }}
                      >
                        <button
                          type="button"
                          onClick={() =>
                            allowRetake(
                              status.assignmentId
                            )
                          }
                          disabled={
                            permissionAvailable ||
                            granting ||
                            !status.assignmentActive
                          }
                          style={{
                            padding:
                              "9px 14px",
                            border: "none",
                            borderRadius:
                              "9px",
                            background:
                              permissionAvailable
                                ? "#334155"
                                : "#4f46e5",
                            color: "#ffffff",
                            fontWeight: "700",
                            cursor:
                              permissionAvailable ||
                              granting ||
                              !status.assignmentActive
                                ? "not-allowed"
                                : "pointer",
                            opacity:
                              permissionAvailable ||
                              granting ||
                              !status.assignmentActive
                                ? 0.65
                                : 1,
                          }}
                        >
                          {granting
                            ? "Granting..."
                            : permissionAvailable
                              ? "Permission Granted"
                              : "Allow One Retake"}
                        </button>
                      </td>
                    </tr>
                  );
                }
              )}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}

export default FacultyMockTestRetakePanel;