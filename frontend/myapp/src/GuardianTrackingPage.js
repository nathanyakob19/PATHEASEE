import React, { useEffect, useState, useRef } from "react";
import { MapContainer, TileLayer, Marker, Popup, useMap } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { apiPost } from "./api";
import "./GuardianStyles.css";

/* Fix Leaflet icons */
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
});

const myIcon = L.divIcon({
  className: "",
  html: `<div style="width:20px;height:20px;background:#007bff;border-radius:50%;border:3px solid white;box-shadow:0 0 5px rgba(0,0,0,0.5);"></div>`,
  iconSize: [20, 20]
});

const partnerIcon = L.divIcon({
  className: "",
  html: `<div style="width:24px;height:24px;background:#dc3545;border-radius:50%;border:3px solid white;box-shadow:0 0 5px rgba(0,0,0,0.5);"></div>`,
  iconSize: [24, 24]
});

// Map Recenter Component
function Recenter({ center }) {
  const map = useMap();
  useEffect(() => {
    if (center) map.setView(center, 15, { animate: true });
  }, [center, map]);
  return null;
}

export default function GuardianTrackingPage() {
  const myEmail = localStorage.getItem("email");

  const [connections, setConnections] = useState([]);
  const [selectedPartner, setSelectedPartner] = useState("");
  const [partnerLocation, setPartnerLocation] = useState(null);
  const [myLocation, setMyLocation] = useState(null);
  const [isSharing, setIsSharing] = useState(false);
  const [statusMessage, setStatusMessage] = useState("Ready to track.");

  const watchIdRef = useRef(null);

  /* Load connections */
  useEffect(() => {
    apiPost("/get-my-connections", { email: myEmail })
      .then(res => setConnections(res || []));
  }, [myEmail]);

  /* Get initial location */
  useEffect(() => {
    navigator.geolocation.getCurrentPosition(
      pos => setMyLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
      err => console.error(err)
    );
  }, []);

  /* Share Location Logic */
  const toggleSharing = () => {
    if (isSharing) {
      // Stop sharing
      if (watchIdRef.current) navigator.geolocation.clearWatch(watchIdRef.current);
      watchIdRef.current = null;
      setIsSharing(false);
      setStatusMessage("Stopped sharing location.");
    } else {
      // Start sharing
      if (!navigator.geolocation) return alert("Geolocation not supported");
      setStatusMessage("Starting location sharing...");
      
      watchIdRef.current = navigator.geolocation.watchPosition(
        (pos) => {
          const { latitude, longitude } = pos.coords;
          setMyLocation({ lat: latitude, lng: longitude });
          
          apiPost("/update-live-location", {
            email: myEmail,
            lat: latitude,
            lng: longitude
          });
          setStatusMessage("Live location sharing active.");
        },
        (err) => setStatusMessage("Error: " + err.message),
        { enableHighAccuracy: true }
      );
      setIsSharing(true);
    }
  };

  /* Poll Partner Location */
  useEffect(() => {
    if (!selectedPartner) {
      setPartnerLocation(null);
      return;
    }

    const fetchPartner = async () => {
      const res = await apiPost("/get-partner-location", {
        requester: myEmail,
        target: selectedPartner
      });
      
      if (!res.error) {
        setPartnerLocation(res);
      } else {
        // Only show error if we expected to see something
        // setStatusMessage(`Waiting for ${selectedPartner}...`);
      }
    };

    fetchPartner();
    const interval = setInterval(fetchPartner, 5000);
    return () => clearInterval(interval);
  }, [selectedPartner, myEmail]);

  const center = partnerLocation || myLocation || { lat: 20.5937, lng: 78.9629 };

  return (
    <div className="tracking-container">
      <div className="tracking-sidebar">
        <h2 className="guardian-header" style={{ fontSize: "1.8rem", textAlign: "left", marginBottom: "20px" }}>
          Live Tracking
        </h2>

        <label htmlFor="partner-select" style={{ fontWeight: "600", marginBottom: "5px" }}>
          Track Partner:
        </label>
        <select
          id="partner-select"
          className="tracking-select"
          value={selectedPartner}
          onChange={e => setSelectedPartner(e.target.value)}
        >
          <option value="">-- Select Partner --</option>
          {connections.map(c => (
            <option key={c.id} value={c.email}>{c.email}</option>
          ))}
        </select>

        <button 
          className={`btn ${isSharing ? "btn-danger" : "btn-success"}`}
          onClick={toggleSharing}
          style={{ width: "100%", justifyContent: "center" }}
        >
          {isSharing ? "STOP SHARING" : "START SHARING"}
        </button>

        <div className="status-box" role="status" aria-live="polite">
          <p style={{ margin: 0 }}>{statusMessage}</p>
          {partnerLocation && (
            <p style={{ marginTop: "10px", fontSize: "0.9em", color: "#0056b3" }}>
              <strong>{selectedPartner}</strong> last updated:<br/>
              {partnerLocation.age_seconds < 60 ? "Just now" : `${Math.round(partnerLocation.age_seconds/60)} mins ago`}
            </p>
          )}
        </div>
      </div>

      <div className="map-wrapper">
        <MapContainer center={center} zoom={13} style={{ height: "100%", width: "100%" }}>
          <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
          <Recenter center={center} />

          {myLocation && (
            <Marker position={myLocation} icon={myIcon}>
              <Popup>You</Popup>
            </Marker>
          )}

          {partnerLocation && (
            <Marker position={partnerLocation} icon={partnerIcon}>
              <Popup>
                <b>{selectedPartner}</b><br/>
                Last seen: {new Date(partnerLocation.updatedAt).toLocaleTimeString()}
              </Popup>
            </Marker>
          )}
        </MapContainer>
      </div>
    </div>
  );
}
