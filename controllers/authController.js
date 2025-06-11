const { createClient } = require('@supabase/supabase-js');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

// ===========================================
// INISIALISASI SUPABASE & JWT
// ===========================================
// Ambil variabel lingkungan
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY;
const jwtSecret = process.env.JWT_SECRET;

// Pastikan variabel lingkungan sudah diatur
if (!supabaseUrl || !supabaseAnonKey || !jwtSecret) {
    console.error("Error: Lingkungan tidak lengkap. Pastikan SUPABASE_URL, SUPABASE_ANON_KEY, dan JWT_SECRET didefinisikan.");
    // Dalam produksi, mungkin lebih baik menghentikan proses
    // process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseAnonKey);

/**
 * Controller untuk Pendaftaran UMKM (Signup).
 * Menangani pembuatan akun pengguna dan profil UMKM.
 */
exports.registerUmkm = async (req, res) => {
    const { email, password, nama_pelaku, nama_perusahaan_umkm, nomor_whatsapp } = req.body;

    // Validasi input dasar
    if (!email || !password || !nama_pelaku || !nama_perusahaan_umkm || !nomor_whatsapp) {
        return res.status(400).json({ error: 'Semua bidang wajib diisi.' });
    }

    try {
        // 1. Cek apakah email sudah terdaftar di tabel users
        const { data: existingUser, error: findUserError } = await supabase
            .from('users')
            .select('id')
            .eq('email', email)
            .single();

        if (existingUser) {
            return res.status(409).json({ error: 'Email ini sudah terdaftar.' });
        }
        if (findUserError && findUserError.code !== 'PGRST116') { // PGRST116 = tidak ada baris ditemukan
            console.error('Supabase error saat cek user:', findUserError);
            return res.status(500).json({ error: 'Kesalahan database saat pendaftaran.' });
        }

        // Buat username unik dari nama_perusahaan_umkm
        let username = nama_perusahaan_umkm.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
        if (!username) { // Jika nama perusahaan tidak menghasilkan username valid
            username = `umkm-${Math.random().toString(36).substring(2, 8)}`; // Fallback random
        }

        // 2. Cek apakah username sudah ada di tabel umkms
        const { data: existingUmkmUsername, error: findUmkmError } = await supabase
            .from('umkms')
            .select('id')
            .eq('username', username)
            .single();

        if (existingUmkmUsername) {
            // Jika username sudah ada, tambahkan string acak
            username = `${username}-${Math.random().toString(36).substring(2, 8)}`;
        }
        if (findUmkmError && findUmkmError.code !== 'PGRST116') {
            console.error('Supabase error saat cek username UMKM:', findUmkmError);
            return res.status(500).json({ error: 'Kesalahan database saat pendaftaran UMKM.' });
        }

        // 3. Hash password
        const hashedPassword = await bcrypt.hash(password, 10); // 10 salt rounds

        // 4. Masukkan user baru ke tabel users
        const { data: newUser, error: insertUserError } = await supabase
            .from('users')
            .insert({ email, password: hashedPassword })
            .select('id, email')
            .single();

        if (insertUserError) {
            console.error('Supabase error saat insert user:', insertUserError);
            return res.status(500).json({ error: 'Gagal mendaftar user.' });
        }

        // 5. Masukkan detail UMKM ke tabel umkms, hubungkan dengan user_id
        const { data: newUmkm, error: insertUmkmError } = await supabase
            .from('umkms')
            .insert({
                user_id: newUser.id,
                nama_pelaku,
                nama_perusahaan_umkm,
                username, // Username unik untuk link toko
                nomor_whatsapp
            })
            .select('*')
            .single();

        if (insertUmkmError) {
            // Jika ada kesalahan saat insert UMKM, coba hapus user yang baru dibuat
            await supabase.from('users').delete().eq('id', newUser.id);
            console.error('Supabase error saat insert UMKM:', insertUmkmError);
            return res.status(500).json({ error: 'Gagal mendaftar detail UMKM.' });
        }

        res.status(201).json({
            message: 'Registrasi UMKM berhasil!',
            user: { id: newUser.id, email: newUser.email },
            umkm_profile: newUmkm
        });

    } catch (error) {
        console.error('Kesalahan server saat registrasi:', error);
        res.status(500).json({ error: 'Kesalahan server internal.' });
    }
};

/**
 * Controller untuk Login UMKM.
 * Mengautentikasi pengguna dan mengembalikan token JWT.
 */
exports.loginUmkm = async (req, res) => {
    const { email, password } = req.body;

    if (!email || !password) {
        return res.status(400).json({ error: 'Email dan password wajib diisi.' });
    }

    try {
        // 1. Ambil user dari tabel users berdasarkan email
        const { data: user, error: findUserError } = await supabase
            .from('users')
            .select('id, email, password') // Ambil hashed password
            .eq('email', email)
            .single();

        if (findUserError && findUserError.code === 'PGRST116') { // PGRST116 = tidak ada baris ditemukan
            return res.status(401).json({ error: 'Kredensial tidak valid.' });
        }
        if (findUserError) {
            console.error('Supabase error saat login (find user):', findUserError);
            return res.status(500).json({ error: 'Kesalahan database saat login.' });
        }

        // 2. Bandingkan provided password dengan hashed password
        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
            return res.status(401).json({ error: 'Kredensial tidak valid.' });
        }

        // 3. Dapatkan detail UMKM yang terhubung dengan user ini
        const { data: umkmProfile, error: findUmkmError } = await supabase
            .from('umkms')
            .select('id, nama_perusahaan_umkm, username')
            .eq('user_id', user.id)
            .single();

        if (findUmkmError) {
             console.error('Supabase error saat login (find UMKM profile):', findUmkmError);
             return res.status(500).json({ error: 'Profil UMKM tidak ditemukan atau kesalahan database.' });
        }

        // 4. Buat token JWT
        const token = jwt.sign(
            {
                userId: user.id,
                email: user.email,
                umkmId: umkmProfile.id,
                username: umkmProfile.username // Sertakan username di token
            },
            jwtSecret,
            { expiresIn: '1h' } // Token berlaku 1 jam
        );

        res.status(200).json({
            message: 'Login berhasil!',
            token,
            umkm_profile: {
                id: umkmProfile.id,
                nama_perusahaan_umkm: umkmProfile.nama_perusahaan_umkm,
                username: umkmProfile.username
            }
        });

    } catch (error) {
        console.error('Kesalahan server saat login:', error);
        res.status(500).json({ error: 'Kesalahan server internal.' });
    }
};
