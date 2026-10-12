"use strict";

const ALLOWED_SPECIES = new Set(["cat", "dog"]);

function normalizeSpecies(value, fallback = "cat") {
  const normalized = String(value ?? fallback)
    .trim()
    .toLowerCase();

  return ALLOWED_SPECIES.has(normalized)
    ? normalized
    : null;
}

module.exports = {
  ALLOWED_SPECIES,
  normalizeSpecies,
};
