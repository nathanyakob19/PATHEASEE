// SnapMapScreen.js — Image pins + sliding sidebar + reverse geocode
import React, { useEffect, useState, useMemo, useRef } from "react";
import { MapContainer, TileLayer, Marker, Popup, useMap } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { API_URL, apiGet } from "./api";

/* ---------------- FIX LEAFLET ICON BUG ---------------- */
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl:
    "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  iconUrl:
    "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  shadowUrl:
    "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
});

/* ---------------- HELPERS ---------------- */
function normalizeLocation(loc) {
  if (!loc) return null;
  if (typeof loc === "object" && loc.lat && loc.lng) {
    return { lat: Number(loc.lat), lng: Number(loc.lng) };
  }
  return null;
}

function haversineKm(a, b, c, d) {
  const toRad = (x) => (x * Math.PI) / 180;
  const R = 6371;
  const dLat = toRad(c - a);
  const dLon = toRad(d - b);
  const s =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(a)) *
      Math.cos(toRad(c)) *
      Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(s), Math.sqrt(1 - s));
}

/* ---------------- MAP RECENTER ---------------- */
function Recenter({ center }) {
  const map = useMap();
  useEffect(() => {
    if (center) map.setView(center, 15, { animate: true });
  }, [center]);
  return null;
}

/* ---------------- IMAGE MARKER ---------------- */
function getMarkerIcon(image) {
  const src =
    image && image.startsWith("http")
      ? image
      : image
      ? `${API_URL}/uploads/${image}`
      : "/no-image.png";

  return L.divIcon({
    className: "",
    html: `
      <div style="
        width:46px;
        height:46px;
        border-radius:50%;
        overflow:hidden;
        border:3px solid #2196f3;
        box-shadow:0 2px 6px rgba(0,0,0,.45);
        background:white;
      ">
        <img
          src="${src}"
          style="width:100%;height:100%;object-fit:cover;"
          onerror="this.src='/no-image.png'"
        />
      </div>
    `,
    iconSize: [46, 46],
    iconAnchor: [23, 46],
    popupAnchor: [0, -38],
  });
}

/* ---------------- USER LOCATION ICON ---------------- */
const userIcon = L.divIcon({
  className: "",
  html: `
    <div style="
      width:18px;
      height:18px;
      background:#4285f4;
      border-radius:50%;
      border:3px solid white;
      box-shadow:0 0 6px rgba(0,0,0,.5);
    "></div>
  `,
  iconSize: [18, 18],
});

/* ===================================================== */

export default function SnapMapScreen() {
  const [places, setPlaces] = useState([]);
  const [selected, setSelected] = useState(null);
  const [userLocation, setUserLocation] = useState(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const reverseCache = useRef(new Map());

  /* ---------------- LOAD PLACES ---------------- */
  useEffect(() => {
    (async () => {
            const data = await apiGet("/get-approved-places");
      setPlaces(
        data.map((p) => ({
          ...p,
          location: normalizeLocation(p.location),
        }))
      );
    })();
  }, []);

  /* ---------------- USER LOCATION ---------------- */
  useEffect(() => {
    navigator.geolocation.getCurrentPosition(
      (pos) =>
        setUserLocation({
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
        }),
      () => console.warn("Location denied")
    );
  }, []);

  /* ---------------- REVERSE GEOCODE ---------------- */
  async function reverseGeocode(lat, lng) {
    const key = `${lat},${lng}`;
    if (reverseCache.current.has(key))
      return reverseCache.current.get(key);

    const res = await fetch(
      `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${lat}&lon=${lng}`
    );
    const json = await res.json();
    const name = json?.display_name || "Unknown location";
    reverseCache.current.set(key, name);
    return name;
  }

  /* ---------------- OPEN SIDEBAR ---------------- */
  async function openSidebar(place) {
    setSidebarOpen(true);

    let distance = null;
    if (userLocation && place.location) {
      distance =
        Math.round(
          haversineKm(
            userLocation.lat,
            userLocation.lng,
            place.location.lat,
            place.location.lng
          ) * 100
        ) / 100;
    }

    const displayName = await reverseGeocode(
      place.location.lat,
      place.location.lng
    );

    setSelected({
      ...place,
      distanceFromUser: distance,
      displayName,
    });
  }

  /* ---------------- MAP CENTER ---------------- */
  const mapCenter = useMemo(() => {
    if (selected?.location)
      return [selected.location.lat, selected.location.lng];
    if (userLocation)
      return [userLocation.lat, userLocation.lng];
    return [20.59, 78.96];
  }, [selected, userLocation]);

  /* ===================================================== */
  return (
    <div style={{ display: "flex", height: "100vh" }}>
      {/* ---------------- MAP ---------------- */}
      <div style={{ flex: 1 }}>
        <MapContainer
          center={mapCenter}
          zoom={14}
          style={{ width: "100%", height: "100%" }}
        >
          <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
          <Recenter center={mapCenter} />

          {/* User Marker */}
          {userLocation && (
            <Marker
              position={[userLocation.lat, userLocation.lng]}
              icon={userIcon}
            >
              <Popup>You are here</Popup>
            </Marker>
          )}

          {/* Place Markers with Images */}
          {places.map(
            (p) =>
              p.location && (
                <Marker
                  key={p._id}
                  position={[p.location.lat, p.location.lng]}
                  icon={getMarkerIcon(p.image)}
                  eventHandlers={{
                    click: () => openSidebar(p),
                  }}
                >
                  <Popup>
                    <b>{p.placeName}</b>
                  </Popup>
                </Marker>
              )
          )}
        </MapContainer>
      </div>

      {/* ---------------- SIDEBAR ---------------- */}
      <div
        style={{
          width: sidebarOpen ? 340 : 0,
          transition: "width 0.3s ease",
          overflow: "hidden",
          background: "#fafafa",
          borderLeft: "1px solid #ddd",
          padding: sidebarOpen ? 20 : 0,
        }}
      >
        {selected && (
          <>
            <button
              onClick={() => setSidebarOpen(false)}
              style={{
                float: "right",
                background: "#000",
                color: "#fff",
                borderRadius: 6,
                padding: "4px 10px",
                cursor: "pointer",
              }}
            >
              X
            </button>

            <h2>{selected.placeName}</h2>

            {/* Image */}
            <img
              src={
                selected.image?.startsWith("http")
                  ? selected.image
                  : `${API_URL}/uploads/${selected.image}`
              }
              alt=""
              style={{
                width: "100%",
                height: 200,
                objectFit: "cover",
                borderRadius: 8,
                marginBottom: 10,
              }}
              onError={(e) => (e.target.src = "/no-image.png")}
            />

            <p><b>Address:</b><br />{selected.displayName}</p>
            <p>
              <b>Distance:</b>{" "}
              {selected.distanceFromUser
                ? `${selected.distanceFromUser} km`
                : "N/A"}
            </p>

            <b>Accessibility:</b>
            <ul>
              {Object.entries(selected.features || {}).map(([k, v]) => (
                <li key={k}>
                  {k}: <b>{v || "No"}</b>
                </li>
              ))}
            </ul>
          </>
        )}
      </div>
    </div>
  );
}
