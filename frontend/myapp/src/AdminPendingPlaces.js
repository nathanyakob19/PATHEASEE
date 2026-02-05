import { useEffect, useState } from "react";
import { API_URL } from "./api";

function formatLocation(loc) {
  if (!loc) return "Not provided";
  if (typeof loc === "string") return loc;
  if (typeof loc === "object") {
    if (typeof loc.lat !== "undefined" && typeof loc.lng !== "undefined") {
      const lat = Number(loc.lat);
      const lng = Number(loc.lng);
      if (!Number.isNaN(lat) && !Number.isNaN(lng)) {
        return `${lat.toFixed(6)}, ${lng.toFixed(6)}`;
      }
    }
    if (Array.isArray(loc.coordinates) && loc.coordinates.length >= 2) {
      const lng = Number(loc.coordinates[0]);
      const lat = Number(loc.coordinates[1]);
      if (!Number.isNaN(lat) && !Number.isNaN(lng)) {
        return `${lat.toFixed(6)}, ${lng.toFixed(6)}`;
      }
    }
    try {
      return JSON.stringify(loc);
    } catch {
      return "Invalid location";
    }
  }
  return String(loc);
}

function AdminPendingPlaces() {
  const [places, setPlaces] = useState([]);
  const [loading, setLoading] = useState(false);

  const fetchPending = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API_URL}/get-pending-places`);
      const data = await res.json();
      setPlaces(Array.isArray(data) ? data : []);
    } catch (e) {
      console.error("Failed to fetch pending places", e);
      setPlaces([]);
    } finally {
      setLoading(false);
    }
  };

  const approvePlace = async (id) => {
    try {
      const res = await fetch(`${API_URL}/approve-place`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id }),
      });
      if (!res.ok) {
        const err = await res.text();
        alert("Approve failed: " + err);
        return;
      }
      await fetchPending();
    } catch (e) {
      alert("Network error while approving");
    }
  };

  useEffect(() => {
    fetchPending();
  }, []);

  return (
    <div style={{ padding: 20 }}>
      <h1>Pending Places</h1>
      {loading && <p>Loading...</p>}
      {!loading && places.length === 0 && <p>No pending places.</p>}

      {places.map((p) => (
        <div
          key={p._id}
          style={{
            border: "1px solid #ccc",
            padding: 20,
            marginBottom: 20,
            borderRadius: 8,
            background: "#fff",
          }}
        >
          <h3>{p.placeName ?? "Unnamed place"}</h3>
          <p>
            <b>Location:</b> {formatLocation(p.location)}
          </p>

          {p.image ? (
            <div style={{ marginBottom: 10 }}>
              <img
                src={`${API_URL}/uploads/${p.image}`}
                alt={p.placeName ?? "place image"}
                style={{ maxWidth: 300, display: "block" }}
                onError={(e) => {
                  e.currentTarget.style.display = "none";
                }}
              />
            </div>
          ) : null}

          <div style={{ marginTop: 10 }}>
            <b>Features:</b>
            <ul>
              {Object.entries(p.features || {}).map(([key, value]) => (
                <li key={key}>
                  {key.replace(/([A-Z])/g, " $1")} :{" "}
                  <b>{value ? "Yes" : "No"}</b>
                </li>
              ))}
              {(!p.features || Object.keys(p.features).length === 0) && (
                <li style={{ color: "#666" }}>No feature data</li>
              )}
            </ul>
          </div>

          <button
            onClick={() => approvePlace(p._id)}
            style={{
              backgroundColor: "green",
              color: "white",
              padding: 10,
              border: "none",
              marginTop: 10,
              cursor: "pointer",
              borderRadius: 5,
            }}
          >
            Approve
          </button>
        </div>
      ))}
    </div>
  );
}

export default AdminPendingPlaces;
