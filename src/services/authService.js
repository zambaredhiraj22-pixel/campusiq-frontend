const AUTH_KEYS = {
  token: "campusiqToken",
  tokenType: "campusiqTokenType",
  userId: "campusiqUserId",
  username: "campusiqUsername",
  role: "campusiqRole",
};

async function login(username, password) {
  const response = await fetch("/api/auth/login", {
    method: "POST",

    headers: {
      "Content-Type": "application/json",
    },

    body: JSON.stringify({
      username: username.trim(),
      password: password,
    }),
  });

  const data = await response
    .json()
    .catch(() => ({}));

  if (!response.ok) {
    throw new Error(
      data.message ||
        "Invalid username or password."
    );
  }

  if (
    !data.id ||
    !data.username ||
    !data.role ||
    !data.token
  ) {
    throw new Error(
      "The server returned an invalid login response."
    );
  }

  localStorage.setItem(
    AUTH_KEYS.token,
    data.token
  );

  localStorage.setItem(
    AUTH_KEYS.tokenType,
    data.tokenType || "Bearer"
  );

  localStorage.setItem(
    AUTH_KEYS.userId,
    String(data.id)
  );

  localStorage.setItem(
    AUTH_KEYS.username,
    data.username
  );

  localStorage.setItem(
    AUTH_KEYS.role,
    data.role
  );

  return data;
}

function getToken() {
  return localStorage.getItem(AUTH_KEYS.token);
}

function getTokenType() {
  return (
    localStorage.getItem(AUTH_KEYS.tokenType) ||
    "Bearer"
  );
}

function getCurrentUser() {
  const token = getToken();
  const userId = localStorage.getItem(
    AUTH_KEYS.userId
  );
  const username = localStorage.getItem(
    AUTH_KEYS.username
  );
  const role = localStorage.getItem(
    AUTH_KEYS.role
  );

  if (!token || !userId || !username || !role) {
    return null;
  }

  return {
    id: Number(userId),
    username: username,
    role: role,
    token: token,
    tokenType: getTokenType(),
  };
}

function getCurrentRole() {
  return localStorage.getItem(AUTH_KEYS.role);
}

function isAuthenticated() {
  return Boolean(getToken());
}

function logout() {
  Object.values(AUTH_KEYS).forEach((key) => {
    localStorage.removeItem(key);
  });
}

const authService = {
  login,
  logout,
  getToken,
  getTokenType,
  getCurrentUser,
  getCurrentRole,
  isAuthenticated,
};

export default authService;