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
 * Controller untuk mendapatkan profil UMKM yang sedang login.
 */
exports.getUmkmProfile = async (req, res) => {
    try {
        const { umkmId } = req.user; // umkmId dari payload token JWT

        const { data: umkm, error } = await supabase
            .from('umkms')
            .select('*')
            .eq('id', umkmId)
            .single();

        if (error && error.code === 'PGRST116') {
            return res.status(404).json({ error: 'Profil UMKM tidak ditemukan.' });
        }
        if (error) {
            console.error('Supabase error saat get UMKM profile:', error);
            return res.status(500).json({ error: 'Kesalahan database saat mengambil profil UMKM.' });
        }

        res.status(200).json({ umkm });
    } catch (error) {
        console.error('Kesalahan server saat get UMKM profile:', error);
        res.status(500).json({ error: 'Kesalahan server internal.' });
    }
};

/**
 * Controller untuk menambah produk baru.
 */
exports.addProduct = async (req, res) => {
    const { nama_produk, deskripsi_produk, harga_produk, gambar_url } = req.body;
    const { umkmId } = req.user; // umkmId dari payload token JWT

    if (!nama_produk || !harga_produk) {
        return res.status(400).json({ error: 'Nama produk dan harga wajib diisi.' });
    }

    try {
        const { data, error } = await supabase
            .from('products')
            .insert({
                umkm_id: umkmId,
                nama_produk,
                deskripsi_produk,
                harga_produk,
                gambar_url
            })
            .select('*')
            .single();

        if (error) {
            console.error('Supabase error saat tambah produk:', error);
            return res.status(500).json({ error: 'Gagal menambahkan produk.' });
        }

        res.status(201).json({ message: 'Produk berhasil ditambahkan!', product: data });
    } catch (error) {
        console.error('Kesalahan server saat tambah produk:', error);
        res.status(500).json({ error: 'Kesalahan server internal.' });
    }
};

/**
 * Controller untuk mendapatkan daftar produk UMKM yang sedang login.
 */
exports.getUmkmProducts = async (req, res) => {
    try {
        const { umkmId } = req.user; // umkmId dari payload token JWT

        const { data: products, error } = await supabase
            .from('products')
            .select('*')
            .eq('umkm_id', umkmId)
            .order('created_at', { ascending: false }); // Urutkan dari yang terbaru

        if (error) {
            console.error('Supabase error saat get produk UMKM:', error);
            return res.status(500).json({ error: 'Gagal mengambil daftar produk.' });
        }

        res.status(200).json({ products });
    } catch (error) {
        console.error('Kesalahan server saat get produk UMKM:', error);
        res.status(500).json({ error: 'Kesalahan server internal.' });
    }
};

/**
 * Controller untuk mengedit produk.
 */
exports.updateProduct = async (req, res) => {
    const productId = req.params.id;
    const { umkmId } = req.user; // umkmId dari payload token JWT
    const updates = req.body; // Data update produk

    try {
        // Pastikan UMKM yang sedang login adalah pemilik produk ini
        const { data: existingProduct, error: productCheckError } = await supabase
            .from('products')
            .select('umkm_id')
            .eq('id', productId)
            .single();

        if (productCheckError && productCheckError.code === 'PGRST116') {
            return res.status(404).json({ error: 'Produk tidak ditemukan.' });
        }
        if (productCheckError) {
            console.error('Supabase error saat cek produk untuk update:', productCheckError);
            return res.status(500).json({ error: 'Kesalahan database saat memverifikasi produk.' });
        }

        if (existingProduct.umkm_id !== umkmId) {
            return res.status(403).json({ error: 'Anda tidak memiliki izin untuk mengedit produk ini.' });
        }

        const { data, error } = await supabase
            .from('products')
            .update(updates)
            .eq('id', productId)
            .select('*')
            .single();

        if (error) {
            console.error('Supabase error saat update produk:', error);
            return res.status(500).json({ error: 'Gagal mengupdate produk.' });
        }

        res.status(200).json({ message: 'Produk berhasil diupdate!', product: data });
    } catch (error) {
        console.error('Kesalahan server saat update produk:', error);
        res.status(500).json({ error: 'Kesalahan server internal.' });
    }
};

/**
 * Controller untuk menghapus produk.
 */
exports.deleteProduct = async (req, res) => {
    const productId = req.params.id;
    const { umkmId } = req.user; // umkmId dari payload token JWT

    try {
        // Pastikan UMKM yang sedang login adalah pemilik produk ini
        const { data: existingProduct, error: productCheckError } = await supabase
            .from('products')
            .select('umkm_id')
            .eq('id', productId)
            .single();

        if (productCheckError && productCheckError.code === 'PGRST116') {
            return res.status(404).json({ error: 'Produk tidak ditemukan.' });
        }
        if (productCheckError) {
            console.error('Supabase error saat cek produk untuk delete:', productCheckError);
            return res.status(500).json({ error: 'Kesalahan database saat memverifikasi produk.' });
        }

        if (existingProduct.umkm_id !== umkmId) {
            return res.status(403).json({ error: 'Anda tidak memiliki izin untuk menghapus produk ini.' });
        }

        const { error } = await supabase
            .from('products')
            .delete()
            .eq('id', productId);

        if (error) {
            console.error('Supabase error saat delete produk:', error);
            return res.status(500).json({ error: 'Gagal menghapus produk.' });
        }

        res.status(200).json({ message: 'Produk berhasil dihapus!' });
    } catch (error) {
        console.error('Kesalahan server saat delete produk:', error);
        res.status(500).json({ error: 'Kesalahan server internal.' });
    }
};
