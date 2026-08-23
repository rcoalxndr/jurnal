import {
  db, el, tampilkanPesan, pasangTombolTema, selesaiMemuat, geraknyaDikurangi,
  pasangSprite, ikon,
} from "./bersama.js?v=4";

/* Siluet disuntikkan sebelum apa pun digambar, supaya <use> di HTML punya
   simbol untuk ditunjuk sejak frame pertama. */
pasangSprite();

const JENIS = { film: "Film", serial: "Serial", buku: "Buku", game: "Game" };
const URUT_JENIS = ["film", "serial", "buku", "game"];

const STATUS = { mau: "Mau", sedang: "Sedang", selesai: "Selesai", ditinggalkan: "Ditinggalkan" };

/* Bintang tanpa keterangan itu ambigu -- 3 dari 5 artinya apa? Label ini
   membuat penilaiannya konsisten dari bulan ke bulan. */
const ARTI_NILAI = {
  1: "Buang waktu",
  2: "Ya sudahlah",
  3: "Bagus",
  4: "Bagus banget",
  5: "Salah satu terbaik",
};

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
let jenisTerpilih = "film";
let bulanRiwayat = kunciBulanIni();
let jenisTersaring = "semua";
let sudahSiap = false;
let modeDemo = false;
let sedangDiubah = null;   /* baris yang terbuka di dialog */
let nilaiDiubah = null;    /* nilai bintang yang dipilih di dialog */
let jenisDiubah = "film";  /* jenis yang dipilih di dialog */

/* Sekelompok tombol yang berperilaku seperti radio: satu aktif, sisanya tidak.
   Dipakai untuk pemilih jenis, status awal, dan chip saringan -- tiga tempat
   dengan perilaku identik, jadi ditulis sekali. */
function pasangPilihan(wadah, kelasTombol, saatPilih) {
  wadah.querySelectorAll("." + kelasTombol).forEach((b) => {
    b.addEventListener("click", () => {
      wadah.querySelectorAll("." + kelasTombol).forEach((o) => {
        const aktif = o === b;
        o.classList.toggle("aktif", aktif);
        o.setAttribute("aria-pressed", String(aktif));
      });
      saatPilih(b.dataset.jenis || b.dataset.status);
    });
  });
}

function setelPilihan(wadah, kelasTombol, nilai) {
  wadah.querySelectorAll("." + kelasTombol).forEach((o) => {
    const aktif = (o.dataset.jenis || o.dataset.status) === nilai;
    o.classList.toggle("aktif", aktif);
    o.setAttribute("aria-pressed", String(aktif));
  });
}

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

  pasangPilihan(el("formTambah"), "status-tombol", (v) => { statusAwal = v; gambarPetunjukTambah(); });
  pasangPilihan(el("jenisPilih"), "jenis-tombol", (v) => { jenisTerpilih = v; gambarPetunjukTambah(); });
  gambarPetunjukTambah();

  el("formTambah").addEventListener("submit", tambahItem);

  el("bulanSebelum").addEventListener("click", () => { bulanRiwayat = geserBulan(bulanRiwayat, -1); gambarRiwayat(); });
  el("bulanSesudah").addEventListener("click", () => { bulanRiwayat = geserBulan(bulanRiwayat, 1); gambarRiwayat(); });
  pasangPilihan(el("saringJenis"), "chip", (v) => { jenisTersaring = v; gambarRiwayat(); });

  /* Lembar cetak disusun tepat sebelum dialog cetak dibuka, supaya selalu
     memuat bulan yang sedang dipilih. */
  el("tombolUnduh").addEventListener("click", () => {
    bangunCetak();
    window.print();
  });
  el("unduhKet").textContent =
    "Pilih “Save as PDF” di dialog cetak. Di iPhone: Bagikan → Print → simpan ke Files.";

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

/* Kalimat di bawah tombol Simpan berubah mengikuti pilihan, supaya orang tahu
   persis apa yang akan terjadi sebelum menekannya. Ini menggantikan penjelasan
   panjang yang sama untuk semua keadaan. */
function gambarPetunjukTambah() {
  const jenis = JENIS[jenisTerpilih].toLowerCase();
  const teks = {
    mau: `Masuk antrean. Tanggal mulai dikosongkan sampai kamu benar-benar mulai.`,
    sedang: `Ditandai mulai hari ini, dan akan mengingatkanmu kalau ${jenis} ini diam terlalu lama.`,
    selesai: `Langsung ditutup hari ini. Nilainya bisa diketuk belakangan di tab Riwayat.`,
  };
  el("petunjukTambah").textContent = teks[statusAwal];
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
    jenis: jenisTerpilih,
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

  pasangPilihan(el("ubahJenis"), "jenis-tombol", (v) => { jenisDiubah = v; });

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
  el("labelNilai").textContent = nilaiDiubah ? ARTI_NILAI[nilaiDiubah] : "Belum dinilai";
}

function bukaDialog(r) {
  sedangDiubah = r;
  nilaiDiubah = r.nilai ?? null;

  el("dialogJudul").textContent = "Ubah " + JENIS[r.jenis].toLowerCase();
  el("ubahJudul").value = r.judul;
  jenisDiubah = r.jenis;
  setelPilihan(el("ubahJenis"), "jenis-tombol", r.jenis);
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
    jenis: jenisDiubah,
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

/* Elemen ketiga adalah kunci jenisnya, dipakai grafik untuk memasang siluet
   di samping labelnya. */
function perJenis(rows) {
  const m = hitungJenis(rows);
  return URUT_JENIS.filter((j) => m.get(j) > 0).map((j) => [JENIS[j], m.get(j), j])
    .sort((a, b) => b[1] - a[1]);
}

function hitungJenis(rows) {
  const m = new Map(URUT_JENIS.map((j) => [j, 0]));
  for (const r of rows) m.set(r.jenis, (m.get(r.jenis) || 0) + 1);
  return m;
}

function perNilai(rows) {
  const m = new Map();
  for (const r of rows) if (r.nilai) m.set(r.nilai, (m.get(r.nilai) || 0) + 1);
  /* Bintang plus artinya. Deretan bintang saja menuntut orang menghitung
     jumlahnya; katanya langsung terbaca. */
  return [5, 4, 3, 2, 1].filter((n) => m.has(n))
    .map((n) => [`${"★".repeat(n)} ${ARTI_NILAI[n]}`, m.get(n)]);
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

  data.forEach(([nama, nilai, jenisKunci], i) => {
    const li = document.createElement("li");
    li.style.setProperty("--tunda", i * 55 + "ms");

    const kepala = document.createElement("div");
    kepala.className = "batang-kepala";
    const kiri = document.createElement("span");
    kiri.className = "batang-label-kiri";
    /* Siluet jenis ikut ditampilkan di label -- bentuknya lebih cepat dikenali
       daripada membaca kata, dan batangnya sendiri tetap sewarna. */
    if (jenisKunci) kiri.append(ikon(jenisKunci, "ikon"));
    kiri.append(document.createTextNode(nama));
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

  /* Rak: keempat jenis selalu ditampilkan, termasuk yang nol. Justru yang nol
     itu informasinya -- sebulan tanpa satu buku pun kelihatan sekali. */
  const hitungan = hitungJenis(selesaiBulanIni);
  const idRak = { film: "rakFilm", serial: "rakSerial", buku: "rakBuku", game: "rakGame" };
  for (const j of URUT_JENIS) {
    const n = hitungan.get(j);
    const node = el(idRak[j]);
    node.textContent = String(n);
    const slot = node.closest(".rak-slot");
    slot.classList.toggle("terisi", n > 0);
    slot.classList.toggle("rak-kosong", n === 0);
    slot.title = `${n} ${JENIS[j].toLowerCase()} selesai bulan ini`;
  }

  const mandek = sedang.filter((r) => umurHari(r.diubah_pada) >= 21).length;

  const catatan = el("heroCatatan");
  if (!semuaItem.length) {
    catatan.textContent = "Jurnalnya masih kosong. Tambah satu judul yang lagi kamu tonton sekarang — tidak harus yang baru.";
  } else if (!selesaiBulanIni.length) {
    catatan.textContent = mandek
      ? `Belum ada yang selesai bulan ini, dan ${mandek} judul sudah lama diam. Selesaikan satu, atau tinggalkan dengan tenang.`
      : "Belum ada yang selesai bulan ini. Masih ada waktu.";
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
      (rata ? ` · rata-rata nilai ${rata.toFixed(1).replace(".", ",")}` : "") +
      (mandek ? ` · ${mandek} judul lagi mangkrak` : "");
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

  /* Keadaan kosong ikut menyesuaikan saringan -- "tidak ada apa-apa" dan
     "tidak ada buku" itu dua kabar yang berbeda, dan yang kedua punya jalan
     keluar yang jelas. */
  const nama = labelBulan(bulanRiwayat);
  el("riwKosongTeks").textContent = jenisTersaring === "semua"
    ? `Tidak ada yang berakhir di ${nama}. Bulan yang tenang, atau memang lupa dicatat?`
    : `Tidak ada ${JENIS[jenisTersaring].toLowerCase()} yang berakhir di ${nama}. Coba saringan Semua.`;
  el("riwKosong").querySelector("use")
    .setAttribute("href", "#ik-" + (jenisTersaring === "semua" ? "film" : jenisTersaring));

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

  /* Kalimat yang membacakan grafiknya. Angka sudah ada di batang; yang belum
     ada adalah kesimpulannya. */
  const subJenis = el("jenisSub");
  if (jenis.length >= 2) {
    const porsi = Math.round((jenis[0][1] / selesaiSemua.length) * 100);
    const belum = URUT_JENIS.filter((j) => !jenis.some((d) => d[2] === j));
    subJenis.textContent =
      `${jenis[0][0]} mengambil ${porsi}% dari semua yang kamu selesaikan` +
      (belum.length ? `, dan belum ada satu pun ${belum.map((j) => JENIS[j].toLowerCase()).join(" atau ")}.` : ".");
  } else {
    subJenis.textContent = "Berapa judul yang selesai per jenis, sepanjang waktu.";
  }

  const nilai = perNilai(selesaiSemua);
  el("nilaiKosong").hidden = nilai.length > 0;
  batangHorizontal(el("grafikNilai"), nilai);

  const rataSemua = rataNilai(selesaiSemua);
  const subNilai = el("nilaiSub");
  if (nilai.length === 1) {
    subNilai.textContent = `Semua judul kamu beri nilai sama. Kalau begitu, nilainya tidak lagi membedakan apa pun.`;
  } else if (rataSemua >= 4.3) {
    subNilai.textContent = `Rata-rata ${rataSemua.toFixed(1).replace(".", ",")} — kamu murah hati, atau memang pintar memilih.`;
  } else if (rataSemua && rataSemua <= 2.7) {
    subNilai.textContent = `Rata-rata ${rataSemua.toFixed(1).replace(".", ",")} — banyak yang mengecewakan. Mungkin cara memilihnya yang perlu diubah.`;
  } else {
    subNilai.textContent = "Berapa judul di tiap bintang.";
  }

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

    /* Punggung: siluet jenis di sisi kiri, seperti punggung buku di rak.
       Ini pembeda visual paling kentara dari daftar transaksi keuangan. */
    const punggung = document.createElement("div");
    punggung.className = "it-punggung";
    punggung.append(ikon(r.jenis, "ikon"));

    const info = document.createElement("div");
    info.className = "it-info";

    const baris1 = document.createElement("div");
    baris1.className = "it-atas";

    /* Ikon sudah ada di punggung, tapi teksnya tetap ditulis -- siluet itu
       aria-hidden, dan pembaca layar harus tetap dapat jenisnya. */
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
    isiMeta(meta, r, konteks);
    if (meta.textContent) info.append(meta);

    /* Bintang yang bisa langsung diketuk, tanpa membuka dialog. Menilai itu
       hal yang paling sering dilakukan setelah selesai, jadi tidak pantas
       dikubur di balik satu ketukan tambahan. */
    if (konteks === "riwayat" && r.status === "selesai") {
      const baris = document.createElement("div");
      baris.className = "bintang-baris";
      for (let n = 1; n <= 5; n++) {
        const b = document.createElement("button");
        b.type = "button";
        b.className = "bintang-mini" + (r.nilai && n <= r.nilai ? " aktif" : "");
        b.textContent = "★";
        b.setAttribute("aria-label", `Beri ${n} bintang untuk ${r.judul}` +
          (ARTI_NILAI[n] ? ` — ${ARTI_NILAI[n]}` : ""));
        b.title = ARTI_NILAI[n];
        b.addEventListener("click", () => {
          /* Ketuk bintang yang sama untuk mengosongkan nilainya. */
          perbarui(r.id, { nilai: r.nilai === n ? null : n });
        });
        baris.append(b);
      }
      info.append(baris);
    }

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

    /* Kartunya memudar ke samping saat berpindah daftar. Penulisan datanya
       dimulai LEBIH DULU dan tidak menunggu animasi apa pun -- daftar akan
       digambar ulang dari data begitu simpanan selesai, terjadi atau tidak
       animasinya. */
    const pindah = (status) => {
      li.classList.add("pergi");
      pindahStatus(r, status);
    };

    if (konteks === "sedang") {
      aksi.append(tombol("Selesai", "Tandai selesai:", () => pindah("selesai"), "utama"));
      aksi.append(tombol("Tinggalkan", "Tandai ditinggalkan:", () => pindah("ditinggalkan")));
    } else if (konteks === "antre") {
      aksi.append(tombol("Mulai", "Mulai:", () => pindah("sedang"), "utama"));
    }
    aksi.append(tombol("Ubah", "Ubah:", () => bukaDialog(r)));

    li.append(punggung, info, aksi);
    wadah.append(li);
  });
}

/* Meta ditulis sebagai elemen, bukan satu untai teks, supaya penanda mangkrak
   bisa ditegaskan sendiri tanpa memisahkannya dari kalimatnya. */
function isiMeta(node, r, konteks) {
  node.textContent = "";
  const bagian = [];

  if (konteks === "sedang") {
    const umur = umurHari(r.diubah_pada);
    bagian.push(r.mulai_pada ? `mulai ${tanggalPendek(r.mulai_pada)}` : "belum dimulai");
    /* Ambang 21 hari: cukup lama untuk berarti mandek, tidak langsung menuduh
       orang yang cuma sedang sibuk seminggu dua minggu. */
    if (umur >= 21) bagian.push({ teks: `diam ${umur} hari`, tegas: true });
  } else if (konteks === "antre") {
    const umur = umurHari(r.dibuat_pada);
    bagian.push("belum dimulai");
    if (umur >= 30) bagian.push({ teks: `antre ${umur} hari`, tegas: true });
  } else {
    bagian.push(STATUS[r.status].toLowerCase());
    if (r.selesai_pada) bagian.push(tanggalPendek(r.selesai_pada));
    if (r.nilai) bagian.push(ARTI_NILAI[r.nilai]);
  }

  bagian.forEach((b, i) => {
    if (i) node.append(document.createTextNode(" · "));
    if (typeof b === "string") { node.append(document.createTextNode(b)); return; }
    const span = document.createElement("span");
    span.className = "it-mandek";
    span.textContent = b.teks;
    node.append(span);
  });
}

/* ---------------- Lembar cetak / PDF ----------------

   Dokumen disusun ulang dari data setiap kali tombol ditekan, bukan disiapkan
   di awal: isinya harus mengikuti bulan dan saringan yang sedang dipilih.

   Tidak memakai pustaka pembuat PDF. jsPDF atau pdfmake berarti menarik
   ratusan kilobita dari CDN di setiap kunjungan dan menambah satu mode gagal
   baru, sementara jalur cetak bawaan browser sudah menghasilkan PDF yang
   ditata penuh oleh CSS. Biayanya nol byte. */

const elemen = (tag, kelas, teks) => {
  const n = document.createElement(tag);
  if (kelas) n.className = kelas;
  if (teks != null) n.textContent = teks;
  return n;
};

/* Selalu textContent, tidak pernah innerHTML -- judul dan catatan diketik
   sendiri oleh pengguna dan bisa berisi tanda kurung siku. */
function barisTabel(tag, sel) {
  const tr = document.createElement("tr");
  for (const s of sel) tr.append(elemen(tag, s.kelas, s.teks));
  return tr;
}

function tabelCetak(judulKolom, barisIsi, kelas = "") {
  const tabel = elemen("table", "cetak-tabel " + kelas);
  const thead = document.createElement("thead");
  thead.append(barisTabel("th", judulKolom));
  const tbody = document.createElement("tbody");
  for (const b of barisIsi) tbody.append(barisTabel("td", b));
  tabel.append(thead, tbody);
  return tabel;
}

function bangunCetak() {
  const wadah = el("cetak");
  wadah.innerHTML = "";

  const berakhir = berakhirBulan(bulanRiwayat);
  const selesai = berakhir.filter((r) => r.status === "selesai");
  const ditinggal = berakhir.filter((r) => r.status === "ditinggalkan");
  const rata = rataNilai(selesai);
  const sedang = berstatus("sedang").sort((a, b) => (a.diubah_pada < b.diubah_pada ? -1 : 1));
  const antre = berstatus("mau");

  /* ---- Kepala ---- */
  const kepala = elemen("header", "cetak-kepala");
  kepala.append(elemen("h1", "", "Jurnal Konsumsi"));
  kepala.append(elemen("p", "cetak-periode", labelBulan(bulanRiwayat)));
  kepala.append(elemen("p", "cetak-meta",
    "Dibuat " + new Date().toLocaleString("id-ID", {
      day: "numeric", month: "long", year: "numeric", hour: "2-digit", minute: "2-digit",
    }) + " · Sumber: aplikasi Jurnal pribadi (rcoalxndr.github.io/jurnal)"));
  wadah.append(kepala);

  /* Sebuah PDF gampang beredar lepas dari konteksnya, jadi lembarnya harus
     bisa menjelaskan dirinya sendiri. */
  if (modeDemo) {
    wadah.append(elemen("p", "cetak-peringatan",
      "DATA CONTOH — judul di lembar ini karangan, bukan catatan sungguhan."));
  }

  /* ---- Ringkasan ---- */
  wadah.append(elemen("h2", "", "Ringkasan periode"));
  wadah.append(tabelCetak(
    [{ teks: "Keterangan" }, { teks: "Jumlah", kelas: "kanan" }],
    [
      [{ teks: "Selesai" }, { teks: judulan(selesai.length), kelas: "kanan angka-cetak" }],
      [{ teks: "Ditinggalkan" }, { teks: judulan(ditinggal.length), kelas: "kanan angka-cetak" }],
      [{ teks: "Rata-rata nilai yang selesai" },
       { teks: rata ? rata.toFixed(1).replace(".", ",") + " dari 5" : "belum ada nilai", kelas: "kanan angka-cetak" }],
      [{ teks: "Sedang jalan (per tanggal cetak)" }, { teks: judulan(sedang.length), kelas: "kanan angka-cetak" }],
      [{ teks: "Di antrean (per tanggal cetak)" }, { teks: judulan(antre.length), kelas: "kanan angka-cetak" }],
    ],
  ));

  const sebelumnya = berakhirBulan(geserBulan(bulanRiwayat, -1)).filter((r) => r.status === "selesai");
  let kalimat;
  if (!berakhir.length) {
    kalimat = "Tidak ada judul yang berakhir pada periode ini.";
  } else if (!sebelumnya.length) {
    kalimat = "Tidak ada data bulan sebelumnya untuk dibandingkan.";
  } else {
    const selisih = selesai.length - sebelumnya.length;
    kalimat = selisih === 0
      ? `Sama banyak dengan ${labelBulan(geserBulan(bulanRiwayat, -1))}.`
      : `${Math.abs(selisih)} ${selisih > 0 ? "lebih banyak" : "lebih sedikit"} dibanding ${labelBulan(geserBulan(bulanRiwayat, -1))}.`;
  }
  wadah.append(elemen("p", "cetak-kalimat", kalimat));

  /* ---- Yang berakhir bulan ini ---- */
  wadah.append(elemen("h2", "", "Yang berakhir pada periode ini"));
  if (!berakhir.length) {
    wadah.append(elemen("p", "cetak-kalimat", "Tidak ada."));
  } else {
    const urut = [...berakhir].sort((a, b) => (a.selesai_pada < b.selesai_pada ? -1 : 1));
    wadah.append(tabelCetak(
      [{ teks: "Judul" }, { teks: "Jenis" }, { teks: "Status" },
       { teks: "Mulai" }, { teks: "Berakhir" }, { teks: "Nilai" }, { teks: "Catatan" }],
      urut.map((r) => [
        { teks: r.judul },
        { teks: JENIS[r.jenis] },
        { teks: STATUS[r.status] },
        { teks: tanggalPendek(r.mulai_pada) || "—" },
        { teks: tanggalPendek(r.selesai_pada) || "—" },
        { teks: r.nilai ? `${r.nilai}/5 ${ARTI_NILAI[r.nilai]}` : "—" },
        { teks: r.catatan || "—" },
      ]),
      "tabel-rincian",
    ));
  }

  /* ---- Sedang jalan ---- */
  if (sedang.length) {
    wadah.append(elemen("h2", "", "Sedang jalan"));
    wadah.append(tabelCetak(
      [{ teks: "Judul" }, { teks: "Jenis" }, { teks: "Mulai" }, { teks: "Terakhir disentuh", kelas: "kanan" }],
      sedang.map((r) => [
        { teks: r.judul },
        { teks: JENIS[r.jenis] },
        { teks: tanggalPendek(r.mulai_pada) || "—" },
        { teks: umurHari(r.diubah_pada) + " hari lalu", kelas: "kanan angka-cetak" },
      ]),
    ));
  }

  /* ---- Antrean ---- */
  if (antre.length) {
    wadah.append(elemen("h2", "", "Antrean"));
    wadah.append(tabelCetak(
      [{ teks: "Judul" }, { teks: "Jenis" }, { teks: "Ditambahkan", kelas: "kanan" }],
      antre.map((r) => [
        { teks: r.judul },
        { teks: JENIS[r.jenis] },
        { teks: umurHari(r.dibuat_pada) + " hari lalu", kelas: "kanan angka-cetak" },
      ]),
    ));
  }

  /* ---- Sebaran sepanjang waktu ---- */
  const selesaiSemua = berstatus("selesai");
  if (selesaiSemua.length) {
    wadah.append(elemen("h2", "", "Sebaran sepanjang waktu"));
    const hitungan = hitungJenis(selesaiSemua);
    wadah.append(tabelCetak(
      [{ teks: "Jenis" }, { teks: "Selesai", kelas: "kanan" }, { teks: "Porsi", kelas: "kanan" }],
      URUT_JENIS.map((j) => [
        { teks: JENIS[j] },
        { teks: String(hitungan.get(j)), kelas: "kanan angka-cetak" },
        { teks: Math.round(hitungan.get(j) / selesaiSemua.length * 100) + "%", kelas: "kanan angka-cetak" },
      ]),
    ));

    const sebaranNilai = perNilai(selesaiSemua);
    if (sebaranNilai.length) {
      wadah.append(tabelCetak(
        [{ teks: "Nilai" }, { teks: "Judul", kelas: "kanan" }],
        sebaranNilai.map(([label, jml]) => [
          { teks: label },
          { teks: String(jml), kelas: "kanan angka-cetak" },
        ]),
      ));
    }
  }

  /* ---- Catatan ----
     Lembar yang beredar tanpa aplikasinya harus bisa menjelaskan sendiri
     istilah dan angkanya. */
  wadah.append(elemen("h2", "", "Catatan"));
  const catatan = elemen("ol", "cetak-catatan");
  [
    "Sebuah judul melewati empat status: “Mau” (masuk antrean, belum dimulai), “Sedang” (sedang berjalan), “Selesai” (tuntas), dan “Ditinggalkan” (berhenti sebelum tuntas, sengaja).",
    "Kolom “Berakhir” berlaku untuk yang selesai maupun yang ditinggalkan — untuk yang ditinggalkan, artinya tanggal berhenti, bukan tanggal tuntas.",
    "Bagian “Yang berakhir pada periode ini” dikelompokkan menurut tanggal berakhir, bukan tanggal mulai. Sebuah buku yang dimulai Januari dan selesai Maret akan muncul di laporan Maret.",
    `Nilai memakai skala 1–5: 1 ${ARTI_NILAI[1]}, 2 ${ARTI_NILAI[2]}, 3 ${ARTI_NILAI[3]}, 4 ${ARTI_NILAI[4]}, 5 ${ARTI_NILAI[5]}. Memberi nilai bersifat opsional, jadi rata-rata hanya dihitung dari judul yang benar-benar dinilai.`,
    "Bagian “Sedang jalan” dan “Antrean” menggambarkan keadaan pada tanggal lembar ini dibuat, bukan keadaan pada akhir periode.",
    "“Terakhir disentuh” dihitung dari perubahan terakhir pada baris itu — menandai, menilai, atau mengubah catatannya.",
    "Bagian “Sebaran sepanjang waktu” menghitung seluruh riwayat, bukan hanya periode di halaman pertama. Porsi dihitung terhadap total judul yang selesai.",
    "Tanggal memakai waktu setempat (WIB). Lembar ini dihasilkan dari catatan pribadi yang dimasukkan sendiri.",
  ].forEach((t) => catatan.append(elemen("li", "", t)));
  wadah.append(catatan);
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
