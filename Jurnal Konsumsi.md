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

## Gerbang sebelum menambah fitur

Setelah **3 minggu**: kalau entri yang tercatat **kurang dari 8**, berhenti. Jangan tambah fitur, jangan tambah API judul otomatis, jangan tambah jenis baru. Angka di bawah itu artinya kebiasaan mencatatnya tidak terbentuk, dan fitur baru tidak akan memperbaikinya.

## Belum ada, sengaja

Ambil judul otomatis dari API · sampul/poster · jumlah episode atau halaman · jam main · ekspor · rekap tahunan.

## Ide lain dari sesi yang sama yang TIDAK dipilih

- **Adobe Stock sebagai sumber penghasilan** — royalti per unduhan sangat kecil, butuh ribuan aset, dan pasarnya kebanjiran suplai sejak generative AI. Bukan "cari duit", melainkan bisnis konten volume tinggi bermargin tipis.
- **Ringkasan berita tiap 4 jam dikirim PDF ke WA/email** — ditaruh di urutan terakhir oleh Rico sendiri. 6 PDF sehari berarti inbox yang tidak pernah dikosongkan; PDF lebih susah dibaca di HP daripada teks; kirim otomatis butuh WhatsApp Business API berbayar; dan butuh server terjadwal + kunci rahasia yang tidak boleh masuk repo publik. Pola yang sama dengan proyek Sheets + Apps Script + Telegram yang dulu dihapus. **Janji ke diri sendiri di portofolio belum ditepati: coba manual seminggu dulu.** Kalau nanti dibangun, bentuk pertamanya satu halaman web sekali sehari, bukan PDF tiap 4 jam.
- **Simulator IPK, Jadwal Kuliah → .ics, Pelacak Waktu** — butuh perilaku baru lebih dulu.
- **Pelacak deadline kuliah** — kalah dari Apple Reminders di hari pertama: notifikasi native, Siri, widget. Web app di iPhone tidak bisa menandingi itu.
