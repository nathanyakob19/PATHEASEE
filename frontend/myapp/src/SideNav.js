import React from "react";
import { Link } from "react-router-dom";
import "./SideNav.css";

export default function SideNav({
  isOpen,
  items,
  activeHref,
  onClose,
  onItemClick,
}) {
  const handleClick = (item, e) => {
    if (item.action === "logout") {
      e.preventDefault();
      onItemClick?.(item);
    }
    onClose?.();
  };

  return (
    <>
      <div className={`side-nav-overlay ${isOpen ? "is-open" : ""}`} onClick={onClose} />
      <aside className={`side-nav ${isOpen ? "is-open" : ""}`} aria-label="Side Navigation">
        <div className="side-nav-header">
          <div className="side-nav-title">PathEase</div>
          <button className="side-nav-close" onClick={onClose} aria-label="Close menu">
            X
          </button>
        </div>
        <nav className="side-nav-links">
          {items.map((item) => (
            <div key={item.label} className="side-nav-item">
              {item.href ? (
                <Link
                  to={item.href}
                  className={`side-nav-link ${activeHref === item.href ? "is-active" : ""}`}
                  onClick={(e) => handleClick(item, e)}
                >
                  {item.label}
                </Link>
              ) : (
                <button
                  className="side-nav-link"
                  onClick={(e) => handleClick(item, e)}
                  type="button"
                >
                  {item.label}
                </button>
              )}
            </div>
          ))}
        </nav>
      </aside>
    </>
  );
}
