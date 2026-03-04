import { useEffect, useMemo, useState } from "react";
import { API_URL } from "./api";

const FALLBACK_IMAGE = "/no-image.png";

function resolveImageSrc(image) {
  if (!image) return FALLBACK_IMAGE;
  if (typeof image === "string" && image.startsWith("http")) return image;
  if (typeof image === "string" && image.startsWith("/uploads/")) return `${API_URL}${image}`;
  return `${API_URL}/uploads/${image}`;
}

function parseFeatureValue(raw) {
  const v = String(raw ?? "").trim();
  const lower = v.toLowerCase();
  if (lower === "true" || lower === "yes") return true;
  if (lower === "false" || lower === "no") return false;
  if (v !== "" && !Number.isNaN(Number(v))) return Number(v);
  return v;
}

function AdminPlaces() {
  const [places, setPlaces] = useState([]);
  const [loading, setLoading] = useState(false);
  const [ratingsState, setRatingsState] = useState({});
  const [newComment, setNewComment] = useState({});
  const [editComment, setEditComment] = useState({});
  const [placeDrafts, setPlaceDrafts] = useState({});
  const [featureDrafts, setFeatureDrafts] = useState({});
  const [newFeature, setNewFeature] = useState({});
  const [viewMode, setViewMode] = useState("card");
  const [searchText, setSearchText] = useState("");
  const [selectedPlaceId, setSelectedPlaceId] = useState("");

  const fetchApproved = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API_URL}/get-approved-places`);
      const data = await res.json();
      const list = Array.isArray(data) ? data : [];
      setPlaces(list);

      const ratingsInit = {};
      const placeInit = {};
      const featureInit = {};
      list.forEach((p) => {
        ratingsInit[p._id] = {
          accessibility_level: p.accessibility_level || "",
          feature_ratings: p.feature_ratings || {},
        };
        placeInit[p._id] = {
          placeName: p.placeName || "",
          description: p.description || "",
          city: p.city || "",
          lat: p.location?.lat ?? "",
          lng: p.location?.lng ?? "",
        };
        featureInit[p._id] = Object.fromEntries(
          Object.entries(p.features || {}).map(([k, v]) => [k, String(v)])
        );
      });
      setRatingsState(ratingsInit);
      setPlaceDrafts(placeInit);
      setFeatureDrafts(featureInit);
    } catch (e) {
      console.error("Failed to fetch approved places", e);
      setPlaces([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchApproved();
  }, []);

  const savePlace = async (place) => {
    const d = placeDrafts[place._id] || {};
    const rawFeatures = featureDrafts[place._id] || {};
    const features = {};
    Object.entries(rawFeatures).forEach(([k, v]) => {
      const key = String(k || "").trim();
      if (!key) return;
      features[key] = parseFeatureValue(v);
    });

    try {
      const payload = {
        place_id: place._id,
        placeName: d.placeName || "",
        description: d.description || "",
        city: d.city || "",
        location: {
          lat: d.lat,
          lng: d.lng,
        },
        features,
      };
      const res = await fetch(`${API_URL}/admin/place/update`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (data.error) {
        alert(data.error);
      } else {
        alert("Place details saved");
        fetchApproved();
      }
    } catch {
      alert("Failed to save place details");
    }
  };

  const deletePlace = async (placeId) => {
    if (!window.confirm("Delete this approved place? This cannot be undone.")) return;
    try {
      const res = await fetch(`${API_URL}/admin/place/delete`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ place_id: placeId }),
      });
      const data = await res.json();
      if (data.error) {
        alert(data.error);
      } else {
        fetchApproved();
      }
    } catch {
      alert("Failed to delete place");
    }
  };

  const uploadImages = async (placeId, files) => {
    const arr = Array.from(files || []);
    if (arr.length === 0) return;
    const formData = new FormData();
    formData.append("place_id", placeId);
    const email = localStorage.getItem("email") || "";
    if (email) formData.append("uploader_email", email);
    arr.forEach((f) => formData.append("images", f));
    const res = await fetch(`${API_URL}/upload-place-images`, {
      method: "POST",
      body: formData,
    });
    const data = await res.json();
    if (data.error) alert(data.error);
    else fetchApproved();
  };

  const removeImage = async (placeId, image) => {
    if (!window.confirm("Delete this image?")) return;
    const res = await fetch(`${API_URL}/admin/place/image/delete`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ place_id: placeId, image }),
    });
    const data = await res.json();
    if (data.error) alert(data.error);
    else fetchApproved();
  };

  const setPrimaryImage = async (placeId, image) => {
    const res = await fetch(`${API_URL}/admin/place/update`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ place_id: placeId, primary_image: image }),
    });
    const data = await res.json();
    if (data.error) alert(data.error);
    else fetchApproved();
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
      else {
        alert("Ratings saved");
        fetchApproved();
      }
    } catch {
      alert("Failed to save ratings");
    }
  };

  const filteredPlaces = useMemo(() => {
    return places.filter((p) => {
      const text = searchText.trim().toLowerCase();
      return (
        !text ||
        (p.placeName || "").toLowerCase().includes(text) ||
        (p.description || "").toLowerCase().includes(text) ||
        (p.city || "").toLowerCase().includes(text)
      );
    });
  }, [places, searchText]);

  const detailedPlaces =
    selectedPlaceId
      ? filteredPlaces.filter((p) => p._id === selectedPlaceId)
      : filteredPlaces;

  return (
    <div style={{ padding: 20 }}>
      <h1>Approved Places (Admin CRUD)</h1>
      <div style={{ display: "grid", gridTemplateColumns: "1fr auto auto", gap: 8, marginBottom: 14, alignItems: "center" }}>
        <input
          placeholder="Search by place/city/description"
          value={searchText}
          onChange={(e) => setSearchText(e.target.value)}
          style={{
            width: "100%",
            padding: "10px 12px",
            borderRadius: 10,
            border: "1px solid #cfc8d8",
            outline: "none",
            boxShadow: "inset 0 1px 2px rgba(0,0,0,0.04)",
            background: "#fff",
          }}
        />
        <button
          onClick={() => {
            setViewMode("card");
            setSelectedPlaceId("");
          }}
          style={{ fontWeight: viewMode === "card" ? 700 : 400 }}
        >
          Card View
        </button>
        <button
          onClick={() => setViewMode("detailed")}
          style={{ fontWeight: viewMode === "detailed" ? 700 : 400 }}
        >
          Detailed View
        </button>
      </div>

      {loading && <p>Loading...</p>}
      {!loading && filteredPlaces.length === 0 && <p>No approved places found for current search/filter.</p>}

      {!loading && viewMode === "card" && filteredPlaces.length > 0 && (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))", gap: 12, marginBottom: 16 }}>
          {filteredPlaces.map((p) => {
            const gallery = Array.isArray(p.images) && p.images.length > 0 ? p.images : (p.image ? [p.image] : []);
            return (
              <div key={`card-${p._id}`} style={{ border: "1px solid #ddd", borderRadius: 10, background: "#fff", padding: 10 }}>
                <img
                  src={resolveImageSrc(gallery[0])}
                  alt={p.placeName || "place"}
                  style={{ width: "100%", height: 150, objectFit: "cover", borderRadius: 8 }}
                  onError={(e) => {
                    e.currentTarget.onerror = null;
                    e.currentTarget.src = FALLBACK_IMAGE;
                  }}
                />
                <div style={{ marginTop: 8, fontWeight: 700 }}>{p.placeName || "Unnamed place"}</div>
                <div style={{ fontSize: 12, color: "#666" }}>{p.city || "No city"}</div>
                <div style={{ fontSize: 12, color: "#666" }}>Level: {p.accessibility_level || "N/A"}</div>
                <div style={{ marginTop: 8, display: "flex", gap: 8 }}>
                  <button
                    onClick={() => {
                      setSelectedPlaceId(p._id);
                      setViewMode("detailed");
                    }}
                    style={{ flex: 1 }}
                  >
                    Open Details
                  </button>
                  <button onClick={() => deletePlace(p._id)} style={{ flex: 1, borderColor: "#b00020", color: "#b00020" }}>
                    Delete
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {viewMode === "detailed" && detailedPlaces.map((p) => {
        const d = placeDrafts[p._id] || {};
        const featureMap = featureDrafts[p._id] || {};
        const gallery = Array.isArray(p.images) && p.images.length > 0 ? p.images : (p.image ? [p.image] : []);
        return (
          <div
            key={p._id}
            style={{
              border: "1px solid #ccc",
              padding: 16,
              marginBottom: 18,
              borderRadius: 10,
              background: "#fff",
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", gap: 10, alignItems: "center" }}>
              <h3 style={{ margin: 0 }}>{p.placeName || "Unnamed place"}</h3>
              <button onClick={() => deletePlace(p._id)} style={{ borderColor: "#b00020", color: "#b00020" }}>
                Delete Place
              </button>
            </div>

            <div style={{ marginTop: 12, display: "grid", gap: 8 }}>
              <label>
                Name
                <input
                  value={d.placeName || ""}
                  onChange={(e) =>
                    setPlaceDrafts((prev) => ({ ...prev, [p._id]: { ...prev[p._id], placeName: e.target.value } }))
                  }
                  style={{ width: "100%" }}
                />
              </label>
              <label>
                Description
                <textarea
                  value={d.description || ""}
                  onChange={(e) =>
                    setPlaceDrafts((prev) => ({ ...prev, [p._id]: { ...prev[p._id], description: e.target.value } }))
                  }
                  rows={3}
                  style={{ width: "100%" }}
                />
              </label>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8 }}>
                <label>
                  City
                  <input
                    value={d.city || ""}
                    onChange={(e) =>
                      setPlaceDrafts((prev) => ({ ...prev, [p._id]: { ...prev[p._id], city: e.target.value } }))
                    }
                    style={{ width: "100%" }}
                  />
                </label>
                <label>
                  Latitude
                  <input
                    value={d.lat ?? ""}
                    onChange={(e) =>
                      setPlaceDrafts((prev) => ({ ...prev, [p._id]: { ...prev[p._id], lat: e.target.value } }))
                    }
                    style={{ width: "100%" }}
                  />
                </label>
                <label>
                  Longitude
                  <input
                    value={d.lng ?? ""}
                    onChange={(e) =>
                      setPlaceDrafts((prev) => ({ ...prev, [p._id]: { ...prev[p._id], lng: e.target.value } }))
                    }
                    style={{ width: "100%" }}
                  />
                </label>
              </div>
            </div>

            <div style={{ marginTop: 14 }}>
              <h4 style={{ marginBottom: 8 }}>Features (Edit/Delete/Add)</h4>
              {Object.entries(featureMap).map(([k, v]) => (
                <div key={`${p._id}-${k}`} style={{ display: "grid", gridTemplateColumns: "1fr 2fr auto", gap: 8, marginBottom: 6 }}>
                  <input value={k} disabled />
                  <input
                    value={v}
                    onChange={(e) =>
                      setFeatureDrafts((prev) => ({
                        ...prev,
                        [p._id]: { ...(prev[p._id] || {}), [k]: e.target.value },
                      }))
                    }
                  />
                  <button
                    onClick={() =>
                      setFeatureDrafts((prev) => {
                        const out = { ...(prev[p._id] || {}) };
                        delete out[k];
                        return { ...prev, [p._id]: out };
                      })
                    }
                  >
                    Delete
                  </button>
                </div>
              ))}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 2fr auto", gap: 8, marginTop: 8 }}>
                <input
                  placeholder="new feature key"
                  value={newFeature[p._id]?.key || ""}
                  onChange={(e) =>
                    setNewFeature((prev) => ({
                      ...prev,
                      [p._id]: { ...(prev[p._id] || {}), key: e.target.value },
                    }))
                  }
                />
                <input
                  placeholder="value (true/false/number/text)"
                  value={newFeature[p._id]?.value || ""}
                  onChange={(e) =>
                    setNewFeature((prev) => ({
                      ...prev,
                      [p._id]: { ...(prev[p._id] || {}), value: e.target.value },
                    }))
                  }
                />
                <button
                  onClick={() => {
                    const key = (newFeature[p._id]?.key || "").trim();
                    const value = newFeature[p._id]?.value || "";
                    if (!key) return;
                    setFeatureDrafts((prev) => ({
                      ...prev,
                      [p._id]: { ...(prev[p._id] || {}), [key]: value },
                    }));
                    setNewFeature((prev) => ({ ...prev, [p._id]: { key: "", value: "" } }));
                  }}
                >
                  Add
                </button>
              </div>
            </div>

            <div style={{ marginTop: 14 }}>
              <h4 style={{ marginBottom: 8 }}>Images (CRUD)</h4>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(180px, 1fr))", gap: 10 }}>
                {gallery.map((img, idx) => (
                  <div key={`${p._id}-img-${idx}`} style={{ border: "1px solid #ddd", borderRadius: 8, padding: 8 }}>
                    <img
                      src={resolveImageSrc(img)}
                      alt={p.placeName || "place"}
                      onError={(e) => {
                        e.currentTarget.onerror = null;
                        e.currentTarget.src = FALLBACK_IMAGE;
                      }}
                      style={{ width: "100%", height: 110, objectFit: "cover", borderRadius: 6 }}
                    />
                    <div style={{ display: "flex", gap: 6, marginTop: 6 }}>
                      <button onClick={() => setPrimaryImage(p._id, img)} style={{ flex: 1 }}>
                        Primary
                      </button>
                      <button onClick={() => removeImage(p._id, img)} style={{ flex: 1 }}>
                        Delete
                      </button>
                    </div>
                  </div>
                ))}
              </div>
              <div style={{ marginTop: 10 }}>
                <input
                  type="file"
                  multiple
                  onChange={(e) => uploadImages(p._id, e.target.files)}
                />
              </div>
            </div>

            <div style={{ marginTop: 14, display: "flex", justifyContent: "flex-end" }}>
              <button onClick={() => savePlace(p)} style={{ fontWeight: 700 }}>
                Save Place Details
              </button>
            </div>

            <div style={{ marginTop: 16 }}>
              <h4>Accessibility Ratings (Admin)</h4>
              <div style={{ marginBottom: 8 }}>
                <label>
                  Level{" "}
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

              {Object.keys(featureMap).map((key) => (
                <div key={`${p._id}-rate-${key}`} style={{ marginBottom: 6 }}>
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
                    <option value={1}>1*</option>
                    <option value={2}>2*</option>
                    <option value={3}>3*</option>
                    <option value={4}>4*</option>
                    <option value={5}>5*</option>
                  </select>
                </div>
              ))}
              <button onClick={() => saveRatings(p._id)}>Save Ratings</button>
            </div>

            <div style={{ marginTop: 16 }}>
              <h4>Comments (Admin CRUD)</h4>
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
        );
      })}
    </div>
  );
}

export default AdminPlaces;
