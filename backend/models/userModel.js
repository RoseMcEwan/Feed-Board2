const { db } = require("../config/db");

const getUserById = async (id) => {
  const [rows] = await db.execute("SELECT user_id AS id, name, email FROM users WHERE user_id = ?", [id]);
  return rows[0] || null;
};
const getUserForLogin = async (email) => {
  const [rows] = await db.execute(
    "SELECT user_id AS id, name, email, password_hash AS passwordHash FROM users WHERE email = ?",
    [email],
  );
  return rows[0] || null;
};
const createUser = async ({ name, email, passwordHash }) => {
  const [result] = await db.execute("INSERT INTO users (name, email, password_hash) VALUES (?, ?, ?)", [
    name,
    email,
    passwordHash,
  ]);
  return { id: result.insertId, name, email };
};
module.exports = { getUserById, getUserForLogin, createUser };
