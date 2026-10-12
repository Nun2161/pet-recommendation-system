"use strict";

require("dotenv").config();

const db = require("../config/db");
const dogQuestions = require("../data/dogQuestions");
const dogBreeds = require("../data/dogBreeds");

const TRAIT_COLUMNS = [
  "friendly",
  "affectionate",
  "playful",
  "independence",
  "trainability",
  "protective",
  "adaptability",
  "sociability",
  "activity_level",
  "exercise_need",
  "outdoor_preference",
  "apartment_suitability",
  "family_friendly",
  "child_friendly",
  "first_time_owner_friendly",
  "grooming_need",
  "shedding_level",
  "noise_level",
  "heat_tolerance",
  "cold_tolerance",
];

const WEIGHT_COLUMNS = TRAIT_COLUMNS.map((trait) => `${trait}_weight`);

const DEFAULT_ANSWER_OPTIONS = [
  { score: 1, text: "ไม่ตรงกับฉันเลย" },
  { score: 2, text: "ค่อนข้างไม่ตรงกับฉัน" },
  { score: 3, text: "ใกล้เคียงฉันบางส่วน" },
  { score: 4, text: "ค่อนข้างตรงกับฉัน" },
  { score: 5, text: "ตรงกับฉันมากที่สุด" },
];

function getQuestionOptions(question) {
  if (!Array.isArray(question?.options) || question.options.length !== 5) {
    return DEFAULT_ANSWER_OPTIONS;
  }

  return question.options.map((option, index) => {
    if (typeof option === "string") {
      return {
        score: index + 1,
        text: option.trim(),
      };
    }

    return {
      score: Number(option?.score || index + 1),
      text: String(option?.text || "").trim(),
    };
  });
}

const REQUIRED_TABLES = [
  "assessment_question",
  "answer_option",
  "assessment_result",
  "user_answer",
  "breed",
  "weight_criteria",
  "recommendation_history",
];

const SPECIES_TABLES = [
  "assessment_question",
  "assessment_result",
  "breed",
  "weight_criteria",
  "recommendation_history",
];

async function tableExists(connection, tableName) {
  const [rows] = await connection.query(
    `SELECT COUNT(*) AS total
     FROM information_schema.tables
     WHERE table_schema = DATABASE()
       AND table_name = ?`,
    [tableName]
  );

  return Number(rows[0]?.total || 0) > 0;
}

async function getColumns(connection, tableName) {
  const [rows] = await connection.query(
    `SELECT
       column_name,
       is_nullable,
       column_default,
       extra,
       data_type
     FROM information_schema.columns
     WHERE table_schema = DATABASE()
       AND table_name = ?
     ORDER BY ordinal_position`,
    [tableName]
  );

  return new Map(
    rows.map((row) => [
      String(row.column_name),
      {
        nullable: String(row.is_nullable).toUpperCase() === "YES",
        defaultValue: row.column_default,
        extra: String(row.extra || ""),
        dataType: String(row.data_type || ""),
      },
    ])
  );
}

async function getIndexes(connection, tableName) {
  const [rows] = await connection.query(
    `SELECT
       index_name,
       non_unique,
       seq_in_index,
       column_name
     FROM information_schema.statistics
     WHERE table_schema = DATABASE()
       AND table_name = ?
     ORDER BY index_name, seq_in_index`,
    [tableName]
  );

  const indexes = new Map();

  for (const row of rows) {
    const name = String(row.index_name);

    if (!indexes.has(name)) {
      indexes.set(name, {
        name,
        unique: Number(row.non_unique) === 0,
        columns: [],
      });
    }

    indexes.get(name).columns.push(
      String(row.column_name)
    );
  }

  return Array.from(indexes.values());
}

function quoteIdentifier(identifier) {
  return `\`${String(identifier).replaceAll("`", "``")}\``;
}

async function replaceSingleColumnUniqueIndex(
  connection,
  tableName,
  singleColumn,
  compositeIndexName
) {
  const indexes = await getIndexes(connection, tableName);
  const singleColumnUniqueIndexes = indexes.filter(
    (index) =>
      index.name !== "PRIMARY" &&
      index.unique &&
      index.columns.length === 1 &&
      index.columns[0] === singleColumn
  );

  for (const index of singleColumnUniqueIndexes) {
    await connection.query(
      `ALTER TABLE ${quoteIdentifier(tableName)}
       DROP INDEX ${quoteIdentifier(index.name)}`
    );

    console.log(
      `Replaced unique index ${tableName}.${index.name}`
    );
  }

  if (!singleColumnUniqueIndexes.length) {
    return;
  }

  const refreshedIndexes = await getIndexes(
    connection,
    tableName
  );
  const alreadyExists = refreshedIndexes.some(
    (index) =>
      index.unique &&
      index.columns.join(",") ===
        `species,${singleColumn}`
  );

  if (!alreadyExists) {
    await connection.query(
      `ALTER TABLE ${quoteIdentifier(tableName)}
       ADD UNIQUE INDEX ${quoteIdentifier(compositeIndexName)}
       (species, ${quoteIdentifier(singleColumn)})`
    );
  }
}

async function ensureSpeciesColumn(connection, tableName) {
  const columns = await getColumns(connection, tableName);

  if (!columns.has("species")) {
    await connection.query(
      `ALTER TABLE \`${tableName}\`
       ADD COLUMN species VARCHAR(10) NOT NULL DEFAULT 'cat'`
    );
    console.log(`Added ${tableName}.species`);
  }

  await connection.query(
    `UPDATE \`${tableName}\`
     SET species = 'cat'
     WHERE species IS NULL
        OR TRIM(species) = ''
        OR species NOT IN ('cat', 'dog')`
  );
}

async function assertRequiredSchema(connection) {
  const missingTables = [];

  for (const tableName of REQUIRED_TABLES) {
    if (!(await tableExists(connection, tableName))) {
      missingTables.push(tableName);
    }
  }

  if (missingTables.length) {
    throw new Error(
      `ไม่พบตารางที่ระบบแบบประเมินต้องใช้: ${missingTables.join(", ")}`
    );
  }

  const expectedColumns = {
    assessment_question: [
      "question_id",
      "question_text",
      "category",
      "question_order",
      "status",
    ],
    answer_option: [
      "option_id",
      "question_id",
      "option_text",
      "score_value",
      "option_order",
    ],
    breed: [
      "breed_id",
      "breed_name",
      ...TRAIT_COLUMNS,
      "description",
      "image_url",
      "status",
    ],
    weight_criteria: ["weight_id", ...WEIGHT_COLUMNS],
  };

  for (const [tableName, requiredColumns] of Object.entries(expectedColumns)) {
    const columns = await getColumns(connection, tableName);
    const missingColumns = requiredColumns.filter(
      (columnName) => !columns.has(columnName)
    );

    if (missingColumns.length) {
      throw new Error(
        `ตาราง ${tableName} ขาดคอลัมน์: ${missingColumns.join(", ")}`
      );
    }
  }
}

async function upsertDogQuestions(connection) {
  for (const question of dogQuestions) {
    const [existingRows] = await connection.query(
      `SELECT question_id
       FROM assessment_question
       WHERE species = 'dog'
         AND question_order = ?
       LIMIT 1`,
      [question.question_order]
    );

    let questionId;

    if (existingRows.length) {
      questionId = Number(existingRows[0].question_id);

      await connection.query(
        `UPDATE assessment_question
         SET question_text = ?,
             category = ?,
             status = ?
         WHERE question_id = ?`,
        [
          question.question_text,
          question.category,
          question.status,
          questionId,
        ]
      );
    } else {
      const [insertResult] = await connection.query(
        `INSERT INTO assessment_question (
           question_text,
           category,
           question_order,
           status,
           species
         )
         VALUES (?, ?, ?, ?, 'dog')`,
        [
          question.question_text,
          question.category,
          question.question_order,
          question.status,
        ]
      );

      questionId = Number(insertResult.insertId);
    }

    const questionOptions = getQuestionOptions(question);

    for (const option of questionOptions) {
      const [optionRows] = await connection.query(
        `SELECT option_id
         FROM answer_option
         WHERE question_id = ?
           AND score_value = ?
         LIMIT 1`,
        [questionId, option.score]
      );

      if (optionRows.length) {
        await connection.query(
          `UPDATE answer_option
           SET option_text = ?,
               option_order = ?
           WHERE option_id = ?`,
          [
            option.text,
            option.score,
            Number(optionRows[0].option_id),
          ]
        );
      } else {
        await connection.query(
          `INSERT INTO answer_option (
             question_id,
             option_text,
             score_value,
             option_order
           )
           VALUES (?, ?, ?, ?)`,
          [
            questionId,
            option.text,
            option.score,
            option.score,
          ]
        );
      }
    }
  }
}

async function upsertDogBreeds(connection) {
  const updateSet = [
    "breed_name = ?",
    ...TRAIT_COLUMNS.map((column) => `${column} = ?`),
    "status = ?",
    "species = 'dog'",
  ].join(", ");

  const insertColumns = [
    "breed_name",
    ...TRAIT_COLUMNS,
    "description",
    "image_url",
    "status",
    "species",
  ];

  const insertPlaceholders = insertColumns.map(() => "?").join(", ");

  for (const breed of dogBreeds) {
    const [existingRows] = await connection.query(
      `SELECT breed_id
       FROM breed
       WHERE species = 'dog'
         AND LOWER(TRIM(breed_name)) = LOWER(TRIM(?))
       LIMIT 1`,
      [breed.breed_name]
    );

    const traitValues = TRAIT_COLUMNS.map(
      (column) => Number(breed[column])
    );

    if (existingRows.length) {
      await connection.query(
        `UPDATE breed
         SET ${updateSet}
         WHERE breed_id = ?`,
        [
          breed.breed_name,
          ...traitValues,
          breed.status,
          Number(existingRows[0].breed_id),
        ]
      );
    } else {
      await connection.query(
        `INSERT INTO breed (${insertColumns.join(", ")})
         VALUES (${insertPlaceholders})`,
        [
          breed.breed_name,
          ...traitValues,
          "",
          "",
          breed.status,
          "dog",
        ]
      );
    }
  }
}

async function ensureDogWeights(connection) {
  const [dogRows] = await connection.query(
    `SELECT weight_id
     FROM weight_criteria
     WHERE species = 'dog'
     ORDER BY weight_id DESC
     LIMIT 1`
  );

  if (dogRows.length) {
    return;
  }

  const columns = await getColumns(connection, "weight_criteria");
  const [catRows] = await connection.query(
    `SELECT *
     FROM weight_criteria
     WHERE species = 'cat'
     ORDER BY weight_id DESC
     LIMIT 1`
  );

  const source = catRows[0] || {};
  const insertColumns = [...WEIGHT_COLUMNS, "species"];
  const insertValues = WEIGHT_COLUMNS.map((column) => {
    const value = Number(source[column]);
    return Number.isFinite(value) && value >= 0 ? value : 5;
  });
  const placeholders = WEIGHT_COLUMNS.map(() => "?");

  insertValues.push("dog");
  placeholders.push("?");

  if (columns.has("updated_by")) {
    const metadata = columns.get("updated_by");
    const sourceAdminId = Number(source.updated_by);

    if (Number.isInteger(sourceAdminId) && sourceAdminId > 0) {
      insertColumns.push("updated_by");
      insertValues.push(sourceAdminId);
      placeholders.push("?");
    } else if (!metadata.nullable && metadata.defaultValue === null) {
      throw new Error(
        "weight_criteria.updated_by เป็น NOT NULL แต่ไม่พบผู้ดูแลจากชุดค่าน้ำหนักแมว"
      );
    }
  }

  if (columns.has("updated_at")) {
    insertColumns.push("updated_at");
    placeholders.push("NOW()");
  }

  await connection.query(
    `INSERT INTO weight_criteria (${insertColumns.join(", ")})
     VALUES (${placeholders.join(", ")})`,
    insertValues
  );
}

async function verifyMigration(connection) {
  const [[questionCount]] = await connection.query(
    `SELECT COUNT(*) AS total
     FROM assessment_question
     WHERE species = 'dog'
       AND status = 'active'`
  );

  const [[optionCount]] = await connection.query(
    `SELECT COUNT(*) AS total
     FROM answer_option AS o
     INNER JOIN assessment_question AS q
       ON q.question_id = o.question_id
     WHERE q.species = 'dog'
       AND q.status = 'active'`
  );

  const [[breedCount]] = await connection.query(
    `SELECT COUNT(*) AS total
     FROM breed
     WHERE species = 'dog'
       AND status = 'active'`
  );

  const [[weightCount]] = await connection.query(
    `SELECT COUNT(*) AS total
     FROM weight_criteria
     WHERE species = 'dog'`
  );

  const summary = {
    dog_questions: Number(questionCount.total),
    dog_answer_options: Number(optionCount.total),
    dog_breeds: Number(breedCount.total),
    dog_weight_sets: Number(weightCount.total),
  };

  if (
    summary.dog_questions !== 100 ||
    summary.dog_answer_options !== 500 ||
    summary.dog_breeds !== 69 ||
    summary.dog_weight_sets < 1
  ) {
    throw new Error(
      `ตรวจสอบข้อมูลไม่ผ่าน: ${JSON.stringify(summary)}`
    );
  }

  return summary;
}

async function runDogAssessmentMigration(options = {}) {
  const closePool = options.closePool === true;
  let connection;

  try {
    connection = await db.getConnection();
    await assertRequiredSchema(connection);

    for (const tableName of SPECIES_TABLES) {
      await ensureSpeciesColumn(connection, tableName);
    }

    await replaceSingleColumnUniqueIndex(
      connection,
      "assessment_question",
      "question_order",
      "uq_assessment_question_species_order"
    );

    await replaceSingleColumnUniqueIndex(
      connection,
      "breed",
      "breed_name",
      "uq_breed_species_name"
    );

    await connection.beginTransaction();

    await upsertDogQuestions(connection);
    await upsertDogBreeds(connection);
    await ensureDogWeights(connection);

    const summary = await verifyMigration(connection);

    await connection.commit();

    console.log("Dog assessment database is ready.");
    console.table(summary);
    return summary;
  } catch (error) {
    if (connection) {
      try {
        await connection.rollback();
      } catch (_rollbackError) {
        // ALTER TABLE commits automatically. The data phase still uses a
        // transaction, so an interrupted seed can safely be run again.
      }
    }

    throw error;
  } finally {
    if (connection) {
      connection.release();
    }

    if (closePool) {
      try {
        await db.end();
      } catch (_closeError) {
        // Ignore pool-close errors after a failed initial connection.
      }
    }
  }
}

if (require.main === module) {
  runDogAssessmentMigration({ closePool: true }).catch((error) => {
    console.error(
      "Dog assessment migration failed:",
      error.message
    );
    process.exitCode = 1;
  });
}

module.exports = {
  runDogAssessmentMigration,
};
