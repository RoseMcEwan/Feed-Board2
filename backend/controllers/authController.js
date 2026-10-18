const argon2 = require("argon2");
const { randomBytes } = require("node:crypto");
const models = require("../models/userModel");
const { csrfToken } = require("../middleware/middleware");
const { sessionName, cookieOptions } = require("../config/session");

const hashOptions = { type: argon2.argon2id, memoryCost: 19456, timeCost: 2, parallelism: 1 };
let dummyHash;

// Runs a session operation and waits for it to finish.
const sessionCall = (req, method) => new Promise((resolve, reject) => {
  req.session[method]((error) => error ? reject(error) : resolve());
});

// Creates the authenticated session after a successful register or login.
const enterAccount = async (req, res, user, status) => {
  await sessionCall(req, "regenerate");
  req.session.userId = user.id;
  req.session.authenticatedAt = Date.now();
  const token = csrfToken(req);
  await sessionCall(req, "save");
  res.status(status).json({
    user: { id: user.id, name: user.name, email: user.email },
    csrfToken: token,
  });
};

// Returns the currently logged-in user and CSRF token.
const getSession = async (req, res) => {
  const user = req.session.userId ? await models.getUserById(req.session.userId) : null;
  res.status(200).json({ user, csrfToken: csrfToken(req) });
};

// Creates a new user account and starts their login session.
const register = async (req, res) => {
  const { name, email, password } = req.account;
  const passwordHash = await argon2.hash(password, hashOptions);
  const user = await models.createUser({ name, email, passwordHash });
  await enterAccount(req, res, user, 201);
};

// Checks the user's credentials and starts their login session.
const login = async (req, res) => {
  const user = await models.getUserForLogin(req.account.email);
  if (!user && !dummyHash) dummyHash = argon2.hash(randomBytes(32).toString("hex"), hashOptions);
  const valid = await argon2.verify(user?.passwordHash || await dummyHash, req.account.password);
  if (!user || !valid) {
    return res.status(401).json({ message: "Email or password is incorrect.", code: "INVALID_CREDENTIALS" });
  }
  await enterAccount(req, res, user, 200);
};

// Ends the user's login session and clears the session cookie.
const logout = async (req, res) => {
  await sessionCall(req, "destroy");
  res.clearCookie(sessionName, cookieOptions);
  res.status(204).send();
};

module.exports = { getSession, register, login, logout };
