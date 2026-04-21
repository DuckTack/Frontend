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
