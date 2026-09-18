/** A bounded GPS acquisition; never treats requested accuracy as a guarantee. */
export function preciseLocation(
  geolocation: Geolocation,
  update: (position: GeolocationPosition) => void,
  finish: (error?: string) => void,
): () => void {
  let watch: number | undefined;
  let stopped = false;
  let best: GeolocationPosition | undefined;
  const stop = () => {
    stopped = true;
    clearTimeout(deadline);
    if (watch !== undefined) geolocation.clearWatch(watch);
  };
  const complete = (error?: string) => {
    if (stopped) return;
    stop();
    finish(error);
  };
  const deadline = setTimeout(() => complete(best ? undefined :
    'No se pudo obtener tu ubicación. Intenta al aire libre o selecciona el punto en el mapa.'), 20000);
  try {
    watch = geolocation.watchPosition(position => {
      if (stopped) return;
      const { latitude, longitude, accuracy } = position.coords;
      if (!Number.isFinite(latitude) || !Number.isFinite(longitude) ||
          Math.abs(latitude) > 90 || Math.abs(longitude) > 180 ||
          !Number.isFinite(accuracy) || accuracy <= 0 ||
          !Number.isFinite(position.timestamp) || Date.now() - position.timestamp > 10000) return;
      if (!best || accuracy < best.coords.accuracy) {
        best = position;
        update(position);
      }
      if (accuracy <= 10) complete();
    }, error => {
      if (stopped) return;
      if (error.code === 1) complete('No pudimos usar tu ubicación. Permítela en tu dispositivo o selecciona el punto en el mapa.');
      // A transient GPS timeout can be followed by a better fix before our deadline.
    }, { enableHighAccuracy: true, maximumAge: 0, timeout: 15000 });
    // Also supports providers that invoke callbacks before returning the watch ID.
    if (stopped) geolocation.clearWatch(watch);
  } catch {
    complete('No pudimos usar tu ubicación. Selecciona el punto en el mapa.');
  }
  return stop;
}
