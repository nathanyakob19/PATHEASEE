import React, { useEffect, useMemo, useState } from "react";
import { API_URL, apiGet, apiPost } from "./api";
import { executeChatCommand } from "./chatCommands";

const FALLBACK_IMAGE = "/no-image.png";
const FAILED_CHAT_IMAGES = new Set();

function resolveImageSrc(image) {
  if (!image) return FALLBACK_IMAGE;
  if (typeof image === "string" && image.startsWith("http")) return image;
  if (typeof image === "string" && image.startsWith("/uploads/")) return `${API_URL}${image}`;
  return `${API_URL}/uploads/${image}`;
}

function getPlaceQueue(place) {
  const all = [place?.image, ...(place?.images || [])].filter(Boolean);
  return Array.from(new Set(all.map((img) => resolveImageSrc(img))));
}

function getChatPlaceImage(place) {
  const next = getPlaceQueue(place).find((url) => !FAILED_CHAT_IMAGES.has(url));
  return next || FALLBACK_IMAGE;
}

export default function AIChatPage() {
  const [language, setLanguage] = useState("en");
  const [destination, setDestination] = useState("");
  const [message, setMessage] = useState("");
  const [reply, setReply] = useState("");
  const [loading, setLoading] = useState(false);
  const [coords, setCoords] = useState(null);
  const [approvedPlaces, setApprovedPlaces] = useState([]);
  const [cart, setCart] = useState(() => {
    try {
      const raw = localStorage.getItem("itinerary_cart");
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  });

  useEffect(() => {
    if (!navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition(
      (pos) => setCoords({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
      () => setCoords(null)
    );
  }, []);

  useEffect(() => {
    apiGet("/get-approved-places")
      .then((items) => setApprovedPlaces(Array.isArray(items) ? items : []))
      .catch(() => setApprovedPlaces([]));
  }, []);

  useEffect(() => {
    localStorage.setItem("itinerary_cart", JSON.stringify(cart));
  }, [cart]);

  const generatedPlaces = useMemo(() => {
    const text = (reply || "").toLowerCase();
    if (!text) return [];
    return approvedPlaces
      .filter((p) => {
        const name = (p.placeName || "").trim().toLowerCase();
        return name.length > 2 && text.includes(name);
      })
      .slice(0, 6);
  }, [reply, approvedPlaces]);

  const isInCart = (place) =>
    cart.some((c) => c._id === place._id || c.placeName === place.placeName);

  const addToCart = (place) => {
    if (isInCart(place)) return;
    setCart((prev) => [
      ...prev,
      {
        _id: place._id,
        placeName: place.placeName,
        image: place.image,
      },
    ]);
  };

  const addToItinerary = (place) => {
    addToCart(place);
    localStorage.setItem("itinerary_from_cart", JSON.stringify([{
      _id: place._id,
      placeName: place.placeName,
      image: place.image,
    }]));
    window.location.href = "/ai-itinerary";
  };

  async function handleChat() {
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

          {generatedPlaces.length > 0 && (
            <div style={{ marginTop: 12 }}>
              <div style={{ fontWeight: 700, marginBottom: 8 }}>Places Found</div>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))", gap: 10 }}>
                {generatedPlaces.map((p) => (
                  <div key={p._id || p.placeName} style={{ border: "1px solid #ddd", borderRadius: 10, padding: 8, background: "#fff" }}>
                    <img
                      src={getChatPlaceImage(p)}
                      alt={p.placeName}
                      style={{ width: "100%", height: 120, objectFit: "cover", borderRadius: 8 }}
                      onError={(e) => {
                        e.currentTarget.onerror = null;
                        FAILED_CHAT_IMAGES.add(e.currentTarget.src);
                        e.currentTarget.src = getChatPlaceImage(p);
                      }}
                    />
                    <div style={{ marginTop: 6, fontWeight: 600 }}>{p.placeName}</div>
                    <div style={{ marginTop: 8, display: "flex", gap: 8 }}>
                      <button onClick={() => addToItinerary(p)} style={{ flex: 1, padding: "6px 8px" }}>
                        Add to Itinerary
                      </button>
                      <button onClick={() => addToCart(p)} style={{ flex: 1, padding: "6px 8px" }}>
                        {isInCart(p) ? "Added" : "Add to Cart"}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
