import {
  Chart as ChartJS,
  ArcElement,
  Tooltip,
  Legend,
} from "chart.js";
import { Doughnut } from "react-chartjs-2";

ChartJS.register(ArcElement, Tooltip, Legend);

// Helper to generate consistent color from string
const stringToColor = (str) => {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = str.charCodeAt(i) + ((hash << 5) - hash);
  }
  const c = (hash & 0x00FFFFFF).toString(16).toUpperCase();
  return '#' + "00000".substring(0, 6 - c.length) + c;
};

// Helper to format key to Label
const formatLabel = (key) => {
    const result = key.replace(/([A-Z])/g, " $1");
    return result.charAt(0).toUpperCase() + result.slice(1);
};

const STANDARD_COLORS = {
    wheelchair: "#4f46e5",
    cleanWashrooms: "#22c55e",
    seatingArrangements: "#f59e0b",
    disabledAssistance: "#ef4444",
    babyWashroom: "#ec4899",
    seniorFriendly: "#8b5cf6",
    medicalSupport: "#14b8a6"
};

function Circle({ label, value, color }) {
  // If value is boolean, treat True as 5 (Full), False as 0
  const isBoolean = typeof value === 'boolean';
  const numericValue = isBoolean ? (value ? 5 : 0) : value;
  
  // If numeric, show "X / 5", if boolean show "Yes/No" or checkmark
  const tooltipLabel = isBoolean ? (value ? "Available" : "Not Available") : `${value} / 5`;
  
  const data = {
    labels: [label, "Remaining"],
    datasets: [
      {
        data: [numericValue, 5 - numericValue],
        backgroundColor: [color, "#e5e7eb"],
        borderWidth: 0,
      },
    ],
  };

  const options = {
    cutout: "70%",
    plugins: {
      legend: { display: false },
      tooltip: {
        callbacks: {
          label: () => tooltipLabel,
        },
      },
    },
  };

  return (
    <div style={{ width: 160, textAlign: "center" }}>
      <div style={{ position: "relative" }}>
        <Doughnut data={data} options={options} />
        <div
          style={{
            position: "absolute",
            top: "50%",
            left: "50%",
            transform: "translate(-50%, -50%)",
            fontSize: 24,
            fontWeight: "bold",
            color: color
          }}
        >
          {isBoolean ? (value ? "✓" : "") : numericValue}
        </div>
      </div>
      <p style={{ marginTop: 8, fontWeight: 600, color: "#444" }}>{label}</p>
    </div>
  );
}

export default function RatingsGraph({ features }) {
  if (!features) return null;

  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))",
        gap: 20,
        marginTop: 20,
        justifyItems: "center",
      }}
    >
      {Object.entries(features).map(([key, value]) => {
          // Only show features that are present (true or > 0)
          if (!value) return null;

          return (
            <Circle
                key={key}
                label={formatLabel(key)}
                value={value}
                color={STANDARD_COLORS[key] || stringToColor(key)}
            />
          );
      })}
    </div>
  );
}
