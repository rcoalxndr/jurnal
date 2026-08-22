-- Skema database untuk jurnal konsumsi (nonton, baca, main).
-- Jalankan sekali di Supabase: menu SQL Editor -> New query -> tempel semua -> Run.
--
-- Dijalankan di project Supabase yang SAMA dengan aplikasi keuangan. Tabelnya
-- terpisah, tapi akun dan sistem loginnya satu -- jadi tidak perlu daftar ulang.

-- ---------------------------------------------------------------
-- 1. Tabel konsumsi
-- ---------------------------------------------------------------
create table if not exists konsumsi (
  id           uuid primary key default gen_random_uuid(),

  -- Diisi otomatis dari user yang sedang login. Ini yang membuat data tiap
  -- orang terpisah, dan jadi dasar aturan keamanan di bawah.
  user_id      uuid not null references auth.users(id) on delete cascade default auth.uid(),

  judul        text not null check (length(trim(judul)) > 0),

  jenis        text not null check (jenis in ('film', 'serial', 'buku', 'game')),

  -- Inilah bedanya dengan tabel transaksi di aplikasi keuangan. Transaksi itu
  -- peristiwa titik: dicatat sekali, tidak pernah berubah. Sebuah film atau
  -- buku punya siklus hidup, jadi barisnya memang dirancang untuk di-UPDATE.
  status       text not null check (status in ('mau', 'sedang', 'selesai', 'ditinggalkan')),

  -- Boleh kosong: banyak yang selesai tanpa ingin dinilai, dan memaksa
  -- mengisi nilai akan membuat orang berhenti mencatat.
  nilai        smallint check (nilai between 1 and 5),

  catatan      text,

  mulai_pada   date,
  selesai_pada date,

  dibuat_pada  timestamptz not null default now(),
  diubah_pada  timestamptz not null default now()
);

-- Query yang paling sering dipakai: "punyaku, status tertentu, terbaru dulu".
create index if not exists konsumsi_user_status_idx
  on konsumsi (user_id, status, diubah_pada desc);

-- Query tab Riwayat dan Tren: "punyaku, selesai di bulan tertentu".
create index if not exists konsumsi_user_selesai_idx
  on konsumsi (user_id, selesai_pada desc);

-- ---------------------------------------------------------------
-- 2. diubah_pada diurus database, bukan aplikasi
-- ---------------------------------------------------------------
-- Kalau kolom ini diisi dari JavaScript, cepat atau lambat ada satu jalur
-- update yang lupa mengisinya, dan urutan daftar jadi salah tanpa ada yang
-- sadar. Trigger membuatnya mustahil lupa.

create or replace function sentuh_diubah_pada()
returns trigger
language plpgsql
as $$
begin
  new.diubah_pada = now();
  return new;
end;
$$;

drop trigger if exists konsumsi_sentuh on konsumsi;

create trigger konsumsi_sentuh
  before update on konsumsi
  for each row
  execute function sentuh_diubah_pada();

-- ---------------------------------------------------------------
-- 3. Row Level Security -- BAGIAN PALING PENTING
-- ---------------------------------------------------------------
-- Tanpa ini, siapa pun yang tahu alamat database bisa membaca SEMUA baris
-- milik siapa pun. RLS membuat Postgres menolak baris yang bukan milik user
-- yang sedang login, di level database -- bukan di level aplikasi. Jadi walau
-- ada bug di kode JavaScript, datanya tetap tidak bisa bocor.

alter table konsumsi enable row level security;

drop policy if exists "hanya baris sendiri" on konsumsi;

create policy "hanya baris sendiri"
  on konsumsi
  for all                            -- berlaku untuk select, insert, update, delete
  using (auth.uid() = user_id)       -- baris mana yang boleh dilihat/diubah
  with check (auth.uid() = user_id); -- baris baru wajib milik sendiri
