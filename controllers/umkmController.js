const { createClient } = require('@supabase/supabase-js');
const bcrypt = require('bcryptjs');
const validator = require('validator');

// ===========================================
// INISIALISASI SUPABASE
// ===========================================
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY;
// const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
    console.error("Error: SUPABASE_URL or SUPABASE_ANON_KEY is not defined.");
    // Dalam produksi, lebih baik menghentikan proses
    // process.exit(1);
}
const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Middleware/cek internal untuk verifikasi email
const checkEmailVerified = (req, res, next) => {
    // req.user dilampirkan oleh authenticateToken middleware
    if (!req.user || !req.user.is_verified) {
        return res.status(403).json({ error: 'Akses Ditolak: Email Anda belum diverifikasi. Mohon verifikasi email Anda terlebih dahulu.' });
    }
    next();
};

/**
 * Controller untuk mendapatkan profil UMKM yang sedang login.
 */
exports.getUmkmProfile = [checkEmailVerified, async (req, res) => {
    try {
        const { umkmId } = req.user; // umkmId dari payload token JWT

        const { data: umkm, error } = await supabase
            .from('umkms')
            .select(`
                id,
                user_id,
                nama_pelaku,
                nama_perusahaan_umkm,
                username,
                nomor_whatsapp,
                created_at,
                lokasi_perusahaan_umkm,
                jam_operasional,
                foto_banner_umkm,
                foto_profil_umkm
            `)
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
 * Controller untuk mengupdate profil UMKM.
 */
exports.updateUmkmProfile = [checkEmailVerified, async (req, res) => {
    const { umkmId } = req.user;
    const { nama_pelaku, nama_perusahaan_umkm, nomor_whatsapp, lokasi_perusahaan_umkm, jam_operasional, foto_banner_umkm, foto_profil_umkm } = req.body;

    try {
        const updateData = {};

        if (nama_pelaku !== undefined) {
            if (!validator.isLength(nama_pelaku.trim(), { min: 3, max: 100 })) {
                return res.status(400).json({ error: 'Nama pelaku harus antara 3 hingga 100 karakter.' });
            }
            updateData.nama_pelaku = nama_pelaku.trim();
        }
        if (nama_perusahaan_umkm !== undefined) {
            if (!validator.isLength(nama_perusahaan_umkm.trim(), { min: 3, max: 150 })) {
                return res.status(400).json({ error: 'Nama perusahaan UMKM harus antara 3 hingga 150 karakter.' });
            }
            updateData.nama_perusahaan_umkm = nama_perusahaan_umkm.trim();
        }
        if (nomor_whatsapp !== undefined) {
            // Asumsi nomor_whatsapp adalah string angka. Gunakan 'id-ID' untuk validasi nomor telepon Indonesia
            if (!validator.isMobilePhone(nomor_whatsapp.replace(/\s/g, ''), 'id-ID') && !validator.isNumeric(nomor_whatsapp.replace(/\s/g, ''))) {
                 return res.status(400).json({ error: 'Nomor WhatsApp tidak valid.' });
            }
            updateData.nomor_whatsapp = nomor_whatsapp.replace(/\s/g, ''); // Hapus spasi jika ada
        }
        if (lokasi_perusahaan_umkm !== undefined) {
            if (!validator.isLength(lokasi_perusahaan_umkm.trim(), { min: 0, max: 255 })) { // Opsional, sesuaikan panjang
                return res.status(400).json({ error: 'Lokasi perusahaan UMKM tidak boleh lebih dari 255 karakter.' });
            }
            updateData.lokasi_perusahaan_umkm = lokasi_perusahaan_umkm.trim();
        }
        if (jam_operasional !== undefined) {
             if (!validator.isLength(jam_operasional.trim(), { min: 0, max: 255 })) { // Contoh: "08:00 - 17:00"
                return res.status(400).json({ error: 'Jam operasional tidak boleh lebih dari 255 karakter.' });
            }
            updateData.jam_operasional = jam_operasional.trim();
        }

        // Catatan: Untuk upload file (gambar), disarankan menggunakan Multer dan Supabase Storage.
        // Saat ini, diasumsikan Anda mengirim URL gambar.
        if (foto_banner_umkm !== undefined) {
            if (!Array.isArray(foto_banner_umkm) || foto_banner_umkm.some(url => !validator.isURL(url, { require_protocol: true }))) {
                return res.status(400).json({ error: 'Foto banner UMKM harus berupa array URL yang valid.' });
            }
            updateData.foto_banner_umkm = foto_banner_umkm;
        }
        if (foto_profil_umkm !== undefined) {
            if (!validator.isURL(foto_profil_umkm, { require_protocol: true })) {
                return res.status(400).json({ error: 'Foto profil UMKM harus berupa URL yang valid.' });
            }
            updateData.foto_profil_umkm = foto_profil_umkm;
        }

        if (Object.keys(updateData).length === 0) {
            return res.status(400).json({ error: 'Tidak ada data yang disediakan untuk diperbarui.' });
        }

        const { data: updatedUmkm, error } = await supabase
            .from('umkms')
            .update(updateData)
            .eq('id', umkmId)
            .select('*')
            .single();

        if (error) {
            console.error('Supabase error saat update UMKM profile:', error);
            return res.status(500).json({ error: 'Gagal memperbarui profil UMKM.' });
        }

        res.status(200).json({ message: 'Profil UMKM berhasil diperbarui!', umkm: updatedUmkm });
    } catch (error) {
        console.error('Kesalahan server saat update UMKM profile:', error);
        res.status(500).json({ error: 'Kesalahan server internal.' });
    }
}];

/**
 * Controller untuk menambahkan produk baru oleh UMKM.
 */
exports.addProduct = [checkEmailVerified, async (req, res) => {
    const { nama_produk, deskripsi_produk, harga_produk, gambar_url } = req.body; // gambar_url diharapkan array URL

    // --- Validasi Input ---
    if (!nama_produk || !deskripsi_produk || !harga_produk || !gambar_url) {
        return res.status(400).json({ error: 'Nama, deskripsi, harga produk, dan URL gambar wajib diisi.' });
    }
    if (!validator.isLength(nama_produk.trim(), { min: 3, max: 200 })) {
        return res.status(400).json({ error: 'Nama produk harus antara 3 hingga 200 karakter.' });
    }
    if (!validator.isLength(deskripsi_produk.trim(), { min: 10, max: 1000 })) {
        return res.status(400).json({ error: 'Deskripsi produk harus antara 10 hingga 1000 karakter.' });
    }
    if (!validator.isFloat(String(harga_produk), { min: 0 })) { // Pastikan harga adalah angka positif
        return res.status(400).json({ error: 'Harga produk harus berupa angka positif.' });
    }
    // Pastikan gambar_url adalah array dan setiap elemen adalah URL valid
    if (!Array.isArray(gambar_url) || gambar_url.length === 0 || gambar_url.some(url => !validator.isURL(url, { require_protocol: true }))) {
        return res.status(400).json({ error: 'Gambar produk harus berupa array URL yang valid (minimal satu URL).' });
    }
    // --- Akhir Validasi Input ---

    const productImages = Array.isArray(gambar_url) ? gambar_url : [gambar_url]; // Redundant karena sudah divalidasi sebagai array

    try {
        const { umkmId } = req.user;

        const { data: newProduct, error } = await supabase
            .from('products')
            .insert({
                umkm_id: umkmId,
                nama_produk: nama_produk.trim(),
                deskripsi_produk: deskripsi_produk.trim(),
                harga_produk: parseFloat(harga_produk), // Pastikan disimpan sebagai float
                gambar_url: productImages
            })
            .select('*')
            .single();

        if (error) {
            console.error('Supabase error saat add product:', error);
            return res.status(500).json({ error: 'Gagal menambahkan produk.' });
        }

        res.status(201).json({ message: 'Produk berhasil ditambahkan!', product: newProduct });
    } catch (error) {
        console.error('Kesalahan server saat add product:', error);
        res.status(500).json({ error: 'Kesalahan server internal.' });
    }
}];

/**
 * Controller untuk mendapatkan semua produk dari UMKM yang sedang login.
 */
exports.getUmkmProducts = [checkEmailVerified, async (req, res) => {
    try {
        const { umkmId } = req.user;

        const { data: products, error } = await supabase
            .from('products')
            .select('*')
            .eq('umkm_id', umkmId)
            .order('created_at', { ascending: false });

        if (error) {
            console.error('Supabase error saat get UMKM products:', error);
            return res.status(500).json({ error: 'Gagal mengambil daftar produk Anda.' });
        }

        res.status(200).json({ products });
    } catch (error) {
        console.error('Kesalahan server saat get UMKM products:', error);
        res.status(500).json({ error: 'Kesalahan server internal.' });
    }
}];

/**
 * Controller untuk mendapatkan detail satu produk UMKM tertentu.
 */
exports.getUmkmProductDetail = [checkEmailVerified, async (req, res) => {
    const productId = req.params.productId;
    const { umkmId } = req.user;

    // --- Validasi Input ---
    if (!productId || !validator.isUUID(productId, 4)) {
        return res.status(400).json({ error: 'ID produk tidak valid.' });
    }
    // --- Akhir Validasi Input ---

    try {
        const { data: product, error } = await supabase
            .from('products')
            .select('*')
            .eq('id', productId)
            .eq('umkm_id', umkmId)
            .single();

        if (error && error.code === 'PGRST116') {
            return res.status(404).json({ error: 'Produk tidak ditemukan atau bukan milik Anda.' });
        }
        if (error) {
            console.error('Supabase error saat get UMKM product detail:', error);
            return res.status(500).json({ error: 'Kesalahan database saat mengambil detail produk.' });
        }

        res.status(200).json({ product });
    } catch (error) {
        console.error('Kesalahan server saat get UMKM product detail:', error);
        res.status(500).json({ error: 'Kesalahan server internal.' });
    }
}];

/**
 * Controller untuk mengupdate produk UMKM.
 */
exports.updateProduct = [checkEmailVerified, async (req, res) => {
    const productId = req.params.productId;
    const { nama_produk, deskripsi_produk, harga_produk, gambar_url } = req.body;

    // --- Validasi Input ---
    if (!productId || !validator.isUUID(productId, 4)) {
        return res.status(400).json({ error: 'ID produk tidak valid.' });
    }
    const updateData = {};
    if (nama_produk !== undefined) {
        if (!validator.isLength(nama_produk.trim(), { min: 3, max: 200 })) {
            return res.status(400).json({ error: 'Nama produk harus antara 3 hingga 200 karakter.' });
        }
        updateData.nama_produk = nama_produk.trim();
    }
    if (deskripsi_produk !== undefined) {
        if (!validator.isLength(deskripsi_produk.trim(), { min: 10, max: 1000 })) {
            return res.status(400).json({ error: 'Deskripsi produk harus antara 10 hingga 1000 karakter.' });
        }
        updateData.deskripsi_produk = deskripsi_produk.trim();
    }
    if (harga_produk !== undefined) {
        if (!validator.isFloat(String(harga_produk), { min: 0 })) {
            return res.status(400).json({ error: 'Harga produk harus berupa angka positif.' });
        }
        updateData.harga_produk = parseFloat(harga_produk);
    }
    if (gambar_url !== undefined) {
        if (!Array.isArray(gambar_url) || gambar_url.length === 0 || gambar_url.some(url => !validator.isURL(url, { require_protocol: true }))) {
            return res.status(400).json({ error: 'Gambar produk harus berupa array URL yang valid (minimal satu URL).' });
        }
        updateData.gambar_url = gambar_url;
    }

    if (Object.keys(updateData).length === 0) {
        return res.status(400).json({ error: 'Tidak ada data yang disediakan untuk diperbarui.' });
    }
    // --- Akhir Validasi Input ---

    try {
        const { umkmId } = req.user;

        const { data: updatedProduct, error } = await supabase
            .from('products')
            .update(updateData)
            .eq('id', productId)
            .eq('umkm_id', umkmId) // Pastikan produk ini milik UMKM yang login
            .select('*')
            .single();

        if (error && error.code === 'PGRST116') {
            return res.status(404).json({ error: 'Produk tidak ditemukan atau bukan milik Anda.' });
        }
        if (error) {
            console.error('Supabase error saat update product:', error);
            return res.status(500).json({ error: 'Gagal memperbarui produk.' });
        }

        res.status(200).json({ message: 'Produk berhasil diperbarui!', product: updatedProduct });
    } catch (error) {
        console.error('Kesalahan server saat update product:', error);
        res.status(500).json({ error: 'Kesalahan server internal.' });
    }
}];

/**
 * Controller untuk menghapus produk UMKM.
 */
exports.deleteProduct = [checkEmailVerified, async (req, res) => {
    const productId = req.params.productId;
    const { umkmId } = req.user;

    // --- Validasi Input ---
    if (!productId || !validator.isUUID(productId, 4)) {
        return res.status(400).json({ error: 'ID produk tidak valid.' });
    }
    // --- Akhir Validasi Input ---

    try {
        const { error, count } = await supabase
            .from('products')
            .delete()
            .eq('id', productId)
            .eq('umkm_id', umkmId) // Pastikan produk ini milik UMKM yang login
            .maybeSingle(); // Menggunakan maybeSingle untuk membedakan antara tidak ditemukan (count 0) dan error lainnya

        if (error) {
            console.error('Supabase error saat delete product:', error);
            return res.status(500).json({ error: 'Gagal menghapus produk.' });
        }

        if (count === 0) { // Jika tidak ada baris yang dihapus, berarti produk tidak ditemukan atau bukan milik UMKM ini
            return res.status(404).json({ error: 'Produk tidak ditemukan atau bukan milik Anda.' });
        }

        res.status(200).json({ message: 'Produk berhasil dihapus!' });
    } catch (error) {
        console.error('Kesalahan server saat delete product:', error);
        res.status(500).json({ error: 'Kesalahan server internal.' });
    }
}];

/**
 * Controller untuk memperbarui kata sandi user yang sedang login.
 */
exports.updatePassword = async (req, res) => {
    const { currentPassword, newPassword } = req.body;
    const { userId } = req.user; // userId dari payload token JWT

    // --- Validasi Input ---
    if (!currentPassword || !newPassword) {
        return res.status(400).json({ error: 'Kata sandi saat ini dan kata sandi baru wajib diisi.' });
    }
    // Validasi kekuatan kata sandi baru
    if (!validator.isStrongPassword(newPassword, {
        minLength: 8,
        minLowercase: 1,
        minUppercase: 1,
        minNumbers: 1,
        minSymbols: 1
    })) {
        return res.status(400).json({ error: 'Kata sandi baru harus minimal 8 karakter, mengandung setidaknya satu huruf kecil, satu huruf besar, satu angka, dan satu simbol.' });
    }
    // --- Akhir Validasi Input ---

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

/**
 * Controller untuk mendapatkan seluruh feedback produk berdasarkan username UMKM.
 */
exports.getAllFeedbackByUmkmUsername = async (req, res) => {
    const umkmUsername = req.params.username;
    const { username } = req.user; // username dari payload token JWT

    // --- Validasi Input ---
    if (!umkmUsername || !validator.isAlphanumeric(umkmUsername.replace(/-/g, ''))) { // Username bisa mengandung hyphen
        return res.status(400).json({ error: 'Username UMKM tidak valid.' });
    }
    // --- Akhir Validasi Input ---

    // Hanya izinkan jika username di token sama dengan username di URL
    if (username !== umkmUsername) {
        return res.status(403).json({ error: 'Akses ditolak: Anda hanya bisa melihat feedback toko Anda sendiri.' });
    }

    try {
        // 1. Ambil UMKM berdasarkan username
        const { data: umkm, error: umkmError } = await supabase
            .from('umkms')
            .select('id, nama_perusahaan_umkm, username')
            .eq('username', umkmUsername)
            .single();

        if (umkmError && umkmError.code === 'PGRST116') {
            return res.status(404).json({ error: 'Toko UMKM tidak ditemukan.' });
        }
        if (umkmError) {
            console.error('Supabase error saat get UMKM by username:', umkmError);
            return res.status(500).json({ error: 'Kesalahan database saat mengambil profil UMKM.' });
        }

        // 2. Ambil semua produk milik UMKM ini
        const { data: products, error: productsError } = await supabase
            .from('products')
            .select('id, nama_produk')
            .eq('umkm_id', umkm.id);

        if (productsError) {
            console.error('Supabase error saat get products by UMKM:', productsError);
            return res.status(500).json({ error: 'Gagal mengambil produk UMKM.' });
        }

        if (!products || products.length === 0) {
            return res.status(200).json({ feedback: [], products: [] }); // Mengembalikan array kosong jika tidak ada produk
        }

        // 3. Ambil semua feedback untuk produk-produk tersebut
        const productIds = products.map(p => p.id);
        const { data: feedback, error: feedbackError } = await supabase
            .from('feedback')
            .select('id, product_id, nama_pembeli, rating, komentar, created_at')
            .in('product_id', productIds)
            .order('created_at', { ascending: false });

        if (feedbackError) {
            console.error('Supabase error saat get feedback by UMKM:', feedbackError);
            return res.status(500).json({ error: 'Gagal mengambil feedback produk.' });
        }

        // 4. Gabungkan feedback dengan nama produk
        const productMap = {};
        products.forEach(p => { productMap[p.id] = p.nama_produk; });

        const feedbackWithProduct = feedback.map(fb => ({
            ...fb,
            nama_produk: productMap[fb.product_id] || null
        }));

        res.status(200).json({
            umkm: {
                id: umkm.id,
                nama_perusahaan_umkm: umkm.nama_perusahaan_umkm,
                username: umkm.username
            },
            feedback: feedbackWithProduct
        });

    } catch (error) {
        console.error('Kesalahan server saat get all feedback by UMKM:', error);
        res.status(500).json({ error: 'Kesalahan server internal.' });
    }
};

app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(err.statusCode || 500).json({
    error: err.message || 'Terjadi kesalahan internal server.'
  });
});
