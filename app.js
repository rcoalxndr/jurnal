import { db, el, tampilkanPesan, pasangTombolTema, selesaiMemuat, geraknyaDikurangi } from "./bersama.js?v=1";

const JENIS = { film: "Film", serial: "Serial", buku: "Buku", game: "Game" };
const URUT_JENIS = ["film", "serial", "buku", "game"];

const STATUS = { mau: "Mau", sedang: "Sedang", selesai: "Selesai", ditinggalkan: "Ditinggalkan" };

const NAMA_BULAN = ["Januari", "Februari", "Maret", "April", "Mei", "Juni",
  "Juli", "Agustus", "September", "Oktober", "November", "Desember"];

/* Kata benda yang cocok per jenis, supaya kalimatnya tidak kaku:
   "3 judul" benar untuk semua, tapi "3 tontonan" salah untuk buku. */
const judulan = (n) => `${n} judul`;

/* ---------------- Tanggal ----------------
   Tanggal lokal, bukan UTC. toISOString() memakai UTC, yang di zona WIB
   (UTC+7) bisa melompat ke hari kemarin untuk catatan dini hari. */
function hariIni() {
  const d = new Date();
  return new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 10);
}

const kunciBulan = (iso) => (iso || "").slice(0, 7);
const kunciBulanIni = () => hariIni().slice(0, 7);

function labelBulan(kunci) {
  const [th, bl] = kunci.split("-");
  return `${NAMA_BULAN[Number(bl) - 1]} ${th}`;
}

function geserBulan(kunci, langkah) {
  const [th, bl] = kunci.split("-").map(Number);
  const d = new Date(th, bl - 1 + langkah, 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

function tanggalPendek(iso) {
  if (!iso) return "";
  return new Date(iso + "T12:00").toLocaleDateString("id-ID", { day: "numeric", month: "short" });
}

/* Selisih hari dari sebuah cap waktu ke sekarang. Dipakai untuk menandai
   judul yang mandek -- yang paling lama tidak disentuh muncul di atas. */
function umurHari(cap) {
  if (!cap) return 0;
  return Math.floor((Date.now() - new Date(cap).getTime()) / 86400000);
}

/* ---------------- Keadaan ----------------
   Harus dideklarasikan SEBELUM blok penjaga di akhir berkas. Variabel `let`
   memang terangkat, tapi belum boleh diakses sampai barisnya dijalankan --
   dan penjaga itu memanggil siapkanUI(), yang memakai statusAwal. */

let semuaItem = [];
let statusAwal = "sedang";
let bulanRiwayat = kunciBulanIni();
let jenisTersaring = "semua";
let sudahSiap = false;
let modeDemo = false;
let sedangDiubah = null;   /* baris yang terbuka di dialog */
let nilaiDiubah = null;    /* nilai bintang yang dipilih di dialog */

function mulai() {
  if (!sudahSiap) { siapkanUI(); sudahSiap = true; }
  muatData();
}

function siapkanUI() {
  pasangTombolTema(gambarSemua); /* grafik memakai warna CSS, jadi digambar ulang */

  el("labelPeriode").textContent = labelBulan(kunciBulanIni());

  document.querySelectorAll(".tab").forEach((t) => {
    t.addEventListener("click", () => pindahTampilan(t.dataset.view));
  });

  document.querySelectorAll(".status-tombol").forEach((b) => {
    b.addEventListener("click", () => {
      statusAwal = b.dataset.status;
      document.querySelectorAll(".status-tombol").forEach((o) => {
        const aktif = o === b;
        o.classList.toggle("aktif", aktif);
        o.setAttribute("aria-pressed", String(aktif));
      });
    });
  });

  el("formTambah").addEventListener("submit", tambahItem);

  el("bulanSebelum").addEventListener("click", () => { bulanRiwayat = geserBulan(bulanRiwayat, -1); gambarRiwayat(); });
  el("bulanSesudah").addEventListener("click", () => { bulanRiwayat = geserBulan(bulanRiwayat, 1); gambarRiwayat(); });
  el("saringJenis").addEventListener("change", () => {
    jenisTersaring = el("saringJenis").value;
    gambarRiwayat();
  });

  siapkanDialog();
}

function pindahTampilan(nama) {
  document.querySelectorAll(".tab").forEach((t) => {
    t.setAttribute("aria-selected", String(t.dataset.view === nama));
  });
  /* Menyembunyikan lalu menampilkan kembali membuat elemen keluar-masuk dari
     tata letak, dan itu sendiri yang memicu ulang animasi masuknya. */
  for (const [id, cocok] of [["viewSekarang", "sekarang"], ["viewRiwayat", "riwayat"], ["viewTren", "tren"]]) {
    el(id).hidden = nama !== cocok;
  }
  if (nama === "riwayat") gambarRiwayat();
  if (nama === "tren") gambarTren();
  window.scrollTo({ top: 0, behavior: "instant" });
}

/* ---------------- Data ----------------

   Di mode demo semua perubahan dikerjakan di array lokal saja. Aplikasinya
   tetap terasa hidup untuk dicoba, tapi tidak ada satu pun permintaan yang
   dikirim ke database. */

async function muatData() {
  const { data, error } = await db
    .from("konsumsi")
    .select("*")
    .order("diubah_pada", { ascending: false });

  if (error) {
    tampilkanPesan(el("pesanTambah"), "Gagal memuat data: " + error.message, true);
    return;
  }
  semuaItem = data || [];
  gambarSemua();
}

async function tambahItem(e) {
  e.preventDefault();
  const pesan = el("pesanTambah");
  const tombol = el("tombolSimpan");
  const judul = el("judul").value.trim();

  if (!judul) { tampilkanPesan(pesan, "Judul tidak boleh kosong.", true); return; }

  /* Tanggal disimpulkan dari status, supaya mencatat tetap tiga ketukan.
     Semua bisa dikoreksi belakangan lewat dialog Ubah. */
  const baris = {
    judul,
    jenis: el("jenis").value,
    status: statusAwal,
    mulai_pada: statusAwal === "mau" ? null : hariIni(),
    selesai_pada: statusAwal === "selesai" ? hariIni() : null,
  };

  if (modeDemo) {
    semuaItem.unshift({ id: `demo-${Date.now()}`, nilai: null, catatan: null,
      dibuat_pada: new Date().toISOString(), diubah_pada: new Date().toISOString(), ...baris });
    bersihkanForm();
    tampilkanPesan(pesan, "Tersimpan — tapi ini demo, jadi hanya di layar ini.");
    setTimeout(() => tampilkanPesan(pesan, ""), 2500);
    gambarSemua();
    return;
  }

  tombol.disabled = true;
  tampilkanPesan(pesan, "Menyimpan…");

  const { error } = await db.from("konsumsi").insert(baris);

  tombol.disabled = false;
  if (error) { tampilkanPesan(pesan, "Gagal menyimpan: " + error.message, true); return; }

  bersihkanForm();
  tampilkanPesan(pesan, "Tersimpan.");
  setTimeout(() => tampilkanPesan(pesan, ""), 2000);

  muatData();
}

function bersihkanForm() {
  el("judul").value = "";
  el("judul").focus();
}

/* Satu pintu untuk semua perubahan baris. Inilah yang tidak ada di aplikasi
   keuangan: di sana transaksi hanya lahir dan mati, tidak pernah berubah. */
async function perbarui(id, tambalan, pesanNode = el("pesanTambah")) {
  if (modeDemo) {
    const i = semuaItem.findIndex((r) => r.id === id);
    if (i >= 0) semuaItem[i] = { ...semuaItem[i], ...tambalan, diubah_pada: new Date().toISOString() };
    gambarSemua();
    return true;
  }

  const { error } = await db.from("konsumsi").update(tambalan).eq("id", id);
  if (error) { tampilkanPesan(pesanNode, "Gagal menyimpan perubahan: " + error.message, true); return false; }
  await muatData();
  return true;
}

/* Perpindahan status yang sering dipakai, dibungkus jadi satu ketukan.
   `selesai_pada` juga diisi untuk status "ditinggalkan" -- artinya "tanggal
   berhenti", supaya keduanya bisa disaring per bulan di tab Riwayat. */
function pindahStatus(r, status) {
  const tambalan = { status };
  if (status === "sedang") {
    tambalan.mulai_pada = r.mulai_pada || hariIni();
    tambalan.selesai_pada = null;
  }
  if (status === "selesai" || status === "ditinggalkan") {
    tambalan.mulai_pada = r.mulai_pada || hariIni();
    tambalan.selesai_pada = r.selesai_pada || hariIni();
  }
  if (status === "mau") {
    tambalan.mulai_pada = null;
    tambalan.selesai_pada = null;
  }
  return perbarui(r.id, tambalan);
}

async function hapusItem(r) {
  if (!confirm(`Hapus "${r.judul}" dari jurnal?`)) return;

  if (modeDemo) {
    semuaItem = semuaItem.filter((x) => x.id !== r.id);
    gambarSemua();
    return;
  }

  const { error } = await db.from("konsumsi").delete().eq("id", r.id);
  if (error) { tampilkanPesan(el("pesanUbah"), "Gagal menghapus: " + error.message, true); return; }
  muatData();
}

/* ---------------- Dialog Ubah ---------------- */

function siapkanDialog() {
  const dialog = el("dialogUbah");

  el("tutupDialog").addEventListener("click", () => dialog.close());

  document.querySelectorAll(".bintang").forEach((b) => {
    b.addEventListener("click", () => {
      const n = Number(b.dataset.nilai);
      /* Ketuk bintang yang sama untuk mengosongkan. Tanpa ini, nilai yang
         terlanjur diisi tidak akan pernah bisa dihapus. */
      nilaiDiubah = nilaiDiubah === n ? null : n;
      catBintang();
    });
  });

  el("formUbah").addEventListener("submit", (e) => { e.preventDefault(); simpanUbahan(); });
  el("tombolHapus").addEventListener("click", async () => {
    const r = sedangDiubah;
    if (!r) return;
    dialog.close();
    await hapusItem(r);
  });

  /* Klik di luar kotak menutup dialog. <dialog> menganggap area gelap di
     sekelilingnya sebagai bagian dari dirinya, jadi yang diperiksa adalah
     apakah titik kliknya berada di luar kotak isinya. */
  dialog.addEventListener("click", (e) => {
    if (e.target !== dialog) return;
    const k = dialog.getBoundingClientRect();
    const diLuar = e.clientX < k.left || e.clientX > k.right || e.clientY < k.top || e.clientY > k.bottom;
    if (diLuar) dialog.close();
  });
}

function catBintang() {
  document.querySelectorAll(".bintang").forEach((b) => {
    const aktif = nilaiDiubah !== null && Number(b.dataset.nilai) <= nilaiDiubah;
    b.classList.toggle("aktif", aktif);
    b.setAttribute("aria-pressed", String(aktif));
  });
}

function bukaDialog(r) {
  sedangDiubah = r;
  nilaiDiubah = r.nilai ?? null;

  el("ubahJudul").value = r.judul;
  el("ubahJenis").value = r.jenis;
  el("ubahStatus").value = r.status;
  el("ubahMulai").value = r.mulai_pada || "";
  el("ubahSelesai").value = r.selesai_pada || "";
  el("ubahCatatan").value = r.catatan || "";
  tampilkanPesan(el("pesanUbah"), "");
  catBintang();

  el("dialogUbah").showModal();
}

async function simpanUbahan() {
  const r = sedangDiubah;
  if (!r) return;

  const judul = el("ubahJudul").value.trim();
  if (!judul) { tampilkanPesan(el("pesanUbah"), "Judul tidak boleh kosong.", true); return; }

  const status = el("ubahStatus").value;
  const tambalan = {
    judul,
    jenis: el("ubahJenis").value,
    status,
    nilai: nilaiDiubah,
    catatan: el("ubahCatatan").value.trim() || null,
    mulai_pada: el("ubahMulai").value || null,
    selesai_pada: el("ubahSelesai").value || null,
  };

  /* Kalau statusnya dipindah ke selesai/ditinggalkan tapi tanggalnya masih
     kosong, isi hari ini -- kalau tidak, barisnya hilang dari tab Riwayat
     yang menyaring berdasarkan tanggal itu. */
  if ((status === "selesai" || status === "ditinggalkan") && !tambalan.selesai_pada) {
    tambalan.selesai_pada = hariIni();
  }
  if (status === "mau") { tambalan.mulai_pada = null; tambalan.selesai_pada = null; }

  el("tombolSimpanUbah").disabled = true;
  const berhasil = await perbarui(r.id, tambalan, el("pesanUbah"));
  el("tombolSimpanUbah").disabled = false;

  if (berhasil) el("dialogUbah").close();
}

/* ---------------- Hitungan ---------------- */

const berstatus = (status) => semuaItem.filter((r) => r.status === status);

/* "Selesai" dan "ditinggalkan" sama-sama sudah berakhir, dan keduanya
   dikelompokkan lewat tanggal berhentinya. */
const berakhirBulan = (kunci) =>
  semuaItem.filter((r) => (r.status === "selesai" || r.status === "ditinggalkan")
    && kunciBulan(r.selesai_pada) === kunci);

function rataNilai(rows) {
  const dinilai = rows.filter((r) => r.nilai);
  if (!dinilai.length) return null;
  return dinilai.reduce((t, r) => t + r.nilai, 0) / dinilai.length;
}

function perJenis(rows) {
  const m = new Map();
  for (const r of rows) m.set(r.jenis, (m.get(r.jenis) || 0) + 1);
  return URUT_JENIS.filter((j) => m.has(j)).map((j) => [JENIS[j], m.get(j)])
    .sort((a, b) => b[1] - a[1]);
}

function perNilai(rows) {
  const m = new Map();
  for (const r of rows) if (r.nilai) m.set(r.nilai, (m.get(r.nilai) || 0) + 1);
  return [5, 4, 3, 2, 1].filter((n) => m.has(n)).map((n) => ["★".repeat(n), m.get(n)]);
}

function bulanBerdata() {
  return [...new Set(
    semuaItem
      .filter((r) => r.selesai_pada && (r.status === "selesai" || r.status === "ditinggalkan"))
      .map((r) => kunciBulan(r.selesai_pada))
  )].sort().reverse();
}

/* ---------------- Grafik ---------------- */

const SVGNS = "http://www.w3.org/2000/svg";
const buat = (tag, attrs = {}) => {
  const n = document.createElementNS(SVGNS, tag);
  for (const [k, v] of Object.entries(attrs)) n.setAttribute(k, v);
  return n;
};

/* Batang horizontal sengaja dibuat dari elemen HTML biasa, bukan SVG. Untuk
   bentuk ini HTML lebih tepat: teksnya tidak mungkin melar, panjang batang
   cukup diatur persentase, dan ikut lebar layar tanpa perhitungan apa pun.

   Satu warna untuk semua batang, bukan warna-warni per jenis: yang membawa
   informasi adalah panjangnya, bukan rona. Ini juga menghindari kebutuhan
   empat warna kategori yang belum pernah diuji keterbacaannya. */
function batangHorizontal(wadah, data, { format = judulan } = {}) {
  wadah.innerHTML = "";
  if (!data.length) return;

  const maks = Math.max(...data.map((d) => d[1]));
  const daftar = document.createElement("ul");
  daftar.className = "batang-list";

  data.forEach(([nama, nilai], i) => {
    const li = document.createElement("li");
    li.style.setProperty("--tunda", i * 55 + "ms");

    const kepala = document.createElement("div");
    kepala.className = "batang-kepala";
    const kiri = document.createElement("span");
    kiri.textContent = nama;
    const kanan = document.createElement("span");
    kanan.className = "batang-nilai";
    kanan.textContent = format(nilai);
    kepala.append(kiri, kanan);

    const alur = document.createElement("div");
    alur.className = "batang-alur";
    const isi = document.createElement("i");
    const lebar = (maks > 0 ? Math.max((nilai / maks) * 100, 1.5) : 0) + "%";

    /* Batang tumbuh dari nol. Pengaman waktu memastikan panjangnya tetap
       benar walau requestAnimationFrame tidak pernah berjalan (tab latar). */
    const setel = () => { isi.style.width = lebar; };
    if (geraknyaDikurangi()) setel();
    else { requestAnimationFrame(() => requestAnimationFrame(setel)); setTimeout(setel, 500); }
    alur.append(isi);

    li.append(kepala, alur);
    daftar.append(li);
  });

  wadah.append(daftar);
}

/* Kolom per bulan: tren waktu, satu seri, satu hue. Digambar dengan koordinat
   piksel sungguhan supaya teks sumbu tidak ikut diregangkan -- itulah sebabnya
   lebar wadah diukur dulu, dan grafik digambar ulang saat jendela berubah. */
function kolomBulanan(wadah, data) {
  wadah.innerHTML = "";
  if (!data.length) return;

  const W = Math.max(wadah.clientWidth || 300, 200);
  const H = 190, padBawah = 24, padAtas = 20;
  const maks = Math.max(...data.map((d) => d[1]), 1);
  const slot = W / data.length;
  const tebal = Math.min(slot * 0.46, 24);   /* mark spec: batang tipis, <=24px */
  const plotTinggi = H - padBawah - padAtas;
  const iMaks = data.reduce((best, d, i) => (d[1] > data[best][1] ? i : best), 0);

  const svg = buat("svg", { viewBox: `0 0 ${W} ${H}`, width: W, height: H, role: "img" });
  const t = buat("title");
  t.textContent = "Judul selesai per bulan";
  svg.append(t);

  /* Garis dasar hairline, resesif. */
  svg.append(buat("line", { x1: 0, y1: H - padBawah, x2: W, y2: H - padBawah, class: "garis-grid" }));

  data.forEach(([kunci, nilai], i) => {
    const tinggiBatang = Math.max((nilai / maks) * plotTinggi, nilai > 0 ? 2 : 0);
    const x = i * slot + (slot - tebal) / 2;
    const y = H - padBawah - tinggiBatang;

    const batang = buat("rect", {
      x, width: tebal, rx: 3, fill: "var(--keluar)", class: "batang",
      y: geraknyaDikurangi() ? y : H - padBawah,
      height: geraknyaDikurangi() ? tinggiBatang : 0,
    });
    const tip = buat("title");
    tip.textContent = `${labelBulan(kunci)}: ${judulan(nilai)}`;
    batang.append(tip);
    svg.append(batang);

    /* Kolom tumbuh dari garis dasar, satu per satu. Sama seperti batang
       horizontal: ada pengaman waktu supaya tingginya tetap benar walau
       requestAnimationFrame tidak pernah berjalan. */
    if (!geraknyaDikurangi()) {
      const setel = () => {
        batang.setAttribute("y", y);
        batang.setAttribute("height", tinggiBatang);
      };
      batang.style.transition = `y 420ms cubic-bezier(.22,.61,.36,1) ${i * 60}ms, height 420ms cubic-bezier(.22,.61,.36,1) ${i * 60}ms`;
      requestAnimationFrame(() => requestAnimationFrame(setel));
      setTimeout(setel, 600 + i * 60);
    }

    /* Hanya kolom tertinggi yang dilabeli. Angka di setiap kolom jadi
       kebisingan dan justru tidak terbaca. */
    if (i === iMaks && nilai > 0) {
      const lab = buat("text", { x: x + tebal / 2, y: y - 7, class: "nilai", "text-anchor": "middle" });
      lab.textContent = String(nilai);
      svg.append(lab);
    }

    const bln = buat("text", { x: x + tebal / 2, y: H - 8, class: "sumbu", "text-anchor": "middle" });
    bln.textContent = NAMA_BULAN[Number(kunci.slice(5)) - 1].slice(0, 3);
    svg.append(bln);
  });

  wadah.append(svg);
}

let jedaUkur;
window.addEventListener("resize", () => {
  clearTimeout(jedaUkur);
  jedaUkur = setTimeout(() => { if (!el("viewTren").hidden) gambarTren(); }, 150);
});

/* ---------------- Angka berjalan ---------------- */

/* Angka utama dihitung naik. Bukan sekadar hiasan: gerakannya menarik mata ke
   satu-satunya angka terpenting di halaman.

   Nilai akhir ditulis LEBIH DULU, baru animasinya jalan. Urutan ini penting:
   requestAnimationFrame tidak berjalan kalau halaman sedang tidak digambar
   (tab latar, jendela tersembunyi). Kalau animasi jadi satu-satunya jalan
   angka muncul, angkanya bisa tidak pernah tampil sama sekali. Ada pula
   pengaman waktu yang memaksa nilai akhir kalau animasinya macet di tengah. */
function angkaBerjalan(node, target) {
  const sebelum = Number(node.dataset.nilai || 0);
  node.dataset.nilai = String(target);
  node.textContent = String(target);

  if (geraknyaDikurangi() || sebelum === target) return;

  const durasi = 650;
  const mulai = performance.now();
  const langkah = (waktu) => {
    const p = Math.min((waktu - mulai) / durasi, 1);
    const eased = 1 - Math.pow(1 - p, 3);
    node.textContent = String(Math.round(sebelum + (target - sebelum) * eased));
    if (p < 1) requestAnimationFrame(langkah);
  };
  requestAnimationFrame(langkah);

  clearTimeout(node._jagaAngka);
  node._jagaAngka = setTimeout(() => { node.textContent = String(target); }, durasi + 250);
}

/* ---------------- Menggambar ---------------- */

function gambarSemua() {
  if (!sudahSiap) return;
  gambarSekarang();
  gambarRiwayat();
  gambarTren();
}

function gambarSekarang() {
  const selesaiBulanIni = berakhirBulan(kunciBulanIni()).filter((r) => r.status === "selesai");
  const sedang = berstatus("sedang").sort((a, b) => (a.diubah_pada < b.diubah_pada ? -1 : 1));
  const antre = berstatus("mau").sort((a, b) => (a.diubah_pada > b.diubah_pada ? -1 : 1));

  angkaBerjalan(el("nilaiSelesai"), selesaiBulanIni.length);
  el("nilaiSedang").textContent = String(sedang.length);
  el("nilaiAntre").textContent = String(antre.length);

  const catatan = el("heroCatatan");
  if (!semuaItem.length) {
    catatan.textContent = "Belum ada apa pun di jurnal ini.";
  } else if (!selesaiBulanIni.length) {
    catatan.textContent = "Belum ada yang selesai bulan ini.";
  } else {
    const rata = rataNilai(selesaiBulanIni);
    const sebaran = perJenis(selesaiBulanIni);

    /* "Terbanyak film (1)" itu kalimat yang menyesatkan saat semua jenis
       sama banyak. Sebutkan pemuncaknya hanya kalau memang ada pemuncak. */
    let depan;
    if (sebaran.length === 1) depan = `Semuanya ${sebaran[0][0].toLowerCase()}`;
    else if (sebaran[0][1] === sebaran[1][1]) depan = `Tersebar di ${sebaran.length} jenis`;
    else depan = `Terbanyak ${sebaran[0][0].toLowerCase()} (${sebaran[0][1]})`;

    catatan.textContent = depan +
      (rata ? ` · rata-rata nilai ${rata.toFixed(1).replace(".", ",")}` : "");
  }

  gambarItem(el("daftarSedang"), sedang, "sedang", el("sedangKosong"));
  gambarItem(el("daftarAntre"), antre, "antre", el("antreKosong"));
  el("sedangSub").hidden = sedang.length < 2;
  el("antreSub").hidden = antre.length === 0;
}

function gambarRiwayat() {
  el("bulanTerpilih").textContent = labelBulan(bulanRiwayat);
  el("bulanSesudah").disabled = bulanRiwayat >= kunciBulanIni();

  const semuaBulanIni = berakhirBulan(bulanRiwayat);
  const selesai = semuaBulanIni.filter((r) => r.status === "selesai");
  const ditinggal = semuaBulanIni.filter((r) => r.status === "ditinggalkan");
  const rata = rataNilai(selesai);

  el("riwSelesai").textContent = String(selesai.length);
  el("riwDitinggal").textContent = String(ditinggal.length);
  el("riwRata").textContent = rata ? rata.toFixed(1).replace(".", ",") : "—";

  /* Perbandingan dengan bulan sebelumnya -- angka sendirian sulit dinilai. */
  const sebelumnya = berakhirBulan(geserBulan(bulanRiwayat, -1)).filter((r) => r.status === "selesai");
  const banding = el("riwBanding");
  if (!semuaBulanIni.length) {
    banding.textContent = "";
  } else if (!sebelumnya.length) {
    banding.textContent = "Belum ada data bulan sebelumnya untuk dibandingkan.";
  } else {
    const selisih = selesai.length - sebelumnya.length;
    const namaSebelum = labelBulan(geserBulan(bulanRiwayat, -1));
    banding.textContent = selisih === 0
      ? `Sama banyak dengan ${namaSebelum}.`
      : `${Math.abs(selisih)} ${selisih > 0 ? "lebih banyak" : "lebih sedikit"} dibanding ${namaSebelum}.`;
  }

  const tampil = semuaBulanIni
    .filter((r) => jenisTersaring === "semua" || r.jenis === jenisTersaring)
    .sort((a, b) => (a.selesai_pada > b.selesai_pada ? -1 : 1));

  gambarItem(el("daftarRiwayat"), tampil, "riwayat", el("riwKosong"));
}

function gambarTren() {
  const bulan = bulanBerdata().slice(0, 6).reverse();
  const dataTren = bulan.map((k) => [k, berakhirBulan(k).filter((r) => r.status === "selesai").length]);
  el("trenKosong").hidden = dataTren.length > 1;
  kolomBulanan(el("grafikTren"), dataTren.length > 1 ? dataTren : []);

  const selesaiSemua = berstatus("selesai");

  const jenis = perJenis(selesaiSemua);
  el("jenisKosong").hidden = jenis.length > 0;
  batangHorizontal(el("grafikJenis"), jenis);

  const nilai = perNilai(selesaiSemua);
  el("nilaiKosong").hidden = nilai.length > 0;
  batangHorizontal(el("grafikNilai"), nilai);

  /* Tabel riwayat: kanal identitas yang tidak bergantung warna sama sekali. */
  const tbody = el("tabelBulanan").querySelector("tbody");
  tbody.innerHTML = "";
  const semuaBulan = bulanBerdata();
  el("riwayatKosong").hidden = semuaBulan.length > 0;
  el("tabelBulanan").hidden = semuaBulan.length === 0;

  for (const k of semuaBulan) {
    const rows = berakhirBulan(k);
    const selesai = rows.filter((r) => r.status === "selesai");
    const rata = rataNilai(selesai);

    const tr = document.createElement("tr");
    const sel = (teks, kelas) => {
      const td = document.createElement("td");
      td.textContent = teks;
      if (kelas) td.className = kelas;
      return td;
    };
    const nama = document.createElement("td");
    nama.textContent = labelBulan(k);
    tr.append(
      nama,
      sel(String(selesai.length), "t-masuk"),
      sel(String(rows.length - selesai.length), "t-keluar"),
      sel(rata ? rata.toFixed(1).replace(".", ",") : "—")
    );
    tbody.append(tr);
  }
}

/* Satu perender untuk tiga daftar. Bedanya cuma tombol aksi yang muncul --
   memisahnya jadi tiga fungsi hanya akan menyalin kode yang sama tiga kali. */
function gambarItem(wadah, rows, konteks, nodeKosong) {
  wadah.innerHTML = "";
  nodeKosong.hidden = rows.length > 0;

  rows.forEach((r, i) => {
    const li = document.createElement("li");
    li.style.setProperty("--tunda", Math.min(i, 8) * 40 + "ms");

    const info = document.createElement("div");
    info.className = "it-info";

    const baris1 = document.createElement("div");
    baris1.className = "it-atas";

    const lencana = document.createElement("span");
    lencana.className = "it-jenis";
    lencana.textContent = JENIS[r.jenis];

    const judul = document.createElement("span");
    judul.className = "it-judul";
    judul.textContent = r.judul;

    baris1.append(lencana, judul);
    info.append(baris1);

    const meta = document.createElement("span");
    meta.className = "it-meta";
    meta.textContent = teksMeta(r, konteks);
    if (meta.textContent) info.append(meta);

    if (r.catatan) {
      const catatan = document.createElement("span");
      catatan.className = "it-catatan";
      catatan.textContent = r.catatan;
      info.append(catatan);
    }

    const aksi = document.createElement("div");
    aksi.className = "it-aksi";

    const tombol = (teks, label, saatKlik, kelas = "") => {
      const b = document.createElement("button");
      b.type = "button";
      b.className = "tombol kecil " + kelas;
      b.textContent = teks;
      b.setAttribute("aria-label", `${label} ${r.judul}`);
      b.addEventListener("click", saatKlik);
      return b;
    };

    if (konteks === "sedang") {
      aksi.append(tombol("Selesai", "Tandai selesai:", () => pindahStatus(r, "selesai"), "utama"));
      aksi.append(tombol("Tinggalkan", "Tandai ditinggalkan:", () => pindahStatus(r, "ditinggalkan")));
    } else if (konteks === "antre") {
      aksi.append(tombol("Mulai", "Mulai:", () => pindahStatus(r, "sedang"), "utama"));
    }
    aksi.append(tombol("Ubah", "Ubah:", () => bukaDialog(r)));

    li.append(info, aksi);
    wadah.append(li);
  });
}

function teksMeta(r, konteks) {
  const bagian = [];

  if (konteks === "sedang") {
    const umur = umurHari(r.diubah_pada);
    bagian.push(r.mulai_pada ? `mulai ${tanggalPendek(r.mulai_pada)}` : "belum dimulai");
    /* Ambang 21 hari: cukup lama untuk berarti mandek, tidak segera menuduh
       orang yang cuma sedang sibuk seminggu dua minggu. */
    if (umur >= 21) bagian.push(`diam ${umur} hari`);
  } else if (konteks === "antre") {
    bagian.push("di antrean");
  } else {
    bagian.push(STATUS[r.status].toLowerCase());
    if (r.selesai_pada) bagian.push(tanggalPendek(r.selesai_pada));
    if (r.nilai) bagian.push("★".repeat(r.nilai));
  }

  return bagian.join(" · ");
}

/* Data karangan untuk mode demo. Judul sengaja dibuat generik supaya tidak
   terlihat seperti selera seseorang, dan sebarannya dibuat wajar: sebagian
   besar selesai, sedikit ditinggalkan, beberapa mangkrak di status sedang. */
function dataContoh() {
  const bahan = [
    ["film", ["Kota Tanpa Nama", "Musim Kedua Hujan", "Lampu di Ujung Jalan", "Perjalanan Terakhir",
      "Sunyi yang Panjang", "Rumah di Bukit", "Cahaya Utara", "Setelah Badai"]],
    ["serial", ["Arsip Tengah Malam", "Distrik Timur", "Kabar dari Selatan", "Musim Dingin Kedua"]],
    ["buku", ["Cara Kerja Kota", "Catatan Seorang Tukang", "Aljabar untuk Pemalas",
      "Sejarah Singkat Kesabaran", "Peta yang Salah"]],
    ["game", ["Menara Tanpa Puncak", "Pulau Kosong", "Bengkel Waktu", "Jalur Sunyi"]],
  ];

  const out = [];
  let n = 0;
  const pakai = { film: 0, serial: 0, buku: 0, game: 0 };

  const buatBaris = (jenis, status, kunci, nilai) => {
    const daftar = bahan.find((b) => b[0] === jenis)[1];
    const judul = daftar[pakai[jenis]++ % daftar.length];
    const tgl = kunci ? `${kunci}-${String(2 + Math.floor(Math.random() * 26)).padStart(2, "0")}` : null;
    return {
      id: `demo-${n++}`,
      judul,
      jenis,
      status,
      nilai: nilai ?? null,
      catatan: null,
      mulai_pada: tgl,
      selesai_pada: status === "selesai" || status === "ditinggalkan" ? tgl : null,
      dibuat_pada: new Date().toISOString(),
      diubah_pada: new Date(Date.now() - n * 36e5).toISOString(),
    };
  };

  /* Enam bulan ke belakang, jumlahnya naik-turun supaya grafik trennya jujur. */
  const banyak = [4, 2, 5, 3, 6, 3];
  banyak.forEach((jml, b) => {
    const kunci = geserBulan(kunciBulanIni(), -b);
    for (let i = 0; i < jml; i++) {
      const jenis = URUT_JENIS[(i + b) % 4];
      const nilai = 3 + ((i + b) % 3);           /* 3, 4, atau 5 */
      out.push(buatBaris(jenis, "selesai", kunci, nilai));
    }
    if (b % 3 === 1) out.push(buatBaris("serial", "ditinggalkan", kunci, null));
  });

  out.push(buatBaris("buku", "sedang", geserBulan(kunciBulanIni(), -2)));
  out.push(buatBaris("game", "sedang", kunciBulanIni()));
  out.push(buatBaris("film", "mau", null));
  out.push(buatBaris("buku", "mau", null));

  /* Satu judul sengaja dibuat mandek, supaya penanda "diam N hari" terlihat
     di demo dan orang paham fitur itu ada. */
  out[out.length - 4].diubah_pada = new Date(Date.now() - 47 * 864e5).toISOString();

  return out;
}

/* Alat bantu pengembangan: mengisi tampilan dengan data karangan dari Console,
   tanpa menyentuh database. Panggil: `__uji()`. */
window.__uji = function (rows) {
  if (!sudahSiap) { siapkanUI(); sudahSiap = true; }
  semuaItem = rows || dataContoh();
  gambarSemua();
};

/* ---------------- Penjaga halaman ----------------
   Sengaja diletakkan paling akhir. Blok ini menjalankan kode sungguhan
   (siapkanUI, gambarSemua), dan semua fungsi serta variabel yang dipakainya
   harus sudah terdefinisi lebih dulu. Menaruhnya di tengah berkas menyebabkan
   ReferenceError "cannot access before initialization" yang hanya muncul saat
   dijalankan, bukan saat sintaks diperiksa. */

/* `?demo` membuka aplikasi berisi data karangan tanpa perlu akun. Dipakai
   untuk memamerkan tampilannya (mis. ditautkan dari portfolio) dan untuk
   memeriksa tata letak grafik saat data asli masih sedikit. Tidak ada risiko
   kebocoran: tanpa sesi, RLS di Postgres menolak semua baca-tulis. */
modeDemo = new URLSearchParams(location.search).has("demo");

el("tombolKeluar").addEventListener("click", () => {
  if (modeDemo) location.href = "index.html";
  else db.auth.signOut();
});

if (modeDemo) {
  selesaiMemuat();
  siapkanUI();
  sudahSiap = true;
  semuaItem = dataContoh();
  gambarSemua();
  el("spandukDemo").hidden = false;
  el("tombolKeluar").textContent = "Keluar demo";
} else {
  const { data: { session } } = await db.auth.getSession();
  if (!session) {
    location.replace("index.html");
  } else {
    selesaiMemuat();
    mulai();
  }

  db.auth.onAuthStateChange((_event, sesi) => {
    if (!sesi) location.replace("index.html");
  });
}
