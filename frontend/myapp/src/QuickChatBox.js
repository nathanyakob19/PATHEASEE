import React, { useEffect, useState } from "react";
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

export default function QuickChatBox({ onClose }) {
  const [language, setLanguage] = useState("en");
  const [destination, setDestination] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [coords, setCoords] = useState(null);
  const [messages, setMessages] = useState([]);
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

  const matchPlacesInText = (text) => {
    const q = (text || "").toLowerCase();
    if (!q) return [];
    return approvedPlaces
      .filter((p) => {
        const name = (p.placeName || "").trim().toLowerCase();
        return name.length > 2 && q.includes(name);
      })
      .slice(0, 4);
  };

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
    localStorage.setItem(
      "itinerary_from_cart",
      JSON.stringify([{ _id: place._id, placeName: place.placeName, image: place.image }])
    );
    window.location.href = "/ai-itinerary";
  };

  async function handleSend() {
    if (!message.trim()) return;
    const userText = message.trim();
    const cmd = executeChatCommand(userText);

    if (cmd.handled) {
      setMessages((prev) => [
        ...prev,
        { role: "user", text: userText },
        { role: "assistant", text: cmd.message || "Done." },
      ]);
      setMessage("");
      return;
    }

    setLoading(true);
    setMessages((prev) => [...prev, { role: "user", text: userText }]);
    try {
      const data = await apiPost("/ai/guide-chat", {
        message: userText,
        destination,
        language,
        lat: coords?.lat,
        lng: coords?.lng,
      });
      const r = data.reply || data.error || "";
      setMessages((prev) => [...prev, { role: "assistant", text: r }]);
    } catch (e) {
      const r = e?.message || "Failed to reach the guide service.";
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
        height: "min(420px, 65vh)",
        background: "#ffffff",
        border: "1px solid #ddd",
        borderRadius: 12,
        boxShadow: "0 6px 18px rgba(0,0,0,0.15)",
        padding: 10,
        display: "flex",
        flexDirection: "column",
      }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
        <div style={{ fontWeight: 700 }}>AI Guide Chat</div>
        <button
          onClick={onClose}
          aria-label="Close chat"
          style={{
            border: "1px solid #360146ff",
            background: "#fff",
            borderRadius: 6,
            cursor: "pointer",
            padding: "2px 6px",
          }}
        >
          X
        </button>
      </div>

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
          flex: 1,
          minHeight: 0,
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
            {m.role === "assistant" && matchPlacesInText(m.text).length > 0 && (
              <div style={{ marginTop: 6, display: "grid", gap: 6, width: "100%" }}>
                {matchPlacesInText(m.text).map((p) => (
                  <div key={p._id || p.placeName} style={{ border: "1px solid #ddd", borderRadius: 8, padding: 6, background: "#fff" }}>
                    <img
                      src={getChatPlaceImage(p)}
                      alt={p.placeName}
                      style={{ width: "100%", height: 90, objectFit: "cover", borderRadius: 6 }}
                      onError={(e) => {
                        e.currentTarget.onerror = null;
                        FAILED_CHAT_IMAGES.add(e.currentTarget.src);
                        e.currentTarget.src = getChatPlaceImage(p);
                      }}
                    />
                    <div style={{ marginTop: 4, fontWeight: 600 }}>{p.placeName}</div>
                    <div style={{ marginTop: 6, display: "flex", gap: 6 }}>
                      <button onClick={() => addToItinerary(p)} style={{ flex: 1, padding: "4px 6px" }}>
                        Add to Itinerary
                      </button>
                      <button onClick={() => addToCart(p)} style={{ flex: 1, padding: "4px 6px" }}>
                        {isInCart(p) ? "Added" : "Add to Cart"}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
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

    </div>
  );
}
