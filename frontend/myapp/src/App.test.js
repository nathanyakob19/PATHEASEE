import { render, screen, waitFor } from "@testing-library/react";

jest.mock("./AuthContext", () => ({
  useAuth: () => ({ isLoggedIn: false }),
}));

jest.mock("./SearchBar", () => () => <div data-testid="search-bar" />);
jest.mock("./RatingsGraph", () => () => <div data-testid="ratings-graph" />);
jest.mock("./ChatAssistant", () => () => <div data-testid="chat-assistant" />);

jest.mock("react-leaflet", () => ({
  MapContainer: ({ children }) => <div data-testid="map">{children}</div>,
  TileLayer: () => <div data-testid="tile-layer" />,
  Marker: ({ children }) => <div data-testid="marker">{children}</div>,
  Popup: ({ children }) => <div data-testid="popup">{children}</div>,
}));

import App from "./App";

beforeEach(() => {
  global.navigator.geolocation = {
    getCurrentPosition: (success) =>
      success({ coords: { latitude: 0, longitude: 0 } }),
  };
  global.fetch = jest.fn().mockResolvedValue({
    json: jest.fn().mockResolvedValue([]),
  });
});

test("renders approved places heading", async () => {
  render(<App />);
  await waitFor(() =>
    expect(screen.getByText(/Approved Places/i)).toBeInTheDocument()
  );
});
