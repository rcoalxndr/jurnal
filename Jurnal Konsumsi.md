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
