const multer = require("multer");
const express = require("express");
const session = require("express-session");
const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
const path = require("path");

const User = require("./models/user");
const Hasil = require("./models/hasil");

const app = express();
const PORT = 3000;

/* ================= MIDDLEWARE ================= */

app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(express.static(path.join(__dirname, "public")));

app.use(session({
  secret: "secretkey123",
  resave: false,
  saveUninitialized: false,
  cookie: { secure: false }
}));

function isLogin(req, res, next) {
  if (!req.session.userId) {
    return res.redirect("/login");
  }
  next();
}

/* ================= DATABASE ================= */

mongoose.connect("mongodb://127.0.0.1:27017/addictica")
.then(() => console.log("✅ MongoDB terhubung"))
.catch(err => console.log("❌ MongoDB error:", err));

/* ================= BUAT ADMIN DEFAULT ================= */

async function createAdmin() {
  const adminExist = await User.findOne({ email: "admin@gmail.com" });

  if (!adminExist) {
    const hashedPassword = await bcrypt.hash("123456", 10);

    await User.create({
      nama: "Administrator",
      email: "admin@gmail.com",
      password: hashedPassword,
      role: "admin"
    });

    console.log("✅ Admin default dibuat");
  }
}
createAdmin();

/* ================= ROUTES ================= */

// HOME
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "views/home.html"));
});

// REGISTER
app.get("/register", (req, res) => {
  res.sendFile(path.join(__dirname, "views/register.html"));
});

// LOGIN
app.get("/login", (req, res) => {
  res.sendFile(path.join(__dirname, "views/login.html"));
});

// GEJALA
app.get("/gejala", (req, res) => {
  res.sendFile(path.join(__dirname, "views/gejala.html"));
});

// KONSULTASI 
app.get("/konsultasi", (req, res) => {
  res.sendFile(path.join(__dirname, "views/konsultasi.html"));
});

// TENTANG
app.get("/tentang", (req, res) => {
  res.sendFile(path.join(__dirname, "views/tentang.html"));
});

// HALAMAN HASIL
app.get("/hasil", (req, res) => {
  res.sendFile(path.join(__dirname, "views/hasil.html"));
});

/* ================= API ================= */

// API ambil hasil user
app.get("/api/hasil", isLogin, async (req, res) => {
  try {
    const dataHasil = await Hasil.find({ userId: req.session.userId })
      .populate("userId", "nama")
      .sort({ tanggal: -1 });

    res.json(dataHasil);
  } catch (err) {
    res.status(500).json({ message: "Server error" });
  }
});

// API ambil data user login
app.get("/api/user", isLogin, async (req, res) => {
  try {
    const user = await User.findById(req.session.userId);

    res.json({
      nama: user.nama,
      email: user.email,
      foto: user.foto || null,
      role: user.role
    });

  } catch (error) {
    res.status(500).json({ message: "Server error" });
  }
});

/* ================= REGISTER ================= */

app.post("/register", async (req, res) => {
  try {
    const { nama, email, password, confirm_password } = req.body;

    if (password !== confirm_password) {
      return res.send("Password tidak cocok");
    }

    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.send("Email sudah terdaftar");
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const user = new User({
      nama,
      email,
      password: hashedPassword,
      role: "user"
    });

    await user.save();
    res.redirect("/login");

  } catch (error) {
    console.log(error);
    res.send("Terjadi kesalahan");
  }
});

/* ================= LOGIN ================= */

app.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.redirect("/login");
    }

    const user = await User.findOne({ email });
    if (!user) {
      return res.redirect("/login");
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.redirect("/login");
    }

    // ✅ SET SESSION (INI YANG TADI SALAH)
    req.session.userId = user._id;
    req.session.role = user.role;

    if (user.role === "admin") {
      return res.redirect("/admin");
    }

    return res.redirect("/dashboard");

  } catch (error) {
    console.log("LOGIN ERROR:", error);
    return res.redirect("/login");
  }
});

/* ================= HALAMAN USER ================= */

app.get("/dashboard", isLogin, (req, res) => {
  res.sendFile(path.join(__dirname, "views/user_dashboard.html"));
});

app.get("/user_konsultasi", isLogin, (req, res) => {
  res.sendFile(path.join(__dirname, "views/user_konsultasi.html"));
});

app.get("/user_gejala", isLogin, (req, res) => {
  res.sendFile(path.join(__dirname, "views/user_gejala.html"));
});

app.get("/user_solusi", isLogin, (req, res) => {
  res.sendFile(path.join(__dirname, "views/user_solusi.html"));
});

app.get("/user_hasil", isLogin, (req, res) => {
  res.sendFile(path.join(__dirname, "views/user_hasil.html"));
});

app.get("/profil", isLogin, (req, res) => {
  res.sendFile(path.join(__dirname, "views/profil.html"));
});

/* ================= ADMIN ================= */

function isAdmin(req, res, next) {
  if (req.session.role !== "admin") {
    return res.redirect("/dashboard");
  }
  next();
}

app.get("/admin", isLogin, isAdmin, (req, res) => {
  res.sendFile(path.join(__dirname, "views/admin.html"));
});

app.get("/admin_manajemen", isLogin, isAdmin, (req, res) => {
  res.sendFile(path.join(__dirname, "views/admin_manajemen.html"));
});

app.get("/admin_pengguna", isLogin, isAdmin, (req, res) => {
  res.sendFile(path.join(__dirname, "views/admin_pengguna.html"));
});

app.get("/admin_riwayat", isLogin, isAdmin, (req, res) => {
  res.sendFile(path.join(__dirname, "views/admin_riwayat.html"));
});

app.get("/admin_detail", isLogin, isAdmin, (req, res) => {
  res.sendFile(path.join(__dirname, "views/admin_detail.html"));
});

/* ================= LOGOUT ================= */

app.get("/logout", (req, res) => {
  req.session.destroy(err => {
    if (err) console.log("LOGOUT ERROR:", err);
    res.redirect("/");
  });
});

/* ================= UPLOAD FOTO ================= */

app.use("/uploads", express.static(path.join(__dirname, "public/uploads")));

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, path.join(__dirname, "public/uploads"));
  },
  filename: function (req, file, cb) {
    const ext = path.extname(file.originalname);
    cb(null, Date.now() + ext);
  }
});

const upload = multer({ storage: storage });

/* ================= UPDATE PROFIL ================= */

app.post("/profil/update", isLogin, upload.single("foto"), async (req, res) => {
  try {
    const { nama } = req.body;

    const updateData = { nama };

    if (req.file) {
      updateData.foto = req.file.filename;
    }

    await User.findByIdAndUpdate(req.session.userId, updateData);

    res.redirect("/profil");

  } catch (error) {
    console.log("UPDATE PROFIL ERROR:", error);
    res.redirect("/profil");
  }
});

/* ================= SERVER ================= */

app.listen(PORT, () => {
  console.log(`Server berjalan di http://localhost:${PORT}`);
});