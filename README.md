# Backend API UMKM Bengkulu 🏪

Backend API untuk platform UMKM Bengkulu, dibangun dengan **Node.js** + **Express.js**, menggunakan **Supabase (PostgreSQL)** sebagai database. Menyediakan fitur otentikasi, manajemen UMKM & produk, serta akses publik untuk melihat daftar UMKM dan produk mereka.

---

## Fitur Utama

### 🔐 Autentikasi UMKM

* **Signup**: Daftar UMKM dengan `email` dan `password`.
* **Login**: Autentikasi menggunakan **JWT** untuk akses terproteksi.

### 🛍️ Dashboard UMKM (Proteksi JWT)

* Kelola **profil UMKM**.
* **CRUD produk**: tambah, lihat, edit, hapus produk.
* **CLEAN URL**: mempercepat pemasaran, meningkatkan SEO produk, Branding. contoh url:
  `https://digivenbengkulu.vercel.app/username-toko`

### 🌐 Akses Publik (Tanpa Token)

* Lihat daftar semua UMKM yang terdaftar.
* Halaman toko per-UMKM berdasar `username-toko`, 
* **Feedback produk**: kirim & lihat komentar & rating.

---

## Integrasi Supabase

* Supabase sebagai BaaS: **PostgreSQL** + autentikasi + API instan.
* Gunakan Supabase SQL editor untuk setup skema database berikut:

```sql
-- Tabel users (autentikasi)
CREATE TABLE public.users (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  email text NOT NULL UNIQUE,
  password text NOT NULL,
  created_at timestamptz DEFAULT now()
);

-- Tabel umkms (profil UMKM)
create table public.umkms (
  id uuid not null default gen_random_uuid (),
  user_id uuid not null,
  nama_pelaku text not null,
  nama_perusahaan_umkm text not null,
  username text not null,
  nomor_whatsapp text not null,
  created_at timestamp with time zone not null default now(),
  lokasi_perusahaan_umkm text null,
  jam_operasional text null,
  foto_banner_umkm text[] null,
  foto_profil_umkm text null,
  created_at timestamptz DEFAULT now()
);

-- Tabel products (produk UMKM)
create table public.products (
  id uuid not null default gen_random_uuid (),
  umkm_id uuid not null,
  nama_produk text not null,
  deskripsi_produk text null,
  harga_produk numeric(10, 2) not null,
  gambar_url text[] null,
  created_at timestamptz DEFAULT now()
);

-- Tabel feedback (komentar & rating)
CREATE TABLE public.feedback (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  product_id uuid NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  nama_pembeli text,
  rating integer CHECK (rating BETWEEN 1 AND 5),
  komentar text,
  created_at timestamptz DEFAULT now()
);
```

---

## Prasyarat

* **Node.js** ≥ v16
* **npm**

---

## Instalasi & Setup Lokal

1. **Clone repositori**

   ```bash
   git clone https://github.com/RayanKhairullah/digiven-bengkulu-backend.git
   cd digiven-bengkulu-backend
   ```

2. **Install dependensi**

   ```bash
   npm install
   ```

3. **Setup Supabase**

   * Buat proyek di Supabase
   * Jalankan skrip SQL di atas

4. **Buat `.env`**

   ```env
   SUPABASE_URL=https://<YOUR_PROJECT_REF>.supabase.co
   SUPABASE_ANON_KEY=eyJhbGci...<YOUR_ANON_KEY>
   JWT_SECRET=super_secret_key_yang_sangat_panjang_dan_acak

   EMAIL_HOST=smtp.gmail.com
   EMAIL_PORT=587        
   EMAIL_SECURE=false   
   EMAIL_USER=email_dari_app_password
   EMAIL_PASS=16_digit_karakter_tanpa_spaso
   EMAIL_FROM="no-reply@umkmbengkulu.com"
   
   FRONTEND_URL=http://localhost:5173 #contoh
   ```

5. **Jalankan server**

   * Dev mode (auto-reload): `npm run dev`
   * Prod mode: `npm start`

6. **Testing API**

   * Import file **Postman** collection dari folder "PostmanCollection_Environtment" ke dalam **Postman** dan setup env:

     * `baseUrl`: `http://localhost:4000`
     * `jwtToken`, `umkmId`, `username`, `productId`, `testUsername` (kosong terlebih dahulu, nanti otomatis di‐isi)

---

## API Endpoints

### 1. Autentikasi (`/api/v1/auth`)
### 2. Dashboard UMKM (`/api/v1/umkm`) – **Protected**
### 3. Akses Publik (`/api/v1/public`)
   * Gunakan postman_collections dan postman environtment untuk uji coba endpoints

---

## Deployment

**Vercel**: sabar

---

## Kontribusi & Lisensi

* **Kontribusi**: rayan4k

---