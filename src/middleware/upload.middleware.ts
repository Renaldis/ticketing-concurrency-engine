import multer from 'multer';

const storage = multer.memoryStorage();

export const upload = multer({
  storage,
  limits: {
    fileSize: 2 * 1024 * 1024, // Batas maksimal file: 2 MB
  },
  fileFilter: (req, file, cb) => {
    // Hanya ijinkan format gambar JPEG, PNG, dan WEBP
    const allowedMimeTypes = ['image/jpeg', 'image/png', 'image/webp'];
    if (allowedMimeTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type. Only JPEG, PNG and WEBP images are allowed.') as any);
    }
  },
});
