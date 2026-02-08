import React from "react";

const MODES = ["off", "high-contrast", "protanopia", "deuteranopia", "tritanopia"];

export default function AccessibilityPage({ onToggle, mode, onSelectMode }) {
  return (
    <div style={{ padding: 20, maxWidth: 900, margin: "0 auto" }}>
      <h1>Accessibility Features</h1>
      <p>
        Choose a color-blind friendly mode for better visibility.
      </p>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 10, marginTop: 12 }}>
        {MODES.map((m) => {
          const label = m === "off" ? "Off" : m.replace("-", " ").replace(/\b\w/g, (c) => c.toUpperCase());
          const active = mode === m;
          return (
            <button
              key={m}
              onClick={() => onSelectMode(m)}
              style={{
                padding: "10px 12px",
                borderRadius: 10,
                border: active ? "3px solid #000" : "2px solid #000",
                background: active ? "#000" : "#fff",
                color: active ? "#fff" : "#000",
                fontWeight: 700,
                cursor: "pointer",
              }}
            >
              {label}
            </button>
          );
        })}
      </div>

      <button
        onClick={onToggle}
        style={{
          marginTop: 14,
          padding: "10px 14px",
          borderRadius: 8,
          border: "3px dashed #000",
          background: "#fff",
          color: "#000",
          fontWeight: "bold",
          cursor: "pointer",
        }}
      >
        Cycle Mode
      </button>
    </div>
  );
}
