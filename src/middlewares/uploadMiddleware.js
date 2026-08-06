import multer from 'multer';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url); //uploaded file path
const __dirname = path.dirname(__filename); //path of folder in which file is uploaded

// Where uploaded audio files get saved temporarily
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, path.join(__dirname, '..', 'uploads')); //dirname thi '..' aa use karine ek folder pachad jai then uploads ma jai
  },
  filename: (req, file, cb) => {
    // e.g. 1691234567890-recording.mp3 — timestamp avoids filename collisions
    cb(null, `${Date.now()}-${file.originalname}`);
  }
});

// Only allow audio files through
const fileFilter = (req, file, cb) => {
  const allowedTypes = ['audio/mpeg', 'audio/wav', 'audio/mp3', 'audio/x-wav'];
  if (allowedTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('Only .mp3 and .wav audio files are allowed'), false);
  }
};

const upload = multer({ storage, fileFilter });

export default upload;