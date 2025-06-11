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
CREATE TABLE public.umkms (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL UNIQUE REFERENCES public.users(id) ON DELETE CASCADE,
  nama_pelaku text NOT NULL,
  nama_perusahaan_umkm text NOT NULL,
  username text NOT NULL UNIQUE,
  nomor_whatsapp text NOT NULL,
  created_at timestamptz DEFAULT now()
);

-- Tabel products (produk UMKM)
CREATE TABLE public.products (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  umkm_id uuid NOT NULL REFERENCES public.umkms(id) ON DELETE CASCADE,
  nama_produk text NOT NULL,
  deskripsi_produk text,
  harga_produk numeric(10,2) NOT NULL,
  gambar_url text,
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
   ```

5. **Jalankan server**

   * Dev mode (auto-reload): `npm run dev`
   * Prod mode: `npm start`

6. **Testing API**

   * Import file **Postman** collection dari folder "PostmanCollection_Environtment" ke dalam **Postman** dan setup env:

     * `baseUrl`: `http://localhost:3000`
     * `jwtToken`, `umkmId`, `username`, `productId`, `testUsername` (kosong terlebih dahulu, nanti otomatis di‐isi)

---

## API Endpoints

### 1. Autentikasi (`/api/v1/auth`)

* `POST /register`:

  ```json
  {
    "email": "nama@email.com",
    "password": "password123",
    "nama_pelaku": "Nama Pelaku",
    "nama_perusahaan_umkm": "Nama Perusahaan",
    "nomor_whatsapp": "6281234567890"
  }
  ```
* `POST /login`:

  ```json
  {
    "email": "nama@email.com",
    "password": "password123"
  }
  ```

---

### 2. Dashboard UMKM (`/api/v1/umkm`) – **Protected**

* **Header**: `Authorization: Bearer <JWT>`
* `GET /profile` – Profil UMKM saat login.
* `POST /products` – Tambah produk:

  ```json
  {
    "nama_produk": "Produk Baru",
    "deskripsi_produk": "Deskripsi lengkap",
    "harga_produk": 25000,
    "gambar_url": "https://..."
  }
  ```
* `GET /products` – Daftar produk UMKM.
* `PUT /products/:id` – Edit produk:

  ```json
  {
    "nama_produk": "Nama Baru",
    "harga_produk": 30000
  }
  ```
* `DELETE /products/:id` – Hapus produk.

---

### 3. Akses Publik (`/api/v1/public`)

* `GET /umkms` – Daftar semua UMKM.
* `GET /umkms/:username` – Profil + produk UMKM.
* `POST /feedback/:productId`:

  ```json
  {
    "nama_pembeli": "Pengguna A",
    "rating": 5,
    "komentar": "Produk ini luar biasa!"
  }
  ```
* `GET /feedback/:productId` – Daftar feedback produk.

---

## Deployment

**Vercel**: sabar

---

## Kontribusi & Lisensi

* **Kontribusi**: rayan4k

---