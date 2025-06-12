const { createClient } = require('@supabase/supabase-js');
const bcrypt = require('bcryptjs'); // Impor bcryptjs untuk hashing password

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

// Middleware/cek internal untuk verifikasi email
const checkEmailVerified = (req, res, next) => {
    if (!req.user || !req.user.is_verified) {
        return res.status(403).json({ error: 'Akses Ditolak: Email Anda belum diverifikasi. Mohon verifikasi email Anda terlebih dahulu.' });
    }
    next();
};

/**
 * Controller untuk mendapatkan profil UMKM yang sedang login.
 */
exports.getUmkmProfile = [checkEmailVerified, async (req, res) => { // Gunakan cekEmailVerified di sini
    try {
        const { umkmId } = req.user;

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
}];

/**
 * Controller untuk menambah produk baru.
 */
exports.addProduct = [checkEmailVerified, async (req, res) => { // Gunakan cekEmailVerified di sini
    const { nama_produk, deskripsi_produk, harga_produk, gambar_url } = req.body;
    const { umkmId } = req.user;

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
}];

/**
 * Controller untuk mendapatkan daftar produk UMKM yang sedang login.
 */
exports.getUmkmProducts = [checkEmailVerified, async (req, res) => { // Gunakan cekEmailVerified di sini
    try {
        const { umkmId } = req.user;

        const { data: products, error } = await supabase
            .from('products')
            .select('*')
            .eq('umkm_id', umkmId)
            .order('created_at', { ascending: false });

        if (error) {
            console.error('Supabase error saat get produk UMKM:', error);
            return res.status(500).json({ error: 'Gagal mengambil daftar produk.' });
        }

        res.status(200).json({ products });
    } catch (error) {
        console.error('Kesalahan server saat get produk UMKM:', error);
        res.status(500).json({ error: 'Kesalahan server internal.' });
    }
}];

/**
 * Controller untuk mengedit produk.
 */
exports.updateProduct = [checkEmailVerified, async (req, res) => { // Gunakan cekEmailVerified di sini
    const productId = req.params.id;
    const { umkmId } = req.user;
    const updates = req.body;

    try {
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
}];

/**
 * Controller untuk menghapus produk.
 */
exports.deleteProduct = [checkEmailVerified, async (req, res) => { // Gunakan cekEmailVerified di sini
    const productId = req.params.id;
    const { umkmId } = req.user;

    try {
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
}];


/**
 * Controller untuk memperbarui kata sandi user yang sedang login.
 */
exports.updatePassword = async (req, res) => {
    const { currentPassword, newPassword } = req.body;
    const { userId } = req.user; // userId dari payload token JWT

    if (!currentPassword || !newPassword) {
        return res.status(400).json({ error: 'Kata sandi saat ini dan kata sandi baru wajib diisi.' });
    }

    try {
        // 1. Ambil user dari database
        const { data: user, error: findUserError } = await supabase
            .from('users')
            .select('password')
            .eq('id', userId)
            .single();

        if (findUserError && findUserError.code === 'PGRST116') { // Seharusnya tidak terjadi karena sudah diautentikasi
            return res.status(404).json({ error: 'User tidak ditemukan.' });
        }
        if (findUserError) {
            console.error('Supabase error saat update password (find user):', findUserError);
            return res.status(500).json({ error: 'Kesalahan database.' });
        }

        // 2. Bandingkan kata sandi saat ini
        const isMatch = await bcrypt.compare(currentPassword, user.password);
        if (!isMatch) {
            return res.status(401).json({ error: 'Kata sandi saat ini salah.' });
        }

        // 3. Hash kata sandi baru
        const hashedNewPassword = await bcrypt.hash(newPassword, 10);

        // 4. Perbarui kata sandi di database
        const { error: updateError } = await supabase
            .from('users')
            .update({ password: hashedNewPassword })
            .eq('id', userId);

        if (updateError) {
            console.error('Supabase error saat update password (update user):', updateError);
            return res.status(500).json({ error: 'Gagal memperbarui kata sandi.' });
        }

        res.status(200).json({ message: 'Kata sandi berhasil diperbarui.' });

    } catch (error) {
        console.error('Kesalahan server saat update password:', error);
        res.status(500).json({ error: 'Kesalahan server internal.' });
    }
};
