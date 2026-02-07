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
  FaStar,
  FaRegStar,
} from "react-icons/fa";
import L from "leaflet";

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
  { name: "Chennai", logo: "https://media.istockphoto.com/id/1462602084/vector/hindu-temple-vector-illustration-dravidian-architecture-tamil-nadu-india.jpg" },
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
  const [cart, setCart] = useState([]);

  const [selectedCity, setSelectedCity] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [userLocation, setUserLocation] = useState(null);
  const [imageIndex, setImageIndex] = useState(0);

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
      } catch {}

      const items = await apiGet("/get-approved-places");
      const enriched = items.map((p) => {
        const loc = extractLatLng(p.location);
        const dist =
          loc && pos
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
    return (
      <div className="app-content-container">
        <button onClick={() => setSelectedPlace(null)}>⬅ Back</button>
        <h2>{selectedPlace.placeName}</h2>
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

      <div className="city-scroll" style={{ display: "flex", gap: 14 }}>
        {CITIES.map((city) => (
          <div key={city.name} onClick={() => setSelectedCity(city.name)}>
            {city.name}
          </div>
        ))}
      </div>

      {loading && <p>Loading…</p>}

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: 20 }}>
        {filteredPlaces.map((p) => (
          <div key={getId(p)} onClick={() => setSelectedPlace(p)}>
            <h3>{p.placeName}</h3>
            <p>{p.distance} km away</p>
            <img src={getImageSrc(p.image)} alt={p.placeName} />
          </div>
        ))}
      </div>

      <ChatAssistant />
    </div>
  );
}
