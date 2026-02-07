import { useEffect, useState } from "react";
import SearchBar from "./SearchBar";
import RatingsGraph from "./RatingsGraph";
import { apiGet, API_URL } from "./api";
import ChatAssistant from "./ChatAssistant";
import { useAuth } from "./AuthContext";

/* ---------- MAP ---------- */
import { MapContainer, TileLayer, Marker, Popup } from "react-leaflet";
import "leaflet/dist/leaflet.css";

/* ---------- ICONS ---------- */
import {
  FaWheelchair,
  FaRestroom,
  FaBaby,
  FaChair,
  FaUserAlt,
  FaUserNurse,
  FaHandsHelping,
} from "react-icons/fa";

const FALLBACK_IMAGE = "/no-image.png";
const FAILED_IMAGES = new Set();

function markImageFailed(url) {
  if (url) FAILED_IMAGES.add(url);
}

/* ---------- CITY CARDS ---------- */
const CITIES = [
  { name: "Mumbai", logo: "https://upload.wikimedia.org/wikipedia/commons/thumb/3/3a/Mumbai_03-2016_30_Gateway_of_India.jpg/640px-Mumbai_03-2016_30_Gateway_of_India.jpg" },
  { name: "Pune", logo: "https://upload.wikimedia.org/wikipedia/commons/thumb/1/14/Shaniwar_wada_pune.jpg/640px-Shaniwar_wada_pune.jpg" },
  { name: "Delhi", logo: "https://upload.wikimedia.org/wikipedia/commons/thumb/t/t1/India_Gate_in_New_Delhi_03-2016.jpg/640px-India_Gate_in_New_Delhi_03-2016.jpg" },
  { name: "Bengaluru", logo: "https://upload.wikimedia.org/wikipedia/commons/thumb/4/47/Bangalore_Palace_3.jpg/640px-Bangalore_Palace_3.jpg" },
  { name: "Chennai", logo: "https://upload.wikimedia.org/wikipedia/commons/thumb/3/32/Chennai_Central.jpg/640px-Chennai_Central.jpg" },
];

/* ---------- DISTANCE ---------- */
function haversineKm(lat1, lon1, lat2, lon2) {
  const toRad = (v) => (v * Math.PI) / 180;
  const R = 6371;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) *
      Math.cos(toRad(lat2)) *
      Math.sin(dLon / 2) ** 2;
  return R * (2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a)));
}

function extractLatLng(loc) {
  if (!loc) return null;
  return { lat: Number(loc.lat), lng: Number(loc.lng) };
}

function getId(p) {
  if (typeof p._id === "string") return p._id;
  if (p._id?.$oid) return p._id.$oid;
  return Math.random();
}

/* ---------- IMAGE SOURCE ---------- */
function resolveImageSrc(image) {
  if (!image) return FALLBACK_IMAGE;
  if (typeof image === "string" && image.startsWith("http")) return image;
  return `${API_URL}/uploads/${image}`;
}

function getImageSrc(image) {
  const url = resolveImageSrc(image);
  return FAILED_IMAGES.has(url) ? FALLBACK_IMAGE : url;
}

function getAvatarSrc(avatar) {
  if (!avatar) return "";
  if (avatar.startsWith("http")) return avatar;
  if (avatar.startsWith("/uploads/")) return `${API_URL}${avatar}`;
  return `${API_URL}/uploads/${avatar}`;
}

/* ---------- ACCESSIBILITY ICON MAP ---------- */

function CommentBox({ place, onAdded, isLoggedIn, userName }) {
  const [comment, setComment] = useState("");
  const [ratings, setRatings] = useState({});
  const [customFeature, setCustomFeature] = useState("");

  const submit = async () => {
    if (!isLoggedIn) {
      alert("Please login to add a comment.");
      return;
    }
    const email = localStorage.getItem("email") || "";
    const res = await fetch(`${API_URL}/add-place-review`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        place_id: place._id,
        name: userName || "Anonymous",
        email,
        comment,
        ratings,
      }),
    });
    const data = await res.json();
    if (!data.error) {
      onAdded({
        name: userName || "Anonymous",
        comment,
        ratings,
        avatar: localStorage.getItem("avatar") || "",
      });
      setComment("");
    }
  };

  const featuresList = Array.from(new Set([...(Object.keys(place.features || {})), ...(Object.keys(ratings || {}))]));
  const setStar = (key, value) => {
    setRatings((prev) => ({ ...prev, [key]: value }));
  };

  return (
    <div>
      {!isLoggedIn && (
        <div style={{ fontSize: 12, color: "#900", marginBottom: 6 }}>
          Please login to add comments and ratings.
        </div>
      )}
      <div style={{ display: "grid", gap: 8 }}>
        <input
          placeholder="Comment"
          value={comment}
          onChange={(e) => setComment(e.target.value)}
          disabled={!isLoggedIn}
        />
      </div>
      <div style={{ marginTop: 8 }}>
        {featuresList.map((k) => (
          <div key={k} style={{ marginBottom: 6 }}>
            <label style={{ marginRight: 8 }}>{k}</label>
            <div style={{ display: "inline-flex", gap: 4 }}>
              {[1, 2, 3, 4, 5].map((v) => (
                <button
                  key={v}
                  onClick={() => setStar(k, v)}
                  disabled={!isLoggedIn}
                  style={{
                    padding: "2px 6px",
                    borderRadius: 6,
                    border: "1px solid #ccc",
                    background: (ratings[k] || 0) >= v ? "#e6d6ff" : "#fff",
                    cursor: "pointer",
                  }}
                  aria-label={`Set ${v} stars for ${k}`}
                >
                  {(ratings[k] || 0) >= v ? "?" : "?"}
                </button>
              ))}
            </div>
          </div>
        ))}
      </div>
      <div style={{ marginTop: 8, display: "flex", gap: 8 }}>
        <input
          placeholder="Add feature (e.g., audio guide)"
          value={customFeature}
          onChange={(e) => setCustomFeature(e.target.value)}
          disabled={!isLoggedIn}
        />
        <button
          onClick={() => {
            if (!customFeature.trim()) return;
            const key = customFeature.trim();
            setRatings((prev) => ({ ...prev, [key]: prev[key] || 0 }));
            setCustomFeature("");
          }}
          disabled={!isLoggedIn}
        >
          Add Feature
        </button>
      </div>
      <button onClick={submit} style={{ marginTop: 6 }}>Submit</button>
    </div>
  );
}

const ACCESSIBILITY_ICONS = {
  wheelchair: <FaWheelchair />,
  cleanWashrooms: <FaRestroom />,
  babyWashroom: <FaBaby />,
  seatingArrangements: <FaChair />,
  seniorFriendly: <FaUserAlt />,
  medicalSupport: <FaUserNurse />,
  disabledAssistance: <FaHandsHelping />,
};

export default function App() {
  const { isLoggedIn } = useAuth();
  const [places, setPlaces] = useState([]);
  const [selectedPlace, setSelectedPlace] = useState(null);
  const [loading, setLoading] = useState(true);
  const [cart, setCart] = useState(() => {
    try {
      const raw = localStorage.getItem("itinerary_cart");
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  });

  const [imageIndex, setImageIndex] = useState(0);

  /* ---------- CITY FILTER ---------- */
  const [selectedCity, setSelectedCity] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    async function load() {
      const pos = await new Promise((res, rej) =>
        navigator.geolocation.getCurrentPosition(res, rej)
      );

      const items = await apiGet("/get-approved-places");

      const enriched = items.map((p) => {
        const loc = extractLatLng(p.location);
        const dist = loc
          ? haversineKm(
              pos.coords.latitude,
              pos.coords.longitude,
              loc.lat,
              loc.lng
            )
          : null;

        return { ...p, distance: dist?.toFixed(2) };
      });

      setPlaces(enriched);
      setLoading(false);
    }

    load();
  }, []);

  useEffect(() => {
    localStorage.setItem("itinerary_cart", JSON.stringify(cart));
  }, [cart]);

  useEffect(() => {
    setImageIndex(0);
  }, [selectedPlace]);


  const isInCart = (place) =>
    cart.some((c) => c._id === place._id || c.placeName === place.placeName);

  const addToCart = (place) => {
    if (!isLoggedIn) {
      alert("Please login to add to itinerary.");
      return;
    }
    if (isInCart(place)) return;
    setCart((prev) => [
      ...prev,
      {
        _id: place._id,
        placeName: place.placeName,
        image: place.image,
        distance: place.distance,
      },
    ]);
  };

  const removeFromCart = (place) => {
    setCart((prev) =>
      prev.filter(
        (c) => c._id !== place._id && c.placeName !== place.placeName
      )
    );
  };

  /* ---------- FILTERED PLACES ---------- */
  const filteredPlaces = places.filter((p) => {
    const matchesCity = selectedCity
      ? p.city?.toLowerCase() === selectedCity.toLowerCase()
      : true;
    const matchesSearch = searchQuery
      ? p.placeName?.toLowerCase().includes(searchQuery.toLowerCase())
      : true;
    return matchesCity && matchesSearch;
  });

  /* ---------- DETAIL VIEW ---------- */
  if (selectedPlace) {
    const allImages = [selectedPlace.image, ...(selectedPlace.images || [])].filter(Boolean);
    const uniqueImages = Array.from(new Set(allImages));
    const currentImage = getImageSrc(uniqueImages[imageIndex] || selectedPlace.image);
    return (
      <div className="app-content-container">
        <button onClick={() => setSelectedPlace(null)}>⬅ Back</button>

        <h2>{selectedPlace.placeName}</h2>
        <p>Distance: {selectedPlace.distance} km</p>
        {selectedPlace.submittedAt && (
          <p style={{ fontSize: 12, color: "#666" }}>
            Posted: {new Date(selectedPlace.submittedAt).toLocaleString()}
          </p>
        )}

        {selectedPlace.description && (
          <div style={{ background: "#f9f9f9", padding: 15, borderRadius: 8, marginBottom: 20 }}>
            <strong>About this place:</strong>
            <p style={{ marginTop: 5 }}>{selectedPlace.description}</p>
          </div>
        )}
        <div className="detail-gallery-wrap" style={{ marginTop: 10 }}>
          <div className="detail-gallery" style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <button
              onClick={() =>
                setImageIndex((i) =>
                  uniqueImages.length ? (i - 1 + uniqueImages.length) % uniqueImages.length : 0
                )
              }
              style={{ padding: "6px 10px" }}
              disabled={uniqueImages.length <= 1}
            >
              Prev
            </button>
            <img
              src={currentImage}
              alt={selectedPlace.placeName}
              loading="lazy"
              onError={(e) => {
                e.currentTarget.onerror = null;
                markImageFailed(e.currentTarget.src);
                e.currentTarget.src = FALLBACK_IMAGE;
              }}
              className="detail-main-image"
              style={{
                width: 420,
                height: 260,
                objectFit: "cover",
                borderRadius: 10,
                backgroundColor: "#fff",
              }}
            />
            <button
              onClick={() =>
                setImageIndex((i) =>
                  uniqueImages.length ? (i + 1) % uniqueImages.length : 0
                )
              }
              style={{ padding: "6px 10px" }}
              disabled={uniqueImages.length <= 1}
            >
              Next
            </button>
          </div>

          <div className="detail-thumbs" style={{ marginTop: 10, display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
            {uniqueImages.map((img, idx) => (
              <img
                key={idx}
                src={getImageSrc(img)}
                alt="thumb"
                onClick={() => setImageIndex(idx)}
                loading="lazy"
                onError={(e) => {
                  e.currentTarget.onerror = null;
                  markImageFailed(e.currentTarget.src);
                  e.currentTarget.src = FALLBACK_IMAGE;
                }}
                className="detail-thumb"
                style={{
                  width: 80,
                  height: 60,
                  objectFit: "cover",
                  borderRadius: 8,
                  border: idx === imageIndex ? "2px solid #360146ff" : "1px solid #ddd",
                  cursor: "pointer",
                }}
              />
            ))}

            <label
              style={{
                width: 80,
                height: 60,
                borderRadius: 8,
                border: "2px dashed #360146ff",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                cursor: "pointer",
                fontWeight: 700,
                fontSize: 18,
              }}
            >
              +
              <input
                type="file"
                multiple
                style={{ display: "none" }}
                onChange={async (e) => {
                  if (!isLoggedIn) {
                    alert("Please login to upload images.");
                    return;
                  }
                  const files = Array.from(e.target.files || []);
                  if (files.length === 0) return;
                  const formData = new FormData();
                  formData.append("place_id", selectedPlace._id);
                  const email = localStorage.getItem("email") || "";
                  if (email) formData.append("uploader_email", email);
                  files.forEach((f) => formData.append("images", f));
                  const res = await fetch(`${API_URL}/upload-place-images`, {
                    method: "POST",
                    body: formData,
                  });
                  const data = await res.json();
                  if (data.images) {
                    const newImgs = data.images.map((i) => `${API_URL}/uploads/${i}`);
                    setSelectedPlace((prev) => ({
                      ...prev,
                      images: [...(prev.images || []), ...newImgs],
                    }));
                  }
                }}
              />
            </label>
          </div>
        </div>


        <div style={{ marginTop: 12 }}>
          <button
            onClick={() =>
              isInCart(selectedPlace)
                ? removeFromCart(selectedPlace)
                : addToCart(selectedPlace)
            }
            style={{
              padding: "8px 12px",
              borderRadius: 8,
              border: "2px solid #360146ff",
              background: isInCart(selectedPlace) ? "#e6d6ff" : "#fff",
              cursor: "pointer",
              fontWeight: 600,
            }}
          >
            {isInCart(selectedPlace) ? "Remove from Itinerary" : "Add to Itinerary"}
          </button>
        </div>

        {selectedPlace.location && (
          <div style={{ height: 250, marginTop: 20 }}>
            <MapContainer
              center={[
                selectedPlace.location.lat,
                selectedPlace.location.lng,
              ]}
              zoom={15}
              style={{ height: "100%", borderRadius: 12 }}
            >
              <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
              <Marker
                position={[
                  selectedPlace.location.lat,
                  selectedPlace.location.lng,
                ]}
              >
                <Popup>{selectedPlace.placeName}</Popup>
              </Marker>
            </MapContainer>
          </div>
        )}

        <h3 style={{ marginTop: 30 }}>Accessibility Ratings</h3>
        <RatingsGraph
          features={
            (selectedPlace.feature_avg_ratings && Object.keys(selectedPlace.feature_avg_ratings).length > 0)
              ? selectedPlace.feature_avg_ratings
              : (selectedPlace.feature_ratings && Object.keys(selectedPlace.feature_ratings).length > 0)
              ? selectedPlace.feature_ratings
              : selectedPlace.features
          }
        />

        {selectedPlace.feature_ratings && (
          <div style={{ marginTop: 10 }}>
            <h4>Accessibility Feature Ratings</h4>
            {Object.entries(selectedPlace.feature_ratings).map(([k, v]) => (
              <div key={k}>{k}: {v} star</div>
            ))}
          </div>
        )}

        <h3 style={{ marginTop: 30 }}>Accessibility Available</h3>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))",
            gap: 15,
          }}
        >
          {Object.entries(selectedPlace.features || {}).map(([key, value]) => (
            <div
              key={key}
              style={{
                border: "1px solid #ddd",
                padding: 10,
                borderRadius: 10,
                textAlign: "center",
              }}
            >
              <div style={{ fontSize: 26, marginBottom: 5 }}>
                {ACCESSIBILITY_ICONS[key]}
              </div>
              <strong>{key}</strong>
              <div>{value > 0 ? `${value} ★` : "Not Available"}</div>
            </div>
          ))}
        </div>

        <div style={{ marginTop: 20 }}>
          <h3>Comments & Ratings</h3>
          <CommentBox place={selectedPlace} isLoggedIn={isLoggedIn} userName={localStorage.getItem("name") || ""} onAdded={(r) => {
            setSelectedPlace((prev) => ({
              ...prev,
              reviews: [r, ...(prev.reviews || [])],
            }));
          }} />
          <div style={{ marginTop: 10 }}>
            {(selectedPlace.reviews || []).map((rev, idx) => (
              <div key={idx} style={{ borderBottom: "1px solid #eee", padding: "6px 0" }}>
                <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
                  {rev.avatar ? (
                    <img
                      src={getAvatarSrc(rev.avatar)}
                      alt="avatar"
                      style={{ width: 32, height: 32, borderRadius: "50%", objectFit: "cover" }}
                    />
                  ) : (
                    <div style={{ width: 32, height: 32, borderRadius: "50%", background: "#e6d6ff" }} />
                  )}
                  <strong>{rev.name}</strong>
                </div>
                <div style={{ marginTop: 4 }}>{rev.comment}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Itinerary Cart (end of detail view) */}
        <div style={{ marginTop: 30 }} id="itinerary-cart">
          <h3>Your Itinerary Cart</h3>
          <button
            onClick={() => {
              localStorage.setItem("itinerary_from_cart", JSON.stringify(cart));
              window.location.href = "/ai-itinerary";
            }}
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
          {cart.length === 0 ? (
            <p>No places added yet.</p>
          ) : (
            <div
              className="cart-grid"
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
                gap: 12,
              }}
            >
              {cart.map((c) => (
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
                      markImageFailed(e.currentTarget.src);
                      e.currentTarget.src = FALLBACK_IMAGE;
                    }}
                    className="cart-image"
                    style={{
                      width: "100%",
                      height: 140,
                      objectFit: "cover",
                      borderRadius: 8,
                      marginTop: 6,
                    }}
                  />
                  <button
                    onClick={() => removeFromCart(c)}
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
      </div>
    );
  }

  /* ---------- CARD VIEW ---------- */
  return (
    <div className="app-content-container">
      <h1>Approved Places</h1>

      <SearchBar
        data={places}
        onSelect={(p) => setSelectedPlace(p)}
        onSearch={(q) => setSearchQuery(q)}
      />

      {/* ---------- CITY SCROLLER ---------- */}
      <div
        className="city-scroll"
        style={{
          display: "flex",
          gap: 14,
          overflowX: "auto",
          overflowY: "hidden",
          padding: "12px 0",
          marginBottom: 10,
          scrollbarWidth: "none",
          msOverflowStyle: "none",
        }}
      >
        {CITIES.map((city) => (
          <div
            key={city.name}
            onClick={() => setSelectedCity(city.name)}
            style={{
              minWidth: 120,
              background:
                selectedCity === city.name ? "#e6d6ff" : "#fff",
              borderRadius: 16,
              padding: 12,
              textAlign: "center",
              cursor: "pointer",
              boxShadow: "0 4px 10px rgba(0,0,0,0.12)",
            }}
          >
            <img
              src={city.logo}
              alt={city.name}
              loading="lazy"
              onError={(e) => {
                e.currentTarget.onerror = null;
                markImageFailed(e.currentTarget.src);
                e.currentTarget.src = FALLBACK_IMAGE;
              }}
              style={{
                width: 48,
                height: 48,
                objectFit: "contain",
                marginBottom: 6,
              }}
            />
            <div style={{ fontSize: 13, fontWeight: 600 }}>
              {city.name}
            </div>
          </div>
        ))}
      </div>

      {loading && <p>Loading…</p>}

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))",
          gap: 20,
        }}
      >
        {filteredPlaces.map((p) => (
          <div
            key={getId(p)}
            onClick={() => setSelectedPlace(p)}
            style={{
              border: "1px solid #ddd",
              padding: 15,
              borderRadius: 10,
              cursor: "pointer",
              background: "#ffffffcc",
            }}
          >
            <h3>{p.placeName}</h3>
            <p>{p.distance} km away</p>
            <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 6 }}>
              {Object.entries(p.features || {}).filter(([_, v]) => v).slice(0, 3).map(([k]) => (
                <span key={k} style={{ fontSize: 11, padding: "2px 6px", borderRadius: 8, background: "#f7f3ff", border: "1px solid #e6d6ff" }}>{k}</span>
              ))}
            </div>

            <img
              src={getImageSrc(p.image)}
              alt={p.placeName}
              loading="lazy"
              onError={(e) => {
                e.currentTarget.onerror = null;
                markImageFailed(e.currentTarget.src);
                e.currentTarget.src = FALLBACK_IMAGE;
              }}
              className="place-card-image"
              style={{
                width: "100%",
                height: 200,
                objectFit: "cover",
                borderRadius: 8,
              }}
            />

            <button
              onClick={(e) => {
                e.stopPropagation();
                isInCart(p) ? removeFromCart(p) : addToCart(p);
              }}
              style={{
                marginTop: 10,
                padding: "6px 10px",
                borderRadius: 8,
                border: "2px solid #360146ff",
                background: isInCart(p) ? "#e6d6ff" : "#fff",
                cursor: "pointer",
                fontWeight: 600,
              }}
            >
              {isInCart(p) ? "Added" : "Add to Itinerary"}
            </button>
          </div>
        ))}
      </div>

      {/* Itinerary Cart (end of list view) */}
      <div style={{ marginTop: 30 }} id="itinerary-cart">
        <h2>Itinerary Cart</h2>
        <button
          onClick={() => {
            localStorage.setItem("itinerary_from_cart", JSON.stringify(cart));
            window.location.href = "/ai-itinerary";
          }}
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
        {cart.length === 0 ? (
          <p>No places added yet.</p>
        ) : (
          <div
            className="cart-grid"
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
              gap: 12,
            }}
          >
            {cart.map((c) => (
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
                    markImageFailed(e.currentTarget.src);
                    e.currentTarget.src = FALLBACK_IMAGE;
                  }}
                  className="cart-image"
                  style={{
                    width: "100%",
                    height: 140,
                    objectFit: "cover",
                    borderRadius: 8,
                    marginTop: 6,
                  }}
                />
                <button
                  onClick={() => removeFromCart(c)}
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
      <ChatAssistant />
    </div>
  );
}
