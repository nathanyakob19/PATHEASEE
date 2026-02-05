import React, { useEffect, useState } from "react";
import {
  BrowserRouter as Router,
  Routes,
  Route,
  useLocation,
  useNavigate,
} from "react-router-dom";

import AdminRoute from "./AdminRoute";
import Signup from "./Signup";
import Login from "./Login";
import SnapMapScreen from "./SnapMapScreen";
import AdminPlaces from "./AdminPlaces";
import AccessibilityForm from "./Accessiblityform";
import App from "./App";
import SearchResults from "./SearchResults";
import LiquidEther from "./LiquidEther";
import PillNav from "./PillNav";
import CityScroller from "./CityScroller";
import AIChatPage from "./AIChatPage";
import AIItineraryPage from "./AIItineraryPage";
import AISentimentPage from "./AISentimentPage";
import AccessibilityPage from "./AccessibilityPage";
import QuickChatBox from "./QuickChatBox";
import ItineraryPage from "./ItineraryPage";
import ProfilePage from "./ProfilePage";
import AdminUsersPage from "./AdminUsersPage";
import AdminAnalyticsPage from "./AdminAnalyticsPage";
import AdminPendingPlaces from "./AdminPendingPlaces";
import { apiGet } from "./api";

import { AuthProvider, useAuth } from "./AuthContext";

import GuardianRequestPage from "./GuardianRequestPage";
import GuardianTrackingPage from "./GuardianTrackingPage";

function LayoutWrapper() {
  const location = useLocation();
  const navigate = useNavigate();
  const { isLoggedIn, logout } = useAuth();

  const [colorBlindMode, setColorBlindMode] = useState(
    localStorage.getItem("colorBlindMode") === "true"
  );
  const [quickMenuOpen, setQuickMenuOpen] = useState(false);
  const [quickChatOpen, setQuickChatOpen] = useState(false);
  const [adminMenuOpen, setAdminMenuOpen] = useState(false);
  const [adminStats, setAdminStats] = useState(null);
  const [cartCount, setCartCount] = useState(0);
  const [savedItineraries, setSavedItineraries] = useState([]);
  const [showItineraryPop, setShowItineraryPop] = useState(false);
  const [speechOn, setSpeechOn] = useState(
    localStorage.getItem("speechOn") === "true"
  );
  const adminEmail = localStorage.getItem("email") || "";
  const isAdmin = adminEmail.toLowerCase().endsWith("@pathease.com");

  const toggleColorBlindMode = () => {
    const next = !colorBlindMode;
    setColorBlindMode(next);
    localStorage.setItem("colorBlindMode", next);
  };

  const hideNavbar = location.pathname === "/search-results";
  useEffect(() => {
    refreshGlobalCounts();
    const onStorage = () => refreshGlobalCounts();
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  useEffect(() => {
    localStorage.setItem("speechOn", speechOn ? "true" : "false");
  }, [speechOn]);

  useEffect(() => {
    if (!isLoggedIn || !isAdmin || !adminMenuOpen) return;
    apiGet("/admin/analytics")
      .then((d) => setAdminStats(d))
      .catch(() => setAdminStats(null));
  }, [isLoggedIn, isAdmin, adminMenuOpen]);

  const speakText = (text) => {
    if (!speechOn || !text || !window.speechSynthesis) return;
    window.speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(text);
    u.lang = "en-IN";
    window.speechSynthesis.speak(u);
  };

  const getPageText = () => {
    const main = document.getElementById("main-content");
    if (!main) return "";
    const text = main.innerText || "";
    return text.replace(/\s+/g, " ").trim().slice(0, 1200);
  };

  useEffect(() => {
    if (!speechOn) return;
    const text = getPageText();
    if (text) speakText(text);
  }, [location.pathname, speechOn]);

  const refreshGlobalCounts = () => {
    try {
      const cartRaw = localStorage.getItem("itinerary_cart");
      const cartArr = cartRaw ? JSON.parse(cartRaw) : [];
      setCartCount(Array.isArray(cartArr) ? cartArr.length : 0);
    } catch {
      setCartCount(0);
    }
    try {
      const raw = localStorage.getItem("generated_itineraries");
      const arr = raw ? JSON.parse(raw) : [];
      setSavedItineraries(Array.isArray(arr) ? arr : []);
    } catch {
      setSavedItineraries([]);
    }
  };

  const navItems = [
    { label: "Home", href: "/" },
    { label: "Maps", href: "/maps" },
    { label: "Admin", href: "/admin" },
    { label: "Upload", href: "/upload" },
  ];

  if (isLoggedIn) {
    navItems.push(
      { label: "Guardian Requests", href: "/guardian-request" },
      { label: "Live Tracking", href: "/guardian-tracking" },
      { label: "Logout", action: "logout" }
    );
  } else {
    navItems.push({ label: "Login", href: "/login" });
  }

  return (
    // 🔒 PREVENT PAGE HORIZONTAL SCROLL
    <div
      style={{
        minHeight: "100vh",
        position: "relative",
        overflowX: "hidden",
      }}
    >
      {/* Background */}
      <div
        style={{
          position: "fixed",
          inset: 0,
          zIndex: -1,
          pointerEvents: "none",
        }}
        className={colorBlindMode ? "color-blind-mode" : ""}
      >
        <LiquidEther colorBlindMode={colorBlindMode} />
      </div>

      {!hideNavbar && (
        <>
          {/* ADMIN BURGER MENU (LEFT) */}
          {isLoggedIn && isAdmin && (
            <div style={{ position: "fixed", top: 18, left: 20, zIndex: 2600 }}>
              <button
                onClick={() => setAdminMenuOpen((v) => !v)}
                style={{
                  width: 44,
                  height: 44,
                  borderRadius: 10,
                  border: "2px solid #360146ff",
                  background: "#fff",
                  cursor: "pointer",
                  fontWeight: 700,
                }}
                aria-label="Admin menu"
              >
                ☰
              </button>
              {adminMenuOpen && (
                <div
                  style={{
                    marginTop: 8,
                    background: "#fff",
                    border: "1px solid #ddd",
                    borderRadius: 10,
                    boxShadow: "0 6px 18px rgba(0,0,0,0.15)",
                    padding: 10,
                    minWidth: 180,
                    transform: adminMenuOpen ? "translateX(0)" : "translateX(-8px)",
                    opacity: adminMenuOpen ? 1 : 0,
                    transition: "all 180ms ease",
                  }}
                >
                  <div style={{ fontWeight: 700, marginBottom: 6 }}>Admin</div>
                  <button
                    onClick={() => navigate("/admin")}
                    style={{ display: "flex", justifyContent: "space-between", width: "100%", textAlign: "left", padding: "6px 8px" }}
                  >
                    <span>Approved Places</span>
                    {adminStats?.approved_places !== undefined && (
                      <span style={{ background: "#e6d6ff", borderRadius: 10, padding: "2px 8px", fontSize: 12 }}>
                        {adminStats.approved_places}
                      </span>
                    )}
                  </button>
                  <button
                    onClick={() => navigate("/admin/pending")}
                    style={{ display: "flex", justifyContent: "space-between", width: "100%", textAlign: "left", padding: "6px 8px" }}
                  >
                    <span>Pending Places</span>
                    {adminStats?.pending_places !== undefined && (
                      <span style={{ background: "#fff2cc", borderRadius: 10, padding: "2px 8px", fontSize: 12, border: "1px solid #e6d6ff" }}>
                        {adminStats.pending_places}
                      </span>
                    )}
                  </button>
                  <button
                    onClick={() => navigate("/admin/users")}
                    style={{ display: "flex", justifyContent: "space-between", width: "100%", textAlign: "left", padding: "6px 8px" }}
                  >
                    <span>Users</span>
                    {adminStats?.users !== undefined && (
                      <span style={{ background: "#e6d6ff", borderRadius: 10, padding: "2px 8px", fontSize: 12 }}>
                        {adminStats.users}
                      </span>
                    )}
                  </button>
                  <button
                    onClick={() => navigate("/admin/analytics")}
                    style={{ display: "flex", justifyContent: "space-between", width: "100%", textAlign: "left", padding: "6px 8px" }}
                  >
                    <span>Analytics</span>
                    {adminStats?.pending_places !== undefined && (
                      <span style={{ background: "#fff2cc", borderRadius: 10, padding: "2px 8px", fontSize: 12, border: "1px solid #e6d6ff" }}>
                        Pending {adminStats.pending_places}
                      </span>
                    )}
                  </button>
                </div>
              )}
            </div>
          )}

          {/* GLOBAL CART + ITINERARY BUTTONS (LOGGED IN ONLY) */}
          {isLoggedIn && (
            <>
              <div style={{ position: "fixed", top: 20, right: 140, zIndex: 2500 }}>
                <button
                  onClick={() => setShowItineraryPop((v) => !v)}
                  style={{
                    padding: "8px 12px",
                    borderRadius: 10,
                    border: "2px solid #360146ff",
                    background: "#fff",
                    cursor: "pointer",
                    fontWeight: 700,
                  }}
                >
                  Itinerary ({savedItineraries.length})
                </button>
                {showItineraryPop && (
                  <div
                    style={{
                      marginTop: 6,
                      background: "#fff",
                      border: "1px solid #ddd",
                      borderRadius: 10,
                      boxShadow: "0 6px 18px rgba(0,0,0,0.15)",
                      padding: 10,
                      minWidth: 220,
                    }}
                  >
                    {savedItineraries.length === 0 ? (
                      <div style={{ fontSize: 12 }}>No saved itineraries</div>
                    ) : (
                      savedItineraries.slice(0, 5).map((it, idx) => (
                        <div key={it.id || idx} style={{ marginBottom: 6 }}>
                          <div style={{ fontWeight: 600 }}>
                            {it.title || "Trip Itinerary"}
                          </div>
                          <button
                            onClick={() => navigate("/itinerary")}
                            style={{ marginTop: 4, padding: "4px 8px" }}
                          >
                            Open
                          </button>
                        </div>
                      ))
                    )}
                  </div>
                )}
              </div>

              <button
                onClick={() => {
                  const el = document.getElementById("itinerary-cart");
                  if (el) el.scrollIntoView({ behavior: "smooth" });
                  else navigate("/");
                }}
                style={{
                  position: "fixed",
                  top: 20,
                  right: 20,
                  zIndex: 2500,
                  padding: "8px 12px",
                  borderRadius: 10,
                  border: "2px solid #360146ff",
                  background: "#fff",
                  cursor: "pointer",
                  fontWeight: 700,
                }}
              >
                Cart ({cartCount})
              </button>
            </>
          )}

          {/* NAVBAR */}
          <div
            style={{
              position: "fixed",
              top: 10,
              left: 0,
              right: 0,
              zIndex: 1000,
              display: "flex",
              justifyContent: "center",
            }}
          >
            <PillNav
              logoAlt="PathEase Logo"
              items={navItems}
              activeHref={location.pathname}
              baseColor={colorBlindMode ? "#000" : "#360146ff"}
              pillColor="#fff"
              pillTextColor={colorBlindMode ? "#000" : "#5c515f"}
              hoveredPillTextColor="#ffffff"
              onItemClick={(item) => {
                if (item.action === "logout") {
                  logout();
                  navigate("/login", { replace: true });
                } else if (item.href) {
                  navigate(item.href);
                }
              }}
            />
          </div>

          {/* CITY CARDS BELOW SEARCH BAR */}
        

          {/* Accessibility Button */}
          <button
            onClick={toggleColorBlindMode}
            style={{
              position: "fixed",
              bottom: 20,
              right: 20,
              zIndex: 3000,
              padding: "10px 14px",
              borderRadius: 8,
              border: "3px solid #000",
              background: colorBlindMode ? "#000" : "#fff",
              color: colorBlindMode ? "#fff" : "#000",
              fontWeight: "bold",
              cursor: "pointer",
            }}
          >
            👁 Accessibility {colorBlindMode ? "ON" : "OFF"}
          </button>

          {/* QUICK MENU (+) */}
          <div
            style={{
              position: "fixed",
              right: 20,
              bottom: 80,
              zIndex: 3000,
              display: "flex",
              flexDirection: "column",
              alignItems: "flex-end",
              gap: 8,
            }}
          >
            {quickMenuOpen && (
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {/* Floating logo buttons */}
                {isLoggedIn && (
                  <button
                    onClick={() => navigate("/profile")}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 8,
                      padding: "6px 10px",
                      borderRadius: 20,
                      border: "1px solid #e6d6ff",
                      background: "#ffffff",
                      cursor: "pointer",
                      boxShadow: "0 4px 10px rgba(0,0,0,0.12)",
                    }}
                  >
                    <span
                      style={{
                        width: 28,
                        height: 28,
                        borderRadius: "50%",
                        background: "#e6d6ff",
                        display: "inline-flex",
                        alignItems: "center",
                        justifyContent: "center",
                        fontWeight: 700,
                        color: "#360146ff",
                      }}
                    >
                      P
                    </span>
                    Profile
                  </button>
                )}
                <button
                  onClick={() => {
                    setQuickChatOpen((v) => !v);
                  }}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 8,
                    padding: "6px 10px",
                    borderRadius: 20,
                    border: "1px solid #e6d6ff",
                    background: "#ffffff",
                    cursor: "pointer",
                    boxShadow: "0 4px 10px rgba(0,0,0,0.12)",
                  }}
                >
                  <span
                    style={{
                      width: 28,
                      height: 28,
                      borderRadius: "50%",
                      background: "#e6d6ff",
                      display: "inline-flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontWeight: 700,
                      color: "#360146ff",
                    }}
                  >
                    C
                  </span>
                  Chat
                </button>

                <button
                  onClick={() => setQuickChatOpen(true)}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 8,
                    padding: "6px 10px",
                    borderRadius: 20,
                    border: "1px solid #e6d6ff",
                    background: "#ffffff",
                    cursor: "pointer",
                    boxShadow: "0 4px 10px rgba(0,0,0,0.12)",
                  }}
                >
                  <span
                    style={{
                      width: 28,
                      height: 28,
                      borderRadius: "50%",
                      background: "#e6d6ff",
                      display: "inline-flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontWeight: 700,
                      color: "#360146ff",
                    }}
                  >
                    A
                  </span>
                  Chat Assistant
                </button>

                <button
                  onClick={() => navigate("/ai-itinerary")}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 8,
                    padding: "6px 10px",
                    borderRadius: 20,
                    border: "1px solid #e6d6ff",
                    background: "#ffffff",
                    cursor: "pointer",
                    boxShadow: "0 4px 10px rgba(0,0,0,0.12)",
                  }}
                >
                  <span
                    style={{
                      width: 28,
                      height: 28,
                      borderRadius: "50%",
                      background: "#e6d6ff",
                      display: "inline-flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontWeight: 700,
                      color: "#360146ff",
                    }}
                  >
                    I
                  </span>
                  Itinerary
                </button>

                <button
                  onClick={() => navigate("/ai-sentiment")}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 8,
                    padding: "6px 10px",
                    borderRadius: 20,
                    border: "1px solid #e6d6ff",
                    background: "#ffffff",
                    cursor: "pointer",
                    boxShadow: "0 4px 10px rgba(0,0,0,0.12)",
                  }}
                >
                  <span
                    style={{
                      width: 28,
                      height: 28,
                      borderRadius: "50%",
                      background: "#e6d6ff",
                      display: "inline-flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontWeight: 700,
                      color: "#360146ff",
                    }}
                  >
                    S
                  </span>
                  Sentiment
                </button>

                {/* Floating Chatbox (only from + menu) */}
                {quickChatOpen && <QuickChatBox />}
              </div>
            )}
            <button
              onClick={() => setQuickMenuOpen((v) => !v)}
              aria-label="Open quick menu"
              style={{
                width: 48,
                height: 48,
                borderRadius: 14,
                border: "2px solid #360146ff",
                background: "#fff",
                fontSize: 26,
                fontWeight: 700,
                cursor: "pointer",
                lineHeight: "44px",
              }}
            >
              +
            </button>
          </div>

          {/* SPEECH BUTTON (LIKE ACCESSIBILITY) */}
          <button
            onClick={() => setSpeechOn((v) => !v)}
            style={{
              position: "fixed",
              bottom: 20,
              left: 20,
              zIndex: 3000,
              padding: "10px 14px",
              borderRadius: 8,
              border: "3px solid #000",
              background: speechOn ? "#000" : "#fff",
              color: speechOn ? "#fff" : "#000",
              fontWeight: "bold",
              cursor: "pointer",
            }}
          >
            Speech {speechOn ? "ON" : "OFF"}
          </button>
        </>
      )}

      {/* ROUTES */}
      <div id="main-content" style={{ paddingTop: hideNavbar ? 0 : 180 }}>
        <Routes>
          <Route path="/" element={<App />} />
          <Route path="/signup" element={<Signup />} />
          <Route path="/login" element={<Login />} />
          <Route path="/maps" element={<SnapMapScreen />} />
          <Route
            path="/admin"
            element={
              <AdminRoute>
                <AdminPlaces />
              </AdminRoute>
            }
          />
          <Route
            path="/admin/pending"
            element={
              <AdminRoute>
                <AdminPendingPlaces />
              </AdminRoute>
            }
          />
          <Route path="/upload" element={<AccessibilityForm />} />
          <Route path="/search-results" element={<SearchResults />} />
          <Route path="/guardian-request" element={<GuardianRequestPage />} />
          <Route path="/guardian-tracking" element={<GuardianTrackingPage />} />
          <Route path="/ai-chat" element={<AIChatPage />} />
          <Route path="/ai-itinerary" element={<AIItineraryPage />} />
          <Route path="/ai-sentiment" element={<AISentimentPage />} />
          <Route path="/itinerary" element={<ItineraryPage />} />
          <Route path="/accessibility" element={<AccessibilityPage onToggle={toggleColorBlindMode} isOn={colorBlindMode} />} />
          <Route path="/profile" element={<ProfilePage />} />
          <Route
            path="/admin/users"
            element={
              <AdminRoute>
                <AdminUsersPage />
              </AdminRoute>
            }
          />
          <Route
            path="/admin/analytics"
            element={
              <AdminRoute>
                <AdminAnalyticsPage />
              </AdminRoute>
            }
          />
        </Routes>
      </div>
    </div>
  );
}

export default function MainLayout() {
  return (
    <AuthProvider>
      <Router>
        <LayoutWrapper />
      </Router>
    </AuthProvider>
  );
}
