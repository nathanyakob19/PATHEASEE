
import React, { useEffect, useState, useRef } from "react";
import { MapContainer, TileLayer, Marker, Popup, useMapEvents } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import "./GuardianStyles.css"; // Import the new styles
import { API_URL } from "./api";

delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
});

function debounce(fn, ms = 300) {
  let t;
  return (...args) => {
    clearTimeout(t);
    t = setTimeout(() => fn(...args), ms);
  };
}


function LocationMarker({ position, setPosition }) {
  useMapEvents({
    click(e) {
      setPosition({ lat: e.latlng.lat, lng: e.latlng.lng });
    }
  });

  if (!position) return null;

  return (
    <Marker
      position={[position.lat, position.lng]}
      draggable={true}
      eventHandlers={{
        dragend(e) {
          const ll = e.target.getLatLng();
          setPosition({ lat: ll.lat, lng: ll.lng });
        }
      }}
    />
  );
}

export default function AccessibilityForm() {
  const [form, setForm] = useState({
    placeName: "",
    description: "",
    features: {
      wheelchair: false,
      cleanWashrooms: false,
      babyWashroom: false,
      seatingArrangements: false,
      seniorFriendly: false,
      medicalSupport: false,
      disabledAssistance: false
    },
  });


  const [position, setPosition] = useState(null);
  const [image, setImage] = useState(null);
  const [status, setStatus] = useState("Waiting for location...");
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [customFeature, setCustomFeature] = useState("");
  const searchRef = useRef(null);


  useEffect(() => {
    if (!navigator.geolocation) {
      setStatus("Geolocation not supported by your browser.");
      return;
    }
    setStatus("Requesting location permission...");
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const lat = pos.coords.latitude;
        const lng = pos.coords.longitude;
        setPosition({ lat, lng });
        setStatus("Location detected. Reverse-geocoding...");
        try {
          const place = await reverseGeocode(lat, lng);
          if (place) {
            setForm((prev) => ({ ...prev, placeName: place }));
            setStatus("Place name filled from location.");
          } else {
            setStatus("No place name found for your location.");
          }
        } catch {
          setStatus("Reverse geocode failed.");
        }
      },
      (err) => {
        console.error(err);
        setStatus("Location permission denied or error.");
      },
      { enableHighAccuracy: true, timeout: 12000 }
    );
  }, []);

  useEffect(() => {
    let mounted = true;
    if (!position) return;
    (async () => {
      try {
        const place = await reverseGeocode(position.lat, position.lng);
        if (!mounted) return;
        if (place) {
          setForm((prev) => {
            if (!prev.placeName || prev.placeName.trim() === "") {
              return { ...prev, placeName: place };
            }
            return prev;
          });
        }
      } catch (e) {
        console.warn("reverse geocode failed", e);
      }
    })();
    return () => { mounted = false; };
  }, [position]);

  const handleInput = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleFeatureChange = (e) => {
    setForm((prev) => ({
      ...prev,
      features: {
        ...prev.features,
        [e.target.name]: e.target.checked
      }
    }));
  };

  const handleAddCustomFeature = () => {
    if (!customFeature.trim()) return;
    const key = customFeature.trim();
    if (form.features.hasOwnProperty(key)) {
      alert("Feature already exists!");
      return;
    }
    setForm((prev) => ({
      ...prev,
      features: {
        ...prev.features,
        [key]: true
      }
    }));
    setCustomFeature("");
  };

  const handleSubmit = async () => {
    if (!position) {
      alert("Please pick a location on the map (or allow location).");
      return;
    }
    if (!form.placeName || form.placeName.trim() === "") {
      if (!window.confirm("Place name is empty. Submit anyway?")) return;
    }

    const formData = new FormData();
    formData.append("placeName", form.placeName);
    formData.append("description", form.description);
    formData.append("location", JSON.stringify({ lat: position.lat, lng: position.lng }));
    formData.append("features", JSON.stringify(form.features));
    const email = localStorage.getItem("email") || "";
    if (email) formData.append("submittedBy", email);
    if (image) formData.append("image", image);

    try {
      setStatus("Uploading...");
      const res = await fetch(`${API_URL}/submit-place`, {
        method: "POST",
        body: formData
      });
      const data = await res.json();
      if (res.ok) {
        setStatus("Place submitted. Thank you!");
        setForm({
          placeName: "",
          description: "",
          features: {
            wheelchair: false,
            cleanWashrooms: false,
            babyWashroom: false,
            seatingArrangements: false,
            seniorFriendly: false,
            medicalSupport: false,
            disabledAssistance: false
          }
        });
        setImage(null);
     
      } else {
        setStatus(data?.error || "Submit failed");
      }
    } catch (e) {
      console.error(e);
      setStatus("Network error while submitting");
    }
  };

 
  const doSearch = async (q) => {
    if (!q || q.trim() === "") {
      setSearchResults([]);
      return;
    }
    setSearchLoading(true);
    try {
      const url = `https://nominatim.openstreetmap.org/search?format=jsonv2&q=${encodeURIComponent(q)}&limit=6&addressdetails=1`;
      const res = await fetch(url);
      const arr = await res.json();
      setSearchResults(arr || []);
    } catch (e) {
      console.error("Search failed", e);
      setSearchResults([]);
    } finally {
      setSearchLoading(false);
    }
  };

  const debouncedSearch = useRef(debounce((q) => doSearch(q), 350)).current;
  useEffect(() => { debouncedSearch(searchQuery); }, [searchQuery, debouncedSearch]);

  async function reverseGeocode(lat, lon) {
    try {
      const url = `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${lat}&lon=${lon}&zoom=18&addressdetails=1`;
      const res = await fetch(url);
      if (!res.ok) return null;
      const json = await res.json();
      return json?.display_name ?? null;
    } catch (e) {
      console.error("reverse geocode error", e);
      return null;
    }
  }

  const handleSearchPick = (item) => {
    const lat = Number(item.lat);
    const lon = Number(item.lon);
    setPosition({ lat, lng: lon });
    setForm((prev) => ({ ...prev, placeName: item.display_name ?? prev.placeName }));
    setSearchResults([]);
    setSearchQuery("");
    setStatus("Picked location from search");
  };

  const formatCoords = (pos) => (pos ? `${pos.lat.toFixed(6)}, ${pos.lng.toFixed(6)}` : "");

  return (
    <div className="guardian-container">
      <h2 className="guardian-header">Report Accessibility</h2>

      <div className="guardian-section">
        <h3 className="section-title">Location Details</h3>
        
        <div style={{ marginBottom: "15px" }}>
          <label style={{ display: "block", marginBottom: 6, fontWeight: "500" }}>Place name</label>
          <input
            className="guardian-input"
            name="placeName"
            value={form.placeName}
            onChange={handleInput}
            placeholder="Place name (auto-filled from location)"
            aria-required="true"
          />
        </div>

        <div style={{ marginBottom: "15px" }}>
          <label style={{ display: "block", marginBottom: 6, fontWeight: "500" }}>Detailed Description</label>
          <textarea
            className="guardian-input"
            name="description"
            value={form.description}
            onChange={handleInput}
            placeholder="Describe accessibility details (e.g. ramp width, elevator location, specific obstacles)..."
            style={{ minHeight: "100px", fontFamily: "inherit" }}
          />
        </div>

        <div style={{ marginBottom: "15px", position: "relative" }}>
          <label style={{ display: "block", marginBottom: 6, fontWeight: "500" }}>Search location (manual)</label>
          <input
            className="guardian-input"
            ref={searchRef}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search address or place (e.g. 'Central Park')"
          />
          {searchLoading && <div style={{ fontSize: 12, color: "#666" }}>Searching...</div>}
          {searchResults.length > 0 && (
            <div style={{ 
              border: "1px solid #ddd", 
              background: "white", 
              marginTop: "5px", 
              maxHeight: "220px", 
              overflow: "auto",
              position: "absolute",
              width: "100%",
              zIndex: 1000,
              borderRadius: "8px",
              boxShadow: "0 4px 6px rgba(0,0,0,0.1)"
            }}>
              {searchResults.map((r) => (
                <div
                  key={r.place_id}
                  onClick={() => handleSearchPick(r)}
                  style={{ padding: "10px", cursor: "pointer", borderBottom: "1px solid #eee" }}
                >
                  <div style={{ fontSize: 13, fontWeight: 600 }}>{r.display_name}</div>
                  <div style={{ fontSize: 12, color: "#666" }}>{r.type} • {r.class}</div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div style={{ marginBottom: "15px" }}>
          <label style={{ display: "block", marginBottom: 6, fontWeight: "500" }}>Selected coordinates</label>
          <input
            className="guardian-input"
            readOnly
            value={formatCoords(position)}
            placeholder="Click on map or use search / geolocation"
            style={{ backgroundColor: "#f9f9f9" }}
          />
        </div>
      </div>

      <div style={{ height: 360, marginBottom: 12 }}>
        <MapContainer
          center={position ? [position.lat, position.lng] : [20.5937, 78.9629]}
          zoom={position ? 15 : 5}
          style={{ width: "100%", height: "100%" }}
        >
          <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
          <LocationMarker position={position} setPosition={setPosition} />
          {/* Show a popup marker as well for info */}
          {position && (
            <Marker position={[position.lat, position.lng]}>
              <Popup>
                {form.placeName ? <div style={{ fontWeight: 700 }}>{form.placeName}<br/></div> : null}
                <div>{formatCoords(position)}</div>
                <div style={{ fontSize: 12, color: "#666" }}>Drag marker or click elsewhere to adjust</div>
              </Popup>
            </Marker>
          )}
        </MapContainer>
      </div>

      <div style={{ marginBottom: 12 }}>
        <label style={{ display: "block", marginBottom: 6 }}>Upload image (optional)</label>
        <input type="file" accept="image/*" onChange={(e) => setImage(e.target.files?.[0] ?? null)} />
      </div>

      <div style={{ marginBottom: 12 }}>
        <h4>Accessibility features</h4>
        {Object.keys(form.features).map((feature) => (
          <label key={feature} style={{ display: "block", marginBottom: 6 }}>
            <input type="checkbox" name={feature} checked={form.features[feature]} onChange={handleFeatureChange} />{" "}
            {feature}
          </label>
        ))}
        
        <div style={{ marginTop: 15, borderTop: "1px solid #eee", paddingTop: 10 }}>
          <h5 style={{ margin: "0 0 10px 0", color: "#666" }}>Add Custom Feature</h5>
          <div className="input-group">
            <input 
              className="guardian-input"
              value={customFeature}
              onChange={(e) => setCustomFeature(e.target.value)}
              placeholder="E.g. Tactile Paving, Audio Guide..."
              onKeyDown={(e) => e.key === 'Enter' && handleAddCustomFeature()}
            />
            <button 
              style={{
                padding: "0 20px",
                backgroundColor: "var(--primary-color)",
                color: "white",
                border: "none",
                borderRadius: "8px",
                cursor: "pointer",
                height: "52px", /* Match input height */
                fontWeight: "600"
              }}
              onClick={handleAddCustomFeature}
            >
              Add
            </button>
          </div>
        </div>
      </div>

      <div style={{ display: "flex", gap: 10 }}>
        <button onClick={handleSubmit} style={{ padding: "8px 16px" }}>Submit</button>
        <button onClick={() => {
          setForm({
            placeName: "",
            features: {
              wheelchair: false,
              cleanWashrooms: false,
              babyWashroom: false,
              seatingArrangements: false,
              seniorFriendly: false,
              medicalSupport: false,
              disabledAssistance: false
            }
          });
          setImage(null);
          setPosition(null);
          setSearchQuery("");
          setSearchResults([]);
          setStatus("Reset");
        }} style={{ padding: "8px 12px" }}>Reset</button>
      </div>

      <div style={{ marginTop: 12, color: "#444" }}>
        <div><strong>Status:</strong> {status}</div>
        <div style={{ fontSize: 12, color: "#666", marginTop: 6 }}>
          Tips: Allow location permission to auto-fill coordinates. Use the search box to quickly find a place. Drag the marker to adjust the exact point.
        </div>
      </div>
    </div>
  );
}
