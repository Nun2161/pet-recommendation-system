const express = require("express");

const {
  getQuestions,
  submitAssessment,
  getRecommendations,
} = require("../controllers/assessmentController");

const router = express.Router();

/*
GET /api/questions
*/
router.get("/questions", getQuestions);

/*
POST /api/assessment/submit
*/
router.post("/assessment/submit", submitAssessment);
router.get(
  "/recommendations/:resultId",
  getRecommendations
);

module.exports = router;