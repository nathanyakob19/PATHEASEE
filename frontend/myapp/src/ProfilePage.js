import React, { useState, useEffect, useCallback } from "react";
import { useAuth } from "./AuthContext";
import { useNavigate } from "react-router-dom";
import { apiPost, API_URL } from "./api";
import {
  fetchUserItineraries,
  subscribeToTravelDataChanges,
} from "./userTravelStore";

const FALLBACK_IMAGE = "/no-image.png";

function resolveUploadSrc(image) {
  if (!image) return "";
  if (image.startsWith("http")) return image;
  if (image.startsWith("/uploads/")) return `${API_URL}${image}`;
  return `${API_URL}/uploads/${image}`;
}

export default function ProfilePage() {
  const { user } = useAuth();
  const userEmail = (user?.email || localStorage.getItem("email") || "").trim().toLowerCase();
  const navigate = useNavigate();
  const [name, setName] = useState(user?.name || "");
  const [avatar, setAvatar] = useState("");
  const [preview, setPreview] = useState("");
  const [activity, setActivity] = useState(null);
  const [itineraries, setItineraries] = useState([]);
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState("");

  const loadProfile = useCallback(async () => {
    if (!user) return;
    const res = await apiPost("/get-profile", { email: user.email });
    if (!res.error) {
      setName(res.name || "");
      setAvatar(res.avatar || "");
      setPreview(res.avatar ? resolveUploadSrc(res.avatar) : "");
      if (res.avatar) localStorage.setItem("avatar", res.avatar);
      else localStorage.removeItem("avatar");
    }
  }, [user]);

  const loadActivity = useCallback(async () => {
    if (!user) return;
    const res = await apiPost("/profile/activity", { email: user.email });
    if (!res.error) setActivity(res);
  }, [user]);

  useEffect(() => {
    if (!user) navigate("/login");
  }, [user, navigate]);

  useEffect(() => {
    if (!user) return;
    void loadProfile();
    void loadActivity();
  }, [user, userEmail, loadProfile, loadActivity]);

  useEffect(() => {
    let alive = true;
    const loadItineraries = async () => {
      try {
        const items = await fetchUserItineraries();
        if (alive) setItineraries(Array.isArray(items) ? items : []);
      } catch {
        if (alive) setItineraries([]);
      }
    };

    void loadItineraries();
    const unsubscribe = subscribeToTravelDataChanges(() => {
      void loadItineraries();
    }, { types: ["itinerary"] });

    return () => {
      alive = false;
      unsubscribe();
    };
  }, [userEmail]);

  const handleFileChange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setLoading(true);
    setMsg("");
    const fd = new FormData();
    fd.append("email", user.email);
    fd.append("image", file);
    try {
      const res = await fetch(`${API_URL}/upload-profile-pic`, {
        method: "POST",
        body: fd,
      });
      const data = await res.json();
      if (!data.error && data.avatar) {
        setAvatar(data.avatar);
        setPreview(resolveUploadSrc(data.avatar));
        localStorage.setItem("avatar", data.avatar);
        setMsg("Profile photo updated!");
      } else {
        setMsg(data.error || "Upload failed");
      }
    } catch {
      setMsg("Network error");
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setMsg("");
    try {
      const data = await apiPost("/update-profile", {
        email: user.email,
        name,
        avatar,
      });
      if (!data.error) setMsg("Profile updated successfully!");
      else setMsg(data.error || "Update failed");
      localStorage.setItem("name", name);
      if (avatar) localStorage.setItem("avatar", avatar);
    } catch (err) {
      setMsg("Network error");
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteAvatar = async () => {
    if (!window.confirm("Delete your profile picture?")) return;
    setLoading(true);
    setMsg("");
    try {
      const data = await apiPost("/profile/avatar/delete", { email: user.email });
      if (!data.error) {
        setAvatar("");
        setPreview("");
        localStorage.removeItem("avatar");
        setMsg("Profile photo deleted.");
      } else {
        setMsg(data.error || "Delete failed");
      }
    } catch {
      setMsg("Network error");
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteComment = async (comment) => {
    if (!window.confirm("Delete this comment?")) return;
    try {
      await apiPost("/profile/comment/delete", {
        email: user.email,
        place_id: comment.place_id,
        review_id: comment.review_id,
      });
      await loadActivity();
    } catch (err) {
      alert(err.message || "Failed to delete comment.");
    }
  };

  const handleDeleteUpload = async (upload) => {
    if (!window.confirm("Delete this uploaded image?")) return;
    try {
      await apiPost("/profile/upload/delete", {
        email: user.email,
        place_id: upload.place_id,
        stored_filename: upload.stored_filename,
      });
      await loadActivity();
    } catch (err) {
      alert(err.message || "Failed to delete upload.");
    }
  };

  if (!user) return null;

  return (
    <div style={{ padding: 40, maxWidth: 800, margin: "0 auto" }}>
      <div style={{ display: "flex", justifyContent: "flex-start", marginBottom: 16 }}>
        <button
          type="button"
          onClick={() => navigate(-1)}
          style={{
            padding: "10px 16px",
            borderRadius: 8,
            border: "1px solid #6A0DAD",
            background: "#fff",
            color: "#6A0DAD",
            cursor: "pointer",
            fontWeight: 600,
          }}
        >
          Back
        </button>
      </div>
      <h1>My Profile</h1>
      <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 20 }}>
        
        <div style={{ textAlign: "center" }}>
          <div style={{ 
            width: 150, height: 150, borderRadius: "50%", overflow: "hidden", 
            margin: "0 auto 20px", border: "4px solid #6A0DAD" 
          }}>
            <img 
              src={preview || "/no-image.png"} 
              alt="Profile" 
              style={{ width: "100%", height: "100%", objectFit: "cover" }} 
            />
          </div>
          <input type="file" onChange={handleFileChange} accept="image/*" />
          {preview && (
            <div style={{ marginTop: 10 }}>
              <button
                type="button"
                onClick={handleDeleteAvatar}
                style={{
                  padding: "8px 14px",
                  borderRadius: 8,
                  border: "1px solid #b00020",
                  background: "#fff",
                  color: "#b00020",
                  cursor: "pointer",
                  fontWeight: 600,
                }}
              >
                Delete Profile Photo
              </button>
            </div>
          )}
        </div>

        <div>
          <label>Name</label>
          <input 
            type="text" 
            value={name} 
            onChange={(e) => setName(e.target.value)}
            style={{ width: "100%", padding: 10, borderRadius: 8, border: "1px solid #ccc" }}
          />
        </div>

        <div>
          <label>Email</label>
          <input 
            type="email" 
            value={user.email} 
            disabled 
            style={{ width: "100%", padding: 10, borderRadius: 8, border: "1px solid #ccc", background: "#f0f0f0" }}
          />
        </div>

        <button 
          type="submit" 
          disabled={loading}
          style={{ 
            padding: 15, background: "#6A0DAD", color: "#fff", 
            border: "none", borderRadius: 8, fontSize: 16, cursor: "pointer" 
          }}
        >
          {loading ? "Updating..." : "Save Changes"}
        </button>

        {msg && <p style={{ textAlign: "center", color: msg.includes("success") ? "green" : "red" }}>{msg}</p>}
      </form>

      <div style={{ marginTop: 30 }}>
        <h2>Your Activity</h2>
        {!activity && <div style={{ fontSize: 12, color: "#666" }}>Loading activity...</div>}
        {activity && (
          <div style={{ display: "grid", gap: 18 }}>
            <div>
              <h4>Itinerary History</h4>
              {itineraries.length === 0 && (
                <div style={{ fontSize: 12, color: "#666" }}>No itineraries saved yet.</div>
              )}
              {itineraries.map((it, idx) => (
                <div key={it.id || idx} style={{ borderBottom: "1px solid #eee", padding: "6px 0" }}>
                  <div style={{ fontWeight: 600 }}>{it.title || "Trip Itinerary"}</div>
                  <div style={{ fontSize: 12, color: "#666" }}>
                    {it.meta?.destination ? `Destination: ${it.meta.destination}` : "Destination: -"}
                    {it.meta?.days ? ` | Days: ${it.meta.days}` : ""}
                  </div>
                </div>
              ))}
            </div>

            <div>
              <h4>Your Ratings Summary</h4>
              <div style={{ fontSize: 12, color: "#666", marginBottom: 6 }}>
                Overall Avg: {activity.ratings_summary?.overall_avg || 0} (from {activity.ratings_summary?.count || 0} ratings)
              </div>
              {(activity.ratings_summary?.feature_avg && Object.keys(activity.ratings_summary.feature_avg).length > 0) ? (
                Object.entries(activity.ratings_summary.feature_avg).map(([k, v]) => (
                  <div key={k} style={{ fontSize: 13 }}>{k}: {v} ⭐</div>
                ))
              ) : (
                <div style={{ fontSize: 12, color: "#666" }}>No ratings yet.</div>
              )}
            </div>

            <div>
              <h4>Submitted Places</h4>
              {(activity.submitted_places || []).length === 0 && (
                <div style={{ fontSize: 12, color: "#666" }}>No submitted places yet.</div>
              )}
              {(activity.submitted_places || []).map((p) => (
                <div key={p._id} style={{ display: "flex", gap: 10, alignItems: "center", marginBottom: 8 }}>
                  {p.image ? (
                    <img
                      src={resolveUploadSrc(p.image)}
                      alt={p.placeName}
                      loading="lazy"
                      onError={(e) => {
                        e.currentTarget.onerror = null;
                        e.currentTarget.src = FALLBACK_IMAGE;
                      }}
                      style={{ width: 48, height: 36, objectFit: "cover", borderRadius: 6 }}
                    />
                  ) : (
                    <div style={{ width: 48, height: 36, background: "#eee", borderRadius: 6 }} />
                  )}
                  <div>
                    <div style={{ fontWeight: 600 }}>{p.placeName || "Unnamed place"}</div>
                    <div style={{ fontSize: 12, color: "#666" }}>
                      {p.approved ? "Approved" : "Pending"}
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <div>
              <h4>Your Comments</h4>
              {(activity.comments || []).length === 0 && (
                <div style={{ fontSize: 12, color: "#666" }}>No comments yet.</div>
              )}
              {(activity.comments || []).map((c, idx) => (
                <div key={`${c.place_id}-${idx}`} style={{ borderBottom: "1px solid #eee", padding: "6px 0" }}>
                  <div style={{ fontSize: 12, color: "#666" }}>
                    {c.placeName}
                  </div>
                  <div>{c.comment}</div>
                  <div style={{ marginTop: 6 }}>
                    <button
                      type="button"
                      onClick={() => handleDeleteComment(c)}
                      style={{
                        padding: "6px 10px",
                        borderRadius: 8,
                        border: "1px solid #b00020",
                        background: "#fff",
                        color: "#b00020",
                        cursor: "pointer",
                      }}
                    >
                      Delete Comment
                    </button>
                  </div>
                </div>
              ))}
            </div>

            <div>
              <h4>Your Uploads</h4>
              {(activity.uploads || []).length === 0 && (
                <div style={{ fontSize: 12, color: "#666" }}>No uploads yet.</div>
              )}
              <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                {(activity.uploads || []).map((u, idx) => (
                  <div key={`${u.place_id}-${idx}`} style={{ textAlign: "center", width: 90 }}>
                    {u.filename ? (
                      <img
                        src={resolveUploadSrc(u.filename)}
                        alt="upload"
                        loading="lazy"
                        onError={(e) => {
                          e.currentTarget.onerror = null;
                          e.currentTarget.src = FALLBACK_IMAGE;
                        }}
                        style={{ width: 90, height: 70, objectFit: "cover", borderRadius: 6 }}
                      />
                    ) : (
                      <div style={{ width: 90, height: 70, background: "#eee", borderRadius: 6 }} />
                    )}
                    <div style={{ fontSize: 10, color: "#666" }}>{u.placeName}</div>
                    <button
                      type="button"
                      onClick={() => handleDeleteUpload(u)}
                      style={{
                        marginTop: 6,
                        padding: "4px 8px",
                        borderRadius: 6,
                        border: "1px solid #b00020",
                        background: "#fff",
                        color: "#b00020",
                        cursor: "pointer",
                        fontSize: 11,
                      }}
                    >
                      Delete
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
      <div style={{ marginTop: 30, display: "flex", justifyContent: "center" }}>
        <button
          type="button"
          onClick={() => navigate(-1)}
          style={{
            padding: "10px 18px",
            borderRadius: 8,
            border: "1px solid #6A0DAD",
            background: "#fff",
            color: "#6A0DAD",
            cursor: "pointer",
            fontWeight: 600,
          }}
        >
          Back
        </button>
      </div>
    </div>
  );
}
