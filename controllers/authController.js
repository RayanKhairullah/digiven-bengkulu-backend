const { createClient } = require('@supabase/supabase-js');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const nodemailer = require('nodemailer'); // Untuk mengirim email
const { v4: uuidv4 } = require('uuid'); // Untuk membuat token unik

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
}

const supabase = createClient(supabaseUrl, supabaseAnonKey);

// ===========================================
// KONFIGURASI EMAIL (Contoh dengan Gmail)
// Anda harus mengganti ini dengan kredensial SMTP Anda
// Ini adalah placeholder, di produksi gunakan layanan email sebenarnya (SendGrid, Mailgun, dll.)
// Pastikan untuk mengatur APP_PASSWORD di Gmail jika menggunakan itu, atau layanan lain
// = ===========================================
const transporter = nodemailer.createTransport({
    host: process.env.EMAIL_HOST,
    port: Number(process.env.EMAIL_PORT),
    secure: process.env.EMAIL_SECURE === 'true',
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
    },
    tls: {
        rejectUnauthorized: false
    }
});


// Fungsi pembantu untuk mengirim email verifikasi
const sendVerificationEmail = async (email, token) => {
    // URL frontend Anda, tempat halaman verifikasi email berada
    const verificationLink = `${process.env.FRONTEND_URL}/verify-email?token=${token}`; // Ganti dengan URL frontend Anda

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
    // URL frontend Anda, tempat halaman reset password berada
    const resetLink = `${process.env.FRONTEND_URL}/reset-password?token=${token}`; // Ganti dengan URL frontend Anda

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
 * Sekarang juga mengirim email verifikasi.
 */
exports.registerUmkm = async (req, res) => {
    const { email, password, nama_pelaku, nama_perusahaan_umkm, nomor_whatsapp } = req.body;

    if (!email || !password || !nama_pelaku || !nama_perusahaan_umkm || !nomor_whatsapp) {
        return res.status(400).json({ error: 'Semua bidang wajib diisi.' });
    }

    try {
        const { data: existingUser, error: findUserError } = await supabase
            .from('users')
            .select('id')
            .eq('email', email)
            .single();

        if (existingUser) {
            return res.status(409).json({ error: 'Email ini sudah terdaftar.' });
        }
        if (findUserError && findUserError.code !== 'PGRST116') {
            console.error('Supabase error saat cek user:', findUserError);
            return res.status(500).json({ error: 'Kesalahan database saat pendaftaran.' });
        }

        let username = nama_perusahaan_umkm.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
        if (!username) {
            username = `umkm-${Math.random().toString(36).substring(2, 8)}`;
        }

        const { data: existingUmkmUsername, error: findUmkmError } = await supabase
            .from('umkms')
            .select('id')
            .eq('username', username)
            .single();

        if (existingUmkmUsername) {
            username = `${username}-${Math.random().toString(36).substring(2, 8)}`;
        }
        if (findUmkmError && findUmkmError.code !== 'PGRST116') {
            console.error('Supabase error saat cek username UMKM:', findUmkmError);
            return res.status(500).json({ error: 'Kesalahan database saat pendaftaran UMKM.' });
        }

        const hashedPassword = await bcrypt.hash(password, 10);
        const verificationToken = uuidv4(); // Buat token verifikasi unik
        const tokenExpiresAt = new Date(Date.now() + 60 * 60 * 1000).toISOString(); // Token berlaku 1 jam

        const { data: newUser, error: insertUserError } = await supabase
            .from('users')
            .insert({
                email,
                password: hashedPassword,
                is_verified: false, // Default false
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
            await supabase.from('users').delete().eq('id', newUser.id);
            console.error('Supabase error saat insert UMKM:', insertUmkmError);
            return res.status(500).json({ error: 'Gagal mendaftar detail UMKM.' });
        }

        // Kirim email verifikasi
        await sendVerificationEmail(newUser.email, verificationToken);

        res.status(201).json({
            message: 'Registrasi UMKM berhasil! Silakan cek email Anda untuk verifikasi.',
            user: { id: newUser.id, email: newUser.email, is_verified: false },
            umkm_profile: newUmkm
        });

    } catch (error) {
        console.error('Kesalahan server saat registrasi:', error);
        res.status(500).json({ error: 'Kesalahan server internal.' });
    }
};

/**
 * Controller untuk Login UMKM.
 */
exports.loginUmkm = async (req, res) => {
    const { email, password } = req.body;

    if (!email || !password) {
        return res.status(400).json({ error: 'Email dan password wajib diisi.' });
    }

    try {
        const { data: user, error: findUserError } = await supabase
            .from('users')
            .select('id, email, password, is_verified') // Ambil is_verified
            .eq('email', email)
            .single();

        if (findUserError && findUserError.code === 'PGRST116') {
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

        // Cek status verifikasi email
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
                is_verified: user.is_verified // Sertakan status verifikasi di token
            },
            jwtSecret,
            { expiresIn: '1h' }
        );

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
    const { token } = req.query; // Ambil token dari query parameter URL

    if (!token) {
        return res.status(400).json({ error: 'Token verifikasi tidak ditemukan.' });
    }

    try {
        // Cari user berdasarkan token dan pastikan belum kedaluwarsa
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

        // Cek masa berlaku token
        const now = new Date();
        const tokenExpiry = new Date(user.verification_token_expires_at);
        if (now > tokenExpiry) {
            return res.status(400).json({ error: 'Token verifikasi telah kadaluarsa. Mohon minta token baru.' });
        }

        // Update status verifikasi user
        const { error: updateError } = await supabase
            .from('users')
            .update({
                is_verified: true,
                verification_token: null, // Hapus token setelah digunakan
                verification_token_expires_at: null // Hapus waktu kadaluarsa
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

    if (!email) {
        return res.status(400).json({ error: 'Email wajib diisi.' });
    }

    try {
        const { data: user, error } = await supabase
            .from('users')
            .select('id, email, is_verified')
            .eq('email', email)
            .single();

        if (error && error.code === 'PGRST116') {
            return res.status(404).json({ error: 'User tidak ditemukan.' }); // Lebih baik respons generik di produksi
        }
        if (error) {
            console.error('Supabase error saat kirim ulang verifikasi (find user):', error);
            return res.status(500).json({ error: 'Kesalahan database saat kirim ulang verifikasi.' });
        }

        if (user.is_verified) {
            return res.status(400).json({ message: 'Email ini sudah diverifikasi.' });
        }

        // Buat token verifikasi baru
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

        // Kirim email verifikasi baru
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

    if (!email) {
        return res.status(400).json({ error: 'Email wajib diisi.' });
    }

    try {
        const { data: user, error } = await supabase
            .from('users')
            .select('id, email')
            .eq('email', email)
            .single();

        // Penting: Selalu kembalikan respons sukses generik untuk mencegah user enumeration
        if (error && error.code === 'PGRST116') {
            return res.status(200).json({ message: 'Jika email Anda terdaftar, link reset password telah dikirimkan.' });
        }
        if (error) {
            console.error('Supabase error saat lupa password (find user):', error);
            return res.status(500).json({ error: 'Kesalahan database.' });
        }

        // Hapus token reset yang ada untuk user ini (untuk keamanan)
        await supabase.from('password_reset_tokens').delete().eq('user_id', user.id);

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

        // Kirim email reset password
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

    if (!token || !newPassword) {
        return res.status(400).json({ error: 'Token dan kata sandi baru wajib diisi.' });
    }

    try {
        // Cari token di tabel password_reset_tokens dan pastikan belum kedaluwarsa
        const { data: resetTokenData, error: findTokenError } = await supabase
            .from('password_reset_tokens')
            .select('id, user_id, expires_at')
            .eq('token', token)
            .single();

        if (findTokenError && findTokenError.code === 'PGRST116') {
            return res.status(400).json({ error: 'Token reset kata sandi tidak valid.' });
        }
        if (findTokenError) {
            console.error('Supabase error saat reset password (find token):', findTokenError);
            return res.status(500).json({ error: 'Kesalahan database.' });
        }

        // Cek masa berlaku token
        const now = new Date();
        const tokenExpiry = new Date(resetTokenData.expires_at);
        if (now > tokenExpiry) {
            return res.status(400).json({ error: 'Token reset kata sandi telah kadaluarsa.' });
        }

        // Hash kata sandi baru
        const hashedPassword = await bcrypt.hash(newPassword, 10);

        // Update password user
        const { error: updatePasswordError } = await supabase
            .from('users')
            .update({ password: hashedPassword })
            .eq('id', resetTokenData.user_id);

        if (updatePasswordError) {
            console.error('Supabase error saat reset password (update password):', updatePasswordError);
            return res.status(500).json({ error: 'Gagal mereset kata sandi.' });
        }

        // Hapus token setelah berhasil digunakan
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
