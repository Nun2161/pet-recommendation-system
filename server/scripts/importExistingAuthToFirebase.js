"use strict";

require("dotenv").config();

const db = require("../config/db");
const { getFirebaseAuth } = require("../config/firebaseAdmin");

const SOURCES = [
  {
    role: "admin",
    table: "admin",
    idColumn: "admin_id",
    nameColumn: "name",
    query: `
      SELECT admin_id, name, email, password, status, firebase_uid
      FROM admin
      WHERE email IS NOT NULL AND TRIM(email) <> ''
    `,
  },
  {
    role: "farm",
    table: "farm",
    idColumn: "farm_id",
    nameColumn: "farm_name",
    query: `
      SELECT farm_id, farm_name, email, password, status, firebase_uid
      FROM farm
      WHERE email IS NOT NULL AND TRIM(email) <> ''
    `,
  },
  {
    role: "user",
    table: "users",
    idColumn: "user_id",
    nameColumn: "name",
    query: `
      SELECT user_id, name, email, password, status, firebase_uid
      FROM users
      WHERE email IS NOT NULL AND TRIM(email) <> ''
    `,
  },
];

function normalizeEmail(value) {
  return String(value || "").trim().toLowerCase();
}

function isBcryptHash(value) {
  return /^\$2[aby]\$\d{2}\$[./A-Za-z0-9]{53}$/.test(String(value || ""));
}

function buildUid(role, id) {
  return `catmatch_${role}_${Number(id)}`;
}

function shouldDisable(role, statusValue) {
  const status = String(statusValue || "").toLowerCase();

  if (role === "farm") {
    // pending ยังต้องเข้าสู่ Firebase ได้ เพื่อให้ Backend แสดงข้อความรออนุมัติ
    return ["rejected", "inactive", "disabled", "suspended"].includes(status);
  }

  return status !== "active";
}

async function loadAccounts() {
  const accounts = [];

  for (const source of SOURCES) {
    const [rows] = await db.query(source.query);
    for (const row of rows) {
      accounts.push({
        ...source,
        row,
        id: Number(row[source.idColumn]),
        email: normalizeEmail(row.email),
        displayName: String(row[source.nameColumn] || row.email || "CatMatch").slice(0, 80),
      });
    }
  }

  return accounts;
}

async function linkDatabaseAccount(account, uid, provider = "password") {
  await db.query(
    `UPDATE ${account.table}
     SET firebase_uid = ?, firebase_provider = ?
     WHERE ${account.idColumn} = ?`,
    [uid, provider, account.id]
  );
}

async function findFirebaseUserByEmail(auth, email) {
  try {
    return await auth.getUserByEmail(email);
  } catch (error) {
    if (error.code === "auth/user-not-found") return null;
    throw error;
  }
}

async function importChunk(auth, chunk) {
  const result = await auth.importUsers(
    chunk.map((account) => ({
      uid: account.targetUid,
      email: account.email,
      displayName: account.displayName,
      disabled: shouldDisable(account.role, account.row.status),
      passwordHash: Buffer.from(String(account.row.password), "utf8"),
      customClaims: {
        role: account.role,
        [`${account.role}_id`]: account.id,
      },
    })),
    {
      hash: {
        algorithm: "BCRYPT",
      },
    }
  );

  const failedIndexes = new Set(result.errors.map((item) => item.index));

  for (const indexedError of result.errors) {
    const account = chunk[indexedError.index];
    console.error(
      `[FAILED] ${account.role} #${account.id} ${account.email}:`,
      indexedError.error?.message || indexedError.error
    );
  }

  for (let index = 0; index < chunk.length; index += 1) {
    if (failedIndexes.has(index)) continue;
    const account = chunk[index];
    await linkDatabaseAccount(account, account.targetUid, "password");
    console.log(`[IMPORTED] ${account.role} #${account.id} ${account.email}`);
  }

  return {
    successCount: result.successCount,
    failureCount: result.failureCount,
  };
}

async function main() {
  const auth = getFirebaseAuth();
  const accounts = await loadAccounts();
  const emailCounts = new Map();

  for (const account of accounts) {
    emailCounts.set(account.email, (emailCounts.get(account.email) || 0) + 1);
  }

  const pendingImports = [];
  let linkedExisting = 0;
  let skipped = 0;

  for (const account of accounts) {
    if (!account.email) {
      skipped += 1;
      continue;
    }

    if ((emailCounts.get(account.email) || 0) > 1) {
      console.error(
        `[SKIPPED] อีเมลซ้ำข้ามบทบาท: ${account.email} กรุณาแก้ข้อมูลในฐานข้อมูลก่อน import`
      );
      skipped += 1;
      continue;
    }

    if (account.row.firebase_uid) {
      try {
        await auth.getUser(String(account.row.firebase_uid));
        console.log(`[ALREADY LINKED] ${account.role} #${account.id} ${account.email}`);
        linkedExisting += 1;
        continue;
      } catch (error) {
        if (error.code !== "auth/user-not-found") throw error;
      }
    }

    const existingFirebaseUser = await findFirebaseUserByEmail(auth, account.email);
    if (existingFirebaseUser) {
      await linkDatabaseAccount(account, existingFirebaseUser.uid, "existing");
      console.log(`[LINKED] ${account.role} #${account.id} ${account.email}`);
      linkedExisting += 1;
      continue;
    }

    if (!isBcryptHash(account.row.password)) {
      console.error(
        `[SKIPPED] ${account.role} #${account.id} ${account.email}: password ไม่ใช่ bcrypt hash`
      );
      skipped += 1;
      continue;
    }

    account.targetUid = buildUid(account.role, account.id);
    pendingImports.push(account);
  }

  let imported = 0;
  let failed = 0;

  for (let start = 0; start < pendingImports.length; start += 1000) {
    const chunk = pendingImports.slice(start, start + 1000);
    const result = await importChunk(auth, chunk);
    imported += result.successCount;
    failed += result.failureCount;
  }

  console.log("\nFirebase migration summary");
  console.log(`- Imported: ${imported}`);
  console.log(`- Linked existing Firebase users: ${linkedExisting}`);
  console.log(`- Skipped: ${skipped}`);
  console.log(`- Failed: ${failed}`);
}

main()
  .catch((error) => {
    console.error("Firebase import failed:", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    try {
      await db.end();
    } catch {
      // Connection pool may already be closed.
    }
  });
