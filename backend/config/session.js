const session = require("express-session");
const MySQLStore = require("express-mysql-session")(session);
const { db } = require("./db");

const production = process.env.NODE_ENV === "production";
const sessionName = production ? "__Host-feedboard.sid" : "feedboard.sid";
const secret = process.env.SESSION_SECRET || "";
if (secret.length < 32 || secret.includes("replace-with")) {
  throw new Error("Generate SESSION_SECRET with npm run secret and add it to backend/.env.");
}

const sessionStore = new MySQLStore({
  createDatabaseTable: false,
  endConnectionOnClose: false,
  clearExpired: true,
  checkExpirationInterval: 15 * 60 * 1000,
  expiration: 8 * 60 * 60 * 1000,
}, db);

const cookieOptions = {
  httpOnly: true,
  secure: production,
  sameSite: "lax",
  path: "/",
};

const sessionMiddleware = session({
  name: sessionName,
  secret,
  store: sessionStore,
  resave: false,
  saveUninitialized: false,
  cookie: { ...cookieOptions, maxAge: 8 * 60 * 60 * 1000 },
});

module.exports = { sessionMiddleware, sessionStore, sessionName, cookieOptions };
