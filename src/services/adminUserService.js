import apiService from "./apiService";

const adminUserService = {
  async getPendingUsers() {
    return apiService.get(
      "/api/admin/users/pending"
    );
  },

  async getStaffUsers() {
    return apiService.get(
      "/api/admin/users/staff"
    );
  },

  async approveUser(userId) {
    return apiService.patch(
      `/api/admin/users/${userId}/approve`
    );
  },

  async rejectUser(userId) {
    return apiService.patch(
      `/api/admin/users/${userId}/reject`
    );
  },
};

export default adminUserService;