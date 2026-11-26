
import axios from "axios";

const api = axios.create({
  baseURL: "http://localhost:5000/auth",
  withCredentials: true,
  headers: {
    "Content-Type": "application/json",
  },
});

// Signup
export const signupAPI = (data) => {
  return api.post("/signup", data);
};

// Request OTP
export const requestOTPAPI = (email) => {
  return api.post("/otp/send", { email });
};

// Login with OTP
export const loginWithOTPAPI = (email, otp) => {
  return api.post("/otp/verify", { email, otp });
};

// Login with Passkey
export const passkeyLoginOptionsAPI = (email) => {
  return api.post("/passkeys/login/options", { email });
};

export const verifyPasskeyLoginAPI = (email, credential) => {
  return api.post("/passkeys/login/verify", {
    email,
    credential,
  });
};

// Register Passkey
export const passkeyRegisterOptionsAPI = () => {
  return api.post("/passkeys/register/options");
};

export const verifyPasskeyRegistrationAPI = (credential) => {
  return api.post("/passkeys/register/verify", credential);
};

// Logout
export const logoutAPI = () => {
  return api.post("/session/logout");
};

// Get logged-in user
export const getMeAPI = () => {
  return api.get("/session");
};

export default api;
