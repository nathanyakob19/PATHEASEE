import { useCallback, useEffect, useMemo, useState } from "react";
import "./App.css";
import SearchBar from "./SearchBar";
import RatingsGraph from "./RatingsGraph";
import { apiGet, API_URL } from "./api";
import SlideShowBanner from "./SlideShowBanner";

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
  FaStar,
  FaRegStar,
  FaFilter,
} from "react-icons/fa";
import L from "leaflet"; // Ensure L is imported

/* ---------- HELPERS ---------- */
function StarRating({ value = 0, max = 5 }) {
  return (
    <div style={{ display: "flex", gap: 2 }}>
      {[...Array(max)].map((_, i) => (
        <span key={i} style={{ color: i < value ? "#ffc107" : "#e4e5e9" }}>
          {i < value ? <FaStar /> : <FaRegStar />}
        </span>
      ))}
    </div>
  );
}

const FALLBACK_IMAGE = "/no-image.png";
const FAILED_IMAGES = new Set();

function markImageFailed(url) {
  if (url) FAILED_IMAGES.add(url);
}

/* ---------- CITY CARDS ---------- */
const CITIES = [
  { name: "Mumbai", logo: "https://img.icons8.com/ios-filled/50/gateway-of-india.png" },
  { name: "Pune", logo: "https://cdn-icons-png.flaticon.com/512/16025/16025176.png" },
  { name: "Delhi", logo: "https://img.icons8.com/external-icongeek26-outline-icongeek26/64/external-india-gate-india-icongeek26-outline-icongeek26.png" },
  { name: "Bengaluru", logo: "https://static.thenounproject.com/png/2165510-200.png" },
  { name: "Chennai", logo: "https://media.istockphoto.com/id/1462602084/vector/hindu-temple-vector-illustration-dravidian-architecture-tamil-nadu-india.jpg?s=612x612&w=0&k=20&c=MfH1a09nU5eVHfhkt75k8Ed2nf4RTrxmNtqcyfcPWxs=" },
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
  if (typeof image === "string" && image.startsWith("/uploads/")) return `${API_URL}${image}`;
  return `${API_URL}/uploads/${image}`;
}

function getImageSrc(image) {
  const url = resolveImageSrc(image);
  return FAILED_IMAGES.has(url) ? FALLBACK_IMAGE : url;
}

function getPlaceImageQueue(place) {
  const raw = [place?.image, ...(place?.images || [])].filter(Boolean);
  const unique = Array.from(new Set(raw.map((img) => resolveImageSrc(img))));
  return unique;
}

function getNextAvailablePlaceImage(place) {
  const queue = getPlaceImageQueue(place);
  const next = queue.find((url) => !FAILED_IMAGES.has(url));
  return next || FALLBACK_IMAGE;
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
    <div className="comment-box">
      {!isLoggedIn && (
        <div style={{ fontSize: 12, color: "#900", marginBottom: 6 }}>
          Please login to add comments and ratings.
        </div>
      )}
      <div style={{ display: "grid", gap: 8 }}>
        <input
          className="comment-input"
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
                <span
                  key={v}
                  onClick={() => isLoggedIn && setStar(k, v)}
                  style={{
                    cursor: isLoggedIn ? "pointer" : "default",
                    color: (ratings[k] || 0) >= v ? "#ffc107" : "#e4e5e9",
                    fontSize: "20px",
                  }}
                >
                  {(ratings[k] || 0) >= v ? <FaStar /> : <FaRegStar />}
                </span>
              ))}
            </div>
          </div>
        ))}
      </div>
      <div style={{ marginTop: 8, display: "flex", gap: 8 }}>
        <input
          className="comment-input"
          placeholder="Add feature (e.g., audio guide)"
          value={customFeature}
          onChange={(e) => setCustomFeature(e.target.value)}
          disabled={!isLoggedIn}
        />
        <button
          className="comment-btn"
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
      <button className="comment-btn" onClick={submit} style={{ marginTop: 6 }}>Submit</button>
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
  const currentRole = (localStorage.getItem("role") || "").toLowerCase();
  const currentEmail = (localStorage.getItem("email") || "").toLowerCase();
  const isAdmin = currentRole === "admin" || currentEmail.endsWith("@pathease.com");
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
  const [userLocation, setUserLocation] = useState(null);
  const [showFilters, setShowFilters] = useState(false);
  const [selectedFeatureFilters, setSelectedFeatureFilters] = useState([]);
  const [selectedCityFilters, setSelectedCityFilters] = useState([]);

  useEffect(() => {
    async function load() {
      let pos = null;
      try {
        pos = await new Promise((res, rej) =>
          navigator.geolocation.getCurrentPosition(res, rej)
        );
        setUserLocation({
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
        });
      } catch (e) {
        console.error("Location error:", e);
      }

      const items = await apiGet("/get-approved-places");

      const enriched = items.map((p) => {
        const loc = extractLatLng(p.location);
        const dist = (loc && pos)
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

  useEffect(() => {
    if (selectedPlace) {
      window.scrollTo({ top: 0, left: 0, behavior: "auto" });
    }
  }, [selectedPlace]);


  const isInCart = useCallback(
    (place) =>
      cart.some((c) => c._id === place._id || c.placeName === place.placeName),
    [cart]
  );

  const addToCart = useCallback((place) => {
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
  }, [isInCart, isLoggedIn]);

  const removeFromCart = useCallback((place) => {
    setCart((prev) =>
      prev.filter(
        (c) => c._id !== place._id && c.placeName !== place.placeName
      )
    );
  }, []);

  useEffect(() => {
    const onVoice = (e) => {
      const detail = e?.detail || {};
      if (!detail.type) return;

      if (detail.type === "open-place") {
        const name = (detail.name || "").toLowerCase();
        if (!name) return;
        const match = places.find((p) =>
          (p.placeName || "").toLowerCase().includes(name)
        );
        if (match) setSelectedPlace(match);
        return;
      }

      if (detail.type === "add-to-cart") {
        if (selectedPlace) {
          addToCart(selectedPlace);
          return;
        }
        const name = (detail.name || "").toLowerCase();
        if (!name) return;
        const match = places.find((p) =>
          (p.placeName || "").toLowerCase().includes(name)
        );
        if (match) addToCart(match);
        return;
      }

      if (detail.type === "remove-from-cart") {
        if (selectedPlace) {
          removeFromCart(selectedPlace);
          return;
        }
        const name = (detail.name || "").toLowerCase();
        if (!name) return;
        const match = places.find((p) =>
          (p.placeName || "").toLowerCase().includes(name)
        );
        if (match) removeFromCart(match);
      }
    };

    window.addEventListener("pathease:voice-command", onVoice);
    return () => window.removeEventListener("pathease:voice-command", onVoice);
  }, [places, selectedPlace, addToCart, removeFromCart]);

  /* ---------- FILTERED PLACES ---------- */
  const cityFilterOptions = useMemo(
    () =>
      Array.from(
        new Set(
          places
            .map((p) => (p.city || "").trim())
            .filter(Boolean)
        )
      ).sort((a, b) => a.localeCompare(b)),
    [places]
  );

  const featureFilterOptions = useMemo(
    () =>
      Array.from(
        new Set(
          places.flatMap((p) => Object.keys(p.features || {}))
        )
      ).sort((a, b) => a.localeCompare(b)),
    [places]
  );

  const filteredPlaces = places.filter((p) => {
    const matchesCity = selectedCity
      ? p.city?.toLowerCase() === selectedCity.toLowerCase()
      : true;
    const matchesCityFilters =
      selectedCityFilters.length === 0 ||
      selectedCityFilters.some((c) => (p.city || "").toLowerCase() === c.toLowerCase());
    const matchesSearch = searchQuery
      ? p.placeName?.toLowerCase().includes(searchQuery.toLowerCase())
      : true;
    const matchesFeatureFilters =
      selectedFeatureFilters.length === 0 ||
      selectedFeatureFilters.every((featureKey) => {
        const featureVal = p.features?.[featureKey];
        if (typeof featureVal === "boolean") return featureVal;
        if (typeof featureVal === "number") return featureVal > 0;
        if (typeof featureVal === "string") return featureVal.toLowerCase() !== "no" && featureVal.trim() !== "";
        return Boolean(featureVal);
      });
    return matchesCity && matchesCityFilters && matchesSearch && matchesFeatureFilters;
  });

  /* ---------- DETAIL VIEW ---------- */
  if (selectedPlace) {
    const accessibilityAvailable =
      selectedPlace.feature_ratings && Object.keys(selectedPlace.feature_ratings).length > 0
        ? selectedPlace.feature_ratings
        : selectedPlace.features || {};
    const allImages = [selectedPlace.image, ...(selectedPlace.images || [])].filter(Boolean);
    const uniqueImages = Array.from(new Set(allImages));
    const currentImage = getImageSrc(uniqueImages[imageIndex] || selectedPlace.image);
    return (
      <div className="app-content-container detail-view">
        <button className="detail-back" onClick={() => setSelectedPlace(null)}>Back</button>

        <h2>{selectedPlace.placeName}</h2>
        <p>Distance: {selectedPlace.distance} km</p>
        {selectedPlace.submittedAt && (
          <p style={{ fontSize: 12, color: "#666" }}>
            Posted: {new Date(selectedPlace.submittedAt).toLocaleString()}
          </p>
        )}

        {selectedPlace.description && (
          <div className="detail-description">
            <strong>About this place:</strong>
            <p>{selectedPlace.description}</p>
          </div>
        )}
        <div className="detail-gallery-wrap">
          <div className="detail-gallery">
            <button
              className="detail-nav"
              onClick={() =>
                setImageIndex((i) =>
                  uniqueImages.length ? (i - 1 + uniqueImages.length) % uniqueImages.length : 0
                )
              }
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
              style={{ backgroundColor: "#fff" }}
            />
            <button
              className="detail-nav"
              onClick={() =>
                setImageIndex((i) =>
                  uniqueImages.length ? (i + 1) % uniqueImages.length : 0
                )
              }
              disabled={uniqueImages.length <= 1}
            >
              Next
            </button>
          </div>

          <div className="detail-thumbs">
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
                className={`detail-thumb${idx === imageIndex ? " active" : ""}`}
              />
            ))}

            {isAdmin && (
              <label className="detail-upload" title="Admin only">
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
                    if (!isAdmin) {
                      alert("Only admin can edit approved places.");
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
                      const newImgs = data.images.map((i) => resolveImageSrc(i));
                      setSelectedPlace((prev) => ({
                        ...prev,
                        images: [...(prev.images || []), ...newImgs],
                      }));
                    }
                  }}
                />
              </label>
            )}
          </div>
        </div>


        <div className="detail-actions">
          <button
            className="detail-itinerary-btn"
            onClick={() =>
              isInCart(selectedPlace)
                ? removeFromCart(selectedPlace)
                : addToCart(selectedPlace)
            }
          >
            {isInCart(selectedPlace) ? "Remove from Itinerary" : "Add to Itinerary"}
          </button>
        </div>

        {selectedPlace.location && (
          <div className="detail-map">
            <div className="detail-map-frame">
              <MapContainer
                center={[
                  selectedPlace.location.lat,
                  selectedPlace.location.lng,
                ]}
                zoom={13}
                style={{ height: "100%", width: "100%" }}
              >
                <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
                
                {/* Destination Marker */}
                <Marker
                  position={[
                    selectedPlace.location.lat,
                    selectedPlace.location.lng,
                  ]}
                >
                  <Popup>{selectedPlace.placeName}</Popup>
                </Marker>

                {/* User Location Marker */}
                {userLocation && (
                  <Marker
                    position={[userLocation.lat, userLocation.lng]}
                    icon={
                      // Simple custom icon for user
                      new L.Icon({
                        iconUrl: "https://maps.google.com/mapfiles/ms/icons/blue-dot.png",
                        iconSize: [32, 32],
                        iconAnchor: [16, 32],
                      })
                    }
                  >
                    <Popup>You are here</Popup>
                  </Marker>
                )}
              </MapContainer>
            </div>

            {/* Start Navigation Button */}
            <button
              onClick={() => {
                const url = `https://www.google.com/maps/dir/?api=1&destination=${selectedPlace.location.lat},${selectedPlace.location.lng}`;
                window.open(url, "_blank");
              }}
              style={{
                marginTop: 10,
                width: "100%",
                padding: "12px",
                borderRadius: 8,
                background: "#4285F4",
                color: "white",
                border: "none",
                fontSize: "16px",
                fontWeight: "bold",
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: 8,
              }}
            >
              Start Navigation (Google Maps)
            </button>
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
              <div key={k} style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 5 }}>
                <span>{k}:</span>
                <StarRating value={v} />
              </div>
            ))}
          </div>
        )}

        <h3 className="detail-section-title">Accessibility Available</h3>

        <div className="detail-features">
          {Object.entries(accessibilityAvailable).map(([key, value]) => (
            <div key={key} className="detail-feature-card">
              <div className="detail-feature-icon">
                {ACCESSIBILITY_ICONS[key]}
              </div>
              <strong>{key}</strong>
              <div className="detail-feature-rating">
                {Number(value) > 0
                  ? <StarRating value={Number(value)} />
                  : (value === true || value === "Yes" ? "Available" : "Not Available")}
              </div>
            </div>
          ))}
        </div>

        <div className="detail-comments">
          <h3 className="detail-section-title">Comments & Ratings</h3>
          <CommentBox place={selectedPlace} isLoggedIn={isLoggedIn} userName={localStorage.getItem("name") || ""} onAdded={(r) => {
            setSelectedPlace((prev) => ({
              ...prev,
              reviews: [r, ...(prev.reviews || [])],
            }));
          }} />
          <div className="detail-comments-list">
            {(selectedPlace.reviews || []).map((rev, idx) => (
              <div key={idx} className="detail-comment-item">
                <div className="detail-comment-head">
                  {rev.avatar ? (
                    <img
                      src={getAvatarSrc(rev.avatar)}
                      alt="avatar"
                      className="detail-comment-avatar"
                    />
                  ) : (
                    <div className="detail-comment-avatar detail-comment-avatar--placeholder" />
                  )}
                  <strong>{rev.name}</strong>
                </div>
                <div className="detail-comment-body">{rev.comment}</div>
              </div>
            ))}
          </div>
        </div>

        <div style={{ marginTop: 20, display: "flex", justifyContent: "center" }}>
          <button className="detail-back" onClick={() => setSelectedPlace(null)}>
            Back
          </button>
        </div>

        {/* Cart moved to dedicated page (/cart) */}
      </div>
    );
  }

  /* ---------- CARD VIEW ---------- */
  return (
    <div className="app-content-container home-content">
      <div className="home-hero">
        <SlideShowBanner />
      </div>

      <div className="home-main">

      <h1 id="nearby-places">Near By Places</h1>

      <SearchBar
        data={places}
        onSelect={(p) => setSelectedPlace(p)}
        onSearch={(q) => setSearchQuery(q)}
      />

      <div style={{ position: "relative", display: "flex", justifyContent: "flex-end", marginBottom: 8 }}>
        <button
          onClick={() => setShowFilters((v) => !v)}
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 6,
            padding: "8px 10px",
            borderRadius: 10,
            border: "2px solid #360146ff",
            background: "#fff",
            fontWeight: 700,
          }}
          aria-label="Open filters"
        >
          <FaFilter />
          Filters
        </button>
        {showFilters && (
          <div
            style={{
              position: "absolute",
              top: "110%",
              right: 0,
              zIndex: 30,
              width: "min(360px, 95vw)",
              background: "#fff",
              border: "1px solid #ddd",
              borderRadius: 12,
              boxShadow: "0 8px 22px rgba(0,0,0,0.15)",
              padding: 12,
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
              <strong>Filter Nearby Places</strong>
              <button
                onClick={() => {
                  setSelectedCityFilters([]);
                  setSelectedFeatureFilters([]);
                }}
                style={{ padding: "4px 8px", fontSize: 12 }}
              >
                Clear
              </button>
            </div>

            <div style={{ marginBottom: 10 }}>
              <div style={{ fontWeight: 600, marginBottom: 6 }}>City</div>
              <div style={{ display: "grid", gap: 4, maxHeight: 120, overflowY: "auto" }}>
                {cityFilterOptions.map((city) => (
                  <label key={city} style={{ display: "flex", gap: 6, alignItems: "center" }}>
                    <input
                      type="checkbox"
                      checked={selectedCityFilters.includes(city)}
                      onChange={(e) =>
                        setSelectedCityFilters((prev) =>
                          e.target.checked ? [...prev, city] : prev.filter((c) => c !== city)
                        )
                      }
                    />
                    {city}
                  </label>
                ))}
                {cityFilterOptions.length === 0 && <div style={{ fontSize: 12, color: "#666" }}>No city data</div>}
              </div>
            </div>

            <div>
              <div style={{ fontWeight: 600, marginBottom: 6 }}>Accessibility Features</div>
              <div style={{ display: "grid", gap: 4, maxHeight: 160, overflowY: "auto" }}>
                {featureFilterOptions.map((feature) => (
                  <label key={feature} style={{ display: "flex", gap: 6, alignItems: "center" }}>
                    <input
                      type="checkbox"
                      checked={selectedFeatureFilters.includes(feature)}
                      onChange={(e) =>
                        setSelectedFeatureFilters((prev) =>
                          e.target.checked ? [...prev, feature] : prev.filter((f) => f !== feature)
                        )
                      }
                    />
                    {feature}
                  </label>
                ))}
                {featureFilterOptions.length === 0 && <div style={{ fontSize: 12, color: "#666" }}>No feature data</div>}
              </div>
            </div>
          </div>
        )}
      </div>

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
            className="place-card"
            style={{ cursor: "pointer" }}
          >
            <h3 className="place-card-title">{p.placeName}</h3>
            <p className="place-card-distance">{p.distance} km away</p>
            <div className="place-card-features">
              {Object.entries(p.features || {}).filter(([_, v]) => v).slice(0, 3).map(([k]) => (
                <span key={k} style={{ fontSize: 11, padding: "2px 6px", borderRadius: 8, background: "#f7f3ff", border: "1px solid #e6d6ff" }}>{k}</span>
              ))}
            </div>

            <img
              src={getNextAvailablePlaceImage(p)}
              alt={p.placeName}
              loading="lazy"
              onError={(e) => {
                e.currentTarget.onerror = null;
                markImageFailed(e.currentTarget.src);
                e.currentTarget.src = getNextAvailablePlaceImage(p);
              }}
              className="place-card-image"
              style={{
                width: "100%",
                aspectRatio: "16 / 9",
                height: "auto",
                objectFit: "cover",
                borderRadius: 8,
              }}
            />

            <button
              onClick={(e) => {
                e.stopPropagation();
                isInCart(p) ? removeFromCart(p) : addToCart(p);
              }}
              className="place-card-btn"
              style={{ background: isInCart(p) ? "#e6d6ff" : "#fff" }}
            >
              {isInCart(p) ? "Added" : "Add to Itinerary"}
            </button>
          </div>
        ))}
      </div>

      </div>

     </div>
  );   
}
