/**
 * Compatibility shim for hull.js 0.2.10.
 *
 * scratch-render already computes a convex boundary before calling hull.js with
 * Infinity. Returning the input points matches the intended simplification path
 * closely enough for local development and avoids the incomplete npm tarball.
 */
module.exports = points => points;
