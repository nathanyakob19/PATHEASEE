import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
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
import { apiGet, apiPost } from "./api";

import { AuthProvider, useAuth } from "./AuthContext";

import GuardianRequestPage from "./GuardianRequestPage";
import GuardianTrackingPage from "./GuardianTrackingPage";
import PrivateRoute from "./PrivateRoute";
import CartPage from "./CartPage";
import "./MainLayout.css";

function LayoutWrapper() {
  const location = useLocation();
  const navigate = useNavigate();
  const { isLoggedIn, logout, user } = useAuth();

  const [colorBlindMode, setColorBlindMode] = useState("off");
  const [quickMenuOpen, setQuickMenuOpen] = useState(false);
  const [quickChatOpen, setQuickChatOpen] = useState(false);
  const [adminMenuOpen, setAdminMenuOpen] = useState(false);
  const [adminStats, setAdminStats] = useState(null);
  const [cartCount, setCartCount] = useState(0);
  const [savedItineraries, setSavedItineraries] = useState([]);
  const [showItineraryPop, setShowItineraryPop] = useState(false);
  const [speechOn, setSpeechOn] = useState(false);
  const [voiceAutoSpeak, setVoiceAutoSpeak] = useState(true);
  const [voiceLang, setVoiceLang] = useState("en-IN");
  const [voiceControlOn, setVoiceControlOn] = useState(true);
  const [voiceControlPanelOpen, setVoiceControlPanelOpen] = useState(true);
  const [voiceControlLang, setVoiceControlLang] = useState("en-IN");
  const [voiceControlActive, setVoiceControlActive] = useState(false);
  const [assistantArmed, setAssistantArmed] = useState(false);
  const [lastVoiceCommand, setLastVoiceCommand] = useState("");
  const [voiceControlError, setVoiceControlError] = useState("");
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const voiceControlRef = useRef(null);
  const voiceControlDesiredRef = useRef(false);
  const voiceControlRestartBlockedRef = useRef(false);
  const assistantArmTimerRef = useRef(null);
  const hoverSpeakTimerRef = useRef(null);
  const lastSpokenHoverTextRef = useRef("");
  const lastHoveredSpeakNodeRef = useRef(null);
  const adminEmail = localStorage.getItem("email") || "";
  const userEmail = (user?.email || adminEmail || "guest").toLowerCase();
  const isAdmin = adminEmail.toLowerCase().endsWith("@pathease.com");

  const settingsKey = useMemo(
    () => `pathease_settings:${userEmail || "guest"}`,
    [userEmail]
  );

  const colorBlindModes = useMemo(
    () => ["off", "high-contrast", "protanopia", "deuteranopia", "tritanopia"],
    []
  );

  const normalizeColorBlindMode = useCallback(
    (value) => {
      if (value === true) return "high-contrast";
      if (!value || value === false) return "off";
      return colorBlindModes.includes(value) ? value : "off";
    },
    [colorBlindModes]
  );

  const readSettings = useCallback(() => {
    const defaults = {
      colorBlindMode: "off",
      speechOn: false,
      voiceAutoSpeak: true,
      voiceLang: "en-IN",
      voiceControlOn: true,
      voiceControlLang: "en-IN",
    };
    try {
      const raw = localStorage.getItem(settingsKey);
      if (!raw) return defaults;
      const parsed = JSON.parse(raw);
      const merged = { ...defaults, ...parsed };
      return {
        ...merged,
        colorBlindMode: normalizeColorBlindMode(merged.colorBlindMode),
      };
    } catch {
      return defaults;
    }
  }, [normalizeColorBlindMode, settingsKey]);

  const writeSettings = useCallback(
    (patch) => {
      const next = { ...readSettings(), ...patch };
      localStorage.setItem(settingsKey, JSON.stringify(next));
    },
    [readSettings, settingsKey]
  );

  useEffect(() => {
    const settings = readSettings();
    setColorBlindMode(settings.colorBlindMode);
    setSpeechOn(settings.speechOn);
    setVoiceAutoSpeak(settings.voiceAutoSpeak);
    setVoiceLang(settings.voiceLang);
    setVoiceControlOn(settings.voiceControlOn);
    setVoiceControlLang(settings.voiceControlLang);
  }, [readSettings]);

  useEffect(() => {
    const baseCls = "color-blind-mode";
    const modeClasses = colorBlindModes
      .filter((m) => m !== "off")
      .map((m) => `cb-${m}`);

    document.body.classList.remove(...modeClasses);

    if (colorBlindMode && colorBlindMode !== "off") {
      document.body.classList.add(baseCls, `cb-${colorBlindMode}`);
    } else {
      document.body.classList.remove(baseCls);
    }

    return () => document.body.classList.remove(baseCls, ...modeClasses);
  }, [colorBlindMode, colorBlindModes]);

  const toggleColorBlindMode = useCallback(() => {
    const idx = colorBlindModes.indexOf(colorBlindMode);
    const next = colorBlindModes[(idx + 1) % colorBlindModes.length];
    setColorBlindMode(next);
    writeSettings({ colorBlindMode: next });
  }, [colorBlindMode, colorBlindModes, writeSettings]);

  const setColorBlindModeExplicit = useCallback(
    (mode) => {
      const next = normalizeColorBlindMode(mode);
      setColorBlindMode(next);
      writeSettings({ colorBlindMode: next });
    },
    [normalizeColorBlindMode, writeSettings]
  );

  const hideNavbar = location.pathname === "/search-results";
  const createCustomItinerary = useCallback(() => {
    try {
      const raw = localStorage.getItem("generated_itineraries");
      const arr = raw ? JSON.parse(raw) : [];
      const nextPlan = {
        id: `plan-${Date.now()}`,
        title: "My Custom Itinerary",
        created_at: new Date().toLocaleString(),
        itinerary: [{ title: "Day 1", stops: [] }],
      };
      const next = [nextPlan, ...(Array.isArray(arr) ? arr : [])];
      localStorage.setItem("generated_itineraries", JSON.stringify(next));
      setSavedItineraries(next);
      navigate("/itinerary");
      setShowItineraryPop(false);
    } catch {
      navigate("/itinerary");
      setShowItineraryPop(false);
    }
  }, [navigate]);

  const refreshGlobalCounts = useCallback(() => {
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
  }, []);

  useEffect(() => {
    refreshGlobalCounts();
    const onStorage = (evt) => {
      refreshGlobalCounts();
      if (evt?.key !== settingsKey) return;
      const settings = readSettings();
      setSpeechOn(settings.speechOn);
      setVoiceAutoSpeak(settings.voiceAutoSpeak);
      setVoiceLang(settings.voiceLang);
      setVoiceControlOn(settings.voiceControlOn);
      setVoiceControlLang(settings.voiceControlLang);
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, [readSettings, refreshGlobalCounts, settingsKey]);

  useEffect(() => {
    writeSettings({ speechOn });
  }, [speechOn, writeSettings]);

  useEffect(() => {
    writeSettings({ voiceAutoSpeak, voiceLang });
  }, [voiceAutoSpeak, voiceLang, writeSettings]);

  useEffect(() => {
    writeSettings({ voiceControlOn, voiceControlLang });
  }, [voiceControlOn, voiceControlLang, writeSettings]);

  useEffect(() => {
    if (!isLoggedIn) return;
    if (!("Notification" in window)) return;
    if (Notification.permission === "default") {
      Notification.requestPermission().catch(() => {});
    }
  }, [isLoggedIn]);

  useEffect(() => {
    if (!isLoggedIn || !isAdmin || !adminMenuOpen) return;
    apiGet("/admin/analytics")
      .then((d) => setAdminStats(d))
      .catch(() => setAdminStats(null));
  }, [isLoggedIn, isAdmin, adminMenuOpen]);

  const speakText = useCallback((text) => {
    if (!speechOn || !text || !window.speechSynthesis) return;
    window.speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(text);
    u.lang = voiceLang || "en-IN";
    window.speechSynthesis.speak(u);
  }, [speechOn, voiceLang]);

  const speakAssistantText = useCallback(
    (text) => {
      if (!text || !window.speechSynthesis) return;
      window.speechSynthesis.cancel();
      const u = new SpeechSynthesisUtterance(text);
      u.lang = voiceControlLang || "en-IN";
      window.speechSynthesis.speak(u);
    },
    [voiceControlLang]
  );

  const hoverSpeakSelector =
    "[data-speak],button,a,input,textarea,select,label,[role='button'],[role='link'],[tabindex]:not([tabindex='-1'])";

  const getSpeakableElementText = useCallback((target) => {
    if (!(target instanceof Element)) return "";
    const node = target.closest(hoverSpeakSelector);
    if (!node) return "";
    const raw =
      node.getAttribute("data-speak") ||
      node.getAttribute("aria-label") ||
      node.getAttribute("title") ||
      node.getAttribute("alt") ||
      node.getAttribute("placeholder") ||
      (node instanceof HTMLInputElement ? node.value : "") ||
      node.textContent ||
      "";
    const cleaned = raw.replace(/\s+/g, " ").trim();
    if (!cleaned || cleaned.length < 2) return "";
    return cleaned.slice(0, 180);
  }, [hoverSpeakSelector]);

  useEffect(() => {
    if (speechOn) return;
    if (!window.speechSynthesis) return;
    window.speechSynthesis.cancel();
    lastSpokenHoverTextRef.current = "";
    lastHoveredSpeakNodeRef.current = null;
  }, [speechOn]);

  useEffect(() => {
    if (!speechOn || !voiceAutoSpeak) return;

    const speakFromTarget = (target) => {
      const text = getSpeakableElementText(target);
      if (!text || text === lastSpokenHoverTextRef.current) return;
      lastSpokenHoverTextRef.current = text;
      speakText(text);
    };

    const onMouseOver = (evt) => {
      if (!(evt.target instanceof Element)) return;
      const node = evt.target.closest(hoverSpeakSelector);
      if (!node) return;
      if (node === lastHoveredSpeakNodeRef.current) return;
      lastHoveredSpeakNodeRef.current = node;
      if (hoverSpeakTimerRef.current) {
        window.clearTimeout(hoverSpeakTimerRef.current);
      }
      hoverSpeakTimerRef.current = window.setTimeout(() => {
        speakFromTarget(node);
      }, 320);
    };

    const onFocusIn = (evt) => speakFromTarget(evt.target);

    document.addEventListener("mouseover", onMouseOver, true);
    document.addEventListener("focusin", onFocusIn, true);

    return () => {
      document.removeEventListener("mouseover", onMouseOver, true);
      document.removeEventListener("focusin", onFocusIn, true);
      if (hoverSpeakTimerRef.current) {
        window.clearTimeout(hoverSpeakTimerRef.current);
        hoverSpeakTimerRef.current = null;
      }
      lastHoveredSpeakNodeRef.current = null;
    };
  }, [getSpeakableElementText, hoverSpeakSelector, speakText, speechOn, voiceAutoSpeak]);

  const runVoiceCommand = useCallback(
    async (rawText) => {
      const text = rawText.toLowerCase().trim();
      if (!text) return;
      setLastVoiceCommand(text);

      const say = (t) => {
        speakAssistantText(t);
      };
      const emitVoiceAction = (type, detail = {}) => {
        window.dispatchEvent(
          new CustomEvent("pathease:voice-command", {
            detail: { type, ...detail },
          })
        );
      };
      const getValueAfter = (re) => {
        const match = text.match(re);
        return match && match[1] ? match[1].trim() : "";
      };
      const executeAction = (action) => {
        if (!action || typeof action !== "object") return false;
        if (action.type === "navigate" && action.path) {
          navigate(action.path);
          return true;
        }
        if (action.type === "toggle_speech") {
          setSpeechOn(!!action.enabled);
          return true;
        }
        if (action.type === "toggle_quick_menu") {
          setQuickMenuOpen(!!action.open);
          return true;
        }
        if (action.type === "toggle_accessibility") {
          toggleColorBlindMode();
          return true;
        }
        if (action.type === "logout") {
          logout();
          navigate("/login", { replace: true });
          return true;
        }
        if (action.type === "voice_event" && action.event_type) {
          emitVoiceAction(action.event_type, {
            ...(action.name ? { name: action.name } : {}),
            ...(action.value ? { value: action.value } : {}),
          });
          return true;
        }
        return false;
      };

      try {
        const aiResult = await apiPost("/ai/voice-assistant", {
          message: rawText,
          language: voiceControlLang || "en-IN",
          current_path: location.pathname,
        });
        const aiActions = Array.isArray(aiResult?.actions) ? aiResult.actions : [];
        let handledByAI = false;
        aiActions.forEach((a) => {
          handledByAI = executeAction(a) || handledByAI;
        });
        const aiReply = (aiResult?.reply || "").trim();
        if (aiReply) {
          speakAssistantText(aiReply);
        }
        if (handledByAI || aiReply) {
          return;
        }
      } catch {
        // Fallback to deterministic local parser below.
      }

      if (text.includes("go home") || text === "home") {
        navigate("/");
        return;
      }
      if (text.includes("open maps") || text.includes("maps")) {
        navigate("/maps");
        return;
      }
      if (text.includes("open admin")) {
        navigate("/admin");
        return;
      }
      if (text.includes("open upload") || text.includes("upload")) {
        navigate("/upload");
        return;
      }
      if (text.includes("guardian requests")) {
        navigate("/guardian-request");
        return;
      }
      if (text.includes("live tracking")) {
        navigate("/guardian-tracking");
        return;
      }
      if (text.includes("ai chat")) {
        navigate("/ai-chat");
        return;
      }
      if (text.includes("ai itinerary") || text.includes("trip planner")) {
        navigate("/ai-itinerary");
        return;
      }
      if (text.includes("ai sentiment")) {
        navigate("/ai-sentiment");
        return;
      }
      if (text.includes("itinerary")) {
        navigate("/itinerary");
        return;
      }
      if (text.includes("profile")) {
        navigate("/profile");
        return;
      }
      if (text.includes("accessibility page")) {
        navigate("/accessibility");
        return;
      }
      if (text.includes("accessibility") || text.includes("color blind")) {
        toggleColorBlindMode();
        return;
      }
      if (text.includes("speech on")) {
        setSpeechOn(true);
        return;
      }
      if (text.includes("speech off")) {
        setSpeechOn(false);
        return;
      }
      if (text.includes("open quick menu")) {
        setQuickMenuOpen(true);
        return;
      }
      if (text.includes("close quick menu")) {
        setQuickMenuOpen(false);
        return;
      }
      if (text.includes("open cart")) {
        navigate("/cart");
        return;
      }
      if (text.includes("open place")) {
        const name = getValueAfter(/open place\s+(.+)/i);
        if (!name) {
          say("Please say the place name.");
          return;
        }
        emitVoiceAction("open-place", { name });
        return;
      }
      if (text.includes("close place")) {
        emitVoiceAction("close-place");
        return;
      }
      if (text.includes("add to cart")) {
        const name = getValueAfter(/add\s+(.+?)\s+to cart/i) || getValueAfter(/add to cart\s+(.+)/i);
        emitVoiceAction("add-to-cart", { name });
        return;
      }
      if (text.includes("remove from cart")) {
        const name =
          getValueAfter(/remove\s+(.+?)\s+from cart/i) ||
          getValueAfter(/remove from cart\s+(.+)/i);
        emitVoiceAction("remove-from-cart", { name });
        return;
      }
      if (text.includes("generate itinerary") || text.includes("create itinerary")) {
        emitVoiceAction("generate-itinerary");
        return;
      }
      if (text.includes("save itinerary")) {
        emitVoiceAction("save-itinerary");
        return;
      }
      if (text.includes("use current location")) {
        emitVoiceAction("use-current-location");
        return;
      }
      if (text.includes("set destination")) {
        const value = getValueAfter(/set destination(?: to)?\s+(.+)/i);
        if (value) emitVoiceAction("set-destination", { value });
        return;
      }
      if (text.includes("set budget")) {
        const value = getValueAfter(/set budget(?: to)?\s+(.+)/i);
        if (value) emitVoiceAction("set-budget", { value });
        return;
      }
      if (text.includes("set days")) {
        const value = getValueAfter(/set days(?: to)?\s+(.+)/i);
        if (value) emitVoiceAction("set-days", { value });
        return;
      }
      if (text.includes("set travel type")) {
        const value = getValueAfter(/set travel type(?: to)?\s+(.+)/i);
        if (value) emitVoiceAction("set-travel-type", { value });
        return;
      }
      if (text.includes("set interests")) {
        const value = getValueAfter(/set interests(?: to)?\s+(.+)/i);
        if (value) emitVoiceAction("set-interests", { value });
        return;
      }
      if (text.includes("set currency")) {
        const value = getValueAfter(/set currency(?: to)?\s+(.+)/i);
        if (value) emitVoiceAction("set-currency", { value });
        return;
      }
      if (text.includes("logout")) {
        logout();
        navigate("/login", { replace: true });
        return;
      }
      if (text.startsWith("help")) {
        say("Say Hey PathEase, then commands like go home, open maps, open itinerary, open place Gateway of India, add to cart, generate itinerary, save itinerary, speech on, speech off, open cart, or logout.");
        return;
      }

      say("Sorry, I did not understand. Say help to hear commands.");
    },
    [location.pathname, navigate, logout, speakAssistantText, toggleColorBlindMode, voiceControlLang]
  );

  const parseWakeCommand = useCallback((rawText) => {
    const cleaned = (rawText || "").toLowerCase().replace(/[.,!?]/g, " ").replace(/\s+/g, " ").trim();
    if (!cleaned) return { wakeDetected: false, command: "" };
    const wakePatterns = [
      /\bhey\s+pathease\b/,
      /\bhi\s+pathease\b/,
      /\bok(?:ay)?\s+pathease\b/,
      /\bhey\s+path\s*ease\b/,
      /\bhi\s+path\s*ease\b/,
      /\bok(?:ay)?\s+path\s*ease\b/,
      /\bhey\s+pathis\b/,
      /\bhi\s+pathis\b/,
      /\bok(?:ay)?\s+pathis\b/,
      /\bhey\s+patiz\b/,
      /\bhi\s+patiz\b/,
      /\bok(?:ay)?\s+patiz\b/,
      /\bऐ\s+पाथ[ -]?ईज\b/i,
      /\bहाय\s+पाथ[ -]?ईज\b/i,
      /\bओके\s+पाथ[ -]?ईज\b/i,
      /\bअरे\s+पाथ[ -]?ईज\b/i,
      /\bऐ\s+पाथ[ -]?ईझ\b/i,
      /\bहाय\s+पाथ[ -]?ईझ\b/i,
      /\bओके\s+पाथ[ -]?ईझ\b/i,
    ];
    const wake = wakePatterns.find((p) => p.test(cleaned));
    if (!wake) return { wakeDetected: false, command: cleaned };
    const command = cleaned.replace(wake, "").trim();
    return { wakeDetected: true, command };
  }, []);

  const armAssistant = useCallback(() => {
    setAssistantArmed(true);
    if (assistantArmTimerRef.current) {
      window.clearTimeout(assistantArmTimerRef.current);
    }
    assistantArmTimerRef.current = window.setTimeout(() => {
      setAssistantArmed(false);
    }, 8000);
  }, []);

  const disarmAssistant = useCallback(() => {
    setAssistantArmed(false);
    if (assistantArmTimerRef.current) {
      window.clearTimeout(assistantArmTimerRef.current);
      assistantArmTimerRef.current = null;
    }
  }, []);

  const processWakeWordTranscript = useCallback(
    (transcript) => {
      const parsed = parseWakeCommand(transcript);
      const say = (t) => {
        speakAssistantText(t);
      };

      if (parsed.wakeDetected) {
        if (parsed.command) {
          disarmAssistant();
          void runVoiceCommand(parsed.command);
        } else {
          armAssistant();
          say("Yes, I am listening.");
          setLastVoiceCommand("hey pathease");
        }
        return;
      }

      if (assistantArmed) {
        disarmAssistant();
        void runVoiceCommand(parsed.command || transcript);
      }
    },
    [
      armAssistant,
      assistantArmed,
      disarmAssistant,
      parseWakeCommand,
      runVoiceCommand,
      speakAssistantText,
    ]
  );

  useEffect(() => {
    voiceControlDesiredRef.current = voiceControlOn;
    if (!voiceControlOn) {
      voiceControlRestartBlockedRef.current = true;
    }
  }, [voiceControlOn]);

  useEffect(() => {
    if (voiceControlOn) return;
    const recognition = voiceControlRef.current;
    if (!recognition) return;
    try {
      recognition.onend = null;
      recognition.stop();
    } catch {}
    setVoiceControlActive(false);
  }, [voiceControlOn]);

  const tryStartVoiceRecognition = useCallback(() => {
    if (!voiceControlOn) return;
    if (voiceControlActive) return;
    const recognition = voiceControlRef.current;
    if (!recognition) return;
    try {
      recognition.start();
    } catch (err) {
      const msg = err?.message || "Unable to start voice input.";
      setVoiceControlError(msg);
    }
  }, [voiceControlActive, voiceControlOn]);

  useEffect(() => {
    const onVisibilityChange = () => {
      if (document.visibilityState !== "visible") return;
      tryStartVoiceRecognition();
    };
    document.addEventListener("visibilitychange", onVisibilityChange);
    return () => document.removeEventListener("visibilitychange", onVisibilityChange);
  }, [tryStartVoiceRecognition]);

  useEffect(() => {
    const Recognition =
      window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!Recognition) {
      if (voiceControlOn) {
        setVoiceControlError("Voice input is not supported in this browser.");
        setVoiceControlOn(false);
      }
      return;
    }

    const recognition = new Recognition();
    recognition.lang = voiceControlLang || "en-IN";
    recognition.interimResults = false;
    recognition.continuous = true;

    recognition.onstart = () => {
      setVoiceControlActive(true);
      setVoiceControlError("");
      voiceControlRestartBlockedRef.current = false;
    };
    recognition.onerror = (evt) => {
      setVoiceControlError(evt?.error || "Voice input error");
      setVoiceControlActive(false);
    };
    recognition.onend = () => {
      setVoiceControlActive(false);
      if (voiceControlDesiredRef.current && !voiceControlRestartBlockedRef.current) {
        try {
          recognition.start();
        } catch {}
      }
    };
    recognition.onresult = (evt) => {
      const result = evt.results[evt.results.length - 1];
      const transcript = result && result[0] ? result[0].transcript : "";
      processWakeWordTranscript(transcript);
    };

    voiceControlRef.current = recognition;
    if (voiceControlOn) {
      tryStartVoiceRecognition();
    }

    return () => {
      try {
        recognition.stop();
      } catch {}
    };
  }, [voiceControlLang, voiceControlOn, processWakeWordTranscript, tryStartVoiceRecognition]);

  useEffect(() => {
    const onFirstInteraction = () => {
      tryStartVoiceRecognition();
    };
    window.addEventListener("pointerdown", onFirstInteraction, { capture: true });
    return () => window.removeEventListener("pointerdown", onFirstInteraction, true);
  }, [tryStartVoiceRecognition]);

  useEffect(() => {
    const onOpenVoiceNavigation = () => {
      setVoiceControlPanelOpen(true);
      setVoiceControlOn(true);
    };
    window.addEventListener("pathease:open-voice-navigation", onOpenVoiceNavigation);
    return () =>
      window.removeEventListener(
        "pathease:open-voice-navigation",
        onOpenVoiceNavigation
      );
  }, []);

  useEffect(() => () => {
    if (assistantArmTimerRef.current) {
      window.clearTimeout(assistantArmTimerRef.current);
      assistantArmTimerRef.current = null;
    }
  }, []);

  useEffect(() => {
    const onChatCommand = (e) => {
      const text = e?.detail?.text || "";
      if (text) void runVoiceCommand(text);
    };
    window.addEventListener("pathease:chat-command", onChatCommand);
    return () => window.removeEventListener("pathease:chat-command", onChatCommand);
  }, [runVoiceCommand]);

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
  }, [location.pathname, speakText, speechOn]);

  const navItems = [
    { label: "Home", href: "/" },
    { label: "Maps", href: "/maps" },
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
      className={`layout-root${isLoggedIn && isAdmin ? " is-admin" : ""}${mobileMenuOpen ? " is-mobile-menu-open" : ""}`}
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
        className={colorBlindMode !== "off" ? "color-blind-mode" : ""}
      >
        <LiquidEther colorBlindMode={colorBlindMode} />
      </div>

      {!hideNavbar && (
        <>
          {/* ADMIN BURGER MENU (LEFT) */}
          {isLoggedIn && isAdmin && (
            <div className="floating-admin-menu">
              <button
                onClick={() => setAdminMenuOpen((v) => !v)}
                className="floating-icon-button admin-logo-button"
                aria-label="Admin menu"
              >
                <img src="/pathease-logo.png" alt="Admin" />
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
              <div className="floating-itinerary">
                <button
                  onClick={() => setShowItineraryPop((v) => !v)}
                  className="floating-pill-button"
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
                    <div style={{ marginBottom: 8 }}>
                      <button
                        onClick={createCustomItinerary}
                        style={{ width: "100%", padding: "6px 8px", fontWeight: 700 }}
                      >
                        + Add Itinerary
                      </button>
                    </div>
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
                onClick={() => navigate("/cart")}
                className="floating-pill-button floating-cart"
              >
                Cart ({cartCount})
              </button>
            </>
          )}

          {/* NAVBAR */}
          <div className="top-nav-wrap">
            <PillNav
              logo="/pathease-logo.png"
              logoAlt="PathEase Logo"
              items={navItems}
              activeHref={location.pathname}
              baseColor={colorBlindMode !== "off" ? "#000" : "#360146ff"}
              pillColor="#fff"
              pillTextColor={colorBlindMode !== "off" ? "#000" : "#5c515f"}
              hoveredPillTextColor="#ffffff"
              className={colorBlindMode !== "off" ? "pillnav-cb" : "pillnav-default"}
              onItemClick={(item) => {
                if (item.action === "logout") {
                  logout();
                  navigate("/login", { replace: true });
                } else if (item.href) {
                  navigate(item.href);
                }
              }}
              onMobileMenuToggle={setMobileMenuOpen}
            />
          </div>

          {/* CITY CARDS BELOW SEARCH BAR */}
        

          <div className="right-rail">
          {/* Accessibility Button */}
          <button
            onClick={toggleColorBlindMode}
            className={`floating-accessibility${colorBlindMode !== "off" ? " is-on" : ""}`}
          >
            👁 Accessibility {colorBlindMode === "off" ? "OFF" : colorBlindMode.replace("-", " ").toUpperCase()}
          </button>
         
          {/* QUICK MENU (+) */}
          {isLoggedIn && (
            <div className={`floating-quickmenu${quickMenuOpen ? " is-open" : ""}`}>
              {quickMenuOpen && (
                <div className="quickmenu-panel">
                  {/* Floating logo buttons */}
                  <button
                    onClick={() => navigate("/profile")}
                    className="quickmenu-item"
                  >
                    <span className="quickmenu-badge">P</span>
                    Profile
                  </button>

                  <button
                    onClick={() => {
                      setQuickChatOpen((v) => !v);
                    }}
                    className="quickmenu-item"
                  >
                    <span className="quickmenu-badge">C</span>
                    Chat
                  </button>

                  <button
                    onClick={() => navigate("/ai-sentiment")}
                    className="quickmenu-item"
                  >
                    <span className="quickmenu-badge">S</span>
                    Sentiment
                  </button>

                  {/* Floating Chatbox (only from + menu) */}
                  {quickChatOpen && <QuickChatBox onClose={() => setQuickChatOpen(false)} />}
                  
                </div>
              )}
              <div className="quickmenu-actions">
                <button
                  onClick={() => setVoiceControlPanelOpen((v) => !v)}
                  aria-label="Open voice assistant"
                  className={`quickmenu-mic${voiceControlPanelOpen ? " is-on" : ""}`}
                >
                  Mic
                </button>
                <button
                  onClick={() => setQuickMenuOpen((v) => !v)}
                  aria-label="Open quick menu"
                  className="quickmenu-toggle"
                >
                  +
                </button>
              </div>
            </div>
          )}

          {/* SPEECH BUTTON (LIKE ACCESSIBILITY) */}
          <div className="floating-voice-stack">
            <button
              onClick={() => setSpeechOn((v) => !v)}
              className={`floating-speech${speechOn ? " is-on" : ""}`}
            >
              Speech {speechOn ? "ON" : "OFF"}
            </button>

            {voiceControlPanelOpen && (
              <div className="voice-control-panel">
              <label className="voice-control-switch" htmlFor="voice-control-toggle">
                <span>Voice Assistant</span>
                <input
                  id="voice-control-toggle"
                  type="checkbox"
                  checked={voiceControlOn}
                  onChange={(e) => setVoiceControlOn(e.target.checked)}
                />
                <span className="voice-control-slider" />
              </label>

              <select
                value={voiceControlLang}
                onChange={(e) => setVoiceControlLang(e.target.value)}
                className="voice-control-select"
              >
                <option value="en-IN">English (India)</option>
                <option value="hi-IN">Hindi</option>
                <option value="mr-IN">Marathi</option>
              </select>

              <div className="voice-control-status">
                <span className={`voice-status-dot${voiceControlActive ? " is-live" : ""}`} />
                {voiceControlActive ? "Listening..." : "Idle"}
              </div>

              <div className="voice-control-last">
                Wake phrase: <strong>Hey PathEase</strong>
              </div>

              {assistantArmed && (
                <div className="voice-control-last">Assistant ready, say your command now.</div>
              )}

              {lastVoiceCommand && (
                <div className="voice-control-last">Last: {lastVoiceCommand}</div>
              )}

              {voiceControlError && (
                <div className="voice-control-error">{voiceControlError}</div>
              )}
              </div>
            )}
          </div>
          </div>
        </>
      )}

      {/* ROUTES */}
      <div id="main-content" className={hideNavbar ? "main-content-hidden" : "main-content-area"}>
        <Routes>
          <Route path="/" element={<App />} />
          <Route path="/signup" element={<Signup />} />
          <Route path="/login" element={<Login />} />
          <Route path="/maps" element={<SnapMapScreen />} />
          <Route path="/SnapMapScreen" element={<SnapMapScreen />} />
          <Route path="/snapmappages" element={<SnapMapScreen />} />
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
          <Route
            path="/upload"
            element={
              <PrivateRoute>
                <AccessibilityForm />
              </PrivateRoute>
            }
          />
          <Route path="/search-results" element={<SearchResults />} />
          <Route path="/guardian-request" element={<GuardianRequestPage />} />
          <Route path="/guardian-tracking" element={<GuardianTrackingPage />} />
          <Route path="/ai-chat" element={<AIChatPage />} />
          <Route path="/ai-itinerary" element={<AIItineraryPage />} />
          <Route path="/ai-sentiment" element={<AISentimentPage />} />
          <Route path="/itinerary" element={<ItineraryPage />} />
          <Route
            path="/accessibility"
            element={
              <AccessibilityPage
                onToggle={toggleColorBlindMode}
                mode={colorBlindMode}
                onSelectMode={setColorBlindModeExplicit}
              />
            }
          />
          <Route path="/profile" element={<ProfilePage />} />
          <Route path="/cart" element={<CartPage />} />
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
