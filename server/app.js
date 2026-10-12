"use strict";

const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const path = require("path");

require("dotenv").config();

const {
  ensureAssessmentSetup,
} = require("./services/assessmentSetupService");

const {
  ensureShelterSetup,
} = require("./services/shelterSetupService");

const {
  ensureChatSetup,
} = require("./services/chatSetupService");

const assessmentRoutes =
  require("./routes/assessmentRoutes");

const userRegisterRoutes =
  require("./routes/userRegisterRoutes");

const farmRegisterRoutes =
  require("./routes/farmRegisterRoutes");

const firebaseAuthRoutes =
  require("./routes/firebaseAuthRoutes");

const userOnboardingRoutes =
  require("./routes/userOnboardingRoutes");

const passwordResetRoutes =
  require("./routes/passwordResetRoutes");

const breedRoutes =
  require("./routes/breedRoutes");

const historyRoutes =
  require("./routes/historyRoutes");

const farmRoutes =
  require("./routes/farmRoutes");

const farmAnimalRoutes =
  require("./routes/farmAnimalRoutes");

const farmProfileRoutes =
  require("./routes/farmProfileRoutes");

const adoptionRoutes =
  require("./routes/adoptionRoutes");

const farmAdoptionRoutes =
  require("./routes/farmAdoptionRoutes");

const adminManagementRoutes =
  require("./routes/adminManagementRoutes");

const dashboardRoutes =
  require("./routes/dashboardRoutes");

const favoriteRoutes =
  require("./routes/favoriteRoutes");

const notificationRoutes =
  require("./routes/notificationRoutes");

const newsletterRoutes =
  require("./routes/newsletterRoutes");

const shelterRoutes =
  require("./routes/shelterRoutes");

const strayListingRoutes =
  require("./routes/strayListingRoutes");

const chatRoutes =
  require("./routes/chatRoutes");

const app = express();
const PORT = process.env.PORT || 3000;

const configuredCorsOrigins = String(process.env.CORS_ORIGINS || "")
  .split(",")
  .map((origin) => origin.trim().replace(/\/+$/, ""))
  .filter(Boolean);

const allowedCorsOrigins = new Set([
  "http://127.0.0.1:5500",
  "http://127.0.0.1:8080",
  "http://localhost:5500",
  "http://localhost:8080",
  "http://localhost",
  "https://catmatch-e6d85.web.app",
  "https://catmatch-e6d85.firebaseapp.com",
  ...configuredCorsOrigins,
]);

app.disable("x-powered-by");

app.use(
  helmet({
    crossOriginResourcePolicy: {
      policy: "cross-origin",
    },
  })
);

app.use(
  cors({
    origin(origin, callback) {
      const normalizedOrigin = String(origin || "").replace(/\/+$/, "");

      if (!origin || allowedCorsOrigins.has(normalizedOrigin)) {
        return callback(null, true);
      }

      return callback(
        new Error(
          "Origin นี้ไม่ได้รับอนุญาตจาก CORS"
        )
      );
    },

    methods: [
      "GET",
      "POST",
      "PUT",
      "PATCH",
      "DELETE",
      "OPTIONS",
    ],

    allowedHeaders: [
      "Content-Type",
      "Authorization",
      "Cache-Control",
      "Pragma",
    ],
  })
);

app.use(
  "/uploads",
  express.static(
    path.join(__dirname, "uploads"),
    {
      fallthrough: false,
      maxAge: "1d",
    }
  )
);

/*
 * แบบฟอร์มลงทะเบียนฟาร์ม
 * รองรับไฟล์หลักฐาน Base64
 */
app.use(
  "/api/auth/farm-register",
  express.json({
    limit: "5mb",
  }),
  farmRegisterRoutes
);

/*
 * การเพิ่มแมวและรูปโปรไฟล์ฟาร์ม
 * รองรับรูปภาพ Base64
 */
app.use(
  "/api/farm",
  express.json({
    limit: "8mb",
  }),
  farmAnimalRoutes
);

app.use(
  "/api/farm",
  express.json({
    limit: "8mb",
  }),
  farmProfileRoutes
);

/*
 * Admin shelter animal images can be uploaded as Base64.
 */
app.use(
  "/api/admin",
  express.json({
    limit: "8mb",
  }),
  adminManagementRoutes
);


/*
 * User stray-animal listings can include a Base64 image.
 */
app.use(
  "/api/stray-listings",
  express.json({
    limit: "8mb",
  }),
  strayListingRoutes
);

/*
 * Realtime chat supports image/video data URLs.
 * Image max 5 MB, video max 20 MB (Base64 needs a larger JSON limit).
 */
app.use(
  "/api/chat",
  express.json({
    limit: "32mb",
  }),
  chatRoutes
);

app.use(
  express.json({
    limit: "20kb",
  })
);

app.use(
  express.urlencoded({
    extended: true,
    limit: "20kb",
  })
);

app.get("/", (req, res) => {
  return res.json({
    success: true,
    message:
      "Pet Recommendation API is running",
  });
});

/*
 * Assessment
 */
app.use(
  "/api",
  assessmentRoutes
);

/*
 * Authentication
 */
app.use(
  "/api/auth",
  firebaseAuthRoutes
);

app.use(
  "/api/auth",
  userRegisterRoutes
);

app.use(
  "/api/auth",
  userOnboardingRoutes
);

app.use(
  "/api/auth/password-reset",
  passwordResetRoutes
);

/*
 * Breed และประวัติ
 */
app.use(
  "/api/breeds",
  breedRoutes
);

app.use(
  "/api/history",
  historyRoutes
);

/*
 * Farm และ Adoption
 */
app.use(
  "/api",
  farmRoutes
);

app.use(
  "/api/adoptions",
  adoptionRoutes
);

app.use(
  "/api/farm",
  farmAdoptionRoutes
);

/*
 * Shelter public data
 */
app.use(
  "/api/shelters",
  shelterRoutes
);

/*
 * Dashboard
 */
app.use(
  "/api",
  dashboardRoutes
);

/*
 * Favorites
 */
app.use(
  "/api/favorites",
  favoriteRoutes
);

/*
 * Route ทดสอบระบบแจ้งเตือน
 */

/*
 * Newsletter
 */
app.use(
  "/api/newsletter",
  newsletterRoutes
);

/*
 * Notifications
 */
app.use(
  "/api/notifications",
  notificationRoutes
);

/*
 * 404 ต้องอยู่หลัง Route ทั้งหมด
 */
app.use((req, res) => {
  return res.status(404).json({
    success: false,
    message:
      "ไม่พบ API ที่เรียกใช้งาน",
  });
});

/*
 * Error Handler ต้องอยู่ท้ายสุด
 */
app.use(
  (err, req, res, next) => {
    console.error(
      "Unhandled Error:",
      err
    );

    if (
      err?.message ===
      "Origin นี้ไม่ได้รับอนุญาตจาก CORS"
    ) {
      return res.status(403).json({
        success: false,
        message: err.message,
      });
    }

    if (
      err?.type ===
      "entity.too.large"
    ) {
      const requestPath =
        String(
          req.originalUrl || ""
        );

      const isAnimalImage =
        requestPath.startsWith(
          "/api/farm/animals"
        );

      const isFarmProfileImage =
        requestPath.startsWith(
          "/api/farm/profile/image"
        );

      const isShelterAnimalImage =
        requestPath.startsWith(
          "/api/admin/shelter-animals"
        );

      const isStrayListingImage =
        requestPath.startsWith(
          "/api/stray-listings"
        );

      const isChatMedia =
        requestPath.startsWith(
          "/api/chat"
        );

      return res.status(413).json({
        success: false,

        message: isAnimalImage
          ? "รูปภาพสัตว์มีขนาดใหญ่เกินกำหนด (สูงสุด 5 MB)"
          : isFarmProfileImage
            ? "รูปโปรไฟล์ฟาร์มมีขนาดใหญ่เกินกำหนด (สูงสุด 5 MB)"
            : isShelterAnimalImage
              ? "รูปสัตว์จากศูนย์พักพิงมีขนาดใหญ่เกินกำหนด (สูงสุด 5 MB)"
              : isStrayListingImage
                ? "รูปสัตว์ในประกาศมีขนาดใหญ่เกินกำหนด (สูงสุด 5 MB)"
                : isChatMedia
                  ? "ไฟล์แชทมีขนาดใหญ่เกินกำหนด (รูปสูงสุด 5 MB / วิดีโอสูงสุด 20 MB)"
                  : "ไฟล์หลักฐานมีขนาดใหญ่เกินกำหนด (สูงสุด 3 MB)",
      });
    }

    return res.status(500).json({
      success: false,
      message:
        "เกิดข้อผิดพลาดภายในเซิร์ฟเวอร์",
    });
  }
);

async function startServer() {
  const assessmentReady = await ensureAssessmentSetup({
    force: true,
  });

  if (!assessmentReady) {
    console.warn(
      "Assessment database is not ready yet. The API will retry on the next assessment request."
    );
  }

  const shelterReady = await ensureShelterSetup({ force: true });
  if (!shelterReady) {
    console.warn(
      "Shelter database is not ready yet. The API will retry on the next shelter request."
    );
  }

  const chatReady = await ensureChatSetup({ force: true });
  if (!chatReady) {
    console.warn(
      "Chat database is not ready yet. The API will retry on the next chat request."
    );
  }

  app.listen(PORT, () => {
  console.log(
    `Server is running on http://localhost:${PORT}`
  );

  console.log(
    `Questions API: http://localhost:${PORT}/api/questions`
  );

  console.log(
    `Register API: http://localhost:${PORT}/api/auth/register`
  );

  console.log(
    `Farm register API: http://localhost:${PORT}/api/auth/farm-register`
  );

  console.log(
    `Firebase session API: http://localhost:${PORT}/api/auth/firebase/session`
  );

  console.log(
    `Onboarding API: http://localhost:${PORT}/api/auth/onboarding`
  );

  console.log(
    `Password reset API: http://localhost:${PORT}/api/auth/password-reset`
  );

  console.log(
    `Favorites API: http://localhost:${PORT}/api/favorites`
  );

  console.log(
    `Newsletter API: http://localhost:${PORT}/api/newsletter/subscribe`
  );

  console.log(
    `Notifications API: http://localhost:${PORT}/api/notifications`
  );

  console.log(
    `Realtime Chat API: http://localhost:${PORT}/api/chat/conversations`
  );
  });
}

startServer().catch((error) => {
  console.error("Server startup error:", error);
  process.exitCode = 1;
});
