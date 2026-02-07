import React, { useState } from "react";
import { apiPost } from "./api";

export default function QuickChatBox() {
  const [language, setLanguage] = useState("en");
  const [destination, setDestination] = useState("");
  const [message, setMessage] = useState("");
  const [reply, setReply] = useState("");
  const [loading, setLoading] = useState(false);
  const [messages, setMessages] = useState([]);

  async function handleSend() {
    if (!message.trim()) return;
    setLoading(true);
    setReply("");
    setMessages((prev) => [...prev, { role: "user", text: message }]);
    try {
      const data = await apiPost("/ai/guide-chat", {
        message,
        destination,
        language,
      });
      const r = data.reply || data.error || "";
      setReply(r);
      setMessages((prev) => [...prev, { role: "assistant", text: r }]);
    } catch (e) {
      const r = e?.message || "Failed to reach the guide service.";
      setReply(r);
      setMessages((prev) => [...prev, { role: "error", text: r }]);
    } finally {
      setLoading(false);
      setMessage("");
    }
  }

  return (
    <div
      style={{
        width: "min(320px, 90vw)",
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

      <div
        style={{
          maxHeight: 220,
          overflowY: "auto",
          border: "1px solid #eee",
          borderRadius: 8,
          padding: 8,
          marginBottom: 8,
          background: "#fafafa",
        }}
      >
        {messages.map((m, i) => (
          <div
            key={i}
            style={{
              marginBottom: 6,
              display: "flex",
              gap: 8,
              alignItems: "flex-start",
            }}
          >
            <div
              style={{
                width: 22,
                height: 22,
                borderRadius: 11,
                background: m.role === "user" ? "#e6d6ff" : m.role === "assistant" ? "#d6f5e6" : "#ffd6d6",
                textAlign: "center",
                lineHeight: "22px",
                fontSize: 12,
                fontWeight: 700,
              }}
            >
              {m.role === "user" ? "U" : m.role === "assistant" ? "A" : "!"}
            </div>
            <div style={{ flex: 1, whiteSpace: "pre-wrap" }}>{m.text}</div>
          </div>
        ))}
      </div>

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
