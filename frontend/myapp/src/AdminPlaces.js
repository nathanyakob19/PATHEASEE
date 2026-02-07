
import { useEffect, useState } from "react";
import { API_URL } from "./api";

const FALLBACK_IMAGE = "/no-image.png";

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

function AdminPlaces() {
  const [places, setPlaces] = useState([]);
  const [loading, setLoading] = useState(false);
  const [ratingsState, setRatingsState] = useState({});
  const [newComment, setNewComment] = useState({});
  const [editComment, setEditComment] = useState({});

  const fetchApproved = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API_URL}/get-approved-places`);
      const data = await res.json();
      setPlaces(Array.isArray(data) ? data : []);
      const init = {};
      (Array.isArray(data) ? data : []).forEach((p) => {
        init[p._id] = {
          accessibility_level: p.accessibility_level || "",
          feature_ratings: p.feature_ratings || {},
        };
      });
      setRatingsState(init);
    } catch (e) {
      console.error("Failed to fetch approved places", e);
      setPlaces([]);
    } finally {
      setLoading(false);
    }
  };

  const saveRatings = async (id) => {
    try {
      const payload = ratingsState[id] || { feature_ratings: {}, accessibility_level: "" };
      const res = await fetch(`${API_URL}/admin-rate-place`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ place_id: id, ...payload }),
      });
      const data = await res.json();
      if (data.error) alert(data.error);
      else alert("Ratings saved");
    } catch (e) {
      alert("Failed to save ratings");
    }
  };

  useEffect(() => {
    fetchApproved();
  }, []);

  return (
    <div style={{ padding: 20 }}>
      <h1>Approved Places</h1>

      {loading && <p>Loading…</p>}
      {!loading && places.length === 0 && <p>No approved places.</p>}

      {places.map((p) => (
        <div
          key={p._id}
          style={{
            border: "1px solid #ccc",
            padding: 20,
            marginBottom: 20,
            borderRadius: 8,
          }}
        >
          <h3>{p.placeName ?? "Unnamed place"}</h3>

          <p>
            <b>Location:</b> {formatLocation(p.location)}
          </p>

          {/* optionally show image if available */}
          {p.image ? (
            <div style={{ marginBottom: 10 }}>
              <img
                src={`${API_URL}/uploads/${p.image}`}
                alt={p.placeName ?? "place image"}
                loading="lazy"
                onError={(e) => {
                  e.currentTarget.onerror = null;
                  e.currentTarget.src = FALLBACK_IMAGE;
                }}
                style={{ maxWidth: 300, display: "block", objectFit: "cover", borderRadius: 8 }}
              />
            </div>
          ) : null}

          {/* Display Features */}
          <div style={{ marginTop: 10 }}>
            <b>Features:</b>
            <ul>
              {Object.entries(p.features || {}).map(([key, value]) => (
                <li key={key}>
                  {key.replace(/([A-Z])/g, " $1")} : <b>{value ? "Yes" : "No"}</b>
                </li>
              ))}

              {/* if features empty */}
              {(!p.features || Object.keys(p.features).length === 0) && (
                <li style={{ color: "#666" }}>No feature data</li>
              )}
            </ul>
          </div>

          <div style={{ marginTop: 14 }}>
            <h4>Accessibility Ratings (Admin)</h4>
            <div style={{ marginBottom: 8 }}>
              <label>
                Level:{" "}
                <select
                  value={ratingsState[p._id]?.accessibility_level || ""}
                  onChange={(e) =>
                    setRatingsState((prev) => ({
                      ...prev,
                      [p._id]: {
                        ...prev[p._id],
                        accessibility_level: e.target.value,
                      },
                    }))
                  }
                >
                  <option value="">Select</option>
                  <option value="basic">Basic</option>
                  <option value="moderate">Moderate</option>
                  <option value="full">Fully Accessible</option>
                </select>
              </label>
            </div>

            {(Object.keys(p.features || {}) || []).map((key) => (
              <div key={key} style={{ marginBottom: 6 }}>
                <label style={{ marginRight: 8 }}>{key}</label>
                <select
                  value={ratingsState[p._id]?.feature_ratings?.[key] || 0}
                  onChange={(e) =>
                    setRatingsState((prev) => ({
                      ...prev,
                      [p._id]: {
                        ...prev[p._id],
                        feature_ratings: {
                          ...(prev[p._id]?.feature_ratings || {}),
                          [key]: Number(e.target.value),
                        },
                      },
                    }))
                  }
                >
                  <option value={0}>0</option>
                  <option value={1}>1★</option>
                  <option value={2}>2★</option>
                  <option value={3}>3★</option>
                  <option value={4}>4★</option>
                  <option value={5}>5★</option>
                </select>
              </div>
            ))}

            <button onClick={() => saveRatings(p._id)}>Save Ratings</button>
          </div>

          <div style={{ marginTop: 16 }}>
            <h4>Comments (Admin)</h4>
            {(p.reviews || []).length === 0 && (
              <div style={{ fontSize: 12, color: "#666" }}>No comments yet.</div>
            )}
            {(p.reviews || []).map((r, idx) => (
              <div key={`${p._id}-${idx}`} style={{ borderBottom: "1px solid #eee", padding: "6px 0" }}>
                <div style={{ fontSize: 12, color: "#555" }}>
                  {r.name || "Anonymous"} {r.email ? `(${r.email})` : ""}{" "}
                  {r.createdAt ? `- ${new Date(r.createdAt).toLocaleString()}` : ""}
                </div>
                <div style={{ marginTop: 4 }}>{r.comment}</div>
                <div style={{ marginTop: 6, display: "flex", gap: 8, flexWrap: "wrap" }}>
                  {!r.approved && (
                    <button
                      onClick={async () => {
                        await fetch(`${API_URL}/admin/review/approve`, {
                          method: "POST",
                          headers: { "Content-Type": "application/json" },
                          body: JSON.stringify({
                            place_id: p._id,
                            review_index: idx,
                          }),
                        });
                        fetchApproved();
                      }}
                    >
                      Approve
                    </button>
                  )}
                  <input
                    placeholder="Edit comment"
                    value={editComment[`${p._id}-${idx}`] ?? ""}
                    onChange={(e) =>
                      setEditComment((prev) => ({
                        ...prev,
                        [`${p._id}-${idx}`]: e.target.value,
                      }))
                    }
                  />
                  <button
                    onClick={async () => {
                      const txt = editComment[`${p._id}-${idx}`];
                      if (!txt) return;
                      await fetch(`${API_URL}/admin/review/update`, {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({
                          place_id: p._id,
                          review_index: idx,
                          comment: txt,
                        }),
                      });
                      fetchApproved();
                    }}
                  >
                    Update
                  </button>
                  <button
                    onClick={async () => {
                      if (!window.confirm("Delete this comment?")) return;
                      await fetch(`${API_URL}/admin/review/delete`, {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({
                          place_id: p._id,
                          review_index: idx,
                        }),
                      });
                      fetchApproved();
                    }}
                  >
                    Delete
                  </button>
                </div>
              </div>
            ))}

            <div style={{ marginTop: 10, display: "flex", gap: 8 }}>
              <input
                placeholder="Add new comment as admin"
                value={newComment[p._id] || ""}
                onChange={(e) =>
                  setNewComment((prev) => ({
                    ...prev,
                    [p._id]: e.target.value,
                  }))
                }
              />
              <button
                onClick={async () => {
                  const txt = newComment[p._id];
                  if (!txt) return;
                  await fetch(`${API_URL}/admin/review/add`, {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                      place_id: p._id,
                      name: "Admin",
                      comment: txt,
                    }),
                  });
                  setNewComment((prev) => ({ ...prev, [p._id]: "" }));
                  fetchApproved();
                }}
              >
                Add Comment
              </button>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

export default AdminPlaces;
