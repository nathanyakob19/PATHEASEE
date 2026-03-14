import React, { useEffect, useState } from "react";
import { useAuth } from "./AuthContext";
import { API_URL } from "./api";
import {
  fetchUserCart,
  removeCartItem,
  subscribeToTravelDataChanges,
} from "./userTravelStore";
 
const FALLBACK_IMAGE = "/no-image.png";
const FAILED_IMAGES = new Set();
 
function getImageSrc(image) {
  if (!image) return FALLBACK_IMAGE;
  if (typeof image === "string" && image.startsWith("http")) return image;
  if (typeof image === "string" && image.startsWith("/uploads/")) {
    const url = `${API_URL}${image}`;
    return FAILED_IMAGES.has(url) ? FALLBACK_IMAGE : url;
  }
  const url = `${API_URL}/uploads/${image}`;
  return FAILED_IMAGES.has(url) ? FALLBACK_IMAGE : url;
}
 
export default function CartPage() {
  const { user } = useAuth();
  const userEmail = (user?.email || localStorage.getItem("email") || "").trim().toLowerCase();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let alive = true;
    const loadCart = async (withLoader = false) => {
      if (withLoader && alive) setLoading(true);
      try {
        const next = await fetchUserCart();
        if (alive) setItems(next);
      } catch {
        if (alive) setItems([]);
      } finally {
        if (withLoader && alive) setLoading(false);
      }
    };

    void loadCart(true);
    const unsubscribe = subscribeToTravelDataChanges(() => {
      void loadCart(false);
    }, { types: ["cart"] });

    return () => {
      alive = false;
      unsubscribe();
    };
  }, [userEmail]);

  const removeItem = async (item) => {
    try {
      const next = await removeCartItem(item);
      setItems(next);
    } catch (err) {
      alert(err.message || "Failed to remove item.");
    }
  };
 
  const goToAIItinerary = () => {
    window.location.href = "/ai-itinerary";
  };
 
  return (
    <div className="app-content-container">
      <h2>Your Itinerary Cart</h2>
      <button
        onClick={goToAIItinerary}
        style={{
          marginTop: 6,
          padding: "6px 10px",
          borderRadius: 8,
          border: "2px solid #360146ff",
          background: "#e6d6ff",
          cursor: "pointer",
          fontWeight: 700,
        }}
      >
        Generate Itinerary
      </button>
 
      {loading ? (
        <p style={{ marginTop: 10 }}>Loading cart...</p>
      ) : items.length === 0 ? (
        <p style={{ marginTop: 10 }}>No places added yet.</p>
      ) : (
        <div
          className="cart-grid"
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
            gap: 12,
            marginTop: 12,
          }}
        >
          {items.map((c) => (
            <div
              key={c._id || c.placeName}
              style={{
                border: "1px solid #ddd",
                padding: 10,
                borderRadius: 10,
                background: "#ffffffcc",
              }}
            >
              <strong>{c.placeName}</strong>
              {c.distance && <div>{c.distance} km away</div>}
              <img
                src={getImageSrc(c.image)}
                alt={c.placeName}
                loading="lazy"
                onError={(e) => {
                  e.currentTarget.onerror = null;
                  FAILED_IMAGES.add(e.currentTarget.src);
                  e.currentTarget.src = FALLBACK_IMAGE;
                }}
                style={{
                  width: "100%",
                  height: 140,
                  objectFit: "cover",
                  borderRadius: 8,
                  marginTop: 6,
                }}
              />
              <button
                onClick={() => removeItem(c)}
                style={{
                  marginTop: 8,
                  padding: "6px 10px",
                  borderRadius: 8,
                  border: "1px solid #360146ff",
                  background: "#fff",
                  cursor: "pointer",
                }}
              >
                Remove
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
