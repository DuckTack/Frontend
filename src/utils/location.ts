import * as Location from "expo-location";

export type Coordinates = {
  latitude: number;
  longitude: number;
  accuracy?: number | null;
};

export async function requestCurrentCoordinates(): Promise<Coordinates> {
  const servicesEnabled = await Location.hasServicesEnabledAsync();
  if (!servicesEnabled) {
    throw new Error("LOCATION_SERVICE_DISABLED");
  }

  const currentPermission = await Location.getForegroundPermissionsAsync();
  let status = currentPermission.status;

  if (status !== "granted") {
    const requested = await Location.requestForegroundPermissionsAsync();
    status = requested.status;
  }

  if (status !== "granted") {
    throw new Error("LOCATION_PERMISSION_DENIED");
  }

  const lastKnown = await Location.getLastKnownPositionAsync({
    maxAge: 1000 * 60 * 5,
    requiredAccuracy: 300,
  });

  if (lastKnown?.coords) {
    return {
      latitude: lastKnown.coords.latitude,
      longitude: lastKnown.coords.longitude,
      accuracy: lastKnown.coords.accuracy,
    };
  }

  const current = await Location.getCurrentPositionAsync({
    accuracy: Location.Accuracy.Balanced,
  });

  return {
    latitude: current.coords.latitude,
    longitude: current.coords.longitude,
    accuracy: current.coords.accuracy,
  };
}

export function calculateDistanceKm(from: Coordinates, to: Coordinates) {
  const earthRadiusKm = 6371;
  const toRadians = (value: number) => (value * Math.PI) / 180;

  const deltaLat = toRadians(to.latitude - from.latitude);
  const deltaLng = toRadians(to.longitude - from.longitude);
  const startLat = toRadians(from.latitude);
  const endLat = toRadians(to.latitude);

  const a =
    Math.sin(deltaLat / 2) * Math.sin(deltaLat / 2) +
    Math.sin(deltaLng / 2) * Math.sin(deltaLng / 2) * Math.cos(startLat) * Math.cos(endLat);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return earthRadiusKm * c;
}

export function formatDistanceKm(distanceKm?: number | null) {
  if (distanceKm == null || Number.isNaN(distanceKm)) return "거리 정보 없음";
  if (distanceKm < 1) {
    return `${Math.round(distanceKm * 1000)}m`;
  }
  return `${distanceKm.toFixed(1)}km`;
}
