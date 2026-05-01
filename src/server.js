require("dotenv").config();

const path = require("path");
const express = require("express");
const session = require("express-session");

const { migrate } = require("./db/migrations");
const { SQLiteSessionStore } = require("./db/sessionStore");
const adminRoutes = require("./routes/admin");
const publicRoutes = require("./routes/public");
const assetRoutes = require("./routes/assets");

migrate();

const app = express();
const port = Number(process.env.PORT || 3000);

app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));
app.locals.nl2br = (value) =>
  String(value || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\r?\n/g, "<br>");

app.use(express.urlencoded({ extended: true }));
app.use(express.json());

// Trust proxy if behind reverse proxy (nginx/apache)
if (process.env.TRUST_PROXY === "true") {
  app.set("trust proxy", 1);
}

app.use(session({
  name: "presell.sid",
  secret: process.env.SESSION_SECRET || "development-secret",
  resave: true,
  saveUninitialized: true,
  store: new SQLiteSessionStore(),
  cookie: {
    httpOnly: true,
    sameSite: "lax",
    // NEVER set secure:true unless explicitly using HTTPS
    // On HTTP, browser silently rejects Secure cookies (root cause of all CSRF issues)
    secure: process.env.FORCE_HTTPS === "true",
    maxAge: 1000 * 60 * 60 * 8
  }
}));

app.use("/static", express.static(path.join(__dirname, "public")));
app.use("/media", assetRoutes);
app.use("/", publicRoutes);
app.use("/admin", adminRoutes);

app.use((req, res) => {
  res.status(404).render("presell/404", { 
    title: "Pagina nao encontrada",
    pixelHtml: ""
  });
});

app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).send("Erro interno no servidor.");
});

if (require.main === module) {
  app.listen(port, () => {
    console.log(`Presell server running at http://localhost:${port}`);
  });
}

module.exports = app;
