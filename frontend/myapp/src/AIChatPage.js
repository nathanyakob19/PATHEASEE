import React, { useState } from "react";
import { apiPost } from "./api";

export default function AIChatPage() {
  const [language, setLanguage] = useState("en");
  const [destination, setDestination] = useState("");
  const [message, setMessage] = useState("");
  const [reply, setReply] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleChat() {
    setLoading(true);
    setReply("");
    const data = await apiPost("/ai/guide-chat", {
      message,
      destination,
      language,
    });
    setReply(data.reply || data.error || "");
    setLoading(false);
  }

  function speakText(text) {
    if (!text) return;
    if (!window.speechSynthesis) {
      alert("Speech Synthesis not supported in this browser.");
      return;
    }
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = language === "hi" ? "hi-IN" : language === "mr" ? "mr-IN" : "en-IN";
    window.speechSynthesis.speak(utterance);
  }

  return (
    <div style={{ padding: 20, maxWidth: 900, margin: "0 auto" }}>
      <h1>AI Tourist Chat</h1>

      <div style={{ marginBottom: 12 }}>
        <label style={{ fontWeight: 600, marginRight: 8 }}>Language</label>
        <select
          value={language}
          onChange={(e) => setLanguage(e.target.value)}
          style={{ padding: 6, borderRadius: 6, border: "1px solid #ccc" }}
        >
          <option value="en">English</option>
          <option value="hi">Hindi</option>
          <option value="mr">Marathi</option>
        </select>
      </div>

      <input
        value={destination}
        onChange={(e) => setDestination(e.target.value)}
        placeholder="Destination (optional)"
        style={{ width: "100%", padding: 8, borderRadius: 6, border: "1px solid #ccc", marginBottom: 10 }}
      />

      <textarea
        rows={4}
        value={message}
        onChange={(e) => setMessage(e.target.value)}
        placeholder="Ask your travel question..."
        style={{ width: "100%", padding: 8, borderRadius: 6, border: "1px solid #ccc" }}
      />

      <button
        onClick={handleChat}
        style={{
          marginTop: 10,
          padding: "8px 14px",
          borderRadius: 8,
          border: "2px solid #360146ff",
          background: "#fff",
          cursor: "pointer",
          fontWeight: 600,
        }}
      >
        {loading ? "Asking..." : "Ask Guide"}
      </button>

      {reply && (
        <div style={{ marginTop: 14 }}>
          <div style={{ background: "#f9f9f9", padding: 10, borderRadius: 8, whiteSpace: "pre-wrap", maxHeight: 320, overflowY: "auto" }}>{reply}</div>
          <button
            onClick={() => speakText(reply)}
            style={{
              marginTop: 8,
              padding: "6px 10px",
              borderRadius: 8,
              border: "1px solid #360146ff",
              background: "#fff",
              cursor: "pointer",
            }}
          >
            Speak Response
          </button>
        </div>
      )}
    </div>
  );
}
