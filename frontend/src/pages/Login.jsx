
import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { startAuthentication } from "@simplewebauthn/browser";
import { useDispatch } from "react-redux";
import { setUser } from "../redux/authSlice";

import {
  requestOTPAPI,
  loginWithOTPAPI,
  passkeyLoginOptionsAPI,
  verifyPasskeyLoginAPI,
  getMeAPI,
  
} from "../config/api";

const Login = () => {
  const navigate = useNavigate();
  const dispatch = useDispatch();

  const [email, setEmail] = useState("");
  const [popup, setPopup] = useState("");
  const [otp, setOtp] = useState("");

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // Request OTP
  const handleOTPLogin = async () => {
    if (!email.trim()) {
      alert("Please enter your email");
      return;
    }

    try {
      setLoading(true);
      setError("");

      const res = await requestOTPAPI(email);

      console.log(res.data.message);

      setPopup("otp");
    } catch (error) {
      setError(
        error.response?.data?.message || "Failed to send OTP"
      );
    } finally {
      setLoading(false);
    }
  };

  // Verify OTP and login
  const handleVerifyOTP = async () => {
    if (otp.length !== 6) {
      setError("Please enter a valid 6-digit OTP");
      return;
    }

    try {
      setLoading(true);
      setError("");

      const res = await loginWithOTPAPI(email, otp);

      dispatch(setUser(res.data.user));

      navigate("/home");

      // Backend sets HttpOnly authentication cookie
      setPopup("");
    } catch (error) {
      setError(
        error.response?.data?.message || "OTP verification failed"
      );
    } finally {
      setLoading(false);
    }
  };

  // Resend OTP
  const handleResendOTP = async () => {
    try {
      setLoading(true);
      setError("");

      const res = await requestOTPAPI(email);

      console.log(res.data.message);
    } catch (error) {
      setError(
        error.response?.data?.message || "Failed to resend OTP"
      );
    } finally {
      setLoading(false);
    }
  };

  // Login with Face ID / Passkey
  const handleFaceIDLogin = async () => {
    if (!email.trim()) {
      alert("Please enter your email");
      return;
    }

    try {
      setLoading(true);
      setError("");

      // Get passkey authentication options from backend
      const optionsRes = await passkeyLoginOptionsAPI(email);

      // Open device authentication prompt
      const credential = await startAuthentication({
        optionsJSON: optionsRes.data,
      });

      // Verify credential with backend
      const res = await verifyPasskeyLoginAPI(
        email,
        credential
      );

      console.log(res.data.message);

      // Get logged-in user from backend
      const me = await getMeAPI();

      dispatch(setUser(me.data.user));

      setPopup("");
      navigate("/home");
    } catch (error) {
      setError(
        error.response?.data?.message ||
        error.message ||
        "Passkey authentication failed"
      );
    } finally {
      setLoading(false);
    }
  };

  // Close popup
  const closePopup = () => {
    setPopup("");
    setOtp("");
    setError("");
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100 px-4">

      {/* Login Card */}
      <div className="w-full max-w-md bg-white p-8 rounded-2xl shadow-lg">

        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900">
            Welcome Back
          </h1>

          <p className="text-gray-500 mt-2">
            Login to continue
          </p>
        </div>

        {/* Email Input */}
        <div className="mb-6">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Email Address
          </label>

          <input
            type="email"
            value={email}
            onChange={(e) => {
              setEmail(e.target.value);
              setError("");
            }}
            placeholder="Enter your email"
            className="w-full border border-gray-300 rounded-lg px-4 py-3 outline-none focus:ring-2 focus:ring-black"
          />
        </div>

        {/* OTP Login Button */}
        <button
          onClick={handleOTPLogin}
          disabled={loading}
          className="w-full bg-black text-white py-3 rounded-lg font-semibold hover:bg-gray-800 transition disabled:bg-gray-400"
        >
          {loading ? "Please wait..." : "Login with OTP"}
        </button>

        {/* Divider */}
        <div className="flex items-center gap-3 my-5">
          <div className="flex-1 h-px bg-gray-300" />
          <span className="text-gray-400 text-sm">OR</span>
          <div className="flex-1 h-px bg-gray-300" />
        </div>

        {/* Face ID Button */}
        <button
          onClick={handleFaceIDLogin}
          disabled={loading}
          className="w-full border border-gray-300 py-3 rounded-lg font-semibold hover:bg-gray-50 transition disabled:bg-gray-100"
        >
          Login with Face ID / Passkey
        </button>

        {/* Error */}
        {error && !popup && (
          <p className="text-red-500 text-sm text-center mt-4">
            {error}
          </p>
        )}

        {/* Signup Link */}
        <p className="text-center text-sm text-gray-500 mt-6">
          Don't have an account?{" "}
          <Link
            to="/"
            className="text-black font-semibold hover:underline"
          >
            Sign Up
          </Link>
        </p>
      </div>

      {/* Popup Overlay */}
      {popup && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center px-4 z-50">

          <div className="bg-white w-full max-w-sm rounded-2xl p-6 shadow-xl relative">

            {/* Close Button */}
            <button
              onClick={closePopup}
              className="absolute top-4 right-4 text-gray-500 hover:text-black text-xl"
            >
              ✕
            </button>

            {/* OTP Popup */}
            {popup === "otp" && (
              <div className="text-center">
                <h2 className="text-2xl font-bold">
                  Verify OTP
                </h2>

                <p className="text-gray-500 text-sm mt-2">
                  Enter the 6-digit code sent to
                </p>

                <p className="font-medium mt-1">
                  {email}
                </p>

                <input
                  type="text"
                  inputMode="numeric"
                  maxLength={6}
                  value={otp}
                  onChange={(e) => {
                    if (/^\d{0,6}$/.test(e.target.value)) {
                      setOtp(e.target.value);
                      setError("");
                    }
                  }}
                  placeholder="000000"
                  className="w-full text-center tracking-[10px] text-xl border border-gray-300 rounded-lg px-4 py-3 mt-6 outline-none focus:ring-2 focus:ring-black"
                />

                {error && (
                  <p className="text-red-500 text-sm mt-3">
                    {error}
                  </p>
                )}

                <button
                  onClick={handleVerifyOTP}
                  disabled={otp.length !== 6 || loading}
                  className="w-full bg-black text-white py-3 rounded-lg mt-5 disabled:bg-gray-400"
                >
                  {loading ? "Verifying..." : "Verify & Login"}
                </button>

                <button
                  onClick={handleResendOTP}
                  disabled={loading}
                  className="text-sm text-gray-500 mt-4 hover:underline disabled:text-gray-400"
                >
                  Resend OTP
                </button>
              </div>
            )}

            {/* Face ID Popup */}
            {popup === "faceid" && (
              <div className="text-center">
                <h2 className="text-2xl font-bold">
                  Face ID Login
                </h2>

                <p className="text-gray-500 text-sm mt-2">
                  Authenticate using your device
                </p>

                <div className="flex justify-center my-8">
                  <div className="w-24 h-24 rounded-full bg-gray-100 flex items-center justify-center">
                    <svg
                      width="55"
                      height="55"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="1.5"
                    >
                      <rect
                        x="3"
                        y="3"
                        width="18"
                        height="18"
                        rx="5"
                      />
                      <path d="M8 9h.01M16 9h.01" />
                      <path d="M8 14c1 2 2.5 3 4 3s3-1 4-3" />
                    </svg>
                  </div>
                </div>

                <p className="text-sm text-gray-500">
                  Email: {email}
                </p>

                {error && (
                  <p className="text-red-500 text-sm mt-3">
                    {error}
                  </p>
                )}

                <button
                  onClick={handleFaceIDLogin}
                  disabled={loading}
                  className="w-full bg-black text-white py-3 rounded-lg mt-6 hover:bg-gray-800 disabled:bg-gray-400"
                >
                  {loading ? "Authenticating..." : "Authenticate"}
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default Login;
