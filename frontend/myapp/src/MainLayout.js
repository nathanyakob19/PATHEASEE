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
  const [voiceControlTalkBack, setVoiceControlTalkBack] = useState(true);
  const [voiceControlActive, setVoiceControlActive] = useState(false);
  const [assistantArmed, setAssistantArmed] = useState(false);
  const [lastVoiceCommand, setLastVoiceCommand] = useState("");
  const [voiceControlError, setVoiceControlError] = useState("");
  const [wakeVisualState, setWakeVisualState] = useState("idle");
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const voiceControlRef = useRef(null);
  const voiceControlDesiredRef = useRef(false);
  const voiceControlRestartBlockedRef = useRef(false);
  const voiceControlActiveRef = useRef(false);
  const voiceControlStartingRef = useRef(false);
  const voiceControlStartRetryTimerRef = useRef(null);
  const voiceTranscriptFinalRef = useRef("");
  const voiceTranscriptInterimRef = useRef("");
  const voiceTranscriptFlushTimerRef = useRef(null);
  const voiceTranscriptMaxTimerRef = useRef(null);
  const assistantSpeakingRef = useRef(false);
  const assistantVoiceCooldownUntilRef = useRef(0);
  const lastVoiceActionRef = useRef({ key: "", ts: 0 });
  const cueToneLastAtRef = useRef(0);
  const cueAudioCtxRef = useRef(null);
  const assistantArmTimerRef = useRef(null);
  const wakeVisualTimerRef = useRef(null);
  const hoverSpeakTimerRef = useRef(null);
  const lastCommandAtRef = useRef(0);
  const commandLockRef = useRef(false);
  const lastSpokenHoverTextRef = useRef("");
  const lastHoveredSpeakNodeRef = useRef(null);
  const adminEmail = localStorage.getItem("email") || "";
  const userEmail = (user?.email || adminEmail || "guest").toLowerCase();
  const isAdmin = adminEmail.toLowerCase().endsWith("@pathease.com");

  const pulseWakeVisual = useCallback((state, holdMs = 1200) => {
    setWakeVisualState(state);
    if (wakeVisualTimerRef.current) {
      window.clearTimeout(wakeVisualTimerRef.current);
    }
    wakeVisualTimerRef.current = window.setTimeout(() => {
      setWakeVisualState("idle");
      wakeVisualTimerRef.current = null;
    }, holdMs);
  }, []);

  const playCueTone = useCallback((frequency = 880, duration = 120) => {
    const nowMs = Date.now();
    if (nowMs - cueToneLastAtRef.current < 280) return;
    cueToneLastAtRef.current = nowMs;
    const Ctx = window.AudioContext || window.webkitAudioContext;
    if (!Ctx) return;
    try {
      if (!cueAudioCtxRef.current || cueAudioCtxRef.current.state === "closed") {
        cueAudioCtxRef.current = new Ctx();
      }
      const ctx = cueAudioCtxRef.current;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "sine";
      osc.frequency.value = frequency;
      gain.gain.value = 0.0001;
      osc.connect(gain);
      gain.connect(ctx.destination);
      const now = ctx.currentTime;
      gain.gain.exponentialRampToValueAtTime(0.08, now + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + duration / 1000);
      osc.start(now);
      osc.stop(now + duration / 1000);
    } catch {}
  }, []);

  const signalListeningState = useCallback(
    (kind) => {
      if (kind !== "wake") return;
      pulseWakeVisual("wake", 1700);
      playCueTone(760, 100);
      if (navigator.vibrate) navigator.vibrate([35, 35, 35]);
    },
    [playCueTone, pulseWakeVisual]
  );

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
      voiceControlTalkBack: true,
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
    setVoiceControlTalkBack(settings.voiceControlTalkBack);
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
    writeSettings({ voiceControlOn, voiceControlLang, voiceControlTalkBack });
  }, [voiceControlOn, voiceControlLang, voiceControlTalkBack, writeSettings]);

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
    (text, opts = {}) => {
      const force = !!opts.force;
      if ((!voiceControlTalkBack && !force) || !text || !window.speechSynthesis) return;
      assistantSpeakingRef.current = true;
      const recognition = voiceControlRef.current;
      voiceControlRestartBlockedRef.current = true;
      try {
        if (recognition) recognition.stop();
      } catch {}
      window.speechSynthesis.cancel();
      const u = new SpeechSynthesisUtterance(text);
      u.lang = voiceControlLang || "en-IN";
      u.onend = () => {
        assistantSpeakingRef.current = false;
        assistantVoiceCooldownUntilRef.current = Date.now() + 1200;
        voiceControlRestartBlockedRef.current = false;
        if (voiceControlOn) {
          if (voiceControlStartRetryTimerRef.current) {
            window.clearTimeout(voiceControlStartRetryTimerRef.current);
          }
          voiceControlStartRetryTimerRef.current = window.setTimeout(() => {
            if (!voiceControlDesiredRef.current) return;
            const nextRecognition = voiceControlRef.current;
            if (!nextRecognition) return;
            if (voiceControlActiveRef.current || voiceControlStartingRef.current) return;
            voiceControlStartingRef.current = true;
            try {
              nextRecognition.start();
            } catch (err) {
              const msg = (err?.message || "").toLowerCase();
              if (!msg.includes("already started")) {
                setVoiceControlError(err?.message || "Unable to start voice input.");
              }
              voiceControlStartingRef.current = false;
            }
          }, 120);
        }
        commandLockRef.current = false;
      };
      u.onerror = () => {
        assistantSpeakingRef.current = false;
        assistantVoiceCooldownUntilRef.current = Date.now() + 1200;
        voiceControlRestartBlockedRef.current = false;
        if (voiceControlOn) {
          if (voiceControlStartRetryTimerRef.current) {
            window.clearTimeout(voiceControlStartRetryTimerRef.current);
          }
          voiceControlStartRetryTimerRef.current = window.setTimeout(() => {
            if (!voiceControlDesiredRef.current) return;
            const nextRecognition = voiceControlRef.current;
            if (!nextRecognition) return;
            if (voiceControlActiveRef.current || voiceControlStartingRef.current) return;
            voiceControlStartingRef.current = true;
            try {
              nextRecognition.start();
            } catch (err) {
              const msg = (err?.message || "").toLowerCase();
              if (!msg.includes("already started")) {
                setVoiceControlError(err?.message || "Unable to start voice input.");
              }
              voiceControlStartingRef.current = false;
            }
          }, 120);
        }
        commandLockRef.current = false;
      };
      window.speechSynthesis.speak(u);
    },
    [voiceControlLang, voiceControlOn, voiceControlTalkBack]
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

  const isInvalidVoiceInput = useCallback((rawText) => {
    const text = (rawText || "").toLowerCase().trim();
    if (!text || text.length < 2) return true;
    if (!/[a-z0-9]/i.test(text)) return true;
    if (/^([a-z0-9])\1{4,}$/i.test(text)) return true;
    const words = text.split(/\s+/).filter(Boolean);
    if (!words.length) return true;
    const filler = new Set(["um", "uh", "hmm", "hmmm", "aaa", "aa", "huh"]);
    const fillerCount = words.filter((w) => filler.has(w)).length;
    if (fillerCount === words.length) return true;
    return false;
  }, []);

  const normalizeVoiceCommandText = useCallback((rawText) => {
    let text = (rawText || "").toLowerCase();
    text = text.replace(/[.,!?]/g, " ").replace(/\s+/g, " ").trim();
    const replacements = [
      [/\b(path\s*ease|pathis|pathees|patheasee|pathase|pathez|patiz)\b/g, "pathease"],
      [/\b(good moring|good mroning|good mourning)\b/g, "good morning"],
      [/\b(itinary|iterinary|itenerary|iternery|itnerary|itenary|iteneri|itinery)\b/g, "itinerary"],
      [/\b(ai itinary|ai itenerary)\b/g, "ai itinerary"],
      [/\b(add to card|add in cart)\b/g, "add to cart"],
      [/\b(remove from card)\b/g, "remove from cart"],
      [/\b(open cap)\b/g, "open cart"],
      [/\b(gaurdian|guardion)\b/g, "guardian"],
      [/\b(live traking|live track ing)\b/g, "live tracking"],
      [/\b(acessibility|accesibility)\b/g, "accessibility"],
      [/\b(senti ment|sentimant)\b/g, "sentiment"],
      [/\b(log out)\b/g, "logout"],
    ];
    replacements.forEach(([pattern, value]) => {
      text = text.replace(pattern, value);
    });
    return text.replace(/\s+/g, " ").trim();
  }, []);

  const runVoiceCommand = useCallback(
    async (rawText) => {
      const now = Date.now();
      if (commandLockRef.current) return;
      if (now - lastCommandAtRef.current < 650) return;
      commandLockRef.current = true;
      lastCommandAtRef.current = now;
      let unlockDelayMs = 700;
      try {
        const text = normalizeVoiceCommandText(rawText);
        if (!text) return;
        if (isInvalidVoiceInput(text)) {
          unlockDelayMs = 1700;
          speakAssistantText("Pathease Assistant: Invalid input. Please say a clear command.", { force: true });
          return;
        }
        setLastVoiceCommand(text);

        const say = (t, opts = {}) => {
          speakAssistantText(t, opts);
        };
        const normalizeUiText = (v) =>
          (v || "")
            .toLowerCase()
            .replace(/[^a-z0-9\s]/g, " ")
            .replace(/\s+/g, " ")
            .trim();
        const clickVisibleControl = (targetLabel) => {
          const target = normalizeUiText(targetLabel);
          if (!target) return false;
          const destructiveIntent =
            /\b(delete|remove account|remove user|block user|drop|destroy|permanent)\b/.test(target);
          if (destructiveIntent) {
            unlockDelayMs = 1800;
            say("Pathease Assistant: That action is blocked for safety.");
            return true;
          }
          const nodes = Array.from(
            document.querySelectorAll(
              "button, a, [role='button'], input[type='button'], input[type='submit']"
            )
          );
          const best = nodes.find((el) => {
            const rect = el.getBoundingClientRect();
            if (rect.width === 0 || rect.height === 0) return false;
            const style = window.getComputedStyle(el);
            if (
              style.display === "none" ||
              style.visibility === "hidden" ||
              style.pointerEvents === "none"
            ) {
              return false;
            }
            const label = normalizeUiText(
              el.getAttribute("data-speak") ||
                el.getAttribute("aria-label") ||
                el.getAttribute("title") ||
                (el.tagName === "INPUT" ? el.value : "") ||
                el.textContent ||
                ""
            );
            if (!label) return false;
            return (
              label.includes(target) ||
              target.includes(label) ||
              target.split(" ").every((w) => label.includes(w))
            );
          });
          if (!best) return false;
          best.click();
          return true;
        };
        const navigateByAlias = (rawTarget) => {
          const target = normalizeUiText(rawTarget);
          if (!target) return false;
          const table = [
            { keys: ["home"], path: "/" },
            { keys: ["map", "maps"], path: "/maps" },
            { keys: ["upload"], path: "/upload", login: true },
            { keys: ["guardian requests", "guardian request"], path: "/guardian-request", login: true },
            { keys: ["live tracking", "tracking"], path: "/guardian-tracking", login: true },
            { keys: ["planner", "ai itinerary", "trip planner"], path: "/ai-itinerary" },
            { keys: ["sentiment", "feedback"], path: "/ai-sentiment" },
            { keys: ["itinerary"], path: "/itinerary" },
            { keys: ["profile"], path: "/profile", login: true },
            { keys: ["cart"], path: "/cart", login: true },
            { keys: ["accessibility"], path: "/accessibility" },
            { keys: ["login"], path: "/login" },
            { keys: ["signup", "register"], path: "/signup" },
            { keys: ["admin users"], path: "/admin/users", admin: true },
            { keys: ["admin analytics"], path: "/admin/analytics", admin: true },
            { keys: ["admin pending", "pending places"], path: "/admin/pending", admin: true },
            { keys: ["admin"], path: "/admin", admin: true },
          ];
          const match = table.find((row) =>
            row.keys.some((k) => target === k || target.includes(k))
          );
          if (!match) return false;
          if (match.admin && !guardAdminOnly("This section")) return true;
          if (match.login && !guardLoggedIn("access this feature")) return true;
          navigate(match.path);
          return true;
        };
        const guardLoggedIn = (featureLabel) => {
          if (isLoggedIn) return true;
          unlockDelayMs = 1700;
          say(`Pathease Assistant: Please login to ${featureLabel}.`);
          return false;
        };
        const guardAdminOnly = (featureLabel) => {
          if (isLoggedIn && isAdmin) return true;
          unlockDelayMs = 1800;
          say(`Pathease Assistant: ${featureLabel} is available only for admin users.`);
          return false;
        };
        const emitVoiceAction = (type, detail = {}) => {
          const dispatch = () =>
            window.dispatchEvent(
              new CustomEvent("pathease:voice-command", {
                detail: { type, ...detail },
              })
            );
          const actionKey = `${type}|${detail?.name || ""}|${detail?.value || ""}`;
          const now = Date.now();
          if (
            lastVoiceActionRef.current.key === actionKey &&
            now - lastVoiceActionRef.current.ts < 1400
          ) {
            return;
          }
          lastVoiceActionRef.current = { key: actionKey, ts: now };
          const dispatchWithRetries = (delay = 0) => {
            const attempts = [delay, delay + 450];
            attempts.forEach((ms) => {
              window.setTimeout(dispatch, ms);
            });
          };
          const itineraryTypes = new Set([
            "generate-itinerary",
            "save-itinerary",
            "set-destination",
            "set-days",
            "set-budget",
            "set-travel-type",
            "set-interests",
            "set-currency",
            "use-current-location",
          ]);
          const homeTypes = new Set(["open-place", "close-place", "add-to-cart", "remove-from-cart"]);
          if (itineraryTypes.has(type)) {
            if (location.pathname !== "/ai-itinerary") navigate("/ai-itinerary");
            dispatchWithRetries(460);
            return;
          }
          if (homeTypes.has(type)) {
            if (location.pathname !== "/") navigate("/");
            dispatchWithRetries(420);
            return;
          }
          dispatch();
        };
        if (/^(hi|hello|hey|good morning|good afternoon|good evening)\b/.test(text)) {
          unlockDelayMs = 1700;
          say("Pathease Assistant: Hello. I am ready. You can ask me to open maps, itinerary, cart, or compare places.", { force: true });
          return;
        }
        if (text.includes("how are you")) {
          unlockDelayMs = 1600;
          say("Pathease Assistant: I am great and ready to guide your trip.");
          return;
        }
        if (text.includes("which place is better") || text.startsWith("compare ")) {
          unlockDelayMs = 2200;
          say("Pathease Assistant: It depends on your budget, time, and interests. Tell me two places and I will compare accessibility, crowd, and travel ease.", { force: true });
          return;
        }
        if (text.startsWith("search ") || text.startsWith("find ")) {
          const q = text.replace(/^(search|find)\s+/i, "").trim();
          if (q) {
            navigate(`/search-results?q=${encodeURIComponent(q)}`);
            unlockDelayMs = 1200;
            say(`Pathease Assistant: Searching for ${q}.`, { force: true });
            return;
          }
        }
        if (
          /^(start navigation|start nav|begin navigation|navigate now|start google maps)\b/.test(
            text
          )
        ) {
          const ok = clickVisibleControl("start navigation");
          if (ok) {
            unlockDelayMs = 1200;
            say("Pathease Assistant: Starting navigation.");
          } else {
            unlockDelayMs = 1700;
            say("Pathease Assistant: I could not find a start navigation button on this screen.");
          }
          return;
        }
        if (/^(open|show|go to)\s+/.test(text)) {
          const target = text.replace(/^(open|show|go to)\s+/, "").trim();
          if (!target) {
            unlockDelayMs = 1400;
            say("Pathease Assistant: Please say what to open.");
            return;
          }
          if (navigateByAlias(target)) return;
          const ok = clickVisibleControl(target);
          if (ok) {
            unlockDelayMs = 1100;
            say(`Pathease Assistant: Opening ${target}.`);
          } else {
            unlockDelayMs = 1700;
            say(`Pathease Assistant: I could not find ${target} on this screen.`);
          }
          return;
        }
        if (/^(click|press|tap)\s+/.test(text)) {
          const target = text.replace(/^(click|press|tap)\s+/, "").trim();
          if (!target) {
            unlockDelayMs = 1400;
            say("Pathease Assistant: Please say the button name.");
            return;
          }
          const ok = clickVisibleControl(target);
          if (ok) {
            unlockDelayMs = 1100;
            say(`Pathease Assistant: Clicking ${target}.`);
          } else {
            unlockDelayMs = 1700;
            say(`Pathease Assistant: I could not find ${target} on this screen.`);
          }
          return;
        }
        const getValueAfter = (re) => {
          const match = text.match(re);
          return match && match[1] ? match[1].trim() : "";
        };
        const executeAction = (action) => {
          if (!action || typeof action !== "object") return false;
          if (action.type === "navigate" && action.path) {
            if (action.path === "/ai-chat") {
              unlockDelayMs = 1400;
              say("Pathease Assistant: Chat is disabled in voice navigation.");
              return true;
            }
            if (
              ["/admin", "/admin/pending", "/admin/users", "/admin/analytics"].includes(action.path) &&
              !guardAdminOnly("This section")
            ) {
              return true;
            }
            if (
              ["/cart", "/profile", "/guardian-request", "/guardian-tracking", "/upload"].includes(action.path) &&
              !guardLoggedIn("access this feature")
            ) {
              return true;
            }
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
            if (
              [
                "add-to-cart",
                "remove-from-cart",
                "generate-itinerary",
                "save-itinerary",
                "set-destination",
                "set-days",
                "set-budget",
                "set-travel-type",
                "set-interests",
                "set-currency",
                "use-current-location",
              ].includes(action.event_type) &&
              !guardLoggedIn("use this feature")
            ) {
              return true;
            }
            emitVoiceAction(action.event_type, {
              ...(action.name ? { name: action.name } : {}),
              ...(action.value ? { value: action.value } : {}),
            });
            return true;
          }
          return false;
        };

        const looksLikeActionableCommand = (value) =>
          /\b(open|go|back|add|remove|generate|create|save|set|search|find|start|click|press|tap|logout|login|help|speech|maps|itinerary|cart|profile|admin|guardian|upload|accessibility|sentiment|planner|navigation)\b/i.test(
            value || ""
          );

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
            const out = /^pathease assistant:/i.test(aiReply) ? aiReply : `Pathease Assistant: ${aiReply}`;
            speakAssistantText(out);
          }
          // Only short-circuit when AI actually performed actions, or when input was not command-like.
          // If command-like text got only a conversational AI reply, continue to deterministic local parser.
          if (handledByAI || (aiReply && !looksLikeActionableCommand(text))) {
            unlockDelayMs = aiReply ? 2200 : 1400;
            return;
          }
        } catch {
          // Fallback to deterministic local parser below.
        }

        if (text.includes("go home") || text === "home") {
          navigate("/");
          return;
        }
        if (text === "back" || text.includes("go back") || text.includes("previous page")) {
          if (location.pathname === "/") {
            emitVoiceAction("close-place");
            return;
          }
          navigate(-1);
          return;
        }
        if (text.includes("open maps") || text.includes("maps")) {
          navigate("/maps");
          return;
        }
        if (text.includes("open admin")) {
          if (!guardAdminOnly("Admin panel")) return;
          navigate("/admin");
          return;
        }
        if (text.includes("open pending places") || text.includes("admin pending")) {
          if (!guardAdminOnly("Pending places")) return;
          navigate("/admin/pending");
          return;
        }
        if (text.includes("open admin users") || text.includes("admin users")) {
          if (!guardAdminOnly("Admin users")) return;
          navigate("/admin/users");
          return;
        }
        if (text.includes("open admin analytics") || text.includes("admin analytics")) {
          if (!guardAdminOnly("Admin analytics")) return;
          navigate("/admin/analytics");
          return;
        }
        if (text.includes("open upload") || text.includes("upload")) {
          navigate("/upload");
          return;
        }
        if (text.includes("guardian requests")) {
          if (!guardLoggedIn("open guardian requests")) return;
          navigate("/guardian-request");
          return;
        }
        if (text.includes("live tracking")) {
          if (!guardLoggedIn("open live tracking")) return;
          navigate("/guardian-tracking");
          return;
        }
        if (
          text.includes("ai itinerary") ||
          text.includes("trip planner") ||
          text.includes("open planner")
        ) {
          navigate("/ai-itinerary");
          return;
        }
        if (
          text.includes("ai sentiment") ||
          text.includes("open ai sentiment") ||
          text.includes("open sentiment") ||
          text.includes("sentiment") ||
          text.includes("feedback")
        ) {
          navigate("/ai-sentiment");
          return;
        }
        if (text.includes("itinerary")) {
          navigate("/itinerary");
          return;
        }
        if (text.includes("profile")) {
          if (!guardLoggedIn("open profile")) return;
          navigate("/profile");
          return;
        }
        if (text.includes("accessibility page") || text.includes("open accessibility")) {
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
          if (!guardLoggedIn("open cart")) return;
          navigate("/cart");
          return;
        }
        if (text.includes("open login") || text === "login") {
          navigate("/login");
          return;
        }
        if (text.includes("open place")) {
          const name = getValueAfter(/open place\s+(.+)/i);
          if (!name) {
            unlockDelayMs = 1800;
            say("Please say the place name.");
            return;
          }
          emitVoiceAction("open-place", { name });
          return;
        }
        if (text.includes("close place") || text.includes("close details") || text.includes("close detail")) {
          emitVoiceAction("close-place");
          return;
        }
        if (text.includes("add to cart") || text.includes("click add to cart") || text.includes("press add to cart")) {
          if (!guardLoggedIn("add items to cart")) return;
          const name = getValueAfter(/add\s+(.+?)\s+to cart/i) || getValueAfter(/add to cart\s+(.+)/i);
          emitVoiceAction("add-to-cart", { name });
          return;
        }
        if (text.includes("remove from cart")) {
          if (!guardLoggedIn("remove items from cart")) return;
          const name =
            getValueAfter(/remove\s+(.+?)\s+from cart/i) ||
            getValueAfter(/remove from cart\s+(.+)/i);
          emitVoiceAction("remove-from-cart", { name });
          return;
        }
        if (
          text.includes("generate itinerary") ||
          text.includes("create itinerary") ||
          text.includes("click generate itinerary") ||
          text.includes("press generate itinerary")
        ) {
          if (!guardLoggedIn("generate itinerary")) return;
          emitVoiceAction("generate-itinerary");
          return;
        }
        if (text.includes("save itinerary") || text.includes("click save itinerary") || text.includes("press save itinerary")) {
          if (!guardLoggedIn("save itinerary")) return;
          emitVoiceAction("save-itinerary");
          return;
        }
        if (text.includes("use current location")) {
          if (!guardLoggedIn("use current location")) return;
          emitVoiceAction("use-current-location");
          return;
        }
        if (text.includes("set destination")) {
          if (!guardLoggedIn("set destination")) return;
          const value = getValueAfter(/set destination(?: to)?\s+(.+)/i);
          if (value) emitVoiceAction("set-destination", { value });
          return;
        }
        if (text.includes("set budget")) {
          if (!guardLoggedIn("set budget")) return;
          const value = getValueAfter(/set budget(?: to)?\s+(.+)/i);
          if (value) emitVoiceAction("set-budget", { value });
          return;
        }
        if (text.includes("set days")) {
          if (!guardLoggedIn("set trip days")) return;
          const value = getValueAfter(/set days(?: to)?\s+(.+)/i);
          if (value) emitVoiceAction("set-days", { value });
          return;
        }
        if (text.includes("set travel type")) {
          if (!guardLoggedIn("set travel type")) return;
          const value = getValueAfter(/set travel type(?: to)?\s+(.+)/i);
          if (value) emitVoiceAction("set-travel-type", { value });
          return;
        }
        if (text.includes("set interests")) {
          if (!guardLoggedIn("set interests")) return;
          const value = getValueAfter(/set interests(?: to)?\s+(.+)/i);
          if (value) emitVoiceAction("set-interests", { value });
          return;
        }
        if (text.includes("set currency")) {
          if (!guardLoggedIn("set currency")) return;
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
          unlockDelayMs = 2200;
          say("Pathease Assistant: Say Hey PathEase, then commands like go home, open maps, open itinerary, open place Gateway of India, add to cart, generate itinerary, save itinerary, speech on, speech off, open cart, or logout.");
          return;
        }

        unlockDelayMs = 1800;
        say("Pathease Assistant: Invalid command. Say help to hear commands.", { force: true });
      } finally {
        window.setTimeout(() => {
          commandLockRef.current = false;
        }, unlockDelayMs);
      }
    },
    [isAdmin, isInvalidVoiceInput, isLoggedIn, location.pathname, navigate, logout, normalizeVoiceCommandText, speakAssistantText, toggleColorBlindMode, voiceControlLang]
  );

  const parseWakeCommand = useCallback((rawText) => {
    const cleaned = normalizeVoiceCommandText(rawText);
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
  }, [normalizeVoiceCommandText]);

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

  const isDirectVoiceCommand = useCallback((rawText) => {
    const t = normalizeVoiceCommandText(rawText);
    if (!t) return false;
    return /^(go home|home|open maps|maps|back|go back|previous page|open admin|open pending places|admin pending|open admin users|admin users|open admin analytics|admin analytics|open upload|guardian requests|live tracking|ai itinerary|trip planner|open planner|ai sentiment|open ai sentiment|open sentiment|feedback|itinerary|profile|accessibility(?: page)?|open accessibility|speech on|speech off|open quick menu|close quick menu|open cart|open login|login|open place\b|close place|close details|add to cart|remove from cart|click add to cart|press add to cart|generate itinerary|create itinerary|click generate itinerary|press generate itinerary|save itinerary|click save itinerary|press save itinerary|use current location|set destination|set budget|set days|set travel type|set interests|set currency|search\b|find\b|start navigation|start nav|begin navigation|navigate now|start google maps|open\b|show\b|go to\b|click\b|press\b|tap\b|which place is better|compare\b|how are you|logout|help)\b/.test(
      t
    );
  }, [normalizeVoiceCommandText]);

  const processWakeWordTranscript = useCallback(
    (transcript) => {
      const parsed = parseWakeCommand(transcript);
      const say = (t) => {
        speakAssistantText(t);
      };

      if (parsed.wakeDetected) {
        signalListeningState("wake");
        if (parsed.command) {
          disarmAssistant();
          void runVoiceCommand(parsed.command);
        } else {
          armAssistant();
          say("Hello, I am Pathease Assistant. How can I help you explore accessible places today?", { force: true });
          setLastVoiceCommand("hey pathease");
        }
        return;
      }

      if (/\bhey\b|\bhello\b|\bhi\b|\bgood morning\b/.test((parsed.command || transcript || "").toLowerCase())) {
        void runVoiceCommand(parsed.command || transcript);
        return;
      }

      if (assistantArmed) {
        disarmAssistant();
        void runVoiceCommand(parsed.command || transcript);
        return;
      }

      if (isDirectVoiceCommand(parsed.command || transcript)) {
        void runVoiceCommand(parsed.command || transcript);
        return;
      }

      const fallbackText = normalizeVoiceCommandText(parsed.command || transcript || "");
      const looksLikeCommand = /\b(open|go|back|add|remove|generate|create|save|set|search|find|start|click|press|tap|logout|login|help|speech|maps|itinerary|cart|profile|admin|guardian|upload|accessibility|sentiment|planner)\b/.test(
        fallbackText
      );
      if (looksLikeCommand && fallbackText.length >= 4) {
        void runVoiceCommand(fallbackText);
      }
    },
    [
      armAssistant,
      assistantArmed,
      disarmAssistant,
      isDirectVoiceCommand,
      parseWakeCommand,
      normalizeVoiceCommandText,
      runVoiceCommand,
      signalListeningState,
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
    voiceControlStartingRef.current = false;
    voiceControlActiveRef.current = false;
    voiceTranscriptFinalRef.current = "";
    voiceTranscriptInterimRef.current = "";
    if (voiceTranscriptFlushTimerRef.current) {
      window.clearTimeout(voiceTranscriptFlushTimerRef.current);
      voiceTranscriptFlushTimerRef.current = null;
    }
    if (voiceTranscriptMaxTimerRef.current) {
      window.clearTimeout(voiceTranscriptMaxTimerRef.current);
      voiceTranscriptMaxTimerRef.current = null;
    }
    if (voiceControlStartRetryTimerRef.current) {
      window.clearTimeout(voiceControlStartRetryTimerRef.current);
      voiceControlStartRetryTimerRef.current = null;
    }
    setVoiceControlActive(false);
  }, [voiceControlOn]);

  const tryStartVoiceRecognition = useCallback(() => {
    if (!voiceControlOn) return;
    if (voiceControlActiveRef.current || voiceControlStartingRef.current) return;
    const recognition = voiceControlRef.current;
    if (!recognition) return;
    voiceControlStartingRef.current = true;
    try {
      recognition.start();
    } catch (err) {
      const msg = err?.message || "";
      if (!msg.toLowerCase().includes("already started")) {
        setVoiceControlError(msg || "Unable to start voice input.");
      }
      voiceControlStartingRef.current = false;
    }
  }, [voiceControlOn]);

  const flushBufferedTranscript = useCallback(() => {
    if (voiceTranscriptFlushTimerRef.current) {
      window.clearTimeout(voiceTranscriptFlushTimerRef.current);
      voiceTranscriptFlushTimerRef.current = null;
    }
    if (voiceTranscriptMaxTimerRef.current) {
      window.clearTimeout(voiceTranscriptMaxTimerRef.current);
      voiceTranscriptMaxTimerRef.current = null;
    }
    const finalText = `${voiceTranscriptFinalRef.current} ${voiceTranscriptInterimRef.current}`.trim();
    voiceTranscriptFinalRef.current = "";
    voiceTranscriptInterimRef.current = "";
    if (assistantSpeakingRef.current || Date.now() < assistantVoiceCooldownUntilRef.current) return;
    if (!finalText || finalText.length < 2 || commandLockRef.current) return;
    processWakeWordTranscript(finalText);
  }, [processWakeWordTranscript]);

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
    recognition.interimResults = true;
    recognition.continuous = true;

    recognition.onstart = () => {
      voiceControlStartingRef.current = false;
      voiceControlActiveRef.current = true;
      setVoiceControlActive(true);
      setVoiceControlError("");
      voiceControlRestartBlockedRef.current = false;
      playCueTone(980, 110);
    };
    recognition.onerror = (evt) => {
      const errCode = evt?.error || "";
      const isExpectedTransient = errCode === "aborted" || errCode === "no-speech";
      voiceControlStartingRef.current = false;
      voiceControlActiveRef.current = false;
      if (errCode === "no-speech") {
        speakAssistantText("Pathease Assistant: Invalid input. I did not catch that. Please speak clearly.", { force: true });
      }
      if (!isExpectedTransient) {
        setVoiceControlError(errCode || "Voice input error");
      }
      setVoiceControlActive(false);
      voiceControlRestartBlockedRef.current = true;
      window.setTimeout(() => {
        voiceControlRestartBlockedRef.current = false;
        if (voiceControlDesiredRef.current) tryStartVoiceRecognition();
      }, 1200);
    };
    recognition.onend = () => {
      voiceControlStartingRef.current = false;
      voiceControlActiveRef.current = false;
      setVoiceControlActive(false);
      playCueTone(520, 100);
      flushBufferedTranscript();
      window.setTimeout(() => {
        if (voiceControlDesiredRef.current && !voiceControlRestartBlockedRef.current) {
          tryStartVoiceRecognition();
        }
      }, 500);
    };
    recognition.onresult = (evt) => {
      if (commandLockRef.current) return;
      if (assistantSpeakingRef.current || Date.now() < assistantVoiceCooldownUntilRef.current) return;
      let finalChunk = "";
      let interimChunk = "";
      for (let i = evt.resultIndex; i < evt.results.length; i += 1) {
        const r = evt.results[i];
        const txt = (r && r[0] ? r[0].transcript : "").trim();
        if (!txt) continue;
        if (r.isFinal) {
          finalChunk += ` ${txt}`;
        } else {
          interimChunk = txt;
        }
      }
      if (finalChunk.trim()) {
        voiceTranscriptFinalRef.current = `${voiceTranscriptFinalRef.current} ${finalChunk}`.trim();
      }
      voiceTranscriptInterimRef.current = interimChunk;
      if (!voiceTranscriptMaxTimerRef.current) {
        voiceTranscriptMaxTimerRef.current = window.setTimeout(() => {
          flushBufferedTranscript();
        }, 5000);
      }
      if (voiceTranscriptFlushTimerRef.current) {
        window.clearTimeout(voiceTranscriptFlushTimerRef.current);
      }
      voiceTranscriptFlushTimerRef.current = window.setTimeout(() => {
        flushBufferedTranscript();
      }, 650);
    };

    voiceControlRef.current = recognition;
    if (voiceControlOn) {
      tryStartVoiceRecognition();
    }

    return () => {
      voiceControlStartingRef.current = false;
      voiceControlActiveRef.current = false;
      voiceTranscriptFinalRef.current = "";
      voiceTranscriptInterimRef.current = "";
      if (voiceTranscriptFlushTimerRef.current) {
        window.clearTimeout(voiceTranscriptFlushTimerRef.current);
        voiceTranscriptFlushTimerRef.current = null;
      }
      if (voiceTranscriptMaxTimerRef.current) {
        window.clearTimeout(voiceTranscriptMaxTimerRef.current);
        voiceTranscriptMaxTimerRef.current = null;
      }
      if (voiceControlStartRetryTimerRef.current) {
        window.clearTimeout(voiceControlStartRetryTimerRef.current);
        voiceControlStartRetryTimerRef.current = null;
      }
      try {
        recognition.stop();
      } catch {}
    };
  }, [flushBufferedTranscript, playCueTone, speakAssistantText, voiceControlLang, voiceControlOn, tryStartVoiceRecognition]);

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
    if (wakeVisualTimerRef.current) {
      window.clearTimeout(wakeVisualTimerRef.current);
      wakeVisualTimerRef.current = null;
    }
    if (voiceTranscriptFlushTimerRef.current) {
      window.clearTimeout(voiceTranscriptFlushTimerRef.current);
      voiceTranscriptFlushTimerRef.current = null;
    }
    if (voiceTranscriptMaxTimerRef.current) {
      window.clearTimeout(voiceTranscriptMaxTimerRef.current);
      voiceTranscriptMaxTimerRef.current = null;
    }
    if (voiceControlStartRetryTimerRef.current) {
      window.clearTimeout(voiceControlStartRetryTimerRef.current);
      voiceControlStartRetryTimerRef.current = null;
    }
    if (assistantArmTimerRef.current) {
      window.clearTimeout(assistantArmTimerRef.current);
      assistantArmTimerRef.current = null;
    }
    if (cueAudioCtxRef.current && cueAudioCtxRef.current.state !== "closed") {
      cueAudioCtxRef.current.close().catch(() => {});
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
    
  ];

  if (isLoggedIn) {
    navItems.push(
      { label: "Upload", href: "/upload" },
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

      {wakeVisualState !== "idle" && (
        <button
          type="button"
          onClick={() => setVoiceControlPanelOpen((v) => !v)}
          className={`voice-wake-orb${wakeVisualState !== "idle" ? " is-visible" : ""}${wakeVisualState === "wake" ? " is-wake" : ""}${voiceControlActive ? " is-live" : ""}${wakeVisualState === "end" ? " is-end" : ""}`}
          aria-label="Voice assistant status"
          title={voiceControlActive ? "Listening..." : "Voice assistant"}
        >
          {voiceControlActive ? "Listening" : wakeVisualState === "wake" ? "Wake" : "Mic"}
        </button>
      )}

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
                      FeedBack
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

              <label className="voice-control-switch" htmlFor="voice-control-talkback-toggle" style={{ marginTop: 8 }}>
                <span>Talk Back</span>
                <input
                  id="voice-control-talkback-toggle"
                  type="checkbox"
                  checked={voiceControlTalkBack}
                  onChange={(e) => setVoiceControlTalkBack(e.target.checked)}
                />
                <span className="voice-control-slider" />
              </label>

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
