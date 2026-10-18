const mysql = require("mysql2/promise");
const fs = require("node:fs");

const db = mysql.createPool({
  host: process.env.DB_HOST,
  port: Number(process.env.DB_PORT || 3306),
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 100,
  connectTimeout: 10000,
  dateStrings: true,
  decimalNumbers: true,
  charset: "utf8mb4",
  timezone: "Z",
  ...(process.env.DB_SSL_CA
    ? { ssl: { ca: fs.readFileSync(process.env.DB_SSL_CA), rejectUnauthorized: true } }
    : {}),
});

// Checks the database connection and confirms all required tables exist.
const connectDB = async () => {
  for (const name of ["DB_HOST", "DB_USER", "DB_PASSWORD", "DB_NAME"]) {
    if (!process.env[name]) throw new Error(`Set ${name} in backend/.env.`);
  }
  const connection = await db.getConnection();
  try {
    for (const table of ["users", "farms", "herds", "paddocks", "crops", "queues", "queue_items", "sessions"]) {
      await connection.query(`SELECT 1 FROM ${table} LIMIT 0`);
    }
    console.log("Connected to MySQL");
  } finally {
    connection.release();
  }
};

module.exports = { db, connectDB };
