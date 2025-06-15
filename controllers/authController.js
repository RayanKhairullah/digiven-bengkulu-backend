const { createClient } = require('@supabase/supabase-js');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const nodemailer = require('nodemailer');
const { v4: uuidv4 } = require('uuid');
const validator = require('validator');

// ===========================================
// INISIALISASI SUPABASE & JWT
// ===========================================
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY;
const jwtSecret = process.env.JWT_SECRET;

// Pastikan variabel lingkungan sudah diatur
if (!supabaseUrl || !supabaseAnonKey || !jwtSecret) {
    console.error("Error: Lingkungan tidak lengkap. Pastikan SUPABASE_URL, SUPABASE_ANON_KEY, dan JWT_SECRET didefinisikan.");
    // Dalam produksi, mungkin lebih baik menghentikan proses
    // process.exit(1); 
    // Untuk pengembangan, kita mungkin ingin aplikasi tetap berjalan untuk debugging
}

const supabase = createClient(supabaseUrl, supabaseAnonKey);

// ===========================================
// KONFIGURASI EMAIL (Contoh dengan Gmail)
// ===========================================
const transporter = nodemailer.createTransport({
    host: process.env.EMAIL_HOST,
    port: Number(process.env.EMAIL_PORT),
    secure: process.env.EMAIL_SECURE === 'true', // true jika port 465, false untuk STARTTLS
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
    },
    tls: {
        // Penting: Hanya gunakan rejectUnauthorized: false di DEVELOPMENT!
        // Di produksi, pastikan sertifikat SSL host email Anda valid dan hapus ini.
        rejectUnauthorized: process.env.NODE_ENV !== 'production' ? false : true
    }
});

// Fungsi pembantu untuk mengirim email verifikasi
const sendVerificationEmail = async (email, token) => {
    const verificationLink = `${process.env.FRONTEND_URL}/verify-email?token=${token}`;

    const mailOptions = {
        from: process.env.EMAIL_FROM || 'no-reply@umkmbengkulu.com',
        to: email,
        subject: 'Verifikasi Email Akun UMKM Bengkulu Anda',
        html: `
            <p>Halo,</p>
            <p>Terima kasih telah mendaftar di platform UMKM Bengkulu. Mohon verifikasi alamat email Anda dengan mengklik link di bawah ini:</p>
            <p><a href="${verificationLink}">Verifikasi Email Saya</a></p>
            <p>Link ini akan kadaluarsa dalam 1 jam.</p>
            <p>Jika Anda tidak merasa mendaftar, mohon abaikan email ini.</p>
            <p>Hormat kami,</p>
            <p>Tim UMKM Bengkulu</p>
        `,
    };

    try {
        await transporter.sendMail(mailOptions);
        console.log('Email verifikasi terkirim ke:', email);
    } catch (error) {
        console.error('Gagal mengirim email verifikasi ke:', email, error);
        throw new Error('Gagal mengirim email verifikasi.');
    }
};

// Fungsi pembantu untuk mengirim email reset password
const sendResetPasswordEmail = async (email, token) => {
    const resetLink = `${process.env.FRONTEND_URL}/reset-password?token=${token}`;

    const mailOptions = {
        from: process.env.EMAIL_FROM || 'no-reply@umkmbengkulu.com',
        to: email,
        subject: 'Permintaan Reset Kata Sandi Akun UMKM Bengkulu Anda',
        html: `
            <p>Halo,</p>
            <p>Kami menerima permintaan untuk mereset kata sandi akun Anda. Klik link di bawah ini untuk melanjutkan:</p>
            <p><a href="${resetLink}">Reset Kata Sandi Saya</a></p>
            <p>Link ini akan kadaluarsa dalam 15 menit.</p>
            <p>Jika Anda tidak meminta reset kata sandi, mohon abaikan email ini.</p>
            <p>Hormat kami,</p>
            <p>Tim UMKM Bengkulu</p>
        `,
    };

    try {
        await transporter.sendMail(mailOptions);
        console.log('Email reset password terkirim ke:', email);
    } catch (error) {
        console.error('Gagal mengirim email reset password ke:', email, error);
        throw new Error('Gagal mengirim email reset password.');
    }
};


/**
 * Controller untuk Pendaftaran UMKM (Signup).
 * Memasukkan user ke tabel users dan umkm ke tabel umkms.
 * Sekarang juga mengirim email verifikasi dan memiliki validasi input.
 */
exports.registerUmkm = async (req, res) => {
    const { email, password, nama_pelaku, nama_perusahaan_umkm, nomor_whatsapp } = req.body;

    // --- Validasi Input ---
    if (!email || !password || !nama_pelaku || !nama_perusahaan_umkm || !nomor_whatsapp) {
        return res.status(400).json({ error: 'Semua bidang wajib diisi.' });
    }
    if (!validator.isEmail(email)) {
        return res.status(400).json({ error: 'Format email tidak valid.' });
    }
    // Contoh validasi kekuatan password: minimal 8 karakter, setidaknya 1 huruf kecil, 1 huruf besar, 1 angka, 1 simbol
    if (!validator.isStrongPassword(password, {
        minLength: 8,
        minLowercase: 1,
        minUppercase: 1,
        minNumbers: 1,
        minSymbols: 1
    })) {
        return res.status(400).json({ error: 'Kata sandi harus minimal 8 karakter, mengandung setidaknya satu huruf kecil, satu huruf besar, satu angka, dan satu simbol.' });
    }
    if (!validator.isLength(nama_pelaku.trim(), { min: 3, max: 100 })) {
        return res.status(400).json({ error: 'Nama pelaku harus antara 3 hingga 100 karakter.' });
    }
    if (!validator.isLength(nama_perusahaan_umkm.trim(), { min: 3, max: 150 })) {
        return res.status(400).json({ error: 'Nama perusahaan UMKM harus antara 3 hingga 150 karakter.' });
    }
    // Validasi nomor WhatsApp (contoh: format E.164, atau hanya angka)
    // Di sini saya asumsikan nomor_whatsapp hanya angka
    if (!validator.isMobilePhone(nomor_whatsapp.replace(/\s/g, ''), 'id-ID') && !validator.isNumeric(nomor_whatsapp)) {
        return res.status(400).json({ error: 'Nomor WhatsApp tidak valid.' });
    }
    // --- Akhir Validasi Input ---

    try {
        const { data: existingUser, error: findUserError } = await supabase
            .from('users')
            .select('id')
            .eq('email', email)
            .single();

        if (existingUser) {
            return res.status(409).json({ error: 'Email ini sudah terdaftar.' });
        }
        // PGRST116 berarti tidak ada data ditemukan, itu normal jika user tidak ada
        if (findUserError && findUserError.code !== 'PGRST116') {
            console.error('Supabase error saat cek user:', findUserError);
            return res.status(500).json({ error: 'Kesalahan database saat pendaftaran user.' });
        }

        // Generate username unik
        let baseUsername = nama_perusahaan_umkm.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
        if (!baseUsername) { // Fallback jika nama perusahaan menghasilkan username kosong
            baseUsername = 'umkm';
        }
        let username = baseUsername;
        let usernameConflict = true;
        let attempt = 0;
        const MAX_ATTEMPTS = 5;

        // Loop untuk memastikan username unik
        while (usernameConflict && attempt < MAX_ATTEMPTS) {
            const { data: existingUmkmUsername, error: findUmkmError } = await supabase
                .from('umkms')
                .select('id')
                .eq('username', username)
                .single();

            if (existingUmkmUsername) {
                username = `${baseUsername}-${Math.random().toString(36).substring(2, 8)}`;
                attempt++;
            } else {
                usernameConflict = false;
            }

            if (findUmkmError && findUmkmError.code !== 'PGRST116') {
                console.error('Supabase error saat cek username UMKM:', findUmkmError);
                return res.status(500).json({ error: 'Kesalahan database saat pendaftaran UMKM (cek username).' });
            }
        }

        if (usernameConflict) {
             console.error('Gagal membuat username unik setelah beberapa kali percobaan untuk:', nama_perusahaan_umkm);
             return res.status(500).json({ error: 'Tidak dapat membuat username unik. Silakan coba lagi.' });
        }


        const hashedPassword = await bcrypt.hash(password, 10);
        const verificationToken = uuidv4();
        const tokenExpiresAt = new Date(Date.now() + 60 * 60 * 1000).toISOString(); // Token berlaku 1 jam

        const { data: newUser, error: insertUserError } = await supabase
            .from('users')
            .insert({
                email,
                password: hashedPassword,
                is_verified: false,
                verification_token: verificationToken,
                verification_token_expires_at: tokenExpiresAt
            })
            .select('id, email')
            .single();

        if (insertUserError) {
            console.error('Supabase error saat insert user:', insertUserError);
            return res.status(500).json({ error: 'Gagal mendaftar user.' });
        }

        const { data: newUmkm, error: insertUmkmError } = await supabase
            .from('umkms')
            .insert({
                user_id: newUser.id,
                nama_pelaku,
                nama_perusahaan_umkm,
                username,
                nomor_whatsapp
            })
            .select('*')
            .single();

        if (insertUmkmError) {
            // Rollback user creation if UMKM profile insertion fails
            await supabase.from('users').delete().eq('id', newUser.id);
            console.error('Supabase error saat insert UMKM:', insertUmkmError);
            return res.status(500).json({ error: 'Gagal mendaftar detail UMKM.' });
        }

        await sendVerificationEmail(newUser.email, verificationToken);

        res.status(201).json({
            message: 'Registrasi UMKM berhasil! Silakan cek email Anda untuk verifikasi.',
            user: { id: newUser.id, email: newUser.email, is_verified: false },
            umkm_profile: newUmkm // Hanya untuk debugging, tidak direkomendasikan di produksi
        });

    } catch (error) {
        console.error('Kesalahan server saat registrasi:', error);
        res.status(500).json({ error: 'Kesalahan server internal.' });
    }
};

/**
 * Controller untuk Login UMKM.
 * Mengirim token JWT sebagai HTTP-only cookie.
 */
exports.loginUmkm = async (req, res) => {
    const { email, password } = req.body;

    // --- Validasi Input ---
    if (!email || !password) {
        return res.status(400).json({ error: 'Email dan password wajib diisi.' });
    }
    if (!validator.isEmail(email)) {
        return res.status(400).json({ error: 'Format email tidak valid.' });
    }
    // --- Akhir Validasi Input ---

    try {
        const { data: user, error: findUserError } = await supabase
            .from('users')
            .select('id, email, password, is_verified')
            .eq('email', email)
            .single();

        if (findUserError && findUserError.code === 'PGRST116') {
            // Generic message to prevent user enumeration
            return res.status(401).json({ error: 'Kredensial tidak valid.' });
        }
        if (findUserError) {
            console.error('Supabase error saat login (find user):', findUserError);
            return res.status(500).json({ error: 'Kesalahan database saat login.' });
        }

        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
            return res.status(401).json({ error: 'Kredensial tidak valid.' });
        }

        if (!user.is_verified) {
            return res.status(403).json({ error: 'Email Anda belum diverifikasi. Silakan cek email Anda atau minta kirim ulang verifikasi.' });
        }

        const { data: umkmProfile, error: findUmkmError } = await supabase
            .from('umkms')
            .select('id, nama_perusahaan_umkm, username')
            .eq('user_id', user.id)
            .single();

        if (findUmkmError) {
            console.error('Supabase error saat login (find UMKM profile):', findUmkmError);
            return res.status(500).json({ error: 'Profil UMKM tidak ditemukan atau kesalahan database.' });
        }

        const token = jwt.sign(
            {
                userId: user.id,
                email: user.email,
                umkmId: umkmProfile.id,
                username: umkmProfile.username,
                is_verified: user.is_verified
            },
            jwtSecret,
            { expiresIn: '1h' } // Token berlaku 1 jam
        );

        // Set JWT sebagai HTTP-only cookie
        // secure: true hanya jika HTTPS (di produksi), sameSite: 'Strict' untuk CSRF protection
        res.cookie('token', token, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production', // true di produksi (HTTPS)
            sameSite: 'strict', // Melindungi dari serangan CSRF
            maxAge: 60 * 60 * 1000 // 1 jam (dalam milidetik)
        });

        res.status(200).json({
            message: 'Login berhasil!',
            token,
            umkm_profile: {
                id: umkmProfile.id,
                nama_perusahaan_umkm: umkmProfile.nama_perusahaan_umkm,
                username: umkmProfile.username,
                is_verified: user.is_verified
            }
        });

    } catch (error) {
        console.error('Kesalahan server saat login:', error);
        res.status(500).json({ error: 'Kesalahan server internal.' });
    }
};

/**
 * Controller untuk memverifikasi email user.
 */
exports.verifyEmail = async (req, res) => {
    const { token } = req.query;

    if (!token) {
        return res.status(400).json({ error: 'Token verifikasi tidak ditemukan.' });
    }
    // Token UUID harus memiliki format yang valid
    if (!validator.isUUID(token, 4)) {
        return res.status(400).json({ error: 'Format token verifikasi tidak valid.' });
    }

    try {
        const { data: user, error } = await supabase
            .from('users')
            .select('id, email, is_verified, verification_token_expires_at')
            .eq('verification_token', token)
            .single();

        if (error && error.code === 'PGRST116') {
            return res.status(400).json({ error: 'Token verifikasi tidak valid atau sudah digunakan.' });
        }
        if (error) {
            console.error('Supabase error saat verifikasi email (find user):', error);
            return res.status(500).json({ error: 'Kesalahan database saat verifikasi email.' });
        }

        if (user.is_verified) {
            return res.status(400).json({ message: 'Email ini sudah diverifikasi sebelumnya.' });
        }

        const now = new Date();
        const tokenExpiry = new Date(user.verification_token_expires_at);
        if (now > tokenExpiry) {
            return res.status(400).json({ error: 'Token verifikasi telah kadaluarsa. Mohon minta token baru.' });
        }

        const { error: updateError } = await supabase
            .from('users')
            .update({
                is_verified: true,
                verification_token: null,
                verification_token_expires_at: null
            })
            .eq('id', user.id);

        if (updateError) {
            console.error('Supabase error saat verifikasi email (update user):', updateError);
            return res.status(500).json({ error: 'Gagal memverifikasi email.' });
        }

        res.status(200).json({ message: 'Email berhasil diverifikasi!' });
        // Di frontend, Anda bisa redirect user ke halaman sukses atau dashboard
        // res.redirect(`${process.env.FRONTEND_URL}/verification-success`);
    } catch (error) {
        console.error('Kesalahan server saat verifikasi email:', error);
        res.status(500).json({ error: 'Kesalahan server internal.' });
    }
};

/**
 * Controller untuk mengirim ulang email verifikasi.
 */
exports.resendVerificationEmail = async (req, res) => {
    const { email } = req.body;

    // --- Validasi Input ---
    if (!email) {
        return res.status(400).json({ error: 'Email wajib diisi.' });
    }
    if (!validator.isEmail(email)) {
        return res.status(400).json({ error: 'Format email tidak valid.' });
    }
    // --- Akhir Validasi Input ---

    try {
        const { data: user, error } = await supabase
            .from('users')
            .select('id, email, is_verified')
            .eq('email', email)
            .single();

        if (error && error.code === 'PGRST116') {
            // Generic message to prevent user enumeration
            return res.status(404).json({ error: 'Email tidak ditemukan.' }); // Atau lebih baik: 'Jika email terdaftar, link akan dikirim.'
        }
        if (error) {
            console.error('Supabase error saat kirim ulang verifikasi (find user):', error);
            return res.status(500).json({ error: 'Kesalahan database saat kirim ulang verifikasi.' });
        }

        if (user.is_verified) {
            return res.status(400).json({ message: 'Email ini sudah diverifikasi.' });
        }

        const newVerificationToken = uuidv4();
        const newTokenExpiresAt = new Date(Date.now() + 60 * 60 * 1000).toISOString(); // Token berlaku 1 jam

        const { error: updateError } = await supabase
            .from('users')
            .update({
                verification_token: newVerificationToken,
                verification_token_expires_at: newTokenExpiresAt
            })
            .eq('id', user.id);

        if (updateError) {
            console.error('Supabase error saat kirim ulang verifikasi (update user):', updateError);
            return res.status(500).json({ error: 'Gagal mengirim ulang email verifikasi.' });
        }

        await sendVerificationEmail(user.email, newVerificationToken);

        res.status(200).json({ message: 'Email verifikasi baru telah dikirim. Silakan cek kotak masuk Anda.' });

    } catch (error) {
        console.error('Kesalahan server saat kirim ulang verifikasi:', error);
        res.status(500).json({ error: 'Kesalahan server internal.' });
    }
};

/**
 * Controller untuk permintaan lupa kata sandi.
 * Mengirim link reset password ke email user.
 */
exports.forgotPassword = async (req, res) => {
    const { email } = req.body;

    // --- Validasi Input ---
    if (!email) {
        return res.status(400).json({ error: 'Email wajib diisi.' });
    }
    if (!validator.isEmail(email)) {
        return res.status(400).json({ error: 'Format email tidak valid.' });
    }
    // --- Akhir Validasi Input ---

    try {
        const { data: user, error } = await supabase
            .from('users')
            .select('id, email')
            .eq('email', email)
            .single();

        // Penting: Selalu kembalikan respons sukses generik untuk mencegah user enumeration
        if (error && error.code === 'PGRST116') {
            console.warn('Permintaan lupa password untuk email tidak terdaftar:', email);
            return res.status(200).json({ message: 'Jika email Anda terdaftar, link reset password telah dikirimkan.' });
        }
        if (error) {
            console.error('Supabase error saat lupa password (find user):', error);
            return res.status(500).json({ error: 'Kesalahan database.' });
        }

        // Hapus token reset yang ada untuk user ini (untuk keamanan, memastikan hanya 1 token aktif)
        const { error: deleteExistingTokenError } = await supabase
            .from('password_reset_tokens')
            .delete()
            .eq('user_id', user.id);

        if (deleteExistingTokenError) {
            console.warn('Gagal menghapus token reset password lama untuk user:', user.id, deleteExistingTokenError);
            // Lanjutkan proses meskipun gagal menghapus token lama, tapi log peringatan
        }

        // Buat token reset password baru
        const resetToken = uuidv4();
        const tokenExpiresAt = new Date(Date.now() + 15 * 60 * 1000).toISOString(); // Token berlaku 15 menit

        const { error: insertTokenError } = await supabase
            .from('password_reset_tokens')
            .insert({
                user_id: user.id,
                token: resetToken,
                expires_at: tokenExpiresAt
            });

        if (insertTokenError) {
            console.error('Supabase error saat lupa password (insert token):', insertTokenError);
            return res.status(500).json({ error: 'Gagal memproses permintaan reset password.' });
        }

        await sendResetPasswordEmail(user.email, resetToken);

        res.status(200).json({ message: 'Jika email Anda terdaftar, link reset password telah dikirimkan.' });

    } catch (error) {
        console.error('Kesalahan server saat lupa password:', error);
        res.status(500).json({ error: 'Kesalahan server internal.' });
    }
};

/**
 * Controller untuk mereset kata sandi.
 */
exports.resetPassword = async (req, res) => {
    const { token, newPassword } = req.body;

    // --- Validasi Input ---
    if (!token || !newPassword) {
        return res.status(400).json({ error: 'Token dan kata sandi baru wajib diisi.' });
    }
    if (!validator.isUUID(token, 4)) {
        return res.status(400).json({ error: 'Format token reset kata sandi tidak valid.' });
    }
    // Validasi kekuatan password baru
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
        const { data: resetTokenData, error: findTokenError } = await supabase
            .from('password_reset_tokens')
            .select('id, user_id, expires_at')
            .eq('token', token)
            .single();

        if (findTokenError && findTokenError.code === 'PGRST116') {
            return res.status(400).json({ error: 'Token reset kata sandi tidak valid atau sudah kadaluarsa.' });
        }
        if (findTokenError) {
            console.error('Supabase error saat reset password (find token):', findTokenError);
            return res.status(500).json({ error: 'Kesalahan database saat reset password.' });
        }

        const now = new Date();
        const tokenExpiry = new Date(resetTokenData.expires_at);
        if (now > tokenExpiry) {
            return res.status(400).json({ error: 'Token reset kata sandi telah kadaluarsa. Mohon minta token baru.' });
        }

        const hashedPassword = await bcrypt.hash(newPassword, 10);

        const { error: updatePasswordError } = await supabase
            .from('users')
            .update({ password: hashedPassword })
            .eq('id', resetTokenData.user_id);

        if (updatePasswordError) {
            console.error('Supabase error saat reset password (update password):', updatePasswordError);
            return res.status(500).json({ error: 'Gagal mereset kata sandi.' });
        }

        const { error: deleteTokenError } = await supabase
            .from('password_reset_tokens')
            .delete()
            .eq('id', resetTokenData.id);

        if (deleteTokenError) {
            console.error('Supabase error saat reset password (delete token):', deleteTokenError);
            // Lanjutkan meskipun gagal menghapus token, karena password sudah diupdate
        }

        res.status(200).json({ message: 'Kata sandi berhasil direset!' });

    } catch (error) {
        console.error('Kesalahan server saat reset password:', error);
        res.status(500).json({ error: 'Kesalahan server internal.' });
    }
};
