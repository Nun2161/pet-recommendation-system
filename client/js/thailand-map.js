"use strict";

document.addEventListener("DOMContentLoaded", () => {
  const mapElement = document.getElementById("indexThailandMap");
  const helper = window.CatMatchThailandMap;

  if (!mapElement || !window.L || !helper) return;

  const map = L.map(mapElement, {
    zoomControl: false,
    attributionControl: false,
    dragging: false,
    scrollWheelZoom: false,
    doubleClickZoom: false,
    boxZoom: false,
    keyboard: false,
    touchZoom: false,
    minZoom: 5,
    maxZoom: 8,
    maxBounds: helper.BOUNDS,
    maxBoundsViscosity: 1,
  });

  helper.addThailandLayer(map, {
    minZoom: 5,
    maxZoom: 18,
    borderColor: "#73aeda",
    borderWeight: 2,
  });

  const fitThailand = () => {
    map.invalidateSize();
    map.fitBounds(helper.BOUNDS, { padding: [4, 4], animate: false });
  };

  fitThailand();
  requestAnimationFrame(fitThailand);
  window.setTimeout(fitThailand, 180);
});
