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

/* ---------------- Siluet jenis ----------------

   Keempat bentuk ini dipakai di halaman masuk maupun aplikasi. Ditulis SEKALI
   di sini lalu disuntikkan ke halaman, bukan disalin ke dua berkas HTML --
   salinan yang harus disamakan manual pasti berbeda diam-diam suatu hari.

   Bentuk, bukan warna, yang membedakan jenis. Empat warna kategori berarti
   empat jarak warna baru yang belum diuji keterbacaannya, sementara siluet
   terbaca oleh siapa pun termasuk yang buta warna. */

const SPRITE = `
<svg xmlns="http://www.w3.org/2000/svg" style="display:none" aria-hidden="true">
  <symbol id="ik-film" viewBox="0 0 24 24">
    <path fill-rule="evenodd" d="M3.4 4.6h17.2c.6 0 1 .5 1 1v12.8c0 .6-.4 1-1 1H3.4c-.6 0-1-.4-1-1V5.6c0-.5.4-1 1-1Zm1 2v2h2.2v-2H4.4Zm0 4.4v2h2.2v-2H4.4Zm0 4.4v2h2.2v-2H4.4Zm13-8.8v2h2.2v-2h-2.2Zm0 4.4v2h2.2v-2h-2.2Zm0 4.4v2h2.2v-2h-2.2Z"/>
  </symbol>
  <symbol id="ik-serial" viewBox="0 0 24 24">
    <path d="M8.3 2.1a1 1 0 0 0-1.2 1.6L10 6.2H3.6A1.6 1.6 0 0 0 2 7.8v10.6a1.6 1.6 0 0 0 1.6 1.6h16.8a1.6 1.6 0 0 0 1.6-1.6V7.8a1.6 1.6 0 0 0-1.6-1.6H14l2.9-2.5a1 1 0 0 0-1.2-1.6L12 5.1 8.3 2.1Z"/>
  </symbol>
  <symbol id="ik-buku" viewBox="0 0 24 24">
    <path d="M11.2 6.6C9.7 5.3 7.6 4.5 5.3 4.5c-.9 0-1.8.1-2.6.4a1 1 0 0 0-.7.9v12.3a1 1 0 0 0 1.3.9c.6-.2 1.3-.3 2-.3 2.2 0 4.3.8 5.9 2.1V6.6Z"/>
    <path d="M12.8 20.8c1.6-1.3 3.7-2.1 5.9-2.1.7 0 1.4.1 2 .3a1 1 0 0 0 1.3-.9V5.8a1 1 0 0 0-.7-.9c-.8-.3-1.7-.4-2.6-.4-2.3 0-4.4.8-5.9 2.1v14.2Z"/>
  </symbol>
  <symbol id="ik-game" viewBox="0 0 24 24">
    <path fill-rule="evenodd" d="M7.4 6.2h9.2A5.4 5.4 0 0 1 22 11.6v1.9a3.6 3.6 0 0 1-6.6 2l-.5-.8H9.1l-.5.8a3.6 3.6 0 0 1-6.6-2v-1.9a5.4 5.4 0 0 1 5.4-5.4Zm-.7 2.6v1.6H5.1v1.7h1.6v1.6h1.7v-1.6H10v-1.7H8.4V8.8H6.7Zm9.6.5a1.1 1.1 0 1 0 0 2.2 1.1 1.1 0 0 0 0-2.2Zm2.2 2.7a1.1 1.1 0 1 0 0 2.2 1.1 1.1 0 0 0 0-2.2Z"/>
  </symbol>
</svg>`;

export function pasangSprite() {
  if (document.getElementById("ik-film")) return;
  document.body.insertAdjacentHTML("afterbegin", SPRITE);
}

/* Elemen <svg><use> yang menunjuk salah satu simbol di atas. */
export function ikon(jenis, kelas = "ikon") {
  const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
  svg.setAttribute("class", kelas);
  svg.setAttribute("aria-hidden", "true");
  const use = document.createElementNS("http://www.w3.org/2000/svg", "use");
  use.setAttribute("href", "#ik-" + jenis);
  svg.append(use);
  return svg;
}

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
