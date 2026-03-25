const multer = require("multer");
const express = require("express");
const session = require("express-session");
const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
const path = require("path");
const fs = require("fs");

const User = require("./models/user");
const Hasil = require("./models/hasil");

const app = express();
const PORT = process.env.PORT || 3000;

/* ================= MONGODB ================= */

const MONGO_URI =
  process.env.MONGO_URI ||
  "mongodb://127.0.0.1:27017/kecanduangame";

mongoose
  .connect(MONGO_URI)
  .then(() => console.log("MongoDB CONNECT"))
  .catch((err) => console.log("DB ERROR:", err));

/* ================= SESSION ================= */
app.set("trust proxy", 1);

app.use(
  session({
    secret: SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
    proxy: true,
    cookie: {
      secure: true,
      sameSite: "none",
    },
  })
);
/* ================= MIDDLEWARE ================= */

app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(express.static(path.join(__dirname, "public")));

app.set("trust proxy", 1);

/* ================= ADMIN AUTO ================= */

async function createAdmin() {
  const admin = await User.findOne({
    email: "admin@gmail.com",
  });

  if (!admin) {
    const hash = await bcrypt.hash("123456", 10);

    await User.create({
      nama: "Administrator",
      email: "admin@gmail.com",
      password: hash,
      role: "admin",
    });

    console.log("Admin dibuat");
  }
}

createAdmin();

/* ================= LOGIN CHECK ================= */

function isLogin(req, res, next) {
  if (!req.session.userId) {
    return res.redirect("/login");
  }
  next();
}

function isAdmin(req, res, next) {
  if (req.session.role !== "admin") {
    return res.redirect("/dashboard");
  }
  next();
}

/* ================= ROUTES ================= */

app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "views/home.html"));
});

app.get("/login", (req, res) => {
  res.sendFile(path.join(__dirname, "views/login.html"));
});

app.get("/register", (req, res) => {
  res.sendFile(path.join(__dirname, "views/register.html"));
});

/* ================= REGISTER ================= */

app.post("/register", async (req, res) => {
  try {
    const { nama, email, password, confirm_password } =
      req.body;

    if (password !== confirm_password) {
      return res.send("Password tidak sama");
    }

    const exist = await User.findOne({ email });

    if (exist) {
      return res.send("Email sudah ada");
    }

    const hash = await bcrypt.hash(password, 10);

    await User.create({
      nama,
      email,
      password: hash,
      role: "user",
    });

    res.redirect("/login");
  } catch (err) {
    console.log("REGISTER ERROR:", err);
    res.send("Error register");
  }
});

/* ================= LOGIN ================= */

app.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;

    const user = await User.findOne({ email });

    if (!user) {
      return res.redirect("/login");
    }

    const match = await bcrypt.compare(
      password,
      user.password
    );

    if (!match) {
      return res.redirect("/login");
    }

    req.session.userId = user._id;
    req.session.role = user.role;

    if (user.role === "admin") {
      return res.redirect("/admin");
    }

    return res.redirect("/dashboard");

  } catch (err) {
    console.log(err);
    res.redirect("/login");
  }
});

/* ================= USER ================= */

app.get("/dashboard", isLogin, (req, res) => {
  res.sendFile(
    path.join(__dirname, "views/user_dashboard.html")
  );
});

app.get("/user_hasil", isLogin, (req, res) => {
  res.sendFile(
    path.join(__dirname, "views/user_hasil.html")
  );
});

/* ================= ADMIN ================= */

app.get("/admin", isLogin, isAdmin, (req, res) => {
  res.sendFile(
    path.join(__dirname, "views/admin.html")
  );
});

/* ================= LOGOUT ================= */

app.get("/logout", (req, res) => {
  req.session.destroy(() => {
    res.redirect("/");
  });
});

/* ================= SERVER ================= */

if (require.main === module) {
  app.listen(PORT, () => {
    console.log("RUN", PORT);
  });
}

module.exports = app;