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
const MONGODB_URI = process.env.MONGODB_URI || "mongodb://127.0.0.1:27017/addictica";
const SESSION_SECRET = process.env.SESSION_SECRET || "secretkey123";
const uploadDir = process.env.VERCEL
  ? path.join("/tmp", "uploads")
  : path.join(__dirname, "public/uploads");

/* ================= MIDDLEWARE ================= */

app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(express.static(path.join(__dirname, "public")));

app.set("trust proxy", 1);

app.use(session({
  secret: SESSION_SECRET,
  resave: false,
  saveUninitialized: true,
  cookie: {
    secure: false
  }
}));

function isLogin(req, res, next) {
  if (!req.session.userId) {
    return res.redirect("/login");
  }
  next();
}

function muRendah(x) {
  if (x <= 30) return 1;
  if (x > 30 && x < 50) return (50 - x) / 20;
  return 0;
}

function muSedang(x) {
  if (x <= 40 || x >= 80) return 0;
  if (x > 40 && x < 60) return (x - 40) / 20;
  if (x >= 60 && x < 80) return (80 - x) / 20;
  return 0;
}

function muTinggi(x) {
  if (x <= 70) return 0;
  if (x > 70 && x < 100) return (x - 70) / 30;
  return 1;
}

function zRendah(a) {
  return 50 - (a * 20);
}

function zSedang(a) {
  return 80 - (a * 20);
}

function zTinggi(a) {
  return 70 + (a * 30);
}

/* ================= DATABASE ================= */

mongoose.connect(MONGODB_URI)
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
      .select("hasil nilaiZ tanggal userId")
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

// API admin - ambil semua admin
app.get("/api/admins", isLogin, isAdmin, async (req, res) => {
  try {
    const admins = await User.find({ role: "admin" })
      .select("nama email foto createdAt");
    res.json(admins);
  } catch (error) {
    res.status(500).json({ message: "Server error" });
  }
});

// API admin - ambil semua user
app.get("/api/users", isLogin, isAdmin, async (req, res) => {
  try {
    const users = await User.find({ role: "user" })
      .select("nama email foto createdAt");
    res.json(users);
  } catch (error) {
    res.status(500).json({ message: "Server error" });
  }
});

// API admin - ambil semua hasil diagnosa
app.get("/api/hasil/admin", isLogin, isAdmin, async (req, res) => {
  try {
    const dataHasil = await Hasil.find({})
      .populate("userId", "nama email")
      .sort({ tanggal: -1 });
    res.json(dataHasil);
  } catch (error) {
    res.status(500).json({ message: "Server error" });
  }
});

// API admin - tambah admin
app.post("/api/admins", isLogin, isAdmin, async (req, res) => {
  try {
    const { nama, email, foto, password } = req.body;

    if (!nama || !email) {
      return res.status(400).json({ message: "Nama dan email wajib diisi" });
    }
    const emailRegex = /^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({ message: "Format email tidak valid" });
    }

    const existing = await User.findOne({ email });
    if (existing) {
      return res.status(400).json({ message: "Email sudah terdaftar" });
    }

    const rawPassword = password && String(password).trim() ? password : "123456";
    const hashedPassword = await bcrypt.hash(rawPassword, 10);
    const admin = await User.create({
      nama,
      email,
      password: hashedPassword,
      role: "admin",
      foto: foto || null
    });

    res.status(201).json({
      _id: admin._id,
      nama: admin.nama,
      email: admin.email,
      foto: admin.foto,
      createdAt: admin.createdAt
    });
  } catch (error) {
    res.status(500).json({ message: "Server error" });
  }
});

// API admin - edit admin
app.put("/api/admins/:id", isLogin, isAdmin, async (req, res) => {
  try {
    const { nama, email, foto, password } = req.body;

    if (!nama || !email) {
      return res.status(400).json({ message: "Nama dan email wajib diisi" });
    }
    const emailRegex = /^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({ message: "Format email tidak valid" });
    }

    const existing = await User.findOne({
      email,
      _id: { $ne: req.params.id }
    });
    if (existing) {
      return res.status(400).json({ message: "Email sudah digunakan" });
    }

    const updateData = { nama, email };
    if (foto) updateData.foto = foto;
    if (password && String(password).trim()) {
      updateData.password = await bcrypt.hash(password, 10);
    }

    const updated = await User.findByIdAndUpdate(
      req.params.id,
      updateData,
      { new: true }
    );

    if (!updated) {
      return res.status(404).json({ message: "Admin tidak ditemukan" });
    }

    res.json({
      _id: updated._id,
      nama: updated.nama,
      email: updated.email,
      foto: updated.foto,
      createdAt: updated.createdAt
    });
  } catch (error) {
    res.status(500).json({ message: "Server error" });
  }
});

// API admin - hapus admin
app.delete("/api/admins/:id", isLogin, isAdmin, async (req, res) => {
  try {
    if (req.params.id === String(req.session.userId)) {
      return res.status(400).json({ message: "Tidak bisa menghapus akun sendiri" });
    }

    const deleted = await User.findByIdAndDelete(req.params.id);
    if (!deleted) {
      return res.status(404).json({ message: "Admin tidak ditemukan" });
    }

    res.json({ message: "Admin dihapus" });
  } catch (error) {
    res.status(500).json({ message: "Server error" });
  }
});

// API admin - hapus hasil diagnosa
app.delete("/api/hasil/:id", isLogin, isAdmin, async (req, res) => {
  try {
    const deleted = await Hasil.findByIdAndDelete(req.params.id);
    if (!deleted) {
      return res.status(404).json({ message: "Data tidak ditemukan" });
    }
    res.json({ message: "Data dihapus" });
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

// API detail hasil user
app.get("/api/hasil/:id", isLogin, async (req, res) => {
  try {
    const detail = await Hasil.findOne({
      _id: req.params.id,
      userId: req.session.userId
    }).select("hasil nilaiZ tanggal total jawaban");

    if (!detail) {
      return res.status(404).json({ message: "Data tidak ditemukan" });
    }

    return res.json(detail);
  } catch (error) {
    return res.status(500).json({ message: "Server error" });
  }
});

/* ================= SUBMIT KONSULTASI ================= */

app.post("/submit", isLogin, async (req, res) => {
  try {
    const jawaban = {};
    const nilai = [];

    for (let i = 1; i <= 20; i += 1) {
      const key = `q${i}`;
      const raw = req.body[key];
      const parsed = parseInt(raw, 10);

      if (Number.isNaN(parsed)) {
        return res.status(400).send("Jawaban belum lengkap.");
      }

      jawaban[key] = parsed;
      nilai.push(parsed);
    }

    const total = nilai.reduce((a, b) => a + b, 0);

    const a1 = muRendah(total);
    const a2 = muSedang(total);
    const a3 = muTinggi(total);

    const z1 = zRendah(a1);
    const z2 = zSedang(a2);
    const z3 = zTinggi(a3);

    const numerator = (a1 * z1) + (a2 * z2) + (a3 * z3);
    const denominator = a1 + a2 + a3;

    const skorFuzzy = denominator === 0 ? 0 : numerator / denominator;
    const nilaiZ = Number(skorFuzzy.toFixed(2));

    let hasil = "";
    if (skorFuzzy < 50) hasil = "Rendah";
    else if (skorFuzzy < 75) hasil = "Sedang";
    else hasil = "Tinggi";

    await Hasil.create({
      userId: req.session.userId,
      hasil,
      jawaban,
      total,
      nilaiZ
    });

    const wantsJson =
      (req.headers.accept && req.headers.accept.includes("application/json")) ||
      req.headers["x-requested-with"] === "XMLHttpRequest";

    if (wantsJson) {
      return res.json({
        hasil,
        nilaiZ,
        total,
        skorFuzzy: nilaiZ,
        pesan:
          hasil === "Tinggi"
            ? "Tingkat kecanduan tergolong tinggi. Pertimbangkan pengaturan waktu dan dukungan aktivitas positif."
            : hasil === "Sedang"
              ? "Tingkat kecanduan tergolong sedang. Jaga konsistensi pola bermain dan istirahat."
              : "Tingkat kecanduan tergolong rendah. Pertahankan kebiasaan sehat yang sudah berjalan."
      });
    }

    return res.redirect("/user_hasil");
  } catch (error) {
    console.log("SUBMIT ERROR:", error);
    return res.status(500).send("Terjadi kesalahan.");
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

if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

app.use("/uploads", express.static(uploadDir));

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, uploadDir);
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

if (require.main === module) {
  app.listen(PORT, () => {
    console.log(`Server berjalan di http://localhost:${PORT}`);
  });
}

module.exports = app;
