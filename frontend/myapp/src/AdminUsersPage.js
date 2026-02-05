import React, { useEffect, useState } from "react";
import { apiGet, apiPost } from "./api";

export default function AdminUsersPage() {
  const [users, setUsers] = useState([]);
  const [selected, setSelected] = useState(null);
  const [detail, setDetail] = useState(null);
  const [editName, setEditName] = useState("");
  const [editRole, setEditRole] = useState("user");
  useEffect(() => {
    apiGet("/admin/users").then(setUsers);
  }, []);

  const openUser = async (u) => {
    setSelected(u);
    const d = await apiGet(`/admin/user/${u._id}`);
    setDetail(d);
    setEditName(d.name || "");
    setEditRole(d.role || "user");
  };

  const refreshUsers = async () => {
    const list = await apiGet("/admin/users");
    setUsers(list);
  };

  const blockToggle = async (u) => {
    await apiPost("/admin/user/block", { user_id: u._id, blocked: !u.blocked });
    refreshUsers();
    if (selected?._id === u._id) {
      openUser(u);
    }
  };

  const deleteUser = async (u) => {
    if (!window.confirm("Delete this user permanently?")) return;
    await apiPost("/admin/user/delete", { user_id: u._id });
    setSelected(null);
    setDetail(null);
    refreshUsers();
  };

  const saveUser = async () => {
    if (!selected) return;
    await apiPost("/admin/user/update", {
      user_id: selected._id,
      name: editName,
      role: editRole,
      blocked: selected.blocked,
    });
    refreshUsers();
    openUser(selected);
  };

  return (
    <div style={{ padding: 20 }}>
      <h1>Users</h1>
      <div style={{ display: "grid", gridTemplateColumns: "1.2fr 1fr", gap: 20 }}>
        <div>
          {users.map((u) => (
            <div
              key={u._id}
              onClick={() => openUser(u)}
              style={{
                border: "1px solid #ddd",
                padding: 10,
                borderRadius: 8,
                marginBottom: 8,
                background: selected?._id === u._id ? "#f7f2ff" : "#fff",
                cursor: "pointer",
              }}
            >
              <div style={{ display: "flex", gap: 10, alignItems: "center", justifyContent: "space-between" }}>
                <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
                  {u.avatar ? (
                    <img src={u.avatar} alt="avatar" style={{ width: 36, height: 36, borderRadius: "50%" }} />
                  ) : (
                    <div style={{ width: 36, height: 36, borderRadius: "50%", background: "#e6d6ff" }} />
                  )}
                  <div>
                    <div style={{ fontWeight: 700 }}>{u.name || "No Name"}</div>
                    <div style={{ fontSize: 12 }}>{u.email}</div>
                    <div style={{ fontSize: 12 }}>Role: {u.role}</div>
                  </div>
                </div>
                <div style={{ display: "flex", gap: 6 }}>
                  <button onClick={(e) => { e.stopPropagation(); blockToggle(u); }}>
                    {u.blocked ? "Unblock" : "Block"}
                  </button>
                  <button onClick={(e) => { e.stopPropagation(); deleteUser(u); }}>
                    Delete
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>

        <div>
          {!detail && <div style={{ border: "1px dashed #ccc", padding: 16, borderRadius: 10 }}>Select a user to view details.</div>}
          {detail && (
            <div style={{ border: "1px solid #ddd", borderRadius: 10, padding: 16, background: "#fff" }}>
              <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
                {detail.avatar ? (
                  <img src={detail.avatar} alt="avatar" style={{ width: 60, height: 60, borderRadius: "50%" }} />
                ) : (
                  <div style={{ width: 60, height: 60, borderRadius: "50%", background: "#e6d6ff" }} />
                )}
                <div>
                  <div style={{ fontWeight: 800, fontSize: 18 }}>{detail.name || "No Name"}</div>
                  <div style={{ fontSize: 12 }}>{detail.email}</div>
                  <div style={{ fontSize: 12 }}>Role: {detail.role}</div>
                  <div style={{ fontSize: 12 }}>Status: {detail.blocked ? "Blocked" : "Active"}</div>
                </div>
              </div>

              <div style={{ marginTop: 12 }}>
                <label>
                  Name
                  <input value={editName} onChange={(e) => setEditName(e.target.value)} />
                </label>
                <label style={{ display: "block", marginTop: 8 }}>
                  Role
                  <select value={editRole} onChange={(e) => setEditRole(e.target.value)}>
                    <option value="user">user</option>
                    <option value="admin">admin</option>
                  </select>
                </label>
                <button onClick={saveUser} style={{ marginTop: 8 }}>Save Changes</button>
              </div>

              <div style={{ marginTop: 16 }}>
                <h3 style={{ marginBottom: 6 }}>User Analytics</h3>
                <div style={{ display: "grid", gap: 8, gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))" }}>
                  <div style={{ border: "1px solid #eee", padding: 8, borderRadius: 8 }}>
                    Reviews: {detail.analytics?.reviews || 0}
                  </div>
                  <div style={{ border: "1px solid #eee", padding: 8, borderRadius: 8 }}>
                    Submitted Places: {detail.analytics?.submitted_places || 0}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
