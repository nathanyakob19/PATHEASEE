import { apiPost } from "./api";

export const TRAVEL_DATA_CHANGED_EVENT = "pathease:travel-data-changed";

function getCurrentUserEmail() {
  return (localStorage.getItem("email") || "").trim().toLowerCase();
}

function requireUserEmail() {
  const email = getCurrentUserEmail();
  if (!email) {
    throw new Error("Please login to continue.");
  }
  return email;
}

function emitTravelDataChanged(detail = {}) {
  window.dispatchEvent(
    new CustomEvent(TRAVEL_DATA_CHANGED_EVENT, {
      detail: {
        email: getCurrentUserEmail(),
        ...detail,
      },
    })
  );
}

export function subscribeToTravelDataChanges(callback, options = {}) {
  if (typeof callback !== "function") {
    return () => {};
  }

  const allowedTypes = Array.isArray(options.types)
    ? new Set(options.types.filter(Boolean))
    : null;

  const handler = (event) => {
    const detail = event?.detail || {};
    const eventEmail = String(detail.email || "").trim().toLowerCase();
    const currentEmail = getCurrentUserEmail();

    if (currentEmail && eventEmail && eventEmail !== currentEmail) {
      return;
    }
    if (allowedTypes && !allowedTypes.has(detail.type)) {
      return;
    }

    callback(detail);
  };

  window.addEventListener(TRAVEL_DATA_CHANGED_EVENT, handler);
  return () => window.removeEventListener(TRAVEL_DATA_CHANGED_EVENT, handler);
}

export async function fetchUserCart() {
  const email = requireUserEmail();
  const data = await apiPost("/user/cart", { email });
  return Array.isArray(data?.items) ? data.items : [];
}

export async function addCartItem(item) {
  const email = requireUserEmail();
  const data = await apiPost("/user/cart/add", { email, item });
  emitTravelDataChanged({ type: "cart" });
  return Array.isArray(data?.items) ? data.items : [];
}

export async function removeCartItem(item) {
  const email = requireUserEmail();
  const data = await apiPost("/user/cart/remove", {
    email,
    item_id: item?._id,
    placeName: item?.placeName,
  });
  emitTravelDataChanged({ type: "cart" });
  return Array.isArray(data?.items) ? data.items : [];
}

export async function clearCart() {
  const email = requireUserEmail();
  const data = await apiPost("/user/cart/clear", { email });
  emitTravelDataChanged({ type: "cart" });
  return Array.isArray(data?.items) ? data.items : [];
}

export async function fetchUserItineraries() {
  const email = requireUserEmail();
  const data = await apiPost("/user/itineraries", { email });
  return Array.isArray(data?.items) ? data.items : [];
}

export async function createItinerary(plan) {
  const email = requireUserEmail();
  const data = await apiPost("/user/itineraries/create", { email, plan });
  emitTravelDataChanged({ type: "itinerary" });
  return data?.item || null;
}

export async function updateItinerary(plan) {
  const email = requireUserEmail();
  const data = await apiPost("/user/itineraries/update", { email, plan });
  emitTravelDataChanged({ type: "itinerary" });
  return data?.item || null;
}

export async function deleteItinerary(itineraryId) {
  const email = requireUserEmail();
  const data = await apiPost("/user/itineraries/delete", {
    email,
    itinerary_id: itineraryId,
  });
  emitTravelDataChanged({ type: "itinerary" });
  return Array.isArray(data?.items) ? data.items : [];
}
