import L from "leaflet";

const markerMarkup = `
  <svg xmlns="http://www.w3.org/2000/svg" width="38" height="40" viewBox="0 0 24 24" fill="none" style="filter:drop-shadow(0 2px 3px rgba(0,0,0,.45))">
    <path d="M20 10c0 4.993-5.539 10.193-7.399 11.799a1 1 0 0 1-1.202 0C9.539 20.193 4 14.993 4 10a8 8 0 0 1 16 0" fill="#dc2626" stroke="#ffffff" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" />
    <circle cx="12" cy="10" r="3" fill="#ffffff" stroke="#b91c1c" stroke-width="1" />
  </svg>
`;

export const COURT_MAP_MARKER = L.divIcon({
  className: "court-map-pin",
  html: markerMarkup,
  iconSize: [38, 40],
  iconAnchor: [19, 39],
});