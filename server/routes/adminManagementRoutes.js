const express = require("express");

const {
  getAllUsersForAdmin,
  updateUserStatusByAdmin,
  getAllFarmsForAdmin,
  updateFarmStatusByAdmin,
  getFarmCertificateForAdmin,
} = require("../controllers/adminManagementController");


const {
  getBreedsForAdmin,
  createBreedByAdmin,
  updateBreedByAdmin,
  getLatestWeightsForAdmin,
  createWeightsByAdmin,
} = require("../controllers/adminBreedWeightController");

const {
  authenticateAdmin,
} = require("../middleware/adminAuth");

const {
  getShelterSummary,
  getShelters,
  createShelter,
  updateShelter,
  getShelterAnimals,
  createShelterAnimal,
  updateShelterAnimal,
} = require("../controllers/adminShelterController");

const {
  getListings: getStrayListings,
  reviewListing: reviewStrayListing,
  updateListingStatus: updateStrayListingStatus,
} = require("../controllers/adminStrayListingController");

const router = express.Router();

router.get(
  "/users",
  authenticateAdmin,
  getAllUsersForAdmin
);

router.patch(
  "/users/:id/status",
  authenticateAdmin,
  updateUserStatusByAdmin
);

router.get(
  "/farms",
  authenticateAdmin,
  getAllFarmsForAdmin
);

router.patch(
  "/farms/:id/status",
  authenticateAdmin,
  updateFarmStatusByAdmin
);

router.get(
  "/farms/:id/certificate",
  authenticateAdmin,
  getFarmCertificateForAdmin
);


router.get(
  "/breeds",
  authenticateAdmin,
  getBreedsForAdmin
);

router.post(
  "/breeds",
  authenticateAdmin,
  createBreedByAdmin
);

router.patch(
  "/breeds/:id",
  authenticateAdmin,
  updateBreedByAdmin
);

router.get(
  "/weights",
  authenticateAdmin,
  getLatestWeightsForAdmin
);

router.post(
  "/weights",
  authenticateAdmin,
  createWeightsByAdmin
);


router.get(
  "/shelter-summary",
  authenticateAdmin,
  getShelterSummary
);

router.get(
  "/shelters",
  authenticateAdmin,
  getShelters
);

router.post(
  "/shelters",
  authenticateAdmin,
  createShelter
);

router.patch(
  "/shelters/:id",
  authenticateAdmin,
  updateShelter
);

router.get(
  "/shelter-animals",
  authenticateAdmin,
  getShelterAnimals
);

router.post(
  "/shelter-animals",
  authenticateAdmin,
  createShelterAnimal
);

router.patch(
  "/shelter-animals/:id",
  authenticateAdmin,
  updateShelterAnimal
);

router.get(
  "/stray-listings",
  authenticateAdmin,
  getStrayListings
);

router.patch(
  "/stray-listings/:id/review",
  authenticateAdmin,
  reviewStrayListing
);

router.patch(
  "/stray-listings/:id/status",
  authenticateAdmin,
  updateStrayListingStatus
);

module.exports = router;