"use strict";
(() => {
  const body = document.body;
  if (!body.matches(".farm-dashboard-page,.farm-pending-page,.admin-page,.admin-dashboard-page")) return;
  document.querySelectorAll(".farm-sakura-scene,.pending-sakura,.catmatch-sakura-scene").forEach((element) => element.remove());
  const scene = document.createElement("div");
  scene.className = "catmatch-sakura-scene";
  scene.setAttribute("aria-hidden", "true");
  const petals = document.createElement("div");
  petals.className = "catmatch-falling-petals";
  for (let index = 1; index <= 16; index += 1) {
    const petal = document.createElement("span");
    petal.className = `catmatch-falling-petal catmatch-petal-${index}`;
    petals.appendChild(petal);
  }
  scene.appendChild(petals);
  body.prepend(scene);
})();
