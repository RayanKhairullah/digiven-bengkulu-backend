const multer = require('multer');

const storage = multer.memoryStorage();
const upload = multer({ storage });

module.exports = {
  upload: upload.fields([
    { name: 'foto_banner_umkm', maxCount: 3 },
    { name: 'foto_profil_umkm', maxCount: 1 }
  ])
};