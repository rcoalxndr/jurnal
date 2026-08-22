/* Hal-hal yang dipakai halaman masuk maupun halaman aplikasi.
   Dipisah supaya tidak ada dua salinan yang bisa berbeda diam-diam.

   Berkas ini nyaris sama dengan milik aplikasi keuangan. Disalin, bukan
   dibagi lewat paket bersama: dua aplikasi yang berdiri sendiri, dan
   menyatukannya berarti menambah langkah build yang belum dibutuhkan. */

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { SUPABASE_URL, SUPABASE_ANON_KEY } from "./config.js";

export const db = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

/* Dibuka ke window supaya bisa diperiksa dari Console browser saat menelusuri
   masalah, mis. `await db.auth.getSession()`. Aman: kunci publik ini memang
   dikirim ke setiap pengunjung, dan RLS yang menjaga datanya. */
window.db = db;

export const el = (id) => document.getElementById(id);

export function tampilkanPesan(node, teks, galat = false) {
  node.textContent = teks;
  node.classList.toggle("galat", galat);
  node.hidden = !teks;
}

export const geraknyaDikurangi = () =>
  window.matchMedia("(prefers-reduced-motion: reduce)").matches;

/* ---------------- Tema ---------------- */

const kueriGelap = window.matchMedia("(prefers-color-scheme: dark)");

export function temaSekarang() {
  return document.documentElement.getAttribute("data-theme") || (kueriGelap.matches ? "dark" : "light");
}

/* `saatBerubah` dipanggil setiap tema berganti -- halaman aplikasi memakainya
   untuk menggambar ulang grafik, yang warnanya diambil dari variabel CSS. */
export function pasangTombolTema(saatBerubah) {
  const tombol = el("tombolTema");
  if (!tombol) return;
  const ikon = el("ikonTema");

  const cat = () => {
    const gelap = temaSekarang() === "dark";
    ikon.textContent = gelap ? "☀" : "☾";
    tombol.setAttribute("aria-label", gelap ? "Ganti ke tema terang" : "Ganti ke tema gelap");
  };

  tombol.addEventListener("click", () => {
    const berikut = temaSekarang() === "dark" ? "light" : "dark";
    document.documentElement.setAttribute("data-theme", berikut);
    try { localStorage.setItem("theme", berikut); } catch (e) {}
    cat();
    if (saatBerubah) saatBerubah();
  });

  /* Tema sistem bisa berubah selagi halaman terbuka. Selama pengguna belum
     memilih sendiri, ikuti sistem. */
  kueriGelap.addEventListener("change", () => {
    if (!document.documentElement.getAttribute("data-theme")) {
      cat();
      if (saatBerubah) saatBerubah();
    }
  });

  cat();
}

/* ---------------- Masuk-keluar halaman ---------------- */

/* Halaman disembunyikan lewat kelas `memuat` sampai status login diketahui.
   Tanpa ini, halaman masuk sempat berkedip sebelum dialihkan ke aplikasi. */
export function selesaiMemuat() {
  document.documentElement.classList.remove("memuat");
}
