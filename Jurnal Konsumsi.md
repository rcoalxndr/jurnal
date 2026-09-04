# Jurnal Konsumsi

Pencatat film, serial, buku, dan game. Dibangun 22 Agustus 2026, proyek personal kelima.

- **Live:** https://rcoalxndr.github.io/jurnal — public
- **Demo tanpa akun:** https://rcoalxndr.github.io/jurnal/app.html?demo
- **Kode:** `all-work\jurnal` · detail teknis lengkap ada di `README.md` di folder yang sama

## Kenapa proyek ini, bukan yang lain

Tiga ide lebih dulu ditolak dalam sesi yang sama: Simulator IPK, konverter Jadwal Kuliah ke `.ics`, dan Pelacak Waktu. Ketiganya gagal di tes yang sama — **semuanya menuntut perilaku baru lebih dulu** supaya aplikasinya ada gunanya.

Aplikasi keuangan berhasil justru karena kebalikannya: uang sudah dikeluarkan tiap hari dengan atau tanpa aplikasi. Aplikasinya cuma menangkap sesuatu yang sudah pasti terjadi. Nonton, baca, dan main memenuhi syarat yang sama.

Ide Adobe Stock dan laporan berita PDF tiap 4 jam dibahas di sesi yang sama dan **tidak dipilih** — lihat bagian akhir catatan ini.

## Kelemahan yang disadari sejak awal

Letterboxd, Goodreads, dan Backloggd lebih matang. Celah yang diisi cuma satu: **tidak ada yang menampung tiga jenis sekaligus.** Itu keunggulan yang nyata tapi tipis.

Keberatan ini sengaja dipakai — keberatan yang persis sama dipakai untuk membatalkan ide pelacak deadline (kalah dari Apple Reminders), jadi tidak adil kalau tidak diterapkan ke ide sendiri.

## Yang membuatnya berbeda dari aplikasi keuangan

**Barisnya bisa berubah status:** mau → sedang → selesai (atau ditinggalkan). Transaksi keuangan itu peristiwa titik dan aplikasinya sengaja tidak punya fitur edit sama sekali. Di sini `UPDATE` justru inti aplikasinya — lengkap dengan dialog ubah, aksi satu ketuk, dan penanda judul yang mandek.

Ini juga alasan proyeknya layak masuk portofolio: kelas masalah yang benar-benar baru, bukan aplikasi keuangan yang dicat ulang.

## Keputusan yang sengaja diambil

- **Numpang project Supabase aplikasi keuangan.** Akun yang ada langsung berlaku, dan project gratis yang bisa di-pause saat nganggur jadi tetap hidup karena aplikasi keuangan dibuka rutin.
- **Tanpa API judul otomatis.** Menambah dependensi jaringan dan kunci API yang tidak boleh masuk repo publik. Kalau nanti ditambah, Open Library duluan — tidak butuh kunci.
- **Tanpa warna per jenis.** Empat warna kategori = empat jarak warna baru yang belum diuji. Jenis ditandai label teks; semua batang sewarna.
- **Tanpa tombol Daftar** di halaman masuk, karena pendaftaran di project itu memang sudah dimatikan.
- **`diubah_pada` diurus trigger Postgres**, bukan JavaScript — supaya mustahil ada jalur update yang lupa mengisinya.

## Temuan saat membangun

- **Baris meta kurang kontras.** `--ink-faint` di atas kartu mode gelap cuma **2,87:1**, di bawah ambang 4,5:1 untuk teks kecil. Di aplikasi keuangan warna itu cuma memuat tanggal yang terbaca di tempat lain, jadi tidak merugikan. Di sini baris itu memuat nilai bintang dan peringatan "diam N hari". Diganti `--ink-dim` → 5,17:1 (gelap) dan 6,34:1 (terang).
- **Dialog `method="dialog"` itu jebakan.** Dengan atribut itu, Enter di kolom judul menutup dialog tanpa menyimpan — pola yang sama dengan tombol Enter di halaman masuk aplikasi keuangan. Submit ditangani sendiri supaya Enter menyimpan.
- **Pengaman animasi terbukti bekerja.** Verifikasi kebetulan berjalan saat halaman tidak digambar (`visibilityState: hidden`, jadi `requestAnimationFrame` mati total) dan semua angka serta batang tetap tampil benar. Ini persis kondisi yang dulu bikin angka utama aplikasi keuangan tidak pernah muncul.

## Revisi tampilan (23 Agustus 2026)

Permintaan Rico: lebih *fun*, sesuai konteks film/buku/game, siluet di halaman masuk, tata letak yang tidak sama dengan aplikasi keuangan, dan teks yang lebih berisi.

Yang dikerjakan: **sistem siluet** untuk empat jenis (dipakai di punggung kartu, pemilih jenis, chip saringan, label grafik, dan dekorasi), **rak** empat jenis di hero yang meredup kalau jenisnya nol bulan ini, **tata letak dua kolom 1000px** di tab Sekarang, **bintang yang bisa diketuk langsung** di daftar Riwayat lengkap dengan arti tiap nilai, serta **teks kontekstual** yang berubah mengikuti pilihan dan data.

Halaman masuk dapat pita seluloid yang bergeser (dibuat dari `repeating-linear-gradient`, nol permintaan jaringan), empat siluet melayang dengan kecepatan berbeda, dan alur `Mau → Sedang → Selesai` dengan titik yang berjalan menyusurinya.

**Yang ditolak masuk:** warna per jenis. Diganti bentuk — lihat alasannya di `README.md`.

**Temuan terukur:** tombol aksi di daftar cuma **29px** tingginya karena `.tombol.kecil` memakai `min-height: 0`. Itu tombol yang paling sering diketuk dari HP. Dinaikkan ke 44px.

**Putaran kedua — latar halaman aplikasi.** Rico menilai bagian isi masih terlalu polos. Ditambah siluet melayang + pita bergeser di `z-index: -1`, `pointer-events: none`, opasitas 0,04–0,055 (0,035 di HP, pita dimatikan di bawah 700px). Diverifikasi: `elementFromPoint` di area kosong mengembalikan `MAIN`, bukan lapisan hiasan — jadi tidak ada ketukan yang tercuri.

**Regresi kontras yang ditemukan lewat pengukuran:** teks kaki halaman turun ke 2,90:1 saat siluet lewat di belakangnya. Ternyata sudah gagal sejak awal di 3,17:1 — warisan `--ink-faint` dari aplikasi keuangan, padahal salah satu isinya tautan. Dinaikkan ke `--ink-dim`: sekarang 5,2:1 pada kasus terburuk di kedua mode. **Kalau opasitas latar dinaikkan, ukur ulang.**

**Catatan alat, bukan bug aplikasi:** saat panel browser tersembunyi, perhitungan gaya berhenti total — bahkan `element.style.opacity` yang diset langsung tetap terbaca nilai lama. Nilai saat halaman pertama dimuat tetap benar. Jadi jangan percaya `getComputedStyle` setelah mengubah kelas lewat Console kalau panelnya tidak terlihat; muat ulang halamannya.

## Gerbang sebelum menambah fitur

Setelah **3 minggu**: kalau entri yang tercatat **kurang dari 8**, berhenti. Jangan tambah fitur, jangan tambah API judul otomatis, jangan tambah jenis baru. Angka di bawah itu artinya kebiasaan mencatatnya tidak terbentuk, dan fitur baru tidak akan memperbaikinya.

## Belum ada, sengaja

Ambil judul otomatis dari API · sampul/poster · jumlah episode atau halaman · jam main · ekspor · rekap tahunan.

## Ide lain dari sesi yang sama yang TIDAK dipilih

- **Adobe Stock sebagai sumber penghasilan** — royalti per unduhan sangat kecil, butuh ribuan aset, dan pasarnya kebanjiran suplai sejak generative AI. Bukan "cari duit", melainkan bisnis konten volume tinggi bermargin tipis.
- **Ringkasan berita tiap 4 jam dikirim PDF ke WA/email** — ditaruh di urutan terakhir oleh Rico sendiri. 6 PDF sehari berarti inbox yang tidak pernah dikosongkan; PDF lebih susah dibaca di HP daripada teks; kirim otomatis butuh WhatsApp Business API berbayar; dan butuh server terjadwal + kunci rahasia yang tidak boleh masuk repo publik. Pola yang sama dengan proyek Sheets + Apps Script + Telegram yang dulu dihapus. **Janji ke diri sendiri di portofolio belum ditepati: coba manual seminggu dulu.** Kalau nanti dibangun, bentuk pertamanya satu halaman web sekali sehari, bukan PDF tiap 4 jam.
- **Simulator IPK, Jadwal Kuliah → .ics, Pelacak Waktu** — butuh perilaku baru lebih dulu.
- **Pelacak deadline kuliah** — kalah dari Apple Reminders di hari pertama: notifikasi native, Siri, widget. Web app di iPhone tidak bisa menandingi itu.


---

## Perubahan

Bagian ini **hanya ditambahi**, tidak pernah ditulis ulang. Entri terbaru di bawah.

### 2026-08-23 — Ekspor PDF + tautan dari portfolio

**Ditambahkan: unduh laporan sebagai PDF** (`v=4`)
- Tombol di tab Riwayat menyusun lembar `#cetak` dari bulan yang sedang dipilih, lalu `window.print()`.
- **Sengaja tanpa pustaka PDF** — alasan sama dengan aplikasi keuangan.
- Isi lembar: ringkasan periode, yang berakhir bulan itu (judul, jenis, status, tanggal, nilai, catatan), sedang jalan + berapa hari sejak disentuh, antrean, sebaran jenis & nilai sepanjang waktu, dan **8 butir catatan**.
- Catatan menjelaskan hal yang gampang disalahartikan: kolom "Berakhir" pada baris *ditinggalkan* berarti tanggal berhenti, bukan tanggal tuntas. Arti tiap bintang ditulis lengkap.

**Diuji**
- Aturan cetak diterapkan sementara sebagai gaya layar lalu diukur — semua lolos.
- Kasus tepi bulan kosong ditangani dengan kalimat penjelas, bukan tabel kosong.

**Ditautkan dari portfolio**
- Studi kasus lengkap sekarang ada di `portfolio\jurnal.html`.

### 2026-08-23 (lanjutan) — Sapuan kontras menyeluruh (`v=5`)

**Pemicu:** di portfolio ketahuan `--ink-faint` gagal ambang 4,5:1 di *setiap* kombinasi latar, di kedua tema (2,87–3,33:1). Palet aplikasi ini identik, jadi cacatnya ikut tersalin.

**Yang disapu:** 14 deklarasi `color:` + 1 `fill:` diganti ke `--ink-dim`. Yang dibiarkan cuma `border-color`. `.grafik .sumbu` ikut diganti walau propertinya `fill`, karena isinya teks label sumbu yang dirender sebagai SVG.

**Bintang kosong: diperbaiki lewat BENTUK, bukan warna.** Bintang yang belum terisi memakai `var(--line)` — terukur **1,42:1**, praktis tidak terlihat. Akibatnya bukan cuma soal ambang: orang tidak tahu ada lima bintang yang bisa diketuk.

Sekarang bintang kosong memakai glyph **☆** dan bintang terisi **★**, dengan warna dinaikkan ke `--ink-dim`. Nilai 3 dari 5 terbaca **★★★☆☆** — kebedaannya bertahan walau warnanya tidak terlihat sama sekali. Ini prinsip yang sama dengan siluet jenis: **bedakan lewat bentuk, warna cuma penegas.**

**Turunan warna data.** Token `--masuk`/`--keluar` **tidak diubah**. Ditambahkan `--keluar-teks` (untuk teks: `.it-mandek`, `.bintang.aktif`, `.bintang-mini.aktif`, nominal di tabel) dan `--isi-keluar` (untuk isian yang memuat teks putih: `.pesan.galat`, `.tombol.bahaya:hover`).

**Hasil akhir:** disisir seluruh elemen teks yang tampil — tab Sekarang, Riwayat, Tren, **dialog ubah**, dan halaman masuk — di kedua tema: **nol kegagalan**.

**Catatan alat:** jangan mengukur dengan mengganti `data-theme` saat panel browser tidak menggambar; hasilnya keadaan setengah-jadi. Muat ulang dengan skema warna OS. Dan `color-mix()` menghasilkan `color(srgb ...)` berskala 0–1, bukan 0–255.

### 2026-09-04 — Disamakan dengan aplikasi keuangan yang baru (`v=6`)

**Pemicu:** aplikasi keuangan dibangun ulang jadi dashboard satu-halaman berkulit dingin (ground putih `#FAFAFA`, near-mono, aksen hitam, Poppins). Jurnal masih pakai tampilan krem + hiasan lama, jadi dua aplikasi yang berbagi database dan login jadi terbaca seperti tidak berhubungan. Rico minta "samakan penuh — termasuk jadi satu halaman tanpa tab".

**Yang berubah:**
- **Token warna** `:root` + kedua blok gelap diganti dengan sistem token Keuangan (putih/hitam/Poppins). Token data `--masuk`/`--keluar`/`--keluar-teks`/`--isi-*` **dipertahankan**. `--grid` dibuang, `--radius-kartu: 18px` ditambahkan.
- **Tiga tab (Sekarang / Riwayat / Tren) dihapus.** Jadi satu halaman dashboard: kartu hero gelap (selesai bulan ini + rak per jenis), formulir tambah, daftar "selesai bulan ini" (dibatasi 6), "sedang jalan", "antrean", grafik garis "selesai per bulan", dan KPI "sorotan bulan ini". Riwayat lengkap (jelajah per bulan, sebaran jenis & nilai, tabel bulanan) pindah ke satu **seksi rincian** di balik tombol "Lihat semua".
- **Grafik tren:** kolom batang → **grafik garis** (`garisBulanan`, sama seperti "Reports" Keuangan) — koordinat piksel, garis dilembutkan bezier, titik terakhir + gelembung nilai.
- **Hiasan latar dilepas seluruhnya** — siluet melayang, pita seluloid, semua `@keyframes` terkait, dan dekorasi halaman masuk. Alasannya lihat entri putaran kedua di atas: hiasan di belakang teks selalu menekan kontras dan tidak membawa informasi. Yang tersisa dari siluet adalah pemakaian fungsionalnya (punggung kartu, pemilih jenis, chip, label grafik). `.alur` tiga-status di halaman masuk **tetap** — itu isi, bukan hiasan.
- **Pencarian judul** (`#cariJudul`) di topbar, menyaring keempat daftar sekaligus.
- **KPI baru** di "sorotan bulan ini": rata-rata nilai bulan ini, jumlah judul mangkrak (≥ 21 hari), total selesai tahun berjalan.

**Diverifikasi (DOM + computed-style, panel browser tidak andal sesi ini):**
- Terang & gelap (sistem, tanpa `data-theme`): **nol kegagalan kontras** — semua pasang teks ≥ 5,3:1, hero-catatan di kartu gelap 6,2–6,9:1.
- Tidak ada overflow horizontal di 375px maupun 1280px. Grid dua kolom aktif ≥ 940px, menumpuk di bawahnya.
- `node --check` app.js/bersama.js/login.js lolos; hitungan kurung seimbang.
- Mode demo, buka/tutup rincian, jelajah bulan, saring jenis, pencarian — semua jalan tanpa error console.

**Catatan:** `localStorage['theme']` yang menempel dari sesi lama (`data-theme=light`) sempat menutupi tema gelap saat verifikasi. Bersihkan dulu sebelum menguji tema sistem.

**Portfolio:** studi kasus (`jurnal.en/id.html`) dapat bab baru "Later, I made it match the finance app". `README.md` disesuaikan (bagian struktur, hiasan latar, tata letak, PDF).
