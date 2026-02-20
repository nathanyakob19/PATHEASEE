import React, { useEffect, useState } from "react";
import { apiPost } from "./api";
import { executeChatCommand } from "./chatCommands";

export default function FloatingChat() {
  const [open, setOpen] = useState(false);
  const [language, setLanguage] = useState("en");
  const [destination, setDestination] = useState("");
  const [message, setMessage] = useState("");
  const [reply, setReply] = useState("");
  const [loading, setLoading] = useState(false);
  const [coords, setCoords] = useState(null);

  useEffect(() => {
    if (!navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition(
      (pos) => setCoords({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
      () => setCoords(null)
    );
  }, []);

  async function handleSend() {
    const userText = message.trim();
    if (!userText) return;
    const cmd = executeChatCommand(userText);
    if (cmd.handled) {
      setReply(cmd.message || "Done.");
      return;
    }
    setLoading(true);
    setReply("");
    try {
      const data = await apiPost("/ai/guide-chat", {
        message: userText,
        destination,
        language,
        lat: coords?.lat,
        lng: coords?.lng,
      });
      setReply(data.reply || data.error || "");
    } catch (err) {
      setReply(err?.message || "Failed to reach the guide service.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={{ position: "fixed", left: 20, bottom: 20, zIndex: 3500 }}>
      {open && (
        <div
          style={{
            width: 300,
            background: "#ffffff",
            border: "1px solid #ddd",
            borderRadius: 12,
            boxShadow: "0 6px 18px rgba(0,0,0,0.15)",
            padding: 12,
            marginBottom: 8,
          }}
        >
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
            <strong>AI Guide</strong>
            <button
              onClick={() => setOpen(false)}
              style={{
                border: "1px solid #360146ff",
                background: "#fff",
                borderRadius: 6,
                cursor: "pointer",
                padding: "2px 6px",
              }}
              aria-label="Close chat"
            >
              X
            </button>
          </div>

          <div style={{ display: "flex", gap: 6, marginBottom: 6 }}>
            <select
              value={language}
              onChange={(e) => setLanguage(e.target.value)}
              style={{ flex: 1, padding: 6, borderRadius: 6, border: "1px solid #ccc" }}
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
            style={{ width: "100%", padding: 6, borderRadius: 6, border: "1px solid #ccc" }}
          />

          <textarea
            rows={3}
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="Ask a local guide..."
            style={{ width: "100%", marginTop: 6, padding: 6, borderRadius: 6, border: "1px solid #ccc" }}
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
            <div style={{ marginTop: 8, background: "#f9f9f9", padding: 8, borderRadius: 8, whiteSpace: "pre-wrap" }}>
              {reply}
            </div>
          )}
        </div>
      )}

      <button
        onClick={() => setOpen((v) => !v)}
        aria-label="Toggle chat"
        style={{
          width: 48,
          height: 48,
          borderRadius: 14,
          border: "2px solid #360146ff",
          background: "#fff",
          fontSize: 18,
          fontWeight: 700,
          cursor: "pointer",
        }}
      >
        Chat
      </button>
    </div>
  );
}
