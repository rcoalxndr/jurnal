/* Alamat dan kunci publik Supabase.
 *
 * Kedua nilai ini AMAN berada di repo publik. Kunci "anon" memang dirancang
 * untuk dikirim ke browser -- keamanannya tidak bergantung pada kerahasiaan
 * kunci ini, melainkan pada Row Level Security di database (lihat schema.sql).
 *
 * Yang TIDAK BOLEH masuk file ini: service_role key, password database.
 * Keduanya bisa menembus semua aturan keamanan.
 */

export const SUPABASE_URL = "https://ufxnmmsduqyffjvaycrw.supabase.co";
export const SUPABASE_ANON_KEY = "sb_publishable_15Dzww0gzWr9oRohg-l2jw_xHILnks3";
