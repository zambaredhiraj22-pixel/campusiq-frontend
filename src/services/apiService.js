import authService from "./authService";

async function request(endpoint, options = {}) {
  const token = authService.getToken();
  const tokenType = authService.getTokenType();

  const headers = new Headers(
    options.headers || {}
  );

  if (token) {
    headers.set(
      "Authorization",
      `${tokenType} ${token}`
    );
  }

  if (
    options.body &&
    !(options.body instanceof FormData)
  ) {
    headers.set(
      "Content-Type",
      "application/json"
    );
  }

  const response = await fetch(endpoint, {
    ...options,
    headers: headers,
  });

  if (response.status === 204) {
    return null;
  }

  const contentType =
    response.headers.get("content-type") || "";

  let data;

  if (
    contentType.includes("application/json")
  ) {
    data = await response.json();

  } else {
    const responseText =
      await response.text();

    data = responseText
      ? { message: responseText }
      : {};
  }

  if (!response.ok) {
    if (response.status === 401) {
      authService.logout();
    }

    const error = new Error(
      data.message ||
        `Request failed with status ${response.status}.`
    );

    error.status = response.status;
    error.data = data;

    throw error;
  }

  return data;
}

function get(endpoint, options = {}) {
  return request(endpoint, {
    ...options,
    method: "GET",
  });
}

function post(endpoint, body, options = {}) {
  return request(endpoint, {
    ...options,
    method: "POST",
    body: JSON.stringify(body),
  });
}

function put(endpoint, body, options = {}) {
  return request(endpoint, {
    ...options,
    method: "PUT",
    body: JSON.stringify(body),
  });
}

function patch(endpoint, body = null, options = {}) {
  return request(endpoint, {
    ...options,
    method: "PATCH",
    body:
      body === null
        ? undefined
        : JSON.stringify(body),
  });
}

function remove(endpoint, options = {}) {
  return request(endpoint, {
    ...options,
    method: "DELETE",
  });
}

const apiService = {
  request,
  get,
  post,
  put,
  patch,
  delete: remove,
};

export default apiService;