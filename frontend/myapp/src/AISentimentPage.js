import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { apiPost } from "./api";

export default function AISentimentPage() {
  const navigate = useNavigate();
  const [reviewText, setReviewText] = useState("");
  const [sentiment, setSentiment] = useState(null);
  const [loading, setLoading] = useState(false);

  async function handleSentiment() {
    setLoading(true);
    setSentiment(null);
    const data = await apiPost("/ai/sentiment", { text: reviewText });
    setSentiment(data);
    setLoading(false);
  }

  return (
    <div style={{ padding: 20, maxWidth: 900, margin: "0 auto" }}>
      <div style={{ display: "flex", justifyContent: "flex-start", marginBottom: 16 }}>
        <button onClick={() => navigate(-1)}>Back</button>
      </div>
      <h1>Review Sentiment</h1>

      <textarea
        rows={4}
        value={reviewText}
        onChange={(e) => setReviewText(e.target.value)}
        placeholder="write a tourist review..."
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
        {loading ? "Analyzing..." : "Analyze Feedback"}
      </button>

      {sentiment && (
        <div style={{ marginTop: 12, background: "#f9f9f9", padding: 10, borderRadius: 8 }}>
          <div>Label: {sentiment.label}</div>
          <div>Score: {sentiment.score}</div>
          <div>Word count: {sentiment.word_count}</div>
        </div>
      )}
      <div style={{ marginTop: 30, display: "flex", justifyContent: "center" }}>
        <button onClick={() => navigate(-1)}>Back</button>
      </div>
    </div>
  );
}
