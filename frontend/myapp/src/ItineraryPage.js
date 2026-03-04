import React, { useEffect, useMemo, useState } from "react";

const cardStyle = {
  background: "rgba(255,255,255,0.35)",
  backdropFilter: "blur(10px)",
  WebkitBackdropFilter: "blur(10px)",
  border: "1px solid rgba(255,255,255,0.45)",
  borderRadius: 14,
  boxShadow: "0 8px 24px rgba(0,0,0,0.08)",
};

function getPlans() {
  try {
    const raw = localStorage.getItem("generated_itineraries");
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function savePlans(plans) {
  localStorage.setItem("generated_itineraries", JSON.stringify(plans));
}

function normalizeStops(day) {
  const stops = Array.isArray(day?.stops) ? day.stops : [];
  return stops.filter((s) => s && s.name);
}

export default function ItineraryPage() {
  const [savedPlans, setSavedPlans] = useState([]);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [visited, setVisited] = useState({});
  const [editingTitle, setEditingTitle] = useState(false);
  const [titleDraft, setTitleDraft] = useState("");
  const [newStopByDay, setNewStopByDay] = useState({});
  const [editingStopKey, setEditingStopKey] = useState("");
  const [editingStopDraft, setEditingStopDraft] = useState("");

  useEffect(() => {
    setSavedPlans(getPlans());
  }, []);

  const plan = savedPlans[selectedIndex] || null;
  const itinerary = useMemo(() => plan?.itinerary || [], [plan]);

  const updatePlans = (next) => {
    setSavedPlans(next);
    savePlans(next);
  };

  const updateCurrentPlan = (updater) => {
    if (!plan) return;
    const next = [...savedPlans];
    const current = { ...next[selectedIndex] };
    updater(current);
    next[selectedIndex] = current;
    updatePlans(next);
  };

  const deletePlan = (idx) => {
    const next = savedPlans.filter((_, i) => i !== idx);
    updatePlans(next);
    setSelectedIndex((prev) => {
      if (next.length === 0) return 0;
      return Math.max(0, Math.min(prev, next.length - 1));
    });
    setVisited({});
  };

  const saveTitle = () => {
    const txt = titleDraft.trim();
    if (!txt) return;
    updateCurrentPlan((p) => {
      p.title = txt;
    });
    setEditingTitle(false);
  };

  const addStop = (dayIdx) => {
    const draft = (newStopByDay[dayIdx] || "").trim();
    if (!draft) return;
    updateCurrentPlan((p) => {
      const nextItinerary = Array.isArray(p.itinerary) ? [...p.itinerary] : [];
      const day = { ...(nextItinerary[dayIdx] || {}) };
      const stops = Array.isArray(day.stops) ? [...day.stops] : [];
      stops.push({ name: draft });
      day.stops = stops;
      nextItinerary[dayIdx] = day;
      p.itinerary = nextItinerary;
    });
    setNewStopByDay((prev) => ({ ...prev, [dayIdx]: "" }));
  };

  const deleteStop = (dayIdx, stopIdx) => {
    updateCurrentPlan((p) => {
      const nextItinerary = Array.isArray(p.itinerary) ? [...p.itinerary] : [];
      const day = { ...(nextItinerary[dayIdx] || {}) };
      const stops = Array.isArray(day.stops) ? [...day.stops] : [];
      stops.splice(stopIdx, 1);
      day.stops = stops;
      nextItinerary[dayIdx] = day;
      p.itinerary = nextItinerary;
    });
    setVisited((prev) => {
      const out = { ...prev };
      delete out[`${dayIdx}-${stopIdx}`];
      return out;
    });
  };

  const saveStopEdit = (dayIdx, stopIdx) => {
    const txt = editingStopDraft.trim();
    if (!txt) return;
    updateCurrentPlan((p) => {
      const nextItinerary = Array.isArray(p.itinerary) ? [...p.itinerary] : [];
      const day = { ...(nextItinerary[dayIdx] || {}) };
      const stops = Array.isArray(day.stops) ? [...day.stops] : [];
      const curr = { ...(stops[stopIdx] || {}) };
      curr.name = txt;
      stops[stopIdx] = curr;
      day.stops = stops;
      nextItinerary[dayIdx] = day;
      p.itinerary = nextItinerary;
    });
    setEditingStopKey("");
    setEditingStopDraft("");
  };

  return (
    <div style={{ padding: 20 }}>
      <div style={{ display: "flex", gap: 16, alignItems: "flex-start" }}>
        <div style={{ width: 340, ...cardStyle, padding: 14 }}>
          <h2 style={{ marginTop: 0 }}>Itineraries</h2>
          {savedPlans.length === 0 && <p>No saved itineraries.</p>}

          {savedPlans.map((p, idx) => (
            <div
              key={p.id || idx}
              style={{
                border: "1px solid rgba(82, 25, 115, 0.25)",
                borderRadius: 10,
                marginBottom: 10,
                padding: 10,
                background: idx === selectedIndex ? "rgba(230,214,255,0.75)" : "rgba(255,255,255,0.65)",
              }}
            >
              <button
                onClick={() => {
                  setSelectedIndex(idx);
                  setVisited({});
                  setEditingTitle(false);
                }}
                style={{ width: "100%", textAlign: "left", marginBottom: 6, border: "none", background: "transparent", padding: 0 }}
              >
                <strong>{p.title || "Trip Itinerary"}</strong>
                <div style={{ fontSize: 12, opacity: 0.7 }}>{p.created_at}</div>
              </button>
              <div style={{ display: "flex", gap: 8 }}>
                <button onClick={() => {
                  setSelectedIndex(idx);
                  setTitleDraft(p.title || "Trip Itinerary");
                  setEditingTitle(true);
                }}>
                  Edit
                </button>
                <button onClick={() => deletePlan(idx)}>Delete</button>
              </div>
            </div>
          ))}
        </div>

        <div style={{ flex: 1, ...cardStyle, padding: 18 }}>
          {!plan && <p>Select an itinerary from the left.</p>}

          {plan && (
            <>
              {!editingTitle ? (
                <h1 style={{ marginTop: 0 }}>{plan?.title || "Itinerary"}</h1>
              ) : (
                <div style={{ display: "flex", gap: 8, marginBottom: 12 }}>
                  <input
                    value={titleDraft}
                    onChange={(e) => setTitleDraft(e.target.value)}
                    placeholder="Itinerary title"
                    style={{ flex: 1 }}
                  />
                  <button onClick={saveTitle}>Save</button>
                  <button onClick={() => setEditingTitle(false)}>Cancel</button>
                </div>
              )}

              {itinerary.length === 0 && <p>No day plan available.</p>}

              {itinerary.map((day, dayIdx) => {
                const stops = normalizeStops(day);
                return (
                  <div
                    key={`day-${dayIdx}`}
                    style={{
                      marginBottom: 14,
                      padding: 12,
                      borderRadius: 12,
                      border: "1px solid rgba(82, 25, 115, 0.18)",
                      background: "rgba(255,255,255,0.55)",
                    }}
                  >
                    <h3 style={{ marginTop: 0, marginBottom: 10 }}>
                      {day?.title || `Day ${dayIdx + 1}`}
                    </h3>

                    {stops.length === 0 && <p style={{ marginTop: 0 }}>No stops for this day.</p>}

                    {stops.map((s, stopIdx) => {
                      const key = `${dayIdx}-${stopIdx}`;
                      const isEditing = editingStopKey === key;
                      return (
                        <div
                          key={key}
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: 8,
                            marginBottom: 8,
                            padding: "6px 8px",
                            borderRadius: 8,
                            background: "rgba(255,255,255,0.65)",
                          }}
                        >
                          <input
                            type="checkbox"
                            checked={!!visited[key]}
                            onChange={(e) =>
                              setVisited((prev) => ({ ...prev, [key]: e.target.checked }))
                            }
                          />

                          {!isEditing ? (
                            <div style={{ flex: 1 }}>
                              {s.name} {s.distance_km != null ? `(${s.distance_km} km)` : ""}
                            </div>
                          ) : (
                            <input
                              value={editingStopDraft}
                              onChange={(e) => setEditingStopDraft(e.target.value)}
                              style={{ flex: 1 }}
                            />
                          )}

                          {!isEditing ? (
                            <button
                              onClick={() => {
                                setEditingStopKey(key);
                                setEditingStopDraft(s.name || "");
                              }}
                            >
                              Edit
                            </button>
                          ) : (
                            <button onClick={() => saveStopEdit(dayIdx, stopIdx)}>Save</button>
                          )}

                          <button
                            onClick={() =>
                              !isEditing
                                ? deleteStop(dayIdx, stopIdx)
                                : setEditingStopKey("")
                            }
                          >
                            {!isEditing ? "Delete" : "Cancel"}
                          </button>
                        </div>
                      );
                    })}

                    <div style={{ display: "flex", gap: 8, marginTop: 10 }}>
                      <input
                        value={newStopByDay[dayIdx] || ""}
                        onChange={(e) =>
                          setNewStopByDay((prev) => ({ ...prev, [dayIdx]: e.target.value }))
                        }
                        placeholder="Add stop name"
                        style={{ flex: 1 }}
                      />
                      <button onClick={() => addStop(dayIdx)}>Add Stop</button>
                    </div>
                  </div>
                );
              })}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
