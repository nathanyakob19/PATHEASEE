import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { MapContainer, TileLayer, Marker, Polyline, Popup } from "react-leaflet";
import "leaflet/dist/leaflet.css";

function distanceKm(a, b) {
  if (!a || !b) return null;
  const toRad = (v) => (v * Math.PI) / 180;
  const R = 6371;
  const dLat = toRad(b.lat - a.lat);
  const dLon = toRad(b.lng - a.lng);
  const s =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(a.lat)) *
      Math.cos(toRad(b.lat)) *
      Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(s), Math.sqrt(1 - s));
}

export default function ItineraryPage() {
  const [savedPlans, setSavedPlans] = useState([]);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [currentLocation, setCurrentLocation] = useState(null);
  const [watchId, setWatchId] = useState(null);
  const [navStarted, setNavStarted] = useState(false);
  const [navPaused, setNavPaused] = useState(false);
  const [dayIndex, setDayIndex] = useState(0);
  const [stopIndex, setStopIndex] = useState(0);
  const [visited, setVisited] = useState({});
  const [speechOn, setSpeechOn] = useState(false);
  const promptedRef = useRef({});

  useEffect(() => {
    try {
      const raw = localStorage.getItem("generated_itineraries");
      setSavedPlans(raw ? JSON.parse(raw) : []);
    } catch {
      setSavedPlans([]);
    }
  }, []);

  const plan = savedPlans[selectedIndex] || null;
  const itinerary = useMemo(() => plan?.itinerary || [], [plan]);

  const currentDay = itinerary[dayIndex] || null;
  const currentStops = (currentDay?.stops || []).filter((s) => s && s.name);
  const currentStop = currentStops[stopIndex] || null;

  const currentTarget = useMemo(() => {
    if (!currentStop || currentStop.lat == null || currentStop.lng == null) return null;
    return { lat: Number(currentStop.lat), lng: Number(currentStop.lng) };
  }, [currentStop]);

  const polyline = useMemo(() => {
    if (!currentLocation || !currentTarget) return [];
    return [
      [currentLocation.lat, currentLocation.lng],
      [currentTarget.lat, currentTarget.lng],
    ];
  }, [currentLocation, currentTarget]);

  function startNavigation() {
    if (!navigator.geolocation) {
      alert("Geolocation not supported.");
      return;
    }
    if (watchId) return;

    const id = navigator.geolocation.watchPosition(
      (pos) => {
        setCurrentLocation({
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
        });
      },
      () => {
        alert("Unable to access location.");
      },
      { enableHighAccuracy: true, maximumAge: 3000, timeout: 10000 }
    );
    setWatchId(id);
    setNavStarted(true);
    setNavPaused(false);
  }

  function stopNavigation() {
    if (watchId) {
      navigator.geolocation.clearWatch(watchId);
      setWatchId(null);
    }
    setNavStarted(false);
    setNavPaused(false);
  }

  const speak = useCallback((text) => {
    if (!speechOn || !text || !window.speechSynthesis) return;
    const u = new SpeechSynthesisUtterance(text);
    u.lang = "en-IN";
    window.speechSynthesis.speak(u);
  }, [speechOn]);

  function markVisited(day, idx) {
    setVisited((prev) => ({ ...prev, [`${day}-${idx}`]: true }));
  }

  useEffect(() => {
    if (!navStarted || navPaused || !currentLocation || !currentTarget) return;

    const distKm = distanceKm(currentLocation, currentTarget);
    const distMeters = distKm != null ? distKm * 1000 : null;
    const key = `${dayIndex}-${stopIndex}`;

    if (distMeters != null && distMeters <= 120 && !visited[key]) {
      markVisited(dayIndex, stopIndex);
      if (!promptedRef.current[key]) {
        promptedRef.current[key] = true;
        speak(`You have reached ${currentStop?.name}.`);
        const cont = window.confirm("Reached this place. Continue to next place?");
        if (cont) {
          if (stopIndex + 1 < currentStops.length) {
            setStopIndex(stopIndex + 1);
            speak(`Next place: ${currentStops[stopIndex + 1]?.name}.`);
          } else {
            const nextDay = dayIndex + 1;
            if (nextDay < itinerary.length) {
              const shift = window.confirm("Day completed. Move to next day?");
              if (shift) {
                setDayIndex(nextDay);
                setStopIndex(0);
                speak(`Starting day ${nextDay + 1}.`);
              } else {
                setNavPaused(true);
              }
            } else {
              alert("Successfully finished the itinerary.");
              setNavPaused(true);
            }
          }
        } else {
          setNavPaused(true);
        }
      }
    }
  }, [navStarted, navPaused, currentLocation, currentTarget, stopIndex, dayIndex, currentStops, currentStop, itinerary, visited, speak]);

  useEffect(() => {
    if (currentStop?.name && navStarted && !navPaused) {
      speak(`Navigate to ${currentStop.name}`);
    }
  }, [currentStop?.name, navStarted, navPaused, speak]);

  return (
    <div style={{ padding: 20 }}>
      <div style={{ display: "flex", gap: 16, alignItems: "flex-start" }}>
        {/* Sidebar list */}
        <div style={{ width: 320 }}>
          <h2>Itineraries</h2>
          {savedPlans.length === 0 && <p>No saved itineraries.</p>}
          {savedPlans.map((p, idx) => (
            <button
              key={p.id || idx}
              onClick={() => {
                setSelectedIndex(idx);
                setDayIndex(0);
                setStopIndex(0);
                setVisited({});
              }}
              style={{
                display: "block",
                width: "100%",
                textAlign: "left",
                padding: 10,
                borderRadius: 8,
                border: "1px solid #ddd",
                marginBottom: 8,
                background: idx === selectedIndex ? "#e6d6ff" : "#fff",
                cursor: "pointer",
              }}
            >
              <strong>{p.title || "Trip Itinerary"}</strong>
              <div style={{ fontSize: 12, opacity: 0.7 }}>{p.created_at}</div>
            </button>
          ))}
        </div>

        {/* Main content */}
        <div style={{ flex: 1 }}>
          <h1>{plan?.title || "Itinerary"}</h1>
          {!plan && <p>Select an itinerary from the left.</p>}

          {plan && (
            <>
              <div style={{ display: "flex", gap: 12, flexWrap: "wrap", marginBottom: 12 }}>
                <button onClick={startNavigation} style={{ padding: "6px 10px" }}>
                  Start Navigation
                </button>
                <button onClick={() => setNavPaused(false)} style={{ padding: "6px 10px" }}>
                  Resume
                </button>
                <button onClick={stopNavigation} style={{ padding: "6px 10px" }}>
                  Stop
                </button>
                <label style={{ display: "flex", alignItems: "center", gap: 6 }}>
                  <input
                    type="checkbox"
                    checked={speechOn}
                    onChange={(e) => setSpeechOn(e.target.checked)}
                  />
                  Speech
                </label>
              </div>

              <div style={{ height: 360, marginBottom: 12 }}>
                <MapContainer
                  center={currentLocation ? [currentLocation.lat, currentLocation.lng] : [20.59, 78.96]}
                  zoom={13}
                  style={{ width: "100%", height: "100%" }}
                >
                  <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
                  {currentLocation && (
                    <Marker position={[currentLocation.lat, currentLocation.lng]}>
                      <Popup>You are here</Popup>
                    </Marker>
                  )}
                  {currentTarget && (
                    <Marker position={[currentTarget.lat, currentTarget.lng]}>
                      <Popup>Next stop</Popup>
                    </Marker>
                  )}
                  {polyline.length === 2 && <Polyline positions={polyline} color="#360146" />}
                </MapContainer>
              </div>

              {currentStop && currentTarget && (
                <div style={{ marginBottom: 12 }}>
                  <strong>Next stop:</strong> {currentStop.name}
                  <div>
                    <a
                      href={`https://www.google.com/maps/dir/?api=1&origin=${currentLocation?.lat || ""},${currentLocation?.lng || ""}&destination=${currentTarget.lat},${currentTarget.lng}&travelmode=walking`}
                      target="_blank"
                      rel="noreferrer"
                    >
                      Open turn-by-turn in Google Maps
                    </a>
                  </div>
                </div>
              )}

              {/* Day checklist */}
              <div>
                <h3>Day {dayIndex + 1} Checklist</h3>
                {currentStops.length === 0 && <p>No stops for this day.</p>}
                {currentStops.map((s, idx) => (
                  <div key={`${dayIndex}-${idx}`} style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <input
                      type="checkbox"
                      checked={!!visited[`${dayIndex}-${idx}`]}
                      onChange={() => markVisited(dayIndex, idx)}
                    />
                    <div>
                      {s.name} {s.distance_km != null ? `(${s.distance_km} km)` : ""}
                    </div>
                    <button
                      onClick={() => {
                        setStopIndex(idx);
                        if (speechOn) speak(`Navigate to ${s.name}`);
                      }}
                      style={{ padding: "4px 8px" }}
                    >
                      Navigate
                    </button>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
