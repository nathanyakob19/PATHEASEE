import React from "react";

export default function AccessibilityPage({ onToggle, isOn }) {
  return (
    <div style={{ padding: 20, maxWidth: 900, margin: "0 auto" }}>
      <h1>Accessibility Features</h1>
      <p>
        Use this page to enable high-contrast mode for better visibility.
      </p>
      <button
        onClick={onToggle}
        style={{
          marginTop: 10,
          padding: "10px 14px",
          borderRadius: 8,
          border: "3px solid #000",
          background: isOn ? "#000" : "#fff",
          color: isOn ? "#fff" : "#000",
          fontWeight: "bold",
          cursor: "pointer",
        }}
      >
        Accessibility {isOn ? "ON" : "OFF"}
      </button>
    </div>
  );
}
