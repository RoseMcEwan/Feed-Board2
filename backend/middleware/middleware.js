const { randomBytes, timingSafeEqual, createHash } = require("node:crypto");
const { rateLimit } = require("express-rate-limit");
const users = require("../models/userModel");
const { validateFarm } = require("./farmValidation");
const { validateCalculation } = require("./calculationValidation");
const { sessionName, cookieOptions } = require("../config/session");

// Checks that requests come from the allowed frontend origin.
const checkOrigin = (req, res, next) => {
  res.setHeader("Cache-Control", "no-store");
  const origin = req.get("Origin");

  if (origin && origin !== (process.env.CLIENT_ORIGIN || "http://localhost:5173")) {
    return res.status(403).json({
      message: "Origin is not allowed.",
      code: "ORIGIN_DENIED",
    });
  }

  next();
};

// Creates or retrieves the session's CSRF token.
const csrfToken = (req) => {
  if (!req.session.csrfToken) {
    req.session.csrfToken = randomBytes(32).toString("hex");
  }

  return req.session.csrfToken;
};

// Blocks protected requests that do not contain the correct CSRF token.
const requireCsrf = (req, res, next) => {
  const supplied = req.get("X-CSRF-Token");
  const expected = req.session?.csrfToken;

  if (
    typeof supplied !== "string" ||
    typeof expected !== "string" ||
    !/^[a-f0-9]{64}$/.test(supplied) ||
    !/^[a-f0-9]{64}$/.test(expected) ||
    !timingSafeEqual(Buffer.from(supplied), Buffer.from(expected))
  ) {
    return res.status(403).json({
      message: "Your security token expired. Refresh and try again.",
      code: "CSRF_INVALID",
    });
  }

  next();
};

// Ends login sessions that have been active for more than eight hours.
const checkSessionExpiry = (req, res, next) => {
  if (req.session.authenticatedAt && Date.now() - req.session.authenticatedAt >= 8 * 60 * 60 * 1000) {
    return req.session.destroy((error) => {
      if (error) return next(error);

      res.clearCookie(sessionName, cookieOptions);

      res.status(401).json({
        message: "Your session expired. Please log in again.",
        code: "AUTH_REQUIRED",
      });
    });
  }

  next();
};

// Confirms the request belongs to the currently logged-in user.
const requireAuth = async (req, res, next) => {
  const user = req.session?.userId ? await users.getUserById(req.session.userId) : null;

  if (!user) {
    return res.status(401).json({
      message: "Please log in to continue. Your browser draft is kept.",
      code: "AUTH_REQUIRED",
    });
  }

  if (req.get("X-FeedBoard-User") !== String(user.id)) {
    return res.status(409).json({
      message: "The signed-in account changed in another tab. Reload before continuing.",
      code: "ACCOUNT_CHANGED",
    });
  }

  req.user = user;
  next();
};

// Limits general API requests.
const apiLimit = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 1200,
  standardHeaders: "draft-8",
  legacyHeaders: false,
  message: {
    message: "Too many requests. Please wait before trying again.",
    code: "RATE_LIMITED",
  },
});

// Limits account registration and login attempts.
const accountLimit = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 30,
  standardHeaders: "draft-8",
  legacyHeaders: false,
  message: {
    message: "Too many account attempts. Wait 15 minutes before trying again.",
    code: "RATE_LIMITED",
  },
});

// Limits repeated attempts using the same email address.
const emailLimit = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 10,
  skipSuccessfulRequests: true,
  standardHeaders: "draft-8",
  legacyHeaders: false,

  // Store a hash, rather than the email itself, in the in-memory limit keys.
  keyGenerator: (req) => createHash("sha256").update(req.account.email).digest("hex"),

  message: {
    message: "Too many account attempts. Wait 15 minutes before trying again.",
    code: "RATE_LIMITED",
  },
});

// Limits weather requests.
const weatherLimit = rateLimit({
  windowMs: 60 * 1000,
  limit: 30,
  standardHeaders: "draft-8",
  legacyHeaders: false,
  message: {
    message: "Too many weather requests. Try again in a minute.",
    code: "RATE_LIMITED",
  },
});

// Limits calculation requests.
const calculationLimit = rateLimit({
  windowMs: 60 * 1000,
  limit: 120,
  keyGenerator: (req) => String(req.user.id),
  standardHeaders: "draft-8",
  legacyHeaders: false,
  message: {
    message: "Too many calculation requests. Wait a minute and retry.",
    code: "RATE_LIMITED",
  },
});

// Validates account details for registration or login.
function validateAccount(req, res, next, registering) {
  const body = req.body;

  if (!body || Array.isArray(body) || typeof body !== "object") {
    return res.status(400).json({
      message: "Send account details as JSON.",
      code: "VALIDATION_ERROR",
    });
  }

  const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";

  const password = typeof body.password === "string" ? body.password : "";

  const name = typeof body.name === "string" ? body.name.trim() : "";

  const errors = [];

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 254) {
    errors.push("Enter a valid email address.");
  }

  if (registering && (!name || name.length > 80)) {
    errors.push("Enter a name of 1–80 characters.");
  }

  if (!password.length || password.length > 128 || (registering && [...password].length < 8)) {
    errors.push(registering ? "Use a password of at least 8 characters." : "Enter your password.");
  }

  if (errors.length) {
    return res.status(400).json({
      message: "Check your account details.",
      code: "VALIDATION_ERROR",
      errors,
    });
  }

  req.account = { name, email, password };
  next();
}

const validateCreateUser = (req, res, next) => validateAccount(req, res, next, true);

const validateLogin = (req, res, next) => validateAccount(req, res, next, false);

// Validates a complete farm before saving it.
const validateFarmBody = (req, res, next) => {
  const { farm, expectedVersion } = req.body || {};

  if (!Number.isSafeInteger(expectedVersion) || expectedVersion < 0 || expectedVersion >= 4294967295) {
    return res.status(400).json({
      message: "Send the saved farm version with your changes.",
      code: "VALIDATION_ERROR",
    });
  }

  const errors = validateFarm(farm);

  if (farm?.setupCompleted !== true) {
    errors.push("Complete setup before saving the farm to your account.");
  }

  if (errors.length) {
    return res.status(422).json({
      message: "These changes are still a draft. Correct the listed fields.",
      code: "VALIDATION_ERROR",
      errors: errors.slice(0, 50),
    });
  }

  req.farm = farm;
  req.expectedVersion = expectedVersion;
  next();
};

// Validates calculation requests.
const validateCalculationBody = (req, res, next) => {
  const errors = validateCalculation(req.body);

  if (errors.length) {
    return res.status(422).json({
      message: "This draft cannot be calculated. Check the listed fields.",
      code: "CALCULATION_INPUT_INVALID",
      errors: errors.slice(0, 50),
    });
  }

  const { farm, today, selectedDate } = req.body;

  req.calculation = {
    farm,
    today,
    selectedDate: selectedDate || null,
  };

  next();
};

// Validates weather coordinates.
const validateWeather = (req, res, next) => {
  const { lat, lon } = req.query;

  if (
    typeof lat !== "string" ||
    typeof lon !== "string" ||
    !lat.trim() ||
    !lon.trim() ||
    !Number.isFinite(Number(lat)) ||
    !Number.isFinite(Number(lon)) ||
    Math.abs(Number(lat)) > 90 ||
    Math.abs(Number(lon)) > 180
  ) {
    return res.status(400).json({
      message: "Valid latitude and longitude are required.",
      code: "VALIDATION_ERROR",
    });
  }

  req.coordinates = {
    lat: Number(lat).toFixed(4),
    lon: Number(lon).toFixed(4),
  };

  next();
};

// Handles API errors and returns safe messages to the frontend.
const errorHandler = (error, req, res, next) => {
  if (res.headersSent) return next(error);

  if (error.type === "entity.too.large") {
    return res.status(413).json({
      message: "This request is too large (maximum 2 MB).",
      code: "PAYLOAD_TOO_LARGE",
    });
  }

  if (error.type === "entity.parse.failed") {
    return res.status(400).json({
      message: "The request contains invalid JSON.",
      code: "INVALID_JSON",
    });
  }

  if (error.code === "ER_DUP_ENTRY") {
    return res.status(409).json({
      message: "That email or record already exists. No changes were saved.",
      code: "DUPLICATE_RECORD",
    });
  }

  if (["ER_NO_REFERENCED_ROW_2", "ER_ROW_IS_REFERENCED_2"].includes(error.code)) {
    return res.status(409).json({
      message: "A linked record is missing or still in use. Refresh before trying again.",
      code: "RELATIONSHIP_CONFLICT",
    });
  }

  if (error.status >= 400 && error.status < 600) {
    return res.status(error.status).json({
      message: error.message,
      code: error.code || "REQUEST_FAILED",
      ...(Array.isArray(error.errors) ? { errors: error.errors.slice(0, 50) } : {}),
    });
  }

  console.error("Request failed:", error.code || error.name || "Error");

  res.status(500).json({
    message: "The server could not complete this request. Your browser draft is kept.",
    code: "SERVER_ERROR",
  });
};

module.exports = {
  checkOrigin,
  csrfToken,
  requireCsrf,
  checkSessionExpiry,
  requireAuth,
  apiLimit,
  accountLimit,
  emailLimit,
  weatherLimit,
  calculationLimit,
  validateCreateUser,
  validateLogin,
  validateFarmBody,
  validateCalculationBody,
  validateWeather,
  errorHandler,
};
