"use strict";

(() => {
  const THAILAND_BOUNDS = [[5.4, 97.2], [20.7, 105.8]];
  const DEFAULT_CENTER = [13.0, 101.0];
  let map = null;
  let marker = null;

  const latitudeInput = document.getElementById("latitude");
  const longitudeInput = document.getElementById("longitude");
  const mapElement = document.getElementById("farmLocationMap");
  const locationButton = document.getElementById("useFarmCurrentLocation");
  const statusElement = document.getElementById("farmMapPickerStatus");
  const details = document.querySelector(".farm-coordinate-details");

  if (!mapElement || !latitudeInput || !longitudeInput || !window.L) return;

  function insideThailand(lat, lng) {
    return lat >= 5.4 && lat <= 20.7 && lng >= 97.2 && lng <= 105.8;
  }

  function setStatus(text, type = "") {
    if (!statusElement) return;
    statusElement.textContent = text;
    statusElement.className = type ? `is-${type}` : "";
  }

  function updateCoordinates(lat, lng, focus = false) {
    const latitude = Number(lat);
    const longitude = Number(lng);
    if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) return;
    if (!insideThailand(latitude, longitude)) {
      setStatus("กรุณาปักหมุดภายในประเทศไทย", "error");
      return;
    }

    latitudeInput.value = latitude.toFixed(6);
    longitudeInput.value = longitude.toFixed(6);

    if (!marker) {
      marker = L.marker([latitude, longitude], { draggable: true }).addTo(map);
      marker.bindTooltip("ตำแหน่งฟาร์มของคุณ", { direction: "top" });
      marker.on("dragend", () => {
        const point = marker.getLatLng();
        updateCoordinates(point.lat, point.lng, false);
      });
    } else {
      marker.setLatLng([latitude, longitude]);
    }

    marker.openTooltip();
    if (focus) map.flyTo([latitude, longitude], 16, { animate: true, duration: 1 });
    setStatus(`ปักหมุดแล้ว: ${latitude.toFixed(5)}, ${longitude.toFixed(5)}`, "success");
    latitudeInput.dispatchEvent(new Event("input", { bubbles: true }));
    longitudeInput.dispatchEvent(new Event("input", { bubbles: true }));
    latitudeInput.dispatchEvent(new Event("change", { bubbles: true }));
    longitudeInput.dispatchEvent(new Event("change", { bubbles: true }));
  }

  function initialiseMap() {
    if (map) return;
    map = L.map(mapElement, {
      minZoom: 5,
      maxZoom: 18,
      maxBounds: THAILAND_BOUNDS,
      maxBoundsViscosity: 1,
    });
    L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
      maxZoom: 18,
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
    }).addTo(map);
    map.fitBounds(THAILAND_BOUNDS, { padding: [12, 12] });
    map.on("click", (event) => updateCoordinates(event.latlng.lat, event.latlng.lng, false));

    const savedLat = Number(latitudeInput.value);
    const savedLng = Number(longitudeInput.value);
    if (insideThailand(savedLat, savedLng)) updateCoordinates(savedLat, savedLng, true);
    window.setTimeout(() => map.invalidateSize(), 150);
  }

  details?.addEventListener("toggle", () => {
    if (details.open) {
      initialiseMap();
      window.setTimeout(() => map?.invalidateSize(), 80);
    }
  });

  locationButton?.addEventListener("click", () => {
    initialiseMap();
    if (!navigator.geolocation) {
      setStatus("เบราว์เซอร์นี้ไม่รองรับการค้นหาตำแหน่ง", "error");
      return;
    }
    locationButton.disabled = true;
    locationButton.textContent = "กำลังค้นหาตำแหน่ง...";
    navigator.geolocation.getCurrentPosition(
      (position) => {
        locationButton.disabled = false;
        locationButton.textContent = "✓ ใช้ตำแหน่งปัจจุบันแล้ว";
        updateCoordinates(position.coords.latitude, position.coords.longitude, true);
      },
      () => {
        locationButton.disabled = false;
        locationButton.textContent = "⌖ ลองใช้ตำแหน่งอีกครั้ง";
        setStatus("ไม่สามารถเข้าถึงตำแหน่งได้ กรุณาคลิกบนแผนที่แทน", "error");
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 120000 }
    );
  });

  initialiseMap();
  if (window.ResizeObserver) {
    new ResizeObserver(() => {
      if (!map || mapElement.offsetWidth === 0 || mapElement.offsetHeight === 0) return;
      map.invalidateSize();
      if (marker) map.panTo(marker.getLatLng());
      else map.fitBounds(THAILAND_BOUNDS, { padding: [12, 12] });
    }).observe(mapElement);
  }
})();
