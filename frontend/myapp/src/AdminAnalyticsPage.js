import React, { useEffect, useState } from "react";
import { apiGet } from "./api";

export default function AdminAnalyticsPage() {
  const [stats, setStats] = useState(null);

  useEffect(() => {
    apiGet("/admin/analytics").then(setStats);
  }, []);

  return (
    <div style={{ padding: 20 }}>
      <h1>Analytics</h1>
      {!stats && <p>Loading...</p>}
      {stats && (
        <>
          <div style={{ display: "grid", gap: 10, gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))" }}>
            <div style={{ border: "1px solid #ddd", padding: 10, borderRadius: 8 }}>Users: {stats.users}</div>
            <div style={{ border: "1px solid #ddd", padding: 10, borderRadius: 8 }}>Approved Places: {stats.approved_places}</div>
            <div style={{ border: "1px solid #ddd", padding: 10, borderRadius: 8 }}>Pending Places: {stats.pending_places}</div>
            <div style={{ border: "1px solid #ddd", padding: 10, borderRadius: 8 }}>Places with Reviews: {stats.places_with_reviews}</div>
          </div>

          <div style={{ marginTop: 20 }}>
            <h3>Summary Graph</h3>
            {[
              { label: "Users", value: stats.users },
              { label: "Approved", value: stats.approved_places },
              { label: "Pending", value: stats.pending_places },
              { label: "Reviews", value: stats.places_with_reviews },
            ].map((item) => {
              const max = Math.max(
                stats.users,
                stats.approved_places,
                stats.pending_places,
                stats.places_with_reviews
              ) || 1;
              const width = Math.round((item.value / max) * 100);
              return (
                <div key={item.label} style={{ marginBottom: 10 }}>
                  <div style={{ fontSize: 12, marginBottom: 4 }}>{item.label}: {item.value}</div>
                  <div style={{ background: "#f3f3f3", borderRadius: 8, overflow: "hidden" }}>
                    <div
                      style={{
                        width: `${width}%`,
                        height: 14,
                        background: "#7b2cbf",
                      }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}
