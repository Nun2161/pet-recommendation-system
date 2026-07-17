const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
require("dotenv").config();

const assessmentRoutes = require("./routes/assessmentRoutes");
const authRoutes = require("./routes/authRoutes");
const userRegisterRoutes = require("./routes/userRegisterRoutes");
const userLoginRoutes = require("./routes/userLoginRoutes");
const userOnboardingRoutes = require("./routes/userOnboardingRoutes");
const passwordResetRoutes = require("./routes/passwordResetRoutes");
const adminPasswordResetRoutes = require("./routes/adminPasswordResetRoutes");
const breedRoutes = require("./routes/breedRoutes");
const historyRoutes = require("./routes/historyRoutes");
const farmRoutes = require("./routes/farmRoutes");
const farmAuthRoutes = require("./routes/farmAuthRoutes");
const farmAnimalRoutes = require("./routes/farmAnimalRoutes");
const adminAuthRoutes = require("./routes/adminAuthRoutes");
const adoptionRoutes = require("./routes/adoptionRoutes");
const farmAdoptionRoutes = require("./routes/farmAdoptionRoutes");
const adminManagementRoutes = require("./routes/adminManagementRoutes");
const dashboardRoutes = require("./routes/dashboardRoutes");

const app = express();
const PORT = process.env.PORT || 3000;

app.disable("x-powered-by");

app.use(
  helmet({
    crossOriginResourcePolicy: { policy: "cross-origin" },
  })
);

app.use(
  cors({
    origin(origin, callback) {
      const allowedOrigins = [
        "http://127.0.0.1:5500",
        "http://127.0.0.1:8080",
        "http://localhost:5500",
        "http://localhost:8080",
        "http://localhost",
      ];

      if (!origin || allowedOrigins.includes(origin)) {
        return callback(null, true);
      }

      return callback(new Error("Origin นี้ไม่ได้รับอนุญาตจาก CORS"));
    },
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
  })
);

app.use(express.json({ limit: "20kb" }));
app.use(express.urlencoded({ extended: true, limit: "20kb" }));

app.get("/", (req, res) => {
  return res.json({
    success: true,
    message: "Pet Recommendation API is running",
  });
});

app.use("/api", assessmentRoutes);

// Authentication routes: secure register, secure login, then first-login onboarding.
app.use("/api/auth", userRegisterRoutes);
app.use("/api/auth", userLoginRoutes);
app.use("/api/auth", userOnboardingRoutes);
app.use("/api/auth/password-reset", passwordResetRoutes);

// Keep this after the new routes. Remove duplicate /register or /login routes inside authRoutes.js.
app.use("/api/auth", authRoutes);

app.use("/api/breeds", breedRoutes);
app.use("/api/history", historyRoutes);
app.use("/api", farmRoutes);
app.use("/api/farm/auth", farmAuthRoutes);
app.use("/api/farm", farmAnimalRoutes);
app.use("/api/adoptions", adoptionRoutes);
app.use("/api/farm", farmAdoptionRoutes);
app.use("/api/admin/auth", adminAuthRoutes);
app.use("/api/admin/password-resets", adminPasswordResetRoutes);
app.use("/api/admin", adminManagementRoutes);
app.use("/api", dashboardRoutes);

app.use((req, res) => {
  return res.status(404).json({
    success: false,
    message: "ไม่พบ API ที่เรียกใช้งาน",
  });
});

app.use((err, req, res, next) => {
  console.error("Unhandled Error:", err);

  if (err?.message === "Origin นี้ไม่ได้รับอนุญาตจาก CORS") {
    return res.status(403).json({ success: false, message: err.message });
  }

  return res.status(500).json({
    success: false,
    message: "เกิดข้อผิดพลาดภายในเซิร์ฟเวอร์",
  });
});

app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
  console.log(`Questions API: http://localhost:${PORT}/api/questions`);
  console.log(`Register API: http://localhost:${PORT}/api/auth/register`);
  console.log(`Login API: http://localhost:${PORT}/api/auth/login`);
  console.log(`Onboarding API: http://localhost:${PORT}/api/auth/onboarding`);
  console.log(`Password reset API: http://localhost:${PORT}/api/auth/password-reset`);
  console.log(`Admin reset requests: http://localhost:${PORT}/api/admin/password-resets`);
});
