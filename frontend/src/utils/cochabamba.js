import department from "../../../shared/cochabamba-department.json";

const { south, north, west, east } = department.bounds;

const decodePolyline = (encoded, precision) => {
  const coordinates = [];
  let index = 0;
  let latitude = 0;
  let longitude = 0;

  while (index < encoded.length) {
    const deltas = [];
    for (let axis = 0; axis < 2; axis += 1) {
      let result = 0;
      let shift = 0;
      let byte;
      do {
        byte = encoded.charCodeAt(index) - 63;
        index += 1;
        result |= (byte & 0x1f) << shift;
        shift += 5;
      } while (byte >= 0x20);
      deltas.push(result & 1 ? ~(result >> 1) : result >> 1);
    }
    latitude += deltas[0];
    longitude += deltas[1];
    coordinates.push([longitude / precision, latitude / precision]);
  }

  return coordinates;
};

export const COCHABAMBA_CENTER = [-17.3330142, -65.5010931];
export const COCHABAMBA_BOUNDS = [
  [south, west],
  [north, east],
];
export const COCHABAMBA_OUTLINE_LATLNG = decodePolyline(
  department.outlinePolyline,
  department.outlinePrecision
).map(([longitude, latitude]) => [latitude, longitude]);
export const COCHABAMBA_MASK_OUTER = [
  [south - 4, west - 4],
  [south - 4, east + 4],
  [north + 4, east + 4],
  [north + 4, west - 4],
  [south - 4, west - 4],
];

export const isWithinCochabambaBounds = (latitude, longitude) =>
  latitude >= south &&
  latitude <= north &&
  longitude >= west &&
  longitude <= east;

export const isCochabambaDepartmentAddress = (address) =>
  address?.country_code?.toLowerCase() === "bo" &&
  String(address?.state || "").toLocaleLowerCase("es").includes("cochabamba");