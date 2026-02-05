import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { apiPost } from "./api";
import "./GuardianStyles.css";

function Signup() {
  const [form, setForm] = useState({ name: "", email: "", password: "" });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const navigate = useNavigate();

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const submit = async () => {
    setError("");
    if (!form.name || !form.email || !form.password) {
      setError("All fields are required.");
      return;
    }

    setLoading(true);
    try {
      const res = await apiPost("/signup", form);

      if (res.error) {
        setError(res.error);
      } else {
        alert("Signup successful! Please login.");
        navigate("/login");
      }
    } catch (e) {
      console.error(e);
      setError("Network error.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-container">
      <h1 className="guardian-header" style={{ fontSize: "2rem", marginBottom: "20px" }}>Sign Up</h1>

      {error && (
        <div className="error-message">
          {error}
        </div>
      )}

      <input
        className="guardian-input"
        name="name"
        placeholder="Full Name"
        value={form.name}
        onChange={handleChange}
      />

      <input
        className="guardian-input"
        name="email"
        placeholder="Email Address"
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
        {loading ? "Creating Account..." : "Create Account"}
      </button>

      <div style={{ marginTop: "15px", fontSize: "0.9rem" }}>
        Already have an account? <a href="/login" style={{ color: "var(--primary-color)", fontWeight: "bold" }}>Login</a>
      </div>
    </div>
  );
}

export default Signup;
