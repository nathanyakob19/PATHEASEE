const host = typeof window !== "undefined" ? window.location.hostname : "";
export const API_URL =
  process.env.REACT_APP_API_URL ||
  (host.endsWith("netlify.app") ? "/api" : "http://localhost:5000");


/* ---------- GET ---------- */
export async function apiGet(path) {
  const res = await fetch(API_URL + path);
  if (!res.ok) {
    const text = await res.text();
    throw new Error(text || "Request failed");
  }
  return res.json();
}

/* ---------- POST ---------- */
export async function apiPost(path, data) {
  const res = await fetch(API_URL + path, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(data),
  });

  const contentType = res.headers.get("content-type") || "";
  let json;
  if (contentType.includes("application/json")) {
    json = await res.json();
  } else {
    const text = await res.text();
    const msg = `Non-JSON response (${res.status}).`;
    throw new Error(text ? `${msg} ${text.slice(0, 200)}` : msg);
  }

  if (!res.ok) {
    console.error("API POST ERROR:", json);
    throw new Error(json.error || json.details || "Request failed");
  }

  return json;
}

/* ---------- PUT ---------- */
export async function apiPut(path, data) {
  const res = await fetch(API_URL + path, {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(data),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(text || "Request failed");
  }
  return res.json();
}

/* ---------- DELETE ---------- */
export async function apiDelete(path) {
  const res = await fetch(API_URL + path, {
    method: "DELETE",
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(text || "Request failed");
  }
  return res.json();
}
