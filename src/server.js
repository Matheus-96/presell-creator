require("dotenv").config();

const path = require("path");
const express = require("express");
const session = require("express-session");

const { migrate } = require("./db/migrations");
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
app.use(
  session({
    name: "presell.sid",
    secret: process.env.SESSION_SECRET || "development-secret",
    resave: false,
    saveUninitialized: false,
    cookie: {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      maxAge: 1000 * 60 * 60 * 8
    }
  })
);

app.use("/static", express.static(path.join(__dirname, "public")));
app.use("/media", assetRoutes);
app.use("/", publicRoutes);
app.use("/admin", adminRoutes);

app.use((req, res) => {
  res.status(404).render("presell/404", { title: "Pagina nao encontrada" });
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
