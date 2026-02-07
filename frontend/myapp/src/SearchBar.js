import { useRef } from "react";

export default function SearchBar() {
  const inputRef = useRef(null);

  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 10,
        width: "100%",
        maxWidth: "100%",
      }}
    >
      {/* 🔵 LOGO */}
      <div
        onClick={() => inputRef.current?.focus()}
        style={{
          width: 42,
          height: 42,
          borderRadius: "50%",
          background: "#3a015cff",
          color: "#fff",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontWeight: "bold",
          cursor: "pointer",
          userSelect: "none",
          flexShrink: 0,
        }}
        title="Click to search"
      >
        P
      </div>

      {/* 🔍 SEARCH INPUT */}
      <input
        ref={inputRef}
        type="text"
        placeholder="Search locations..."
        style={{
          flex: 1,
          width: "100%",
          minWidth: 0,
          padding: "8px 12px",
          borderRadius: 8,
          border: "1px solid #ccc",
          outline: "none",
        }}
      />
    </div>
  );
}
