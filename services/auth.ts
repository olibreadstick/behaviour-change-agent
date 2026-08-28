const API_BASE_URL =
  import.meta.env.VITE_API_URL ||
  "http://localhost:8080";

interface AuthResponse {
  participantId: string;
}

interface ErrorResponse {
  error?: string;
}

const sendAuthRequest = async (
  path: string,
  username: string,
  password: string
): Promise<AuthResponse> => {
  const response = await fetch(
    `${API_BASE_URL}${path}`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        username,
        password,
      }),
    }
  );

  const data:
    | AuthResponse
    | ErrorResponse =
    await response.json();

  if (!response.ok) {
    throw new Error(
      "error" in data && data.error
        ? data.error
        : "Something went wrong."
    );
  }

  return data as AuthResponse;
};

export const signupParticipant = (
  username: string,
  password: string
) =>
  sendAuthRequest(
    "/api/auth/participant/signup",
    username,
    password
  );

export const loginParticipant = (
  username: string,
  password: string
) =>
  sendAuthRequest(
    "/api/auth/participant/login",
    username,
    password
  );

interface AdminAuthResponse {
  role: "admin";
}

export const loginAdmin = async (
  username: string,
  password: string
): Promise<AdminAuthResponse> => {
  const response = await fetch(
    `${API_BASE_URL}/api/auth/admin/login`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        username,
        password,
      }),
    }
  );

  const data = await response.json();

  if (!response.ok) {
    throw new Error(
      data.error ||
        "Unable to log in as administrator."
    );
  }

  return data as AdminAuthResponse;
};


interface AdminPasswordChangeResponse {
  message: string;
}

export const changeAdminPassword = async (
  username: string,
  currentPassword: string,
  newPassword: string
): Promise<AdminPasswordChangeResponse> => {
  const response = await fetch(
    `${API_BASE_URL}/api/auth/admin/change-password`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        username,
        currentPassword,
        newPassword,
      }),
    }
  );

  const data = await response.json();

  if (!response.ok) {
    throw new Error(
      data.error ||
        "Unable to change administrator password."
    );
  }

  return data as AdminPasswordChangeResponse;
};
