const { haversineDistance } = require('./haversine');

/**
 * Check if a point is inside a geofence (circular region).
 * Returns { inside, distance }
 */
function checkGeofence(pesertaLat, pesertaLon, posLat, posLon, radiusMeter) {
  const distance = haversineDistance(pesertaLat, pesertaLon, posLat, posLon);
  return {
    inside: distance <= radiusMeter,
    distance: Math.round(distance),
  };
}

/**
 * Find which pos (if any) the peserta is currently inside.
 * Returns { pos, distance } or null.
 */
function findCurrentPos(pesertaLat, pesertaLon, posArray) {
  for (const pos of posArray) {
    const result = checkGeofence(
      pesertaLat,
      pesertaLon,
      parseFloat(pos.latitude),
      parseFloat(pos.longitude),
      pos.radius_meter || 50
    );
    if (result.inside) {
      return { pos, distance: result.distance };
    }
  }
  return null;
}

module.exports = { checkGeofence, findCurrentPos };
