import { useState, useRef, useEffect } from "react";

export default function SearchBar({ data = [], onSelect, onSearch }) {
  const [query, setQuery] = useState("");
  const [suggestions, setSuggestions] = useState([]);
  const [showDropdown, setShowDropdown] = useState(false);
  const wrapperRef = useRef(null);
  const inputRef = useRef(null);

  useEffect(() => {
    // Click outside to close dropdown
    function handleClickOutside(event) {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target)) {
        setShowDropdown(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleChange = (e) => {
    const val = e.target.value;
    setQuery(val);
    if (val.trim()) {
      const filtered = data.filter((item) =>
        item.placeName && item.placeName.toLowerCase().includes(val.toLowerCase())
      );
      setSuggestions(filtered);
      setShowDropdown(true);
    } else {
      setSuggestions([]);
      setShowDropdown(false);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter") {
      setShowDropdown(false);
      if (onSearch) onSearch(query);
    }
  };

  const handleItemClick = (item) => {
    setQuery(item.placeName);
    setShowDropdown(false);
    if (onSelect) onSelect(item);
  };

  return (
    <div
      ref={wrapperRef}
      style={{
        position: "relative",
        display: "flex",
        alignItems: "center",
        gap: 10,
        width: "100%",
        maxWidth: "100%",
        zIndex: 100,
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
        value={query}
        onChange={handleChange}
        onKeyDown={handleKeyDown}
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

      {/* 🔽 DROPDOWN */}
      {showDropdown && suggestions.length > 0 && (
        <div
          style={{
            position: "absolute",
            top: "100%",
            left: 52, // Align with input (42px logo + 10px gap)
            right: 0,
            background: "white",
            border: "1px solid #ddd",
            borderRadius: 8,
            marginTop: 4,
            maxHeight: 200,
            overflowY: "auto",
            zIndex: 1000,
            boxShadow: "0 4px 6px rgba(0,0,0,0.1)",
          }}
        >
          {suggestions.map((item) => (
            <div
              key={item._id || item.placeName}
              onClick={() => handleItemClick(item)}
              style={{
                padding: "10px 12px",
                cursor: "pointer",
                borderBottom: "1px solid #eee",
                fontSize: "14px",
                color: "#333",
              }}
              onMouseEnter={(e) => (e.target.style.background = "#f0f0f0")}
              onMouseLeave={(e) => (e.target.style.background = "white")}
            >
              {item.placeName}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
