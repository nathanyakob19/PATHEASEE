import { useState, useEffect } from "react";
const images = [
  "/banner-features.jpg",
  "/banner-voice-commands.jpg",
  "/banner-maps.jpg"
];

function SlideshowBanner() {
  const [index, setIndex] = useState(0);

  // Auto-slide every 3 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      setIndex((prev) => (prev + 1) % images.length);
    }, 3000);

    return () => clearInterval(interval);
  }, []);

  return (
    <div className="banner-container">
      {images.map((img, i) => (
        <img
          key={i}
          src={img}
          alt="banner"
          className={`banner-image ${i === index ? "active" : ""}`}
        />
      ))}
    </div>
  );
}
export default SlideshowBanner;
