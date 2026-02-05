import React, { useState } from "react";
import { apiPost } from "./api";

export default function QuickChatBox() {
  const [language, setLanguage] = useState("en");
  const [destination, setDestination] = useState("");
  const [message, setMessage] = useState("");
  const [reply, setReply] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSend() {
    if (!message.trim()) return;
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

  return (
    <div
      style={{
        width: 280,
        background: "#ffffff",
        border: "1px solid #ddd",
        borderRadius: 12,
        boxShadow: "0 6px 18px rgba(0,0,0,0.15)",
        padding: 10,
      }}
    >
      <div style={{ fontWeight: 700, marginBottom: 6 }}>AI Guide Chat</div>

      <select
        value={language}
        onChange={(e) => setLanguage(e.target.value)}
        style={{ width: "100%", padding: 6, borderRadius: 6, border: "1px solid #ccc", marginBottom: 6 }}
      >
        <option value="en">English</option>
        <option value="hi">Hindi</option>
        <option value="mr">Marathi</option>
      </select>

      <input
        value={destination}
        onChange={(e) => setDestination(e.target.value)}
        placeholder="Destination (optional)"
        style={{ width: "100%", padding: 6, borderRadius: 6, border: "1px solid #ccc", marginBottom: 6 }}
      />

      <textarea
        rows={3}
        value={message}
        onChange={(e) => setMessage(e.target.value)}
        placeholder="Ask a local guide..."
        style={{ width: "100%", padding: 6, borderRadius: 6, border: "1px solid #ccc" }}
      />

      <button
        onClick={handleSend}
        style={{
          marginTop: 6,
          padding: "6px 10px",
          borderRadius: 8,
          border: "2px solid #360146ff",
          background: "#fff",
          cursor: "pointer",
          fontWeight: 600,
        }}
      >
        {loading ? "Sending..." : "Send"}
      </button>

      {reply && (
        <div style={{ marginTop: 8, background: "#f9f9f9", padding: 8, borderRadius: 8 }}>
          {reply}
        </div>
      )}
    </div>
  );
}
