fetch("/api/user")
  .then(res => res.json())
  .then(data => {

    if (!data) return;

    document.getElementById("sidebarNama").innerText = data.nama;
    document.getElementById("sidebarEmail").innerText = data.email;

    const foto = document.getElementById("sidebarFoto");
    const initial = document.getElementById("sidebarInitial");

    if (data.foto) {
      foto.src = "/uploads/" + data.foto;
      foto.classList.remove("hidden");
      initial.classList.add("hidden");
    } else {
      initial.innerText = data.nama.charAt(0).toUpperCase();
      initial.classList.remove("hidden");
      foto.classList.add("hidden");
    }
});