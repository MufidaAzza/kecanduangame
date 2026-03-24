const express = require("express");
const path = require("path");
const mongoose = require("mongoose");

const app = express();

// =====================
// KONEKSI DATABASE
// =====================
mongoose.connect("mongodb://127.0.0.1:27017/kecanduan_game")
.then(() => console.log("MongoDB Connected"))
.catch(err => console.log(err));

// =====================
// CONFIG
// =====================
app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(express.static(path.join(__dirname, "public")));

// =====================
// MODEL
// =====================
const Konsultasi = require("./models/Konsultasi");

// =====================
// VARIABEL SEMENTARA
// =====================
let hasilTerakhir = null;

// =====================
// ROUTES USER
// =====================
app.get("/dashboard", (req, res) => {
  res.sendFile(path.join(__dirname, "views", "home.html"));
});

app.get("/tentang", (req, res) => {
  res.sendFile(path.join(__dirname, "views", "tentang.html"));
});

app.get("/login", (req, res) => {
  res.sendFile(path.join(__dirname, "views", "login.html"));
});

app.get("/register", (req, res) => {
  res.sendFile(path.join(__dirname, "views", "register.html"));
});

app.get("/gejala", (req, res) => {
  res.sendFile(path.join(__dirname, "views", "gejala.html"));
});

app.get("/admin-dashboard", (req, res) => {
  res.sendFile(path.join(__dirname, "views", "admin-dashboard.html"));
});

// =====================
// HALAMAN KONSULTASI
// =====================
app.get("/user_konsultasi", (req, res) => {
  res.sendFile(path.join(__dirname, "views", "konsultasi.html"));
});

// =====================
// FUZZY TSUKAMOTO
// =====================
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

// =====================
// POST SUBMIT (INI YANG BENAR)
// =====================
app.post("/submit", async (req, res) => {
  try {

    console.log("POST MASUK");

    const jawaban = req.body;

    // Hitung total skor
    let total = 0;
    for (let key in jawaban) {
      total += parseInt(jawaban[key]) || 0;
    }

    // FUZZY
    let a1 = muRendah(total);
    let a2 = muSedang(total);
    let a3 = muTinggi(total);

    let z1 = zRendah(a1);
    let z2 = zSedang(a2);
    let z3 = zTinggi(a3);

    let numerator = (a1 * z1) + (a2 * z2) + (a3 * z3);
    let denominator = a1 + a2 + a3;

    let skorFuzzy = denominator === 0 ? 0 : numerator / denominator;

    let hasil = "";
    if (skorFuzzy < 50) hasil = "Rendah";
    else if (skorFuzzy < 75) hasil = "Sedang";
    else hasil = "Tinggi";

    // Simpan ke database
    const dataBaru = new Konsultasi({
      ...jawaban,
      total,
      skorFuzzy,
      hasil
    });

    await dataBaru.save();

    // Simpan sementara
    hasilTerakhir = {
      total,
      skorFuzzy: skorFuzzy.toFixed(2),
      hasil
    };

    res.redirect("/user_hasil");

  } catch (err) {
    console.log(err);
    res.send("Terjadi kesalahan");
  }
});

// =====================
// HALAMAN HASIL
// =====================
app.get("/user_hasil", (req, res) => {

  if (!hasilTerakhir) {
    return res.send("Belum ada hasil konsultasi");
  }

  res.send(`
    <h2>Hasil Konsultasi</h2>
    <p>Total Skor: ${hasilTerakhir.total}</p>
    <p>Skor Fuzzy: ${hasilTerakhir.skorFuzzy}</p>
    <p>Tingkat Kecanduan: ${hasilTerakhir.hasil}</p>
    <br>
    <a href="/user_konsultasi">Kembali</a>
  `);
});

// =====================
// SERVER
// =====================
const PORT = 3000;
app.listen(PORT, () => {
  console.log(`Server berjalan di http://localhost:${PORT}`);
});