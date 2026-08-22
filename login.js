import { db, el, tampilkanPesan, pasangTombolTema, selesaiMemuat, pasangSprite } from "./bersama.js?v=2";

/* Siluet disuntikkan sebelum apa pun digambar, supaya <use> di HTML punya
   simbol untuk ditunjuk sejak frame pertama. */
pasangSprite();

pasangTombolTema();

/* Tidak ada tombol Daftar di sini, beda dengan aplikasi keuangan.
   Aplikasi ini memakai project Supabase yang sama, dan pendaftaran di sana
   memang sudah dimatikan setelah akun pertama dibuat. Menampilkan tombol yang
   dipastikan gagal ("signup_disabled") cuma membingungkan. */

/* Kalau sesi sebelumnya masih ada, langsung ke aplikasi tanpa menampilkan
   formulir. replace() dipakai agar tombol "kembali" tidak memantulkan
   pengguna bolak-balik ke halaman masuk yang sudah tidak relevan. */
const { data: { session } } = await db.auth.getSession();
if (session) {
  location.replace("app.html");
} else {
  selesaiMemuat();
}

db.auth.onAuthStateChange((_event, sesi) => {
  if (sesi) location.replace("app.html");
});

el("formMasuk").addEventListener("submit", async (e) => {
  e.preventDefault();

  const email = el("email").value.trim();
  const sandi = el("sandi").value;
  const pesan = el("pesanMasuk");
  const tombol = el("tombolMasuk");

  if (!email || sandi.length < 6) {
    tampilkanPesan(pesan, "Email wajib diisi dan kata sandi minimal 6 karakter.", true);
    return;
  }

  tombol.disabled = true;
  tampilkanPesan(pesan, "Memproses…");

  const { error } = await db.auth.signInWithPassword({ email, password: sandi });

  tombol.disabled = false;
  if (error) { tampilkanPesan(pesan, error.message, true); return; }

  /* Perpindahan halaman ditangani onAuthStateChange di atas. */
});
