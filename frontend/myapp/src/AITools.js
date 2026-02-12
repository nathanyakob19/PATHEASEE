import React, { useState } from "react";
import { apiPost } from "./api";

const LANG_OPTIONS = [
  { value: "en", label: "English" },
  { value: "hi", label: "Hindi" },
  { value: "mr", label: "Marathi" },
];

export default function AITools() {
  const [language, setLanguage] = useState("en");

  // Trip planner
  const [destination, setDestination] = useState("");
  const [days, setDays] = useState(3);
  const [budget, setBudget] = useState("");
  const [travelType, setTravelType] = useState("leisure");
  const [interests, setInterests] = useState("");
  const [planResult, setPlanResult] = useState(null);
  const [planLoading, setPlanLoading] = useState(false);

  // Chat
  const [chatMessage, setChatMessage] = useState("");
  const [chatReply, setChatReply] = useState("");
  const [chatLoading, setChatLoading] = useState(false);

  // Sentiment
  const [reviewText, setReviewText] = useState("");
  const [sentiment, setSentiment] = useState(null);
  const [sentimentLoading, setSentimentLoading] = useState(false);

  async function handleTripPlan() {
    setPlanLoading(true);
    setPlanResult(null);
    const data = await apiPost("/ai/trip-planner", {
      destination,
      days,
      budget,
      travel_type: travelType,
      interests: interests
        .split(",")
        .map((v) => v.trim())
        .filter(Boolean),
      language,
    });
    setPlanResult(data);
    setPlanLoading(false);
  }

  async function handleChat() {
    setChatLoading(true);
    setChatReply("");
    const data = await apiPost("/ai/guide-chat", {
      message: chatMessage,
      destination,
      language,
    });
    setChatReply(data.reply || data.error || "");
    setChatLoading(false);
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

  async function handleSentiment() {
    setSentimentLoading(true);
    setSentiment(null);
    const data = await apiPost("/ai/sentiment", { text: reviewText });
    setSentiment(data);
    setSentimentLoading(false);
  }

  return (
    <div style={{ padding: 20, maxWidth: 980, margin: "0 auto" }}>
      <h1>AI Travel Tools</h1>

      <div style={{ marginBottom: 16 }}>
        <label style={{ fontWeight: 600, marginRight: 8 }}>Language</label>
        <select
          value={language}
          onChange={(e) => setLanguage(e.target.value)}
          style={{ padding: 6, borderRadius: 6, border: "1px solid #ccc" }}
        >
          {LANG_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
      </div>

      {/* Trip Planner */}
      <section
        style={{
          background: "#ffffffcc",
          border: "1px solid #ddd",
          borderRadius: 12,
          padding: 16,
          marginBottom: 18,
        }}
      >
        <h2>AI Trip Planner</h2>
        <div style={{ display: "grid", gap: 10, gridTemplateColumns: "1fr 1fr" }}>
          <input
            value={destination}
            onChange={(e) => setDestination(e.target.value)}
            placeholder="Destination (e.g., Mumbai)"
            style={{ padding: 8, borderRadius: 6, border: "1px solid #ccc" }}
          />
          <input
            type="number"
            value={days}
            onChange={(e) => setDays(e.target.value)}
            placeholder="Days"
            style={{ padding: 8, borderRadius: 6, border: "1px solid #ccc" }}
          />
          <input
            value={budget}
            onChange={(e) => setBudget(e.target.value)}
            placeholder="Budget (e.g., 15000)"
            style={{ padding: 8, borderRadius: 6, border: "1px solid #ccc" }}
          />
          <input
            value={travelType}
            onChange={(e) => setTravelType(e.target.value)}
            placeholder="Travel type (leisure, business, family)"
            style={{ padding: 8, borderRadius: 6, border: "1px solid #ccc" }}
          />
        </div>
        <input
          value={interests}
          onChange={(e) => setInterests(e.target.value)}
          placeholder="Interests (comma separated, e.g., food, culture, beaches)"
          style={{ marginTop: 10, width: "100%", padding: 8, borderRadius: 6, border: "1px solid #ccc" }}
        />
        <button
          onClick={handleTripPlan}
          style={{
            marginTop: 12,
            padding: "8px 14px",
            borderRadius: 8,
            border: "2px solid #360146ff",
            background: "#fff",
            cursor: "pointer",
            fontWeight: 600,
          }}
        >
          {planLoading ? "Planning..." : "Generate Itinerary"}
        </button>

        {planResult?.itinerary && (
          <div style={{ marginTop: 14 }}>
            <div style={{ fontSize: 12, opacity: 0.7 }}>
              Source: {planResult.source}
            </div>
            {planResult.itinerary.map((d) => (
              <div
                key={d.day}
                style={{
                  border: "1px solid #eee",
                  borderRadius: 10,
                  padding: 12,
                  marginTop: 10,
                  background: "#fafafa",
                }}
              >
                <strong>{d.title}</strong>
                <div>Morning: {d.morning}</div>
                <div>Afternoon: {d.afternoon}</div>
                <div>Evening: {d.evening}</div>
                <div>Tips: {d.tips}</div>
                <div>Estimated cost: {d.est_cost}</div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Chat */}
      <section
        style={{
          background: "#ffffffcc",
          border: "1px solid #ddd",
          borderRadius: 12,
          padding: 16,
          marginBottom: 18,
        }}
      >
        <h2>AI Tourist Chat</h2>
        <textarea
          rows={3}
          value={chatMessage}
          onChange={(e) => setChatMessage(e.target.value)}
          placeholder="Ask a local guide..."
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
          {chatLoading ? "Asking..." : "Ask Guide"}
        </button>

        {chatReply && (
          <div style={{ marginTop: 12 }}>
            <div style={{ background: "#f9f9f9", padding: 10, borderRadius: 8, whiteSpace: "pre-wrap", maxHeight: 300, overflowY: "auto" }}>
              {chatReply}
            </div>
            <button
              onClick={() => speakText(chatReply)}
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
      </section>

      {/* Sentiment */}
      <section
        style={{
          background: "#ffffffcc",
          border: "1px solid #ddd",
          borderRadius: 12,
          padding: 16,
        }}
      >
        <h2>Review Sentiment</h2>
        <textarea
          rows={3}
          value={reviewText}
          onChange={(e) => setReviewText(e.target.value)}
          placeholder="Paste a tourist review..."
          style={{ width: "100%", padding: 8, borderRadius: 6, border: "1px solid #ccc" }}
        />
        <button
          onClick={handleSentiment}
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
          {sentimentLoading ? "Analyzing..." : "Analyze Sentiment"}
        </button>

        {sentiment && (
          <div style={{ marginTop: 12, background: "#f9f9f9", padding: 10, borderRadius: 8 }}>
            <div>Label: {sentiment.label}</div>
            <div>Score: {sentiment.score}</div>
            <div>Word count: {sentiment.word_count}</div>
          </div>
        )}
      </section>
    </div>
  );
}
