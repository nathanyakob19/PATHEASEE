import React, { useState, useEffect } from "react";
import { useAuth } from "./AuthContext";
import { useNavigate } from "react-router-dom";
import { apiPost, API_URL } from "./api";

export default function ProfilePage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [name, setName] = useState(user?.name || "");
  const [avatar, setAvatar] = useState("");
  const [preview, setPreview] = useState("");
  const [activity, setActivity] = useState(null);
  const [itineraries, setItineraries] = useState([]);
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState("");

  useEffect(() => {
    if (!user) navigate("/login");
  }, [user, navigate]);

  useEffect(() => {
    if (!user) return;
    apiPost("/get-profile", { email: user.email }).then((res) => {
      if (!res.error) {
        setName(res.name || "");
        setAvatar(res.avatar || "");
        if (res.avatar) {
          const full = res.avatar.startsWith("http")
            ? res.avatar
            : res.avatar.startsWith("/uploads/")
            ? `${API_URL}${res.avatar}`
            : `${API_URL}/uploads/${res.avatar}`;
          setPreview(full);
        }
      }
    });
    apiPost("/profile/activity", { email: user.email }).then((res) => {
      if (!res.error) setActivity(res);
    });
  }, [user]);

  useEffect(() => {
    try {
      const raw = localStorage.getItem("generated_itineraries");
      const arr = raw ? JSON.parse(raw) : [];
      setItineraries(Array.isArray(arr) ? arr : []);
    } catch {
      setItineraries([]);
    }
  }, []);

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
        const full = `${API_URL}/uploads/${data.avatar}`;
        setAvatar(data.avatar);
        setPreview(full);
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
    } catch (err) {
      setMsg("Network error");
    } finally {
      setLoading(false);
    }
  };

  if (!user) return null;

  return (
    <div style={{ padding: 40, maxWidth: 800, margin: "0 auto" }}>
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
                <div style={{ fontSize: 12, color: "#666" }}>No submissions yet.</div>
              )}
              {(activity.submitted_places || []).map((p) => (
                <div key={p._id} style={{ display: "flex", gap: 10, alignItems: "center", marginBottom: 8 }}>
                  {p.image ? (
                    <img src={p.image} alt={p.placeName} style={{ width: 48, height: 36, objectFit: "cover", borderRadius: 6 }} />
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
                    {c.placeName} {c.approved ? "(Approved)" : "(Pending)"}
                  </div>
                  <div>{c.comment}</div>
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
                      <img src={u.filename} alt="upload" style={{ width: 90, height: 70, objectFit: "cover", borderRadius: 6 }} />
                    ) : (
                      <div style={{ width: 90, height: 70, background: "#eee", borderRadius: 6 }} />
                    )}
                    <div style={{ fontSize: 10, color: "#666" }}>{u.placeName}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
