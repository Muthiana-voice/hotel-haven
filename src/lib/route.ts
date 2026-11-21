export type RouteResult = { points: [number, number][]; distanceKm: number; durationMin: number };

/** Driving route from the free public OSRM server. Points are [lat, lng]. */
export async function fetchDrivingRoute(from: [number, number], to: [number, number]): Promise<RouteResult> {
  const url = `https://router.project-osrm.org/route/v1/driving/${from[1]},${from[0]};${to[1]},${to[0]}?overview=full&geometries=geojson`;
  const res = await fetch(url);
  if (!res.ok) throw new Error("Não foi possível calcular a rota.");
  const json = await res.json();
  const r = json.routes?.[0];
  if (!r) throw new Error("Nenhuma rota encontrada até este hotel.");
  return {
    points: (r.geometry.coordinates as [number, number][]).map(([lng, lat]) => [lat, lng]),
    distanceKm: r.distance / 1000,
    durationMin: r.duration / 60,
  };
}

export function getCurrentPosition(): Promise<[number, number]> {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) return reject(new Error("Seu navegador não permite obter a localização."));
    navigator.geolocation.getCurrentPosition(
      (p) => resolve([p.coords.latitude, p.coords.longitude]),
      () => reject(new Error("Permita o acesso à localização para traçar a rota.")),
      { enableHighAccuracy: true, timeout: 15000 },
    );
  });
}
