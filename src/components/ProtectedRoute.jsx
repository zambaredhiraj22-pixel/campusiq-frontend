import { Navigate } from "react-router-dom";

import authService from "../services/authService";

function ProtectedRoute({
  children,
  allowedRoles = [],
}) {
  const isLoggedIn =
    authService.isAuthenticated();

  const currentRole =
    authService.getCurrentRole();

  if (!isLoggedIn) {
    return (
      <Navigate
        to="/login"
        replace
      />
    );
  }

  const hasRoleRestriction =
    allowedRoles.length > 0;

  const hasRequiredRole =
    allowedRoles.includes(currentRole);

  if (
    hasRoleRestriction &&
    !hasRequiredRole
  ) {
    return (
      <Navigate
        to="/"
        replace
      />
    );
  }

  return children;
}

export default ProtectedRoute;