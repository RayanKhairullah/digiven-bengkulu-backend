const { createClient } = require('@supabase/supabase-js');
const validator = require('validator');

// ===========================================
// INISIALISASI SUPABASE
// ===========================================
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
    console.error("Error: SUPABASE_URL or SUPABASE_ANON_KEY is not defined.");
    // Dalam produksi, lebih baik menghentikan proses
    // process.exit(1);
}
const supabase = createClient(supabaseUrl, supabaseAnonKey);

/**
 * Controller untuk mendapatkan semua daftar UMKM (untuk Landing Page).
 * Mengambil nama perusahaan dan username saja.
 */
exports.getAllUmkms = async (req, res) => {
    try {
        // Mengambil semua detail UMKM termasuk kolom baru
        const { data: umkms, error } = await supabase
            .from('umkms')
            .select('id, nama_perusahaan_umkm, username, nomor_whatsapp, nama_pelaku, foto_profil_umkm, lokasi_perusahaan_umkm, jam_operasional')
            .order('created_at', { ascending: false });

        if (error) {
            console.error('Supabase error saat get all UMKM:', error);
            return res.status(500).json({ error: 'Gagal mengambil daftar UMKM.' });
        }

        res.status(200).json({ umkms });
    } catch (error) {
        console.error('Kesalahan server saat get all UMKM:', error);
        res.status(500).json({ error: 'Kesalahan server internal.' });
    }
};

/**
 * Controller untuk mendapatkan detail UMKM dan daftar produknya berdasarkan username.
 * Ini adalah halaman toko unik untuk setiap UMKM.
 */
exports.getUmkmStoreByUsername = async (req, res) => {
    const umkmUsername = req.params.username;

    // --- Validasi Input ---
    // Username UMKM diharapkan hanya berisi alfanumerik dan hyphen
    if (!umkmUsername || !validator.isAlphanumeric(umkmUsername.replace(/-/g, ''), 'en-US')) {
        return res.status(400).json({ error: 'Username UMKM tidak valid.' });
    }
    // --- Akhir Validasi Input ---

    try {
        // 1. Ambil detail UMKM berdasarkan username (termasuk kolom baru)
        const { data: umkmProfile, error: umkmError } = await supabase
            .from('umkms')
            .select(`
                *,
                lokasi_perusahaan_umkm,
                jam_operasional,
                foto_banner_umkm,
                foto_profil_umkm
            `)
            .eq('username', umkmUsername)
            .single();

        if (umkmError && umkmError.code === 'PGRST116') {
            return res.status(404).json({ error: 'Toko UMKM tidak ditemukan.' });
        }
        if (umkmError) {
            console.error('Supabase error saat get UMKM by username:', umkmError);
            return res.status(500).json({ error: 'Kesalahan database saat mengambil profil UMKM.' });
        }

        // 2. Ambil produk-produk UMKM ini
        const { data: products, error: productsError } = await supabase
            .from('products')
            .select(`
                *,
                feedback (
                    rating
                )
            `)
            .eq('umkm_id', umkmProfile.id)
            .order('created_at', { ascending: false });

        if (productsError) {
            console.error('Supabase error saat get products by UMKM:', productsError);
            // Tetap kembalikan profil UMKM meskipun produk tidak ditemukan/ada error
            return res.status(200).json({ umkm: umkmProfile, products: [] });
        }

        // Hitung rata-rata rating untuk setiap produk
        const productsWithAverageRating = products.map(product => {
            const ratings = product.feedback.map(f => f.rating);
            const averageRating = ratings.length > 0
                ? (ratings.reduce((sum, r) => sum + r, 0) / ratings.length).toFixed(1)
                : 0; // Default 0 jika tidak ada feedback
            return {
                ...product,
                average_rating: parseFloat(averageRating),
                feedback: undefined // Hapus array feedback mentah jika tidak diperlukan di sini
            };
        });

        res.status(200).json({
            umkm: umkmProfile,
            products: productsWithAverageRating
        });

    } catch (error) {
        console.error('Kesalahan server saat get UMKM profile & products:', error);
        res.status(500).json({ error: 'Kesalahan server internal.' });
    }
};

/**
 * Controller untuk mengirimkan feedback produk.
 */
exports.submitProductFeedback = async (req, res) => {
    const productId = req.params.productId;
    let { nama_pembeli, rating, komentar } = req.body;

    // --- Validasi Input ---
    if (!productId || !rating || !nama_pembeli) {
        return res.status(400).json({
            error: 'ID Produk, nama pembeli, dan rating wajib diisi.'
        });
    }
    // Validasi ID Produk harus berupa UUID
    if (!validator.isUUID(productId, 4)) {
        return res.status(400).json({ error: 'ID Produk tidak valid.' });
    }
    // Validasi rating harus berupa angka integer antara 1–5
    if (!validator.isInt(String(rating), { min: 1, max: 5 })) {
        return res.status(400).json({
            error: 'Rating harus berupa angka integer antara 1 dan 5.'
        });
    }
    // Validasi panjang nama pembeli
    if (!validator.isLength(nama_pembeli.trim(), { min: 2, max: 50 })) {
        return res.status(400).json({
            error: 'Nama pembeli harus antara 2 hingga 50 karakter.'
        });
    }
    // Validasi panjang komentar (jika ada)
    if (komentar && !validator.isLength(komentar.trim(), { min: 0, max: 500 })) {
        return res.status(400).json({
            error: 'Komentar tidak boleh lebih dari 500 karakter.'
        });
    }
    // --- Akhir Validasi Input ---

    // Sanitasi input (XSS prevention)
    nama_pembeli = validator.escape(nama_pembeli.trim());
    if (komentar) {
        komentar = validator.escape(komentar.trim());
    }

    try {
        // Cek apakah produk ada
        const { data: productExists, error: productCheckError } = await supabase
            .from('products')
            .select('id')
            .eq('id', productId)
            .single();

        if (productCheckError && productCheckError.code === 'PGRST116') {
            return res.status(404).json({ error: 'Produk tidak ditemukan.' });
        }
        if (productCheckError) {
            console.error('Supabase error saat cek produk untuk feedback:', productCheckError);
            return res.status(500).json({
                error: 'Kesalahan database saat memverifikasi produk.'
            });
        }

        // Simpan feedback
        const { data: feedbackData, error: insertError } = await supabase
            .from('feedback')
            .insert({
                product_id: productId,
                nama_pembeli,
                rating: parseInt(rating), // Pastikan rating disimpan sebagai integer
                komentar
            })
            .select('*')
            .single();

        if (insertError) {
            console.error('Supabase error saat insert feedback:', insertError);
            return res.status(500).json({
                error: 'Gagal mengirimkan feedback ke database.'
            });
        }

        // Sukses
        return res.status(201).json({
            message: 'Feedback berhasil dikirim!',
            feedback: feedbackData
        });
    } catch (err) {
        console.error('Kesalahan server saat kirim feedback:', err);
        return res.status(500).json({
            error: 'Terjadi kesalahan server.'
        });
    }
};

/**
 * Controller untuk mendapatkan feedback untuk produk tertentu.
 */
exports.getProductFeedback = async (req, res) => {
    const productId = req.params.productId;

    // --- Validasi Input ---
    if (!productId || !validator.isUUID(productId, 4)) {
        return res.status(400).json({ error: 'ID Produk tidak valid.' });
    }
    // --- Akhir Validasi Input ---

    try {
        const { data: feedback, error } = await supabase
            .from('feedback')
            .select('*')
            .eq('product_id', productId)
            .order('created_at', { ascending: false });

        if (error) {
            console.error('Supabase error saat get feedback:', error);
            return res.status(500).json({ error: 'Gagal mengambil feedback.' });
        }

        res.status(200).json({ feedback });
    } catch (error) {
        console.error('Kesalahan server saat get feedback:', error);
        res.status(500).json({ error: 'Kesalahan server internal.' });
    }
};

/**
 * Controller untuk mendapatkan semua produk dari semua UMKM.
 * Sekarang hanya mengambil data produk esensial untuk daftar umum.
 */
exports.getAllProducts = async (req, res) => {
    try {
        const { data: products, error } = await supabase
            .from('products')
            .select(`
                id,
                nama_produk,
                deskripsi_produk,
                harga_produk,
                gambar_url,
                created_at,
                umkms (
                    nama_perusahaan_umkm,
                    username,
                    foto_profil_umkm
                ),
                feedback (
                    rating
                )
            `)
            .order('created_at', { ascending: false }); // Urutkan dari yang terbaru

        if (error) {
            console.error('Supabase error saat get all products:', error);
            return res.status(500).json({ error: 'Gagal mengambil daftar semua produk.' });
        }

        // Jika tidak ada produk, kembalikan array kosong
        if (!products) {
            return res.status(200).json({ products: [] });
        }

        // Hitung rata-rata rating untuk setiap produk di daftar publik
        const productsWithAverageRating = products.map(product => {
            const ratings = product.feedback.map(f => f.rating);
            const averageRating = ratings.length > 0
                ? (ratings.reduce((sum, r) => sum + r, 0) / ratings.length).toFixed(1)
                : 0;
            return {
                ...product,
                average_rating: parseFloat(averageRating),
                feedback: undefined // Hapus array feedback mentah
            };
        });

        res.status(200).json({ products: productsWithAverageRating });

    } catch (error) {
        console.error('Kesalahan server saat get all products:', error);
        res.status(500).json({ error: 'Kesalahan server internal.' });
    }
};

/**
 * Controller untuk mendapatkan detail satu produk berdasarkan ID.
 * Termasuk detail UMKM pemilik dan daftar feedback.
 */
exports.getSingleProductDetail = async (req, res) => {
    const productId = req.params.productId;

    // --- Validasi Input ---
    if (!productId || !validator.isUUID(productId, 4)) {
        return res.status(400).json({ error: 'ID Produk tidak valid.' });
    }
    // --- Akhir Validasi Input ---

    try {
        // 1. Ambil detail produk berdasarkan ID, join dengan UMKM dan feedback
        const { data: product, error: productError } = await supabase
            .from('products')
            .select(`
                *,
                umkms (
                    id,
                    nama_perusahaan_umkm,
                    username,
                    nomor_whatsapp,
                    nama_pelaku,
                    foto_profil_umkm,
                    lokasi_perusahaan_umkm,
                    jam_operasional
                ),
                feedback (
                    rating,
                    nama_pembeli,
                    komentar,
                    created_at
                )
            `)
            .eq('id', productId)
            .single();

        if (productError && productError.code === 'PGRST116') {
            return res.status(404).json({ error: 'Produk tidak ditemukan.' });
        }
        if (productError) {
            console.error('Supabase error saat get single product:', productError);
            return res.status(500).json({ error: 'Kesalahan database saat mengambil detail produk.' });
        }

        // Hitung rata-rata rating dari feedback
        const ratings = product.feedback.map(f => f.rating);
        const averageRating = ratings.length > 0
            ? (ratings.reduce((sum, r) => sum + r, 0) / ratings.length).toFixed(1)
            : 0; // Default 0 jika tidak ada feedback

        // Siapkan respons dengan rata-rata rating
        const responseProduct = {
            id: product.id,
            nama_produk: product.nama_produk,
            deskripsi_produk: product.deskripsi_produk,
            harga_produk: product.harga_produk,
            gambar_url: product.gambar_url,
            created_at: product.created_at,
            umkm: {
                id: product.umkms.id,
                nama_perusahaan_umkm: product.umkms.nama_perusahaan_umkm,
                username: product.umkms.username,
                nomor_whatsapp: product.umkms.nomor_whatsapp,
                nama_pelaku: product.umkms.nama_pelaku,
                lokasi_perusahaan_umkm: product.umkms.lokasi_perusahaan_umkm,
                jam_operasional: product.umkms.jam_operasional,
                foto_profil_umkm: product.umkms.foto_profil_umkm,
            },
            average_rating: parseFloat(averageRating),
            feedback: product.feedback // Feedback lengkap
        };

        res.status(200).json({ product: responseProduct });

    } catch (error) {
        console.error('Kesalahan server saat get single product detail:', error);
        res.status(500).json({ error: 'Kesalahan server internal.' });
    }
};

/**
 * Controller untuk menghapus feedback produk (public).
 * Hanya bisa menghapus feedback berdasarkan ID (tanpa autentikasi).
 */
exports.deleteProductFeedback = async (req, res) => {
    const feedbackId = req.params.feedbackId;

    if (!feedbackId) {
        return res.status(400).json({ error: 'ID feedback wajib disediakan.' });
    }

    try {
        // Cek apakah feedback ada
        const { data: feedback, error: findError } = await supabase
            .from('feedback')
            .select('id')
            .eq('id', feedbackId)
            .single();

        if (findError && findError.code === 'PGRST116') {
            return res.status(404).json({ error: 'Feedback tidak ditemukan.' });
        }
        if (findError) {
            console.error('Supabase error saat cek feedback:', findError);
            return res.status(500).json({ error: 'Gagal menghapus feedback.' });
        }

        // Hapus feedback
        const { error: deleteError } = await supabase
            .from('feedback')
            .delete()
            .eq('id', feedbackId);

        if (deleteError) {
            console.error('Supabase error saat delete feedback:', deleteError);
            return res.status(500).json({ error: 'Gagal menghapus feedback.' });
        }

        res.status(200).json({ message: 'Feedback berhasil dihapus.' });
    } catch (error) {
        console.error('Kesalahan server saat delete feedback:', error);
        res.status(500).json({ error: 'Kesalahan server internal.' });
    }
};