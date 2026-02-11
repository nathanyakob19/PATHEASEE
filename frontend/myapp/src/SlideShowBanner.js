import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "./AuthContext";

/* ========================= BANNER EDIT FILE =========================
You only need to edit this section.

Global settings:
- intervalMs: auto slide speed
- showDots: show/hide bottom dots
- showArrows: show/hide previous/next buttons

Per slide:
- theme: "dark" | "light"
- align: "left" | "center" | "right"
- vAlign: "top" | "center" | "bottom"
- tag/title/description: text content
- image: "/file.jpg" from public folder (optional)
- cta: optional button { label, href }
==================================================================== */
const BANNER_CONFIG = {
  intervalMs: 5000,
  showDots: true,
  showArrows: false,
  slides: [
    {
      theme: "dark",
      align: "center",
      vAlign: "center",
      tag: "Home ",
      title: "PATHEASE",
      description: "MAKING TOURISM FOR ALL",
      image: "",
      cta: { label: "Explore Places", href: "#nearby-places" },
    },
    {
      theme: "light",
      align: "left",
      vAlign: "center",
      tag: "Navigation",
      title: "Map + Route Guidance",
      description:
        "View places on the map and launch navigation quickly for seamless travel planning.",
      image: "",
      cta: { label: "Open Maps", action: "maps", href: "/maps" },
    },
    {
      theme: "dark",
      align: "left",
      vAlign: "center",
      tag: "Voice",
      title: "Hands-Free Commands",
      description:
        "Use voice commands to open maps, control navigation actions, and move faster in-app.",
      image: "",
      cta: { label: "Try Voice Navigation", action: "voice", href: "/" },
      commands: [
        "Start navigation",
        "Pause navigation",
        "Resume navigation",
        "Stop navigation",
        "Repeat instruction",
        "Mute voice / Unmute voice",
        "Recenter map",
        "Zoom in / Zoom out",
        "Show alternate routes",
        "What is ETA?",
      ],
    },
    {
      theme: "light",
      align: "left",
      vAlign: "center",
      tag: "Safety",
      title: "Guardian Live Tracking",
      description:
        "Share live location with trusted contacts and track safely during your journey.",
      image: "",
      cta: { label: "Open Tracking", action: "guardian-tracking", href: "/guardian-tracking" },
    },
  ],
};

function SlideshowBanner() {
  const { intervalMs, showDots, showArrows, slides } = BANNER_CONFIG;
  const [index, setIndex] = useState(0);
  const navigate = useNavigate();
  const { isLoggedIn } = useAuth();

  const handleCtaClick = (event, cta) => {
    const action = cta?.action || "";
    const href = cta?.href || "#";
    const label = (cta?.label || "").toLowerCase();
    const normalized = action.toLowerCase();

    const isMapCta =
      normalized === "maps" ||
      normalized === "map" ||
      normalized === "snapmap" ||
      href.toLowerCase().includes("map") ||
      label.includes("map");

    if (isMapCta) {
      event.preventDefault();
      navigate("/maps");
      return;
    }

    if (normalized === "voice") {
      event.preventDefault();
      if (!isLoggedIn) {
        navigate("/login");
        return;
      }
      navigate("/");
      window.dispatchEvent(new Event("pathease:open-voice-navigation"));
      return;
    }

    if (normalized === "guardian-tracking") {
      event.preventDefault();
      if (!isLoggedIn) {
        navigate("/login");
        return;
      }
      navigate("/guardian-tracking");
      return;
    }

    if (!href) return;
    if (href.startsWith("#")) {
      event.preventDefault();
      const target = document.querySelector(href);
      if (target) {
        target.scrollIntoView({ behavior: "smooth", block: "start" });
      }
      return;
    }

    if (href.startsWith("/")) {
      event.preventDefault();
      navigate(href);
    }
  };

  useEffect(() => {
    if (!slides.length || intervalMs <= 0) return undefined;
    const interval = setInterval(() => {
      setIndex((prev) => (prev + 1) % slides.length);
    }, intervalMs);
    return () => clearInterval(interval);
  }, [slides.length, intervalMs]);

  if (!slides.length) return null;

  return (
    <section className="banner-container hero-slider" aria-label="Home Hero">
      {slides.map((slide, i) => (
        <article
          key={`${slide.title}-${i}`}
          className={`hero-slide hero-slide-${slide.theme || "light"} hero-align-${slide.align || "left"} hero-valign-${slide.vAlign || "center"} ${i === index ? "active" : ""}`}
          aria-hidden={i !== index}
        >
          {slide.image ? (
            <div className="hero-slide-media">
              <img src={slide.image} alt={slide.title || "Banner"} className="hero-slide-image" />
              <div className="hero-slide-overlay" />
            </div>
          ) : null}

          <div className="hero-content">
            {slide.tag ? <p className="hero-tag">{slide.tag}</p> : null}
            {slide.title ? <h2 className="hero-title">{slide.title}</h2> : null}
            {slide.description ? <p className="hero-description">{slide.description}</p> : null}
            {Array.isArray(slide.commands) && slide.commands.length > 0 ? (
              <ul className="hero-commands">
                {slide.commands.map((command) => (
                  <li key={command}>{command}</li>
                ))}
              </ul>
            ) : null}
            {slide.cta?.label ? (
              <a
                className="hero-cta"
                href={slide.cta.href || "#"}
                onClick={(event) => handleCtaClick(event, slide.cta)}
              >
                {slide.cta.label}
              </a>
            ) : null}
          </div>
        </article>
      ))}

      {showArrows ? (
        <>
          <button
            type="button"
            className="hero-nav hero-nav-prev"
            onClick={() => setIndex((prev) => (prev - 1 + slides.length) % slides.length)}
            aria-label="Previous slide"
          >
            Prev
          </button>
          <button
            type="button"
            className="hero-nav hero-nav-next"
            onClick={() => setIndex((prev) => (prev + 1) % slides.length)}
            aria-label="Next slide"
          >
            Next
          </button>
        </>
      ) : null}

      {showDots ? (
        <div className="hero-dots" aria-hidden="true">
          {slides.map((slide, i) => (
            <button
              type="button"
              key={`${slide.title || "slide"}-${i}`}
              className={`hero-dot ${i === index ? "active" : ""}`}
              onClick={() => setIndex(i)}
              aria-label={`Go to slide ${i + 1}`}
            />
          ))}
        </div>
      ) : null}
    </section>
  );
}

export default SlideshowBanner;
