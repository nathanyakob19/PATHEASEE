import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { gsap } from "gsap";
import "./PillNav.css";

const PillNav = ({
  logo,
  logoAlt = "Logo",
  items,
  activeHref,
  className = "",
  ease = "power3.easeOut",
  baseColor = "#fff",
  pillColor = "#5c0cdbff",
  hoveredPillTextColor = "#5a0dd6ff",
  pillTextColor,
  onItemClick,          // ✅ REQUIRED ADDITION
  onMobileMenuClick,
  initialLoadAnimation = true,
}) => {
  const resolvedPillTextColor = pillTextColor ?? baseColor;
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const circleRefs = useRef([]);
  const tlRefs = useRef([]);
  const logoImgRef = useRef(null);
  const logoTweenRef = useRef(null);
  const hamburgerRef = useRef(null);
  const mobileMenuRef = useRef(null);
  const navItemsRef = useRef(null);
  const logoRef = useRef(null);

  /* ---------------- ANIMATION SETUP ---------------- */
  useEffect(() => {
    const layout = () => {
      circleRefs.current.forEach((circle) => {
        if (!circle?.parentElement) return;

        const pill = circle.parentElement;
        const rect = pill.getBoundingClientRect();
        const { width: w, height: h } = rect;
        const R = ((w * w) / 4 + h * h) / (2 * h);
        const D = Math.ceil(2 * R) + 2;
        const delta =
          Math.ceil(R - Math.sqrt(Math.max(0, R * R - (w * w) / 4))) + 1;

        circle.style.width = `${D}px`;
        circle.style.height = `${D}px`;
        circle.style.bottom = `-${delta}px`;

        gsap.set(circle, {
          xPercent: -50,
          scale: 0,
          transformOrigin: `50% ${D - delta}px`,
        });

        const index = circleRefs.current.indexOf(circle);
        if (index === -1) return;

        tlRefs.current[index]?.kill();
        const tl = gsap.timeline({ paused: true });

        tl.to(circle, {
          scale: 1.2,
          duration: 0.3,
          ease,
          overwrite: "auto",
        });

        tlRefs.current[index] = tl;
      });
    };

    layout();
    window.addEventListener("resize", layout);
    return () => window.removeEventListener("resize", layout);
  }, [items, ease, initialLoadAnimation]);

  const handleEnter = (i) => tlRefs.current[i]?.play();
  const handleLeave = (i) => tlRefs.current[i]?.reverse();

  const handleLogoEnter = () => {
    const img = logoImgRef.current;
    if (!img) return;
    logoTweenRef.current?.kill();
    gsap.set(img, { rotate: 0 });
    logoTweenRef.current = gsap.to(img, {
      rotate: 360,
      duration: 0.2,
      ease,
    });
  };

  const isExternalLink = (href) =>
    href?.startsWith("http") ||
    href?.startsWith("mailto") ||
    href?.startsWith("tel") ||
    href?.startsWith("#");

  const isRouterLink = (href) => href && !isExternalLink(href);

  const cssVars = {
    "--base": baseColor,
    "--pill-bg": pillColor,
    "--hover-text": hoveredPillTextColor,
    "--pill-text": resolvedPillTextColor,
  };

  return (
    <div className="pill-nav-container">
      <nav className={`pill-nav ${className}`} aria-label="Primary" style={cssVars}>
        {/* ---------- LOGO ---------- */}
        <Link
          className="pill-logo"
          to="/"
          aria-label="Home"
          onMouseEnter={handleLogoEnter}
          ref={logoRef}
        >
          <img src={logo} alt={logoAlt} ref={logoImgRef} />
        </Link>

        {/* ---------- DESKTOP MENU ---------- */}
        <div className="pill-nav-items desktop-only" ref={navItemsRef}>
          <ul className="pill-list" role="menubar">
            {items.map((item, i) => (
              <li key={item.label} role="none">
                {isRouterLink(item.href) ? (
                  <Link
                    role="menuitem"
                    to={item.href || "#"}
                    className={`pill${
                      activeHref === item.href ? " is-active" : ""
                    }`}
                    onMouseEnter={() => handleEnter(i)}
                    onMouseLeave={() => handleLeave(i)}
                    onClick={(e) => {
                      if (item.action === "logout") {
                        e.preventDefault();            // ✅ STOP NAVIGATION
                        onItemClick?.(item);          // ✅ TRIGGER LOGOUT
                      }
                    }}
                  >
                    <span
                      className="hover-circle"
                      ref={(el) => (circleRefs.current[i] = el)}
                    />
                    <span className="pill-label">{item.label}</span>
                  </Link>
                ) : (
                  <a
                    href={item.href}
                    className="pill"
                    onMouseEnter={() => handleEnter(i)}
                    onMouseLeave={() => handleLeave(i)}
                    onClick={(e) => {
                      if (item.action === "logout") {
                        e.preventDefault();
                        onItemClick?.(item);
                      }
                    }}
                  >
                    <span
                      className="hover-circle"
                      ref={(el) => (circleRefs.current[i] = el)}
                    />
                    <span className="pill-label">{item.label}</span>
                  </a>
                )}
              </li>
            ))}
          </ul>
        </div>

        {/* ---------- MOBILE MENU BUTTON ---------- */}
        <button
          className="mobile-menu-button mobile-only"
          onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
          ref={hamburgerRef}
          aria-label="Toggle menu"
        >
          <span className="hamburger-line" />
          <span className="hamburger-line" />
        </button>
      </nav>

      {/* ---------- MOBILE MENU ---------- */}
      <div
        className={`mobile-menu-popover mobile-only${isMobileMenuOpen ? " is-open" : ""}`}
        ref={mobileMenuRef}
        style={cssVars}
      >
        <ul className="mobile-menu-list">
          {items.map((item) => (
            <li key={item.label}>
              {isRouterLink(item.href) ? (
                <Link
                  to={item.href || "#"}
                  className={`mobile-menu-link${
                    activeHref === item.href ? " is-active" : ""
                  }`}
                  onClick={(e) => {
                    setIsMobileMenuOpen(false);
                    if (item.action === "logout") {
                      e.preventDefault();            // ✅ STOP NAVIGATION
                      onItemClick?.(item);          // ✅ TRIGGER LOGOUT
                    }
                  }}
                >
                  {item.label}
                </Link>
              ) : (
                <a
                  href={item.href}
                  className="mobile-menu-link"
                  onClick={(e) => {
                    setIsMobileMenuOpen(false);
                    if (item.action === "logout") {
                      e.preventDefault();
                      onItemClick?.(item);
                    }
                  }}
                >
                  {item.label}
                </a>
              )}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
};

export default PillNav;
