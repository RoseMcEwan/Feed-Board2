require("dotenv").config();

const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const path = require("node:path");
const { db, connectDB } = require("./config/db");
const { sessionMiddleware, sessionStore } = require("./config/session");
const farmRoutes = require("./routes/farmRoute");
const { checkOrigin, checkSessionExpiry, apiLimit, errorHandler } = require("./middleware/middleware");

const app = express();
const port = Number(process.env.PORT || 3008);
const production = process.env.NODE_ENV === "production";
const clientOrigin = process.env.CLIENT_ORIGIN || "http://localhost:5173";
const proxyHops = Number(process.env.TRUST_PROXY_HOPS || 0);

if (!Number.isInteger(port) || port < 1 || port > 65535) throw new Error("PORT must be between 1 and 65535.");
if (!Number.isInteger(proxyHops) || proxyHops < 0 || proxyHops > 5)
  throw new Error("Set a valid TRUST_PROXY_HOPS value.");
if (new URL(clientOrigin).origin !== clientOrigin || !/^https?:\/\//.test(clientOrigin)) {
  throw new Error("CLIENT_ORIGIN must be an exact http(s) origin without a trailing slash.");
}
if (production && !clientOrigin.startsWith("https://")) throw new Error("Production requires an HTTPS CLIENT_ORIGIN.");

// Middleware
app.disable("x-powered-by");
app.set("trust proxy", proxyHops);
app.use(helmet({ contentSecurityPolicy: { directives: { upgradeInsecureRequests: production ? [] : null } } }));
app.use("/api", checkOrigin);
app.use(
  "/api",
  cors({
    origin: clientOrigin,
    credentials: true,
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE"],
    allowedHeaders: ["Content-Type", "X-CSRF-Token", "X-FeedBoard-User"],
  }),
);
app.use("/api", apiLimit);
app.use(express.json({ limit: "2mb" }));
app.use("/api", sessionMiddleware);
app.use("/api", checkSessionExpiry);

// Routes
app.get("/api/health", async (req, res) => {
  try {
    await db.execute("SELECT 1");
    res.status(200).json({ status: "ok" });
  } catch {
    res.status(503).json({ status: "unavailable" });
  }
});
app.use("/api", farmRoutes);
app.use("/api", (req, res) => res.status(404).json({ message: "API route not found.", code: "NOT_FOUND" }));

// Vite serves the UI in development; only built public files are served in production.
if (production) {
  const uiFolder = path.join(__dirname, "../ui/dist");
  app.use(express.static(uiFolder));
  app.get("/{*path}", (req, res) => {
    if (path.extname(req.path)) return res.sendStatus(404);
    res.sendFile(path.join(uiFolder, "index.html"));
  });
} else {
  app.get("/", (req, res) => res.status(200).json({ message: "FeedBoard API is running" }));
}
app.use(errorHandler);

// Connect first, then start listening.
const startServer = async () => {
  try {
    await connectDB();
    await sessionStore.onReady();
    const server = app.listen(port, process.env.HOST || "127.0.0.1", () => {
      console.log(`Server running on port ${port}`);
    });
    server.on("error", (error) => {
      console.error("Failed to start server:", error.code || error.message);
      process.exit(1);
    });
    // Let in-flight saves finish before closing the database on a normal shutdown.
    const stop = () => {
      const forceExit = setTimeout(() => process.exit(1), 10000).unref();
      server.close(async () => {
        try {
          await sessionStore.close();
          await db.end();
          clearTimeout(forceExit);
        } catch {
          process.exitCode = 1;
        }
      });
    };
    process.once("SIGINT", stop);
    process.once("SIGTERM", stop);
    return server;
  } catch (error) {
    console.error("Failed to start server:", error.code || error.message);
    process.exit(1);
  }
};

// Tests can import the app without starting another listening server.
if (require.main === module) startServer();
module.exports = { app, startServer };
