import React, { useEffect, useMemo, useRef, useState } from "react";
import { apiPost } from "./api";
import "./VoiceAssistant.css";

const getApiLanguage = (lang) => {
  if (!lang) return "en";
  const l = lang.toLowerCase();
  if (l.startsWith("hi")) return "hi";
  if (l.startsWith("mr")) return "mr";
  return "en";
};

export default function VoiceAssistant({
  language,
  onLanguageChange,
  autoSpeak,
  onAutoSpeakChange,
  onClose,
}) {
  const [destination, setDestination] = useState("");
  const [message, setMessage] = useState("");
  const [interim, setInterim] = useState("");
  const [reply, setReply] = useState("");
  const [listening, setListening] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const recognitionRef = useRef(null);
  const supportsSpeech = useMemo(
    () => !!(window.SpeechRecognition || window.webkitSpeechRecognition),
    []
  );

  useEffect(() => {
    if (!supportsSpeech) return;
    const Recognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    const recognition = new Recognition();
    recognition.lang = language || "en-IN";
    recognition.interimResults = true;
    recognition.continuous = false;

    recognition.onstart = () => {
      setListening(true);
      setError("");
    };

    recognition.onerror = (evt) => {
      setError(evt?.error || "Microphone error");
      setListening(false);
    };

    recognition.onresult = (evt) => {
      let finalText = "";
      let interimText = "";
      for (let i = evt.resultIndex; i < evt.results.length; i += 1) {
        const result = evt.results[i];
        const text = result[0]?.transcript || "";
        if (result.isFinal) finalText += `${text} `;
        else interimText += text;
      }
      if (finalText.trim()) {
        setMessage((prev) => `${prev} ${finalText}`.trim());
      }
      setInterim(interimText);
    };

    recognition.onend = () => {
      setListening(false);
      setInterim("");
    };

    recognitionRef.current = recognition;
    return () => recognition.stop();
  }, [language, supportsSpeech]);

  const speak = (text) => {
    if (!text || !window.speechSynthesis) return;
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = language || "en-IN";
    window.speechSynthesis.speak(utterance);
  };

  const handleStart = () => {
    if (!supportsSpeech) return;
    setError("");
    recognitionRef.current?.start();
  };

  const handleStop = () => {
    recognitionRef.current?.stop();
  };

  const handleSend = async () => {
    const content = message.trim();
    if (!content) return;
    setLoading(true);
    setReply("");
    setError("");
    try {
      const data = await apiPost("/ai/guide-chat", {
        message: content,
        destination: destination.trim(),
        language: getApiLanguage(language),
      });
      const nextReply = data.reply || data.error || "";
      setReply(nextReply);
      if (autoSpeak && nextReply) speak(nextReply);
    } catch (err) {
      setError(err?.message || "Failed to reach assistant.");
    } finally {
      setLoading(false);
    }
  };

  const handleClear = () => {
    setMessage("");
    setInterim("");
    setReply("");
    setError("");
  };

  return (
    <div className="voice-assistant">
      <div className="voice-header">
        <div>Voice Assistant</div>
        <div className="voice-status">
          <span className={`voice-dot${listening ? " is-live" : ""}`} />
          {listening ? "Listening..." : "Idle"}
        </div>
        <button
          onClick={onClose}
          className="voice-button"
          style={{ marginLeft: "auto" }}
          aria-label="Close voice assistant"
        >
          Close
        </button>
      </div>

      {!supportsSpeech && (
        <div className="voice-warning">
          Your browser does not support voice input. You can still type below.
        </div>
      )}

      <select
        value={language}
        onChange={(e) => onLanguageChange?.(e.target.value)}
        className="voice-select"
      >
        <option value="en-IN">English (India)</option>
        <option value="hi-IN">Hindi</option>
        <option value="mr-IN">Marathi</option>
      </select>

      <input
        value={destination}
        onChange={(e) => setDestination(e.target.value)}
        placeholder="Destination (optional)"
        className="voice-input"
      />

      <textarea
        rows={3}
        value={message}
        onChange={(e) => setMessage(e.target.value)}
        placeholder="Say or type your request..."
        className="voice-textarea"
      />

      {interim && (
        <div className="voice-interim">
          {interim}
        </div>
      )}

      <div className="voice-controls">
        <button
          onClick={handleStart}
          className="voice-button primary"
          disabled={listening}
        >
          Start
        </button>
        <button onClick={handleStop} className="voice-button" disabled={!listening}>
          Stop
        </button>
        <button onClick={handleSend} className="voice-button" disabled={loading}>
          {loading ? "Sending..." : "Send"}
        </button>
        <button onClick={handleClear} className="voice-button">
          Clear
        </button>
      </div>

      <label className="voice-toggle">
        <input
          type="checkbox"
          checked={!!autoSpeak}
          onChange={(e) => onAutoSpeakChange?.(e.target.checked)}
        />
        Auto speak reply
      </label>

      {error && <div className="voice-error">{error}</div>}

      {reply && <div className="voice-reply">{reply}</div>}
    </div>
  );
}
