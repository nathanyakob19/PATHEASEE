const cities = [
  "Mumbai",
  "Pune",
  "Delhi",
  "Bengaluru",
  "Hyderabad",
  "Chennai",
  "Kolkata",
];

export default function CitiesBar({ onCitySelect }) {
  return (
    <div
      style={{
        display: "flex",
        gap: 10,
        flexWrap: "wrap",
        marginTop: 8,
      }}
    >
      {cities.map((city) => (
        <button
          key={city}
          onClick={() => onCitySelect(city)}
          style={{
            padding: "6px 14px",
            borderRadius: 20,
            border: "1px solid #ccc",
            background: "#fff",
            cursor: "pointer",
            fontSize: 13,
          }}
        >
          {city}
        </button>
      ))}
    </div>
  );
}
