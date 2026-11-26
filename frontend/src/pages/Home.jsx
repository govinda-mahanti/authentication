
import React, { useState } from "react";
import { useSelector, useDispatch } from "react-redux";
import { useNavigate } from "react-router-dom";
import { startRegistration } from "@simplewebauthn/browser";

import {
  logoutAPI,
  passkeyRegisterOptionsAPI,
  verifyPasskeyRegistrationAPI,
} from "../config/api";

import { clearAuth } from "../redux/authSlice";

const Home = () => {
  const { user, isAuthenticated } = useSelector(
    (state) => state.auth
  );

  const dispatch = useDispatch();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  // Register Face ID / Passkey
  const handleRegisterPasskey = async () => {
    try {
      setLoading(true);
      setMessage("");

      // Step 1: Get registration options from backend
      const optionsRes = await passkeyRegisterOptionsAPI();

      // Step 2: Open device authentication prompt
      const credential = await startRegistration({
        optionsJSON: optionsRes.data,
      });

      // Step 3: Send credential to backend for verification
      const verifyRes = await verifyPasskeyRegistrationAPI(
        credential
      );

      setMessage(
        verifyRes.data.message ||
          "Passkey registered successfully"
      );
    } catch (error) {
      setMessage(
        error.response?.data?.message ||
          error.message ||
          "Passkey registration failed"
      );
    } finally {
      setLoading(false);
    }
  };

  // Logout
  const handleLogout = async () => {
    try {
      await logoutAPI();
    } catch (error) {
      console.log(
        error.response?.data?.message || error.message
      );
    } finally {
      dispatch(clearAuth());
      navigate("/login");
    }
  };

  if (!isAuthenticated) {
    return <p>Please login</p>;
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100">
      <div className="w-full max-w-md bg-white p-8 rounded-2xl shadow-lg text-center">

        <h1 className="text-2xl font-bold">
          Welcome {user?.email || user?.surname || "User"}
        </h1>

        <p className="text-gray-500 mt-2">
          Manage your account
        </p>

        {/* Register Passkey Button */}
        <button
          onClick={handleRegisterPasskey}
          disabled={loading}
          className="w-full bg-black text-white py-3 rounded-lg mt-6 hover:bg-gray-800 disabled:bg-gray-400"
        >
          {loading
            ? "Setting up Passkey..."
            : "Set up Face ID / Passkey"}
        </button>

        {/* Status Message */}
        {message && (
          <p className="text-sm mt-4 text-gray-600">
            {message}
          </p>
        )}

        {/* Logout Button */}
        <button
          onClick={handleLogout}
          className="w-full border border-gray-300 py-3 rounded-lg mt-4 hover:bg-gray-50"
        >
          Logout
        </button>
      </div>
    </div>
  );
};

export default Home;
