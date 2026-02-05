import React, { useCallback, useEffect, useState } from "react";
import { apiPost } from "./api";
import "./GuardianStyles.css";

export default function GuardianRequestPage() {
  const myEmail = localStorage.getItem("email");

  const [targetEmail, setTargetEmail] = useState("");
  const [incoming, setIncoming] = useState([]);
  const [connections, setConnections] = useState([]);
  const [loading, setLoading] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const reqs = await apiPost("/get-incoming-requests", { email: myEmail });
      const conns = await apiPost("/get-my-connections", { email: myEmail });
      setIncoming(reqs || []);
      setConnections(conns || []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, [myEmail]);

  useEffect(() => {
    if (!myEmail) return alert("Email missing in localStorage");
    load();
  }, [load, myEmail]);

  const send = async () => {
    if (!targetEmail) return alert("Please enter an email");
    const res = await apiPost("/send-tracking-request", {
      requester: myEmail,
      target: targetEmail
    });
    alert(res.message || res.error);
    setTargetEmail("");
    load();
  };

  const respond = async (id, status) => {
    const res = await apiPost("/respond-tracking-request", {
      request_id: id,
      status
    });
    alert(res.message || res.error);
    load();
  };

  const removeConnection = async (partnerEmail) => {
    if (!window.confirm(`Stop tracking with ${partnerEmail}?`)) return;
    const res = await apiPost("/stop-tracking", {
      requester: myEmail,
      target: partnerEmail
    });
    alert(res.message || res.error);
    load();
  };

  return (
    <div className="guardian-container">
      <h2 className="guardian-header">Guardian Requests</h2>

      {/* SEND REQUEST */}
      <div className="guardian-section">
        <h3 className="section-title">Add New Partner</h3>
        <div className="input-group">
          <input
            className="guardian-input"
            placeholder="Partner Email"
            value={targetEmail}
            onChange={e => setTargetEmail(e.target.value.toLowerCase())}
            aria-label="Partner Email Address"
          />
          <button className="btn btn-primary" onClick={send} disabled={loading}>
            {loading ? "Sending..." : "Send Request"}
          </button>
        </div>
      </div>

      {/* INCOMING REQUESTS */}
      <div className="guardian-section">
        <h3 className="section-title">Incoming Requests ({incoming.length})</h3>
        {incoming.length === 0 ? (
          <p className="empty-state">No pending requests.</p>
        ) : (
          incoming.map(r => (
            <div key={r._id} className="request-card">
              <span className="request-info">
                <strong>{r.requester}</strong> wants to connect.
              </span>
              <div className="action-buttons">
                <button 
                  className="btn btn-success" 
                  onClick={() => respond(r._id, "accepted")}
                  aria-label={`Accept ${r.requester}`}
                >
                  Accept
                </button>
                <button 
                  className="btn btn-danger" 
                  onClick={() => respond(r._id, "rejected")}
                  aria-label={`Reject ${r.requester}`}
                >
                  Reject
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {/* CONNECTIONS */}
      <div className="guardian-section">
        <h3 className="section-title">My Connections ({connections.length})</h3>
        {connections.length === 0 ? (
          <p className="empty-state">No active connections.</p>
        ) : (
          connections.map(c => (
            <div key={c.id} className="request-card">
              <span className="request-info">{c.email}</span>
              <button 
                className="btn btn-secondary" 
                onClick={() => removeConnection(c.email)}
                aria-label={`Remove connection with ${c.email}`}
              >
                Remove
              </button>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
