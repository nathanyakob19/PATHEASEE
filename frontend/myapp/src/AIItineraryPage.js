import React, { useCallback, useEffect, useState } from "react";
import { apiPost } from "./api";

export default function AIItineraryPage() {
  const [language, setLanguage] = useState("en");
  const [destination, setDestination] = useState("");
  const [days, setDays] = useState(3);
  const [budget, setBudget] = useState("");
  const [travelType, setTravelType] = useState("leisure");
  const [interests, setInterests] = useState("");
  const [planResult, setPlanResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [cartPlaces, setCartPlaces] = useState([]);
  const [error, setError] = useState("");
  const [coords, setCoords] = useState(null);
  const [currency, setCurrency] = useState("INR");
  const [locationLabel, setLocationLabel] = useState("");

  useEffect(() => {
    try {
      const raw = localStorage.getItem("itinerary_from_cart");
      const cartRaw = localStorage.getItem("itinerary_cart");
      setCartPlaces(cartRaw ? JSON.parse(cartRaw) : []);
      if (raw) {
        const items = JSON.parse(raw);
        const names = items.map((i) => i.placeName).filter(Boolean);
        if (names.length > 0) setInterests(names.join(", "));
        localStorage.removeItem("itinerary_from_cart");
      }
    } catch {
      setCartPlaces([]);
    }
  }, []);

  useEffect(() => {
    if (!navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setCoords({ lat: pos.coords.latitude, lng: pos.coords.longitude });
      },
      () => {
        setCoords(null);
      }
    );
  }, []);

  const handleTripPlan = useCallback(async () => {
    const hasCart = cartPlaces.length > 0;
    const destinationValue = destination.trim() || (hasCart ? "Selected Places" : "");
    if (!destinationValue) {
      alert("Please enter a destination or add places to the cart.");
      return;
    }

    const latVal = coords?.lat;
    const lngVal = coords?.lng;
    if (Number.isNaN(latVal) || Number.isNaN(lngVal) || latVal == null || lngVal == null) {
      alert("Please allow location access to continue.");
      return;
    }

    setLoading(true);
    setError("");
    setPlanResult(null);

    try {
      const data = await apiPost("/ai/trip-planner", {
        destination: destinationValue,
        days: Number(days),
        budget,
        travel_type: travelType,
        interests: interests
          .split(",")
          .map((v) => v.trim())
          .filter(Boolean),
        language,
        currency,
        selected_places: cartPlaces.map((c) => c.placeName).filter(Boolean),
        lat: latVal,
        lng: lngVal,
        location_label: locationLabel.trim() || "Current Location",
      });

      setPlanResult(data);
    } catch (err) {
      console.error(err);
      setError(err.message || "Failed to generate itinerary");
    } finally {
      setLoading(false);
    }
  }, [
    budget,
    cartPlaces,
    coords,
    currency,
    days,
    destination,
    interests,
    language,
    locationLabel,
    travelType,
  ]);

  useEffect(() => {
    const onVoice = (e) => {
      const detail = e?.detail || {};
      if (!detail.type) return;
      if (detail.type === "set-destination") {
        setDestination(detail.value || "");
        return;
      }
      if (detail.type === "set-days") {
        const n = Number(detail.value);
        if (!Number.isNaN(n)) setDays(n);
        return;
      }
      if (detail.type === "set-budget") {
        setBudget(detail.value || "");
        return;
      }
      if (detail.type === "set-travel-type") {
        setTravelType(detail.value || "");
        return;
      }
      if (detail.type === "set-interests") {
        setInterests(detail.value || "");
        return;
      }
      if (detail.type === "set-currency") {
        setCurrency((detail.value || "").toUpperCase());
        return;
      }
      if (detail.type === "use-current-location") {
        setLocationLabel("Current Location");
        return;
      }
      if (detail.type === "generate-itinerary") {
        handleTripPlan();
      }
    };
    window.addEventListener("pathease:voice-command", onVoice);
    return () => window.removeEventListener("pathease:voice-command", onVoice);
  }, [coords, handleTripPlan]);

  function addToItineraryPage() {
    if (!planResult || !planResult.itinerary) return;

    const payload = {
      id: Date.now(),
      created_at: new Date().toLocaleString(),
      title: destination ? `Trip to ${destination}` : "Trip Itinerary",
      destination,
      itinerary: planResult.itinerary,
      notes: planResult.notes || "",
      meta: {
        source: planResult.source,
        start_from: planResult.start_from,
        total_distance_km: planResult.total_distance_km,
        cost_breakdown: planResult.cost_breakdown,
      },
    };

    try {
      const raw = localStorage.getItem("generated_itineraries");
      const existing = raw ? JSON.parse(raw) : [];
      localStorage.setItem(
        "generated_itineraries",
        JSON.stringify([payload, ...existing])
      );
      window.location.href = "/itinerary";
    } catch {
      window.location.href = "/itinerary";
    }
  }

  return (
    <div style={{ padding: 20, maxWidth: 900, margin: "0 auto" }}>
      <h1>AI Trip Planner</h1>

      <div style={{ marginBottom: 12 }}>
        <label style={{ fontWeight: 600, marginRight: 8 }}>Language</label>
        <select
          value={language}
          onChange={(e) => setLanguage(e.target.value)}
          style={{ padding: 6, borderRadius: 6, border: "1px solid #ccc" }}
        >
          <option value="en">English</option>
          <option value="hi">Hindi</option>
          <option value="mr">Marathi</option>
        </select>
        <label style={{ fontWeight: 600, marginLeft: 16, marginRight: 8 }}>
          Currency
        </label>
        <select
          value={currency}
          onChange={(e) => setCurrency(e.target.value)}
          style={{ padding: 6, borderRadius: 6, border: "1px solid #ccc" }}
        >
          <option value="INR">INR (Rs)</option>
          <option value="USD">USD ($)</option>
          <option value="EUR">EUR</option>
          <option value="GBP">GBP</option>
          <option value="AUD">AUD</option>
          <option value="CAD">CAD</option>
        </select>
      </div>

      <div style={{ display: "grid", gap: 10, gridTemplateColumns: "1fr 1fr" }}>
        <label style={{ fontWeight: 600 }}>
          Destination
          <input
            value={destination}
            onChange={(e) => setDestination(e.target.value)}
            placeholder="Destination (e.g., Mumbai)"
            style={{ display: "block", width: "100%", marginTop: 4 }}
          />
        </label>

        <label style={{ fontWeight: 600 }}>
          Days
          <input
            type="number"
            value={days}
            onChange={(e) => setDays(e.target.value)}
            style={{ display: "block", width: "100%", marginTop: 4 }}
          />
        </label>

        <label style={{ fontWeight: 600 }}>
          Budget
          <input
            value={budget}
            onChange={(e) => setBudget(e.target.value)}
            style={{ display: "block", width: "100%", marginTop: 4 }}
          />
        </label>

        <label style={{ fontWeight: 600 }}>
          Travel Type
          <input
            value={travelType}
            onChange={(e) => setTravelType(e.target.value)}
            style={{ display: "block", width: "100%", marginTop: 4 }}
          />
        </label>
      </div>

      <div style={{ marginTop: 10, display: "grid", gap: 10, gridTemplateColumns: "1fr" }}>
        <label style={{ fontWeight: 600 }}>
          Current Location Name
          <input
            value={locationLabel}
            onChange={(e) => setLocationLabel(e.target.value)}
            placeholder={coords ? "Current Location" : "Location access required"}
            style={{ display: "block", width: "100%", marginTop: 4 }}
          />
        </label>
      </div>
      <button
        onClick={() => {
          setLocationLabel("Current Location");
        }}
        style={{ marginTop: 8 }}
      >
        Use Current Location
      </button>

      <label style={{ fontWeight: 600, display: "block", marginTop: 10 }}>
        Interests
        <input
          value={interests}
          onChange={(e) => setInterests(e.target.value)}
          placeholder="Interests (comma separated)"
          style={{ display: "block", width: "100%", marginTop: 4 }}
        />
      </label>

      <button onClick={handleTripPlan} style={{ marginTop: 12 }}>
        {loading ? "Planning..." : "Generate Itinerary"}
      </button>

      {error && <div style={{ color: "red", marginTop: 10 }}>{error}</div>}

      {planResult?.itinerary && (
        <div style={{ marginTop: 14 }}>
          <div style={{ fontSize: 12 }}>Source: {planResult.source}</div>

          {planResult.start_from && (
            <div style={{ marginTop: 8, fontSize: 13 }}>
              Start from: {planResult.start_from.label}
            </div>
          )}
          {planResult.nearest_place && (
            <div style={{ fontSize: 13 }}>
              Nearest place: {planResult.nearest_place.placeName} ({planResult.nearest_place.distance_km} km)
            </div>
          )}
          {planResult.total_distance_km !== null && planResult.total_distance_km !== undefined && (
            <div style={{ fontSize: 13 }}>
              Total distance: {planResult.total_distance_km} km
            </div>
          )}
          {planResult.cost_breakdown && (
            <div style={{ marginTop: 8, fontSize: 13 }}>
              <strong>Cost split:</strong>{" "}
              {planResult.cost_breakdown.symbol} Stay {planResult.cost_breakdown.stay},
              {planResult.cost_breakdown.symbol} Food {planResult.cost_breakdown.food},
              {planResult.cost_breakdown.symbol} Transport {planResult.cost_breakdown.transport},
              {planResult.cost_breakdown.symbol} Tickets {planResult.cost_breakdown.tickets},
              {planResult.cost_breakdown.symbol} Misc {planResult.cost_breakdown.misc}
            </div>
          )}

          <button onClick={addToItineraryPage} style={{ marginTop: 8 }}>
            Add to Itinerary Page
          </button>

          {planResult.itinerary.map((d) => (
            <div key={d.day} style={{ marginTop: 10 }}>
              <strong>{d.title}</strong>
              <div>Morning: {d.morning}</div>
              <div>Afternoon: {d.afternoon}</div>
              <div>Evening: {d.evening}</div>
              <div>Tips: {d.tips}</div>
              <div>Estimated cost: {d.currency_symbol}{d.est_cost} {d.currency}</div>
              {d.day_distance_km !== null && d.day_distance_km !== undefined && (
                <div>Day distance: {d.day_distance_km} km</div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
