# Jurnal — pencatat film, serial, buku, dan game

Aplikasi web untuk mencatat apa yang ditonton, dibaca, dan dimainkan — dari antrean, sedang jalan, sampai selesai dan dinilai. HTML, CSS, dan JavaScript biasa, tanpa framework dan tanpa build step. Data disimpan di Postgres lewat Supabase.

**Live:** https://rcoalxndr.github.io/jurnal · **Demo tanpa akun:** https://rcoalxndr.github.io/jurnal/app.html?demo

## Kenapa ini ada, padahal Letterboxd sudah ada

Letterboxd, Goodreads, dan Backloggd masing-masing lebih matang di bidangnya. Celah yang diisi aplikasi ini cuma satu, tapi nyata: **tidak ada satu pun dari ketiganya yang menampung film, buku, dan game sekaligus.** Untuk melihat satu pola konsumsi, orang harus membuka tiga akun di tiga aplikasi.

Kalau ternyata pemakainya cuma menonton film, aplikasi ini kalah dan sebaiknya tidak dipakai.

## Yang baru dibanding aplikasi keuangan

Aplikasi ini kembarannya [Keuangan](https://github.com/rcoalxndr/keuangan) — arsitektur, palet, dan pola kodenya sama. Satu hal yang berbeda, dan itu inti proyeknya:

**Barisnya berubah status.** Transaksi keuangan itu peristiwa titik: dicatat sekali, tidak pernah diubah — aplikasi keuangan bahkan sengaja tidak punya fitur edit sama sekali. Sebuah film atau buku punya siklus hidup:

```
mau ──► sedang ──► selesai
             └───► ditinggalkan
```

Artinya aplikasi ini butuh operasi `UPDATE`, penanganan status, dialog ubah, dan tampilan "yang sedang jalan" — kelas masalah yang tidak ada di proyek sebelumnya.

## Struktur

```
jurnal/
├── index.html    Halaman masuk — juga berfungsi sebagai halaman perkenalan
├── app.html      Aplikasi: satu halaman dashboard + seksi rincian + dialog ubah
├── style.css     Semua styling, mobile-first, dipakai kedua halaman
├── bersama.js    Klien Supabase, tema, siluet jenis, pembantu kedua halaman
├── login.js      Masuk, alihkan ke app.html
├── app.js        Catatan, status, hitungan, grafik
├── config.js     Alamat + kunci publik Supabase
└── schema.sql    Tabel + trigger + aturan keamanan, dijalankan sekali di Supabase
```

## Keputusan yang perlu dijelaskan

**Numpang project Supabase aplikasi keuangan.** Tabelnya terpisah (`konsumsi`), tapi database dan sistem loginnya satu. Untungnya bukan cuma hemat setup: akun yang sudah ada langsung berlaku, dan project Supabase gratis yang **di-pause kalau nganggur** jadi tetap hidup karena aplikasi keuangan dibuka rutin.

**Tidak ada tombol Daftar.** Pendaftaran di project itu sudah dimatikan setelah akun pertama dibuat. Menampilkan tombol yang dipastikan gagal cuma membingungkan.

**Tidak ada API judul otomatis.** Ambil judul dan sampul dari TMDb atau Open Library memang enak, tapi menambah dependensi jaringan, mode gagal baru, dan sebagian butuh kunci API yang tidak boleh masuk repo publik. Ditambahkan kalau mengetik judul terbukti menjengkelkan berulang kali — dan kalau iya, Open Library yang pertama dicoba, karena tidak butuh kunci sama sekali.

**Jenis dibedakan lewat bentuk, bukan warna.** Empat warna kategori berarti empat pasang jarak warna baru yang belum pernah diuji keterbacaannya. Sebagai gantinya tiap jenis punya **siluet** sendiri — film, serial, buku, game — yang muncul di punggung kartu, pemilih jenis, chip saringan, dan label grafik. Bentuk terbaca oleh siapa pun termasuk yang buta warna, dan semua batang grafik tetap sewarna: yang membawa informasi adalah panjangnya.

Siluetnya ditulis **sekali** sebagai sprite di `bersama.js`, lalu disuntikkan ke kedua halaman lewat `pasangSprite()`. Bukan disalin ke dua berkas HTML — salinan yang harus disamakan manual pasti berbeda diam-diam suatu hari. Elemen `<use>` di HTML menunjuk simbol itu, dan `ikon(jenis)` membuat elemen yang sama untuk daftar yang dirender JavaScript.

**Hiasan latar dilepas.** Versi sebelumnya menaruh keempat siluet melayang di latar halaman aplikasi dan halaman masuk, dengan pita seluloid bergeser di belakangnya. Semua itu dibuang saat tampilan disamakan dengan aplikasi Keuangan (kulit dingin: ground putih, near-mono, Poppins). Hiasan yang duduk di belakang teks selalu menekan kontras — kaki halaman sempat turun ke 2,90:1 karenanya — dan tidak membawa informasi apa pun. Yang tersisa dari siluet adalah pemakaian fungsionalnya di daftar dan pemilih.

**Tampilannya kini sengaja mengikuti aplikasi Keuangan.** Satu halaman dashboard: kartu hero gelap (berapa selesai bulan ini, per jenis), formulir tambah, daftar "sedang jalan" dan "antrean", grafik garis "selesai per bulan", dan KPI "sorotan bulan ini" — semua di grid dua kolom yang menumpuk di layar sempit. Riwayat lengkap (jelajah per bulan, sebaran jenis & nilai, tabel bulanan) pindah ke satu **seksi rincian** yang dibuka lewat tombol "Lihat semua", menggantikan tiga tab yang lama.

**Bintang bisa diketuk langsung di daftar.** Menilai adalah hal yang paling sering dilakukan setelah selesai, jadi tidak pantas dikubur di balik satu ketukan tambahan ke dialog. Tiap bintang juga punya artinya (`Bagus`, `Bagus banget`, …) — deretan bintang tanpa keterangan menuntut orang menghitung dan menebak maknanya sendiri.

**`diubah_pada` diurus trigger database, bukan JavaScript.** Kalau diisi dari aplikasi, cepat atau lambat ada satu jalur update yang lupa mengisinya dan urutan daftar jadi salah tanpa ada yang sadar.

**Dialog ubah sengaja bukan `method="dialog"`.** Dengan atribut itu, menekan Enter di kolom judul menutup dialog tanpa menyimpan — jebakan yang sama seperti tombol Enter di halaman masuk aplikasi keuangan yang dulu memicu "Masuk" padahal maksudnya "Daftar".

## Unduh PDF

Tombol **PDF** di kartu "Selesai per bulan" menyusun sebuah lembar laporan dari bulan yang sedang dipilih (bulan berjalan, atau bulan yang sedang dijelajah di seksi rincian), lalu membuka dialog cetak. Pilih "Save as PDF" di sana. Di iPhone: Bagikan → Print → simpan ke Files.

**Tidak memakai pustaka pembuat PDF.** jsPDF atau pdfmake berarti menarik ratusan kilobita dari CDN di **setiap** kunjungan — termasuk kunjungan yang tidak pernah mengunduh apa pun — dan menambah satu mode gagal baru kalau CDN-nya bermasalah. Jalur cetak bawaan browser sudah menghasilkan PDF yang ditata penuh oleh CSS, dengan biaya nol byte.

Konsekuensinya jujur: bukan satu klik langsung jadi berkas, ada satu dialog di tengah.

Lembarnya **dokumen terpisah** (`#cetak`), bukan tampilan aplikasi yang dipaksa muat di kertas. Isinya:

| Bagian | Isi |
|---|---|
| Kepala | Judul, periode, waktu pembuatan, sumber |
| Ringkasan | Selesai, ditinggalkan, rata-rata nilai, sedang jalan, antrean |
| Yang berakhir | Judul, jenis, status, tanggal mulai & berakhir, nilai, catatan |
| Sedang jalan | Termasuk berapa hari sejak terakhir disentuh |
| Antrean | Termasuk berapa lama sudah mengantre |
| Sebaran | Per jenis dan per nilai, sepanjang waktu |
| Catatan | Delapan butir penjelasan istilah dan cara hitung |

**Kenapa ada bagian Catatan.** Sebuah PDF gampang beredar lepas dari aplikasinya. Tanpa penjelasan, kolom "Berakhir" pada baris berstatus *ditinggalkan* gampang disalahartikan sebagai tanggal tuntas — padahal artinya tanggal berhenti. Arti tiap bintang juga ditulis lengkap, karena "3 dari 5" sendirian tidak berarti apa-apa.

**Mode demo mencetak peringatan besar** di kepala lembar, supaya PDF berisi judul karangan tidak pernah disangka catatan sungguhan.

Detail teknis yang menahan hasilnya tetap rapi: `thead { display: table-header-group }` mengulang kepala tabel di tiap halaman, `tr { break-inside: avoid }` mencegah satu baris terpotong dua halaman, dan `h2 { break-after: avoid }` mencegah judul bagian terdampar sendirian di kaki halaman.

## Mode demo

`app.html?demo` membuka aplikasi berisi data karangan enam bulan, tanpa perlu akun. Semua tombolnya berfungsi — tambah, ubah status, ubah catatan, hapus — tapi perubahannya hanya hidup di layar itu dan tidak pernah menyentuh database.

Tidak ada risiko kebocoran: tanpa sesi login, RLS di Postgres menolak semua baca dan tulis.

## Menyiapkan dari nol

1. Buka **SQL Editor** di project Supabase yang dipakai, tempel seluruh isi `schema.sql`, jalankan.
2. Kalau memakai project Supabase lain, salin **Project URL** dan **publishable/anon key** ke `config.js`.
3. Buka `index.html` lewat server lokal, masuk dengan akun yang sudah ada.

## Menjalankan di lokal

```bash
python -m http.server 5175 --directory jurnal
```

Harus lewat server, tidak bisa klik dua kali file HTML-nya — browser memblokir modul JavaScript yang dibuka lewat `file://`.

## Soal keamanan

**`config.js` aman berada di repo publik.** Kunci publik itu memang dirancang untuk dikirim ke browser siapa pun. Keamanannya bergantung pada **Row Level Security** di `schema.sql`: Postgres menolak baris yang `user_id`-nya bukan milik pengguna yang sedang login, di level database. Walau ada bug di JavaScript, data tetap tidak bisa terbaca orang lain.

Yang **tidak boleh** masuk repo: `service_role` key dan password database. Keduanya menembus semua aturan keamanan.

## Aturan yang tidak boleh dilanggar saat mengubah kode

Semuanya lahir dari bug sungguhan di proyek-proyek sebelumnya, bukan dari teori.

| Aturan | Kenapa |
|---|---|
| Naikkan `?v=N` di `style.css`, `app.js`, `login.js`, dan di dalam `import ... from "./bersama.js?v=N"` **setiap kali** JS/CSS diubah | Tanpa itu pengunjung lama dapat JS lama + HTML baru, dan aplikasinya rusak. **Tidak pernah terlihat di localhost.** |
| Jangan memeriksa alamat `?v=N` yang baru **sebelum** deploy-nya mendarat | `?v=N` hanya mematahkan cache selama N-nya berubah. Meminta kunci baru saat server masih menyajikan isi lama akan menyimpan isi lama itu di bawah kunci baru — dan cache-nya bertahan sampai kedaluwarsa. Terjadi sungguhan saat memverifikasi rilis ini. Tunggu deploy selesai dulu, baru periksa. |
| Animasi tidak boleh jadi satu-satunya jalan sebuah nilai muncul | `requestAnimationFrame` tidak berjalan saat halaman tidak digambar (tab latar). Tiap angka dan batang punya pengaman `setTimeout`. Sudah jadi bug dua kali. |
| Tanggal pakai perhitungan lokal, bukan `toISOString()` | WIB itu UTC+7 — catatan dini hari akan tercatat tanggal kemarin. |
| Semua `input`/`select` minimal 16px | Di bawah itu iOS memperbesar layar sendiri saat field disentuh. |
| Tombol aksi di daftar minimal 44px tinggi | `.tombol.kecil` memakai `min-height: 0`. Terukur: tanpa penegasan ulang, tombol Selesai/Tinggalkan/Ubah cuma 29px — dan justru itu yang paling sering diketuk dari HP. |
| Blok penjaga halaman tetap di **paling akhir** `app.js` | Di tengah berkas → `ReferenceError` karena TDZ, dan itu **lolos dari `node --check`**. |
| Batang horizontal pakai HTML biasa, bukan SVG yang diregangkan | Teks pernah melar 5,86× ke samping. SVG hanya untuk grafik garis bulanan, dengan koordinat piksel sungguhan — itulah kenapa lebar wadahnya diukur dulu dan grafik digambar ulang saat jendela berubah. |

## Alat bantu di Console

- `__uji()` — isi tampilan dengan data karangan tanpa login dan tanpa database
- `__uji([])` — lihat tampilan saat jurnalnya masih kosong
- `db` — klien Supabase, mis. `await db.auth.getSession()`
