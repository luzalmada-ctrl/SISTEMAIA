// Utilidades para determinar si un punto está dentro de una geocerca.

export function distanceMeters(lat1, lng1, lat2, lng2) {
  const R = 6371000;
  const toRad = (d) => (d * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(a));
}

// Ray casting: ¿está (lat,lng) dentro del anillo de coordenadas?
export function pointInPolygon(lat, lng, coords) {
  if (!coords || coords.length < 3) return false;
  let inside = false;
  for (let i = 0, j = coords.length - 1; i < coords.length; j = i++) {
    const xi = coords[i].lng;
    const yi = coords[i].lat;
    const xj = coords[j].lng;
    const yj = coords[j].lat;
    const intersect =
      yi > lat !== yj > lat && lng < ((xj - xi) * (lat - yi)) / (yj - yi) + xi;
    if (intersect) inside = !inside;
  }
  return inside;
}

export function containsPoint(geo, lat, lng) {
  if (!geo || !Number.isFinite(lat) || !Number.isFinite(lng)) return false;

  if (geo.type === 'circle' && geo.center && geo.radius) {
    return distanceMeters(lat, lng, geo.center.lat, geo.center.lng) <= geo.radius;
  }

  if (geo.type === 'rectangle') {
    if (geo.bounds) {
      const { southWest, northEast } = geo.bounds;
      return (
        lat >= southWest.lat &&
        lat <= northEast.lat &&
        lng >= southWest.lng &&
        lng <= northEast.lng
      );
    }
    if (geo.coordinates?.length >= 3) return pointInPolygon(lat, lng, geo.coordinates);
    return false;
  }

  if (geo.type === 'polygon' && geo.coordinates?.length >= 3) {
    return pointInPolygon(lat, lng, geo.coordinates);
  }

  return false;
}
