import React, { useEffect, useMemo, useState } from "react";
import { useAuth } from "./AuthContext";
import { apiGet } from "./api";
import {
  createItinerary,
  deleteItinerary,
  fetchUserItineraries,
  subscribeToTravelDataChanges,
  updateItinerary,
} from "./userTravelStore";

const cardStyle = {
  background: "rgba(255,255,255,0.35)",
  backdropFilter: "blur(10px)",
  WebkitBackdropFilter: "blur(10px)",
  border: "1px solid rgba(255,255,255,0.45)",
  borderRadius: 14,
  boxShadow: "0 8px 24px rgba(0,0,0,0.08)",
};

function normalizeStops(day) {
  const directStops = Array.isArray(day?.stops) ? day.stops : [];
  if (directStops.length > 0) {
    return directStops.filter((s) => s && s.name);
  }
  const fromSlots = [day?.morning, day?.afternoon, day?.evening]
    .filter(Boolean)
    .map((name) => ({ name }));
  return fromSlots;
}

function normalizePlans(plans) {
  return (Array.isArray(plans) ? plans : []).map((plan, pIdx) => {
    const itinerary = Array.isArray(plan?.itinerary) ? plan.itinerary : [];
    const normalizedItinerary = itinerary.map((day, dIdx) => ({
      ...day,
      title: day?.title || `Day ${dIdx + 1}`,
      stops: normalizeStops(day),
    }));
    return {
      ...plan,
      id: plan?.id || `plan-${Date.now()}-${pIdx}`,
      title: plan?.title || "Trip Itinerary",
      created_at: plan?.created_at || new Date().toLocaleString(),
      itinerary: normalizedItinerary,
    };
  });
}

export default function ItineraryPage() {
  const { user } = useAuth();
  const userEmail = (user?.email || localStorage.getItem("email") || "").trim().toLowerCase();
  const [savedPlans, setSavedPlans] = useState([]);
  const [loadingPlans, setLoadingPlans] = useState(true);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [visited, setVisited] = useState({});
  const [editingTitle, setEditingTitle] = useState(false);
  const [titleDraft, setTitleDraft] = useState("");
  const [newStopByDay, setNewStopByDay] = useState({});
  const [editingStopKey, setEditingStopKey] = useState("");
  const [editingStopDraft, setEditingStopDraft] = useState("");
  const [editingDayKey, setEditingDayKey] = useState("");
  const [editingDayDraft, setEditingDayDraft] = useState("");
  const [availablePlaces, setAvailablePlaces] = useState([]);

  useEffect(() => {
    let alive = true;
    const loadPlans = async (withLoader = false) => {
      if (withLoader && alive) setLoadingPlans(true);
      try {
        const plans = await fetchUserItineraries();
        if (alive) setSavedPlans(normalizePlans(plans));
      } catch {
        if (alive) setSavedPlans([]);
      } finally {
        if (withLoader && alive) setLoadingPlans(false);
      }
    };

    void loadPlans(true);
    const unsubscribe = subscribeToTravelDataChanges(() => {
      void loadPlans(false);
    }, { types: ["itinerary"] });

    return () => {
      alive = false;
      unsubscribe();
    };
  }, [userEmail]);

  useEffect(() => {
    apiGet("/get-approved-places")
      .then((list) => setAvailablePlaces(Array.isArray(list) ? list : []))
      .catch(() => setAvailablePlaces([]));
  }, []);

  const plan = savedPlans[selectedIndex] || null;
  const itinerary = useMemo(() => plan?.itinerary || [], [plan]);

  const updatePlans = (next) => {
    setSavedPlans(next);
  };

  const createCustomItinerary = async () => {
    const nextPlan = {
      id: `plan-${Date.now()}`,
      title: "My Custom Itinerary",
      created_at: new Date().toLocaleString(),
      itinerary: [
        {
          title: "Day 1",
          stops: [],
        },
      ],
    };
    try {
      const created = await createItinerary(nextPlan);
      const normalizedPlan = normalizePlans([created])[0];
      const next = [normalizedPlan, ...savedPlans];
      updatePlans(next);
      setSelectedIndex(0);
      setVisited({});
      setEditingTitle(true);
      setTitleDraft(normalizedPlan.title);
    } catch (err) {
      alert(err.message || "Failed to create itinerary.");
    }
  };

  const deletePlanAt = async (idx) => {
    const target = savedPlans[idx];
    if (!target) return;
    try {
      const next = normalizePlans(await deleteItinerary(target.id));
      updatePlans(next);
      setSelectedIndex((prev) => {
        if (next.length === 0) return 0;
        return Math.max(0, Math.min(prev, next.length - 1));
      });
      setVisited({});
    } catch (err) {
      alert(err.message || "Failed to delete itinerary.");
    }
  };

  const persistPlan = async (planDraft) => {
    const normalizedPlan = normalizePlans([planDraft])[0];
    try {
      const saved = await updateItinerary(normalizedPlan);
      return normalizePlans([saved])[0];
    } catch (err) {
      alert(err.message || "Failed to save itinerary.");
      return null;
    }
  };

  const saveTitle = async () => {
    const txt = titleDraft.trim();
    if (!txt) return;
    if (!plan) return;
    const draft = { ...plan };
    draft.title = txt;
    const saved = await persistPlan(draft);
    if (!saved) return;
    updatePlans(savedPlans.map((p, idx) => (idx === selectedIndex ? saved : p)));
    setVisited({});
    setEditingTitle(false);
  };

  const addStop = async (dayIdx, selectedPlace = null) => {
    const draft = (selectedPlace?.placeName || newStopByDay[dayIdx] || "").trim();
    if (!draft) return;
    if (!plan) return;
    const nextItinerary = Array.isArray(plan.itinerary) ? [...plan.itinerary] : [];
    const day = { ...(nextItinerary[dayIdx] || {}) };
    const stops = Array.isArray(day.stops) ? [...day.stops] : [];
    if (selectedPlace?.location?.lat != null && selectedPlace?.location?.lng != null) {
      stops.push({
        name: draft,
        lat: selectedPlace.location.lat,
        lng: selectedPlace.location.lng,
      });
    } else {
      stops.push({ name: draft });
    }
    day.stops = stops;
    nextItinerary[dayIdx] = day;
    const saved = await persistPlan({ ...plan, itinerary: nextItinerary });
    if (!saved) return;
    updatePlans(savedPlans.map((p, idx) => (idx === selectedIndex ? saved : p)));
    setNewStopByDay((prev) => ({ ...prev, [dayIdx]: "" }));
  };

  const deleteStop = async (dayIdx, stopIdx) => {
    if (!plan) return;
    const nextItinerary = Array.isArray(plan.itinerary) ? [...plan.itinerary] : [];
    const day = { ...(nextItinerary[dayIdx] || {}) };
    const stops = Array.isArray(day.stops) ? [...day.stops] : [];
    stops.splice(stopIdx, 1);
    day.stops = stops;
    nextItinerary[dayIdx] = day;
    const saved = await persistPlan({ ...plan, itinerary: nextItinerary });
    if (!saved) return;
    updatePlans(savedPlans.map((p, idx) => (idx === selectedIndex ? saved : p)));
    setVisited((prev) => {
      const out = { ...prev };
      delete out[`${dayIdx}-${stopIdx}`];
      return out;
    });
  };

  const saveStopEdit = async (dayIdx, stopIdx) => {
    const txt = editingStopDraft.trim();
    if (!txt) return;
    if (!plan) return;
    const nextItinerary = Array.isArray(plan.itinerary) ? [...plan.itinerary] : [];
    const day = { ...(nextItinerary[dayIdx] || {}) };
    const stops = Array.isArray(day.stops) ? [...day.stops] : [];
    const curr = { ...(stops[stopIdx] || {}) };
    curr.name = txt;
    stops[stopIdx] = curr;
    day.stops = stops;
    nextItinerary[dayIdx] = day;
    const saved = await persistPlan({ ...plan, itinerary: nextItinerary });
    if (!saved) return;
    updatePlans(savedPlans.map((p, idx) => (idx === selectedIndex ? saved : p)));
    setEditingStopKey("");
    setEditingStopDraft("");
  };

  const addDay = async () => {
    if (!plan) return;
    const nextItinerary = Array.isArray(plan.itinerary) ? [...plan.itinerary] : [];
    nextItinerary.push({
      title: `Day ${nextItinerary.length + 1}`,
      stops: [],
    });
    const saved = await persistPlan({ ...plan, itinerary: nextItinerary });
    if (!saved) return;
    updatePlans(savedPlans.map((p, idx) => (idx === selectedIndex ? saved : p)));
  };

  const deleteDay = async (dayIdx) => {
    if (!window.confirm("Delete this day from itinerary?")) return;
    if (!plan) return;
    const nextItinerary = Array.isArray(plan.itinerary) ? [...plan.itinerary] : [];
    nextItinerary.splice(dayIdx, 1);
    const saved = await persistPlan({
      ...plan,
      itinerary: nextItinerary.map((d, i) => ({
        ...d,
        title: d.title || `Day ${i + 1}`,
      })),
    });
    if (!saved) return;
    updatePlans(savedPlans.map((p, idx) => (idx === selectedIndex ? saved : p)));
  };

  const saveDayTitle = async (dayIdx) => {
    const txt = editingDayDraft.trim();
    if (!txt) return;
    if (!plan) return;
    const nextItinerary = Array.isArray(plan.itinerary) ? [...plan.itinerary] : [];
    const day = { ...(nextItinerary[dayIdx] || {}) };
    day.title = txt;
    nextItinerary[dayIdx] = day;
    const saved = await persistPlan({ ...plan, itinerary: nextItinerary });
    if (!saved) return;
    updatePlans(savedPlans.map((p, idx) => (idx === selectedIndex ? saved : p)));
    setEditingDayKey("");
    setEditingDayDraft("");
  };

  const getPlaceSuggestions = (dayIdx) => {
    const q = (newStopByDay[dayIdx] || "").trim().toLowerCase();
    if (!q) return [];
    return availablePlaces
      .filter((p) => (p.placeName || "").toLowerCase().includes(q))
      .slice(0, 6);
  };

  return (
    <div style={{ padding: 20 }}>
      <div style={{ display: "flex", gap: 16, alignItems: "flex-start" }}>
        <div style={{ width: 340, ...cardStyle, padding: 14 }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8 }}>
            <h2 style={{ marginTop: 0, marginBottom: 8 }}>Itineraries</h2>
            <button onClick={createCustomItinerary}>+ New</button>
          </div>
          {loadingPlans && <p>Loading itineraries...</p>}
          {!loadingPlans && savedPlans.length === 0 && <p>No saved itineraries.</p>}

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
                <button onClick={() => deletePlanAt(idx)}>Delete</button>
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

              <div style={{ marginBottom: 10 }}>
                <button onClick={addDay}>Add Day</button>
              </div>

              {itinerary.map((day, dayIdx) => {
                const stops = normalizeStops(day);
                const dayEditKey = `day-${dayIdx}`;
                const isEditingDay = editingDayKey === dayEditKey;
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
                    <div style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 10 }}>
                      {!isEditingDay ? (
                        <h3 style={{ margin: 0, flex: 1 }}>
                          {day?.title || `Day ${dayIdx + 1}`}
                        </h3>
                      ) : (
                        <input
                          value={editingDayDraft}
                          onChange={(e) => setEditingDayDraft(e.target.value)}
                          style={{ flex: 1 }}
                        />
                      )}
                      {!isEditingDay ? (
                        <button
                          onClick={() => {
                            setEditingDayKey(dayEditKey);
                            setEditingDayDraft(day?.title || `Day ${dayIdx + 1}`);
                          }}
                        >
                          Edit Day
                        </button>
                      ) : (
                        <button onClick={() => saveDayTitle(dayIdx)}>Save</button>
                      )}
                      <button
                        onClick={() =>
                          !isEditingDay ? deleteDay(dayIdx) : setEditingDayKey("")
                        }
                      >
                        {!isEditingDay ? "Delete Day" : "Cancel"}
                      </button>
                    </div>

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
                    {getPlaceSuggestions(dayIdx).length > 0 && (
                      <div
                        style={{
                          marginTop: 6,
                          border: "1px solid #ddd",
                          borderRadius: 8,
                          background: "#fff",
                          maxHeight: 180,
                          overflowY: "auto",
                        }}
                      >
                        {getPlaceSuggestions(dayIdx).map((pl) => (
                          <button
                            key={`s-${dayIdx}-${pl._id || pl.placeName}`}
                            onClick={() => addStop(dayIdx, pl)}
                            style={{
                              width: "100%",
                              textAlign: "left",
                              padding: "8px 10px",
                              border: "none",
                              borderBottom: "1px solid #eee",
                              background: "#fff",
                            }}
                          >
                            {pl.placeName}
                          </button>
                        ))}
                      </div>
                    )}
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
