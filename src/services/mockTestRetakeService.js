import apiService from "./apiService";

const RETAKE_API =
  "/api/faculty/mock-tests";

const mockTestRetakeService = {
  async getRetakeStatuses() {
    const response = await apiService.get(
      `${RETAKE_API}/retakes`
    );

    return Array.isArray(response)
      ? response
      : [];
  },

  async allowRetake(assignmentId) {
    const normalizedAssignmentId =
      Number(assignmentId);

    if (
      !Number.isInteger(
        normalizedAssignmentId
      ) ||
      normalizedAssignmentId <= 0
    ) {
      throw new Error(
        "A valid assignment ID is required."
      );
    }

    return apiService.post(
      `${RETAKE_API}/assignments/${normalizedAssignmentId}/allow-retake`,
      {}
    );
  },
};

export default mockTestRetakeService;