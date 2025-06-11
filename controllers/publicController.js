const { createClient } = require('@supabase/supabase-js');

// ===========================================
// INISIALISASI SUPABASE
// ===========================================
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
    console.error("Error: SUPABASE_URL or SUPABASE_ANON_KEY is not defined.");
    // process.exit(1);
}
const supabase = createClient(supabaseUrl, supabaseAnonKey);

/**
 * Controller untuk mendapatkan semua daftar UMKM (untuk Landing Page).
 * Mengambil nama perusahaan dan username saja.
 */
exports.getAllUmkms = async (req, res) => {
    try {
        const { data: umkms, error } = await supabase
            .from('umkms')
            .select('id, nama_perusahaan_umkm, username')
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

    try {
        // 1. Ambil detail UMKM berdasarkan username
        const { data: umkmProfile, error: umkmError } = await supabase
            .from('umkms')
            .select('*') // Ambil semua detail UMKM
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
            .select('*')
            .eq('umkm_id', umkmProfile.id)
            .order('created_at', { ascending: false });

        if (productsError) {
            console.error('Supabase error saat get products by UMKM:', productsError);
            // Tetap kembalikan profil UMKM meskipun produk tidak ditemukan/ada error
            return res.status(200).json({ umkm: umkmProfile, products: [] });
        }

        res.status(200).json({
            umkm: umkmProfile,
            products: products
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
    const { nama_pembeli, rating, komentar } = req.body;

    if (!productId || !rating || !nama_pembeli) {
        return res.status(400).json({ error: 'ID Produk, nama pembeli, dan rating wajib diisi.' });
    }
    if (rating < 1 || rating > 5) {
        return res.status(400).json({ error: 'Rating harus antara 1 dan 5.' });
    }

    try {
        // Opsional: Cek apakah produk dengan productId ini ada
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
            return res.status(500).json({ error: 'Kesalahan database saat memverifikasi produk untuk feedback.' });
        }

        const { data, error } = await supabase
            .from('feedback')
            .insert({
                product_id: productId,
                nama_pembeli,
                rating,
                komentar
            })
            .select('*')
            .single();

        if (error) {
            console.error('Supabase error saat insert feedback:', error);
            return res.status(500).json({ error: 'Gagal mengirimkan feedback.' });
        }

        res.status(201).json({ message: 'Feedback berhasil dikirim!', feedback: data });
    } catch (error) {
        console.error('Kesalahan server saat kirim feedback:', error);
        res.status(500).json({ error: 'Kesalahan server internal.' });
    }
};

/**
 * Controller untuk mendapatkan feedback untuk produk tertentu.
 */
exports.getProductFeedback = async (req, res) => {
    const productId = req.params.productId;

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
