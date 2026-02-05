// Login.js
import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { apiPost } from "./api";
import { useAuth } from "./AuthContext";
import "./GuardianStyles.css";

export default function Login() {
  const [form, setForm] = useState({ email: "", password: "" });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const navigate = useNavigate();
  const { login } = useAuth();

  const handleChange = (e) => {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const submit = async () => {
    setError("");
    if (!form.email || !form.password) {
      setError("Please enter email and password.");
      return;
    }

    setLoading(true);
    try {
      const res = await apiPost("/login", form);

      if (!res) {
        setError("No response from server.");
        return;
      }

      if (res.error) {
        setError(res.error);
        return;
      }

      // Save auth + user info in localStorage
      if (res.token) localStorage.setItem("token", res.token);
      if (res.role) localStorage.setItem("role", res.role);
      if (res.name) localStorage.setItem("name", res.name);
      if (res.email) localStorage.setItem("email", res.email);

      // Update Auth Context
      login(res);

      // Redirect based on role
      if (res.role === "admin") navigate("/admin");
      else navigate("/");

    } catch (e) {
      console.error("Login error:", e);
      setError("Network error. Check console for details.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-container">
      <h1 className="guardian-header" style={{ fontSize: "2rem", marginBottom: "20px" }}>Login</h1>

      {error && (
        <div className="error-message">
          {error}
        </div>
      )}

      <input
        className="guardian-input"
        name="email"
        placeholder="Email"
        value={form.email}
        onChange={handleChange}
      />

      <input
        className="guardian-input"
        name="password"
        placeholder="Password"
        type="password"
        value={form.password}
        onChange={handleChange}
      />

      <button
        className="btn btn-primary btn-full"
        onClick={submit}
        disabled={loading}
      >
        {loading ? "Signing in..." : "Login"}
      </button>

      <div style={{ marginTop: "15px", fontSize: "0.9rem" }}>
        Don't have an account? <a href="/signup" style={{ color: "var(--primary-color)", fontWeight: "bold" }}>Sign Up</a>
      </div>
    </div>
  );
}
