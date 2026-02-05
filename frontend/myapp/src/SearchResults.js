// SearchResults.js (portal overlay — paste over existing file)
import React, { useState, useEffect } from "react";
import ReactDOM from "react-dom";
import { useSearchParams, useNavigate } from "react-router-dom";
import { API_URL } from "./api";

const BACKEND_BASE = API_URL;

function ResultsContent({ q, onClose }) {
  const navigate = useNavigate();
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState(null);

  useEffect(() => {
    if (!q) { setResults([]); setErrorMsg(null); return; }

    let cancelled = false;
    (async () => {
      setLoading(true); setErrorMsg(null);
      try {
        const res = await fetch(`${BACKEND_BASE}/search?q=${encodeURIComponent(q)}`);
        const text = await res.text();
        if (!res.ok) {
          setErrorMsg(`Server error ${res.status}: ${res.statusText}`);
          console.warn("Raw response:", text);
          setLoading(false);
          return;
        }
        let data;
        try { data = text ? JSON.parse(text) : null; } catch (e) {
          setErrorMsg("Invalid JSON from server; check backend (see console).");
          console.error("Raw server response:", text);
          setLoading(false);
          return;
        }
        const items = Array.isArray(data) ? data : (data && Array.isArray(data.results) ? data.results : []);
        if (!cancelled) setResults(items);
      } catch (err) {
        if (!cancelled) setErrorMsg("Network error (see console).");
        console.error(err);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [q]);

  // Keep the overlay full-screen, scrollable content area
  return (
    <div
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        zIndex: 99999,
        background: "#fff",
        overflowY: "auto",
        padding: 24,
        boxSizing: "border-box"
      }}
      aria-modal="true"
      role="dialog"
    >
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
        <h1 style={{ margin: 0 }}>Results for “{q}”</h1>
        <div>
          <button onClick={() => { onClose(); navigate("/"); }} style={{ marginRight: 8 }}>Close</button>
          <button onClick={() => navigate(-1)}>Back</button>
        </div>
      </div>

      {loading && <p>Loading results…</p>}
      {errorMsg && <div style={{ padding: 12, background: "#fee", color: "#900", borderRadius: 6 }}>{errorMsg}</div>}

      {!loading && !errorMsg && results.length === 0 && <p>No results found.</p>}

      <div style={{ display: "grid", gap: 12 }}>
        {results.map((item) => (
          <article key={item._id ?? item.id ?? item.placeName}
                   style={{ padding: 16, background: "#fafafa", borderRadius: 8, boxShadow: "0 1px 3px rgba(0,0,0,0.06)" }}>
            <h3 style={{ marginTop: 0 }}>{item.placeName ?? item.name}</h3>
            {item.address && <p style={{ margin: "6px 0" }}>{item.address}</p>}
            {item.category && <p style={{ margin: "6px 0" }}><strong>Category:</strong> {item.category}</p>}
            {item.distance !== undefined && <p style={{ margin: "6px 0" }}><strong>Distance:</strong> {item.distance} km</p>}
          </article>
        ))}
      </div>
    </div>
  );
}

export default function SearchResults() {
  const [searchParams] = useSearchParams();
  const q = searchParams.get("q") || "";
  const [mounted, setMounted] = useState(false);

  // create a container element in document.body for the portal
  useEffect(() => {
    const el = document.createElement("div");
    el.id = "search-results-portal";
    document.body.appendChild(el);
    // lock background scroll while portal open
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    setMounted(true);
    return () => {
      document.body.style.overflow = prevOverflow;
      if (document.getElementById("search-results-portal")) {
        document.getElementById("search-results-portal").remove();
      }
      setMounted(false);
    };
  }, []);

  const onClose = () => {
    // navigate back handled inside ResultsContent via navigate(); but we provide hook to unmount if needed
    // This function exists if you want to trigger other cleanup
  };

  if (!mounted) return null;

  const portalRoot = document.getElementById("search-results-portal");
  return portalRoot ? ReactDOM.createPortal(<ResultsContent q={q} onClose={onClose} />, portalRoot) : null;
}
