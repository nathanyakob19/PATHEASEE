const CITIES = [
  { name: "Mumbai", logo: "https://upload.wikimedia.org/wikipedia/commons/thumb/3/3a/Mumbai_03-2016_30_Gateway_of_India.jpg/640px-Mumbai_03-2016_30_Gateway_of_India.jpg" },
  { name: "Pune", logo: "https://upload.wikimedia.org/wikipedia/commons/thumb/1/14/Shaniwar_wada_pune.jpg/640px-Shaniwar_wada_pune.jpg" },
  { name: "Delhi", logo: "https://upload.wikimedia.org/wikipedia/commons/thumb/t/t1/India_Gate_in_New_Delhi_03-2016.jpg/640px-India_Gate_in_New_Delhi_03-2016.jpg" },
  { name: "Bengaluru", logo: "https://upload.wikimedia.org/wikipedia/commons/thumb/4/47/Bangalore_Palace_3.jpg/640px-Bangalore_Palace_3.jpg" },
  { name: "Chennai", logo: "https://upload.wikimedia.org/wikipedia/commons/thumb/3/32/Chennai_Central.jpg/640px-Chennai_Central.jpg" },
];

export default function CityScroller({ onCitySelect }) {
  return (
    <div
      style={{
        display: "flex",
        gap: 14,
        overflowX: "auto",
        padding: "10px",
        scrollbarWidth: "none",
      }}
    >
      {CITIES.map((city) => (
        <div
          key={city.name}
          onClick={() => onCitySelect(city.name)}
          style={{
            minWidth: 120,
            background: "#fff",
            borderRadius: 16,
            padding: 12,
            textAlign: "center",
            cursor: "pointer",
            boxShadow: "0 4px 12px rgba(0,0,0,0.15)",
          }}
        >
          <img
            src={city.logo}
            alt={city.name}
            style={{
              width: 50,
              height: 50,
              objectFit: "contain",
              marginBottom: 6,
              filter: "grayscale(100%) contrast(120%)", // Minimalist B&W effect
            }}
          />
          <div style={{ fontWeight: 600, fontSize: 13 }}>
            {city.name}
          </div>
        </div>
      ))}
    </div>
  );
}
