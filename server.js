const express = require('express');
const multer = require('multer');
const fs = require('fs');
const path = require('path');
const app = express();
const PORT = process.env.PORT || 3000;

const CONFIG_PATH = path.join(__dirname, 'images-config.json');
const UPLOAD_DIR = path.join(__dirname, 'images', 'uploads');

// Ensure upload directory exists
fs.mkdirSync(UPLOAD_DIR, { recursive: true });

function readConfig() {
  try {
    const raw = fs.readFileSync(CONFIG_PATH, 'utf8');
    return JSON.parse(raw);
  } catch (e) {
    return { secret: '', images: {} };
  }
}

function writeConfig(cfg) {
  fs.writeFileSync(CONFIG_PATH, JSON.stringify(cfg, null, 2), 'utf8');
}

// Multer setup with file filtering for images only
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, UPLOAD_DIR),
  filename: (req, file, cb) => {
    const safe = path.basename(file.originalname).replace(/[^a-zA-Z0-9.\-_]/g, '-');
    const name = `${Date.now()}-${safe}`;
    cb(null, name);
  }
});

function fileFilter (req, file, cb) {
  if (!file.mimetype.startsWith('image/')) {
    return cb(new Error('Only image files are allowed'), false);
  }
  cb(null, true);
}

function isValidKey(key) {
  return typeof key === 'string' && /^[a-zA-Z0-9._-]+$/.test(key);
}

const upload = multer({ storage, fileFilter, limits: { fileSize: 5 * 1024 * 1024 } });

app.use(express.json());
// Serve static files from project root so admin.html and site are accessible
app.use(express.static(path.join(__dirname)));

// GET config
app.get('/admin/config', (req, res) => {
  const cfg = readConfig();
  res.json(cfg);
});

// POST upload: fields: key, secret, file
app.post('/admin/upload', upload.single('file'), (req, res) => {
  try {
    const { key, secret } = req.body;
    const cfg = readConfig();
    if (secret !== cfg.secret) return res.status(401).json({ error: 'Unauthorized' });
    if (!key) return res.status(400).json({ error: 'Missing key' });
    if (!isValidKey(key)) return res.status(400).json({ error: 'Invalid key. Use letters, numbers, dot, underscore, or hyphen only.' });
    if (!req.file) return res.status(400).json({ error: 'Missing file' });

    // Save mapping relative path
    const relPath = path.join('images', 'uploads', req.file.filename).replace(/\\/g, '/');
    cfg.images = cfg.images || {};
    cfg.images[key] = relPath;
    writeConfig(cfg);
    res.json({ ok: true, url: relPath });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Server error' });
  }
});

// POST delete mapping and file if local: JSON { key, secret }
app.post('/admin/delete', (req, res) => {
  try {
    const { key, secret } = req.body;
    const cfg = readConfig();
    if (secret !== cfg.secret) return res.status(401).json({ error: 'Unauthorized' });
    if (!key) return res.status(400).json({ error: 'Missing key' });
    if (!isValidKey(key)) return res.status(400).json({ error: 'Invalid key' });
    const url = cfg.images && cfg.images[key];
    if (!url) {
      // nothing to do
      return res.json({ ok: true });
    }
    // If it's a local file path starting with images/, try to unlink
    if (typeof url === 'string' && url.startsWith('images/')) {
      const filePath = path.join(__dirname, url);
      try { fs.unlinkSync(filePath); } catch (e) { /* ignore if missing */ }
    }
    // Remove mapping
    delete cfg.images[key];
    writeConfig(cfg);
    res.json({ ok: true });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Server error' });
  }
});

// POST update entire images mapping or change secret: { secret, images, newSecret? }
app.post('/admin/update', (req, res) => {
  try {
    const { secret, images, newSecret } = req.body;
    const cfg = readConfig();
    if (secret !== cfg.secret) return res.status(401).json({ error: 'Unauthorized' });
    if (images && typeof images === 'object') {
      for (const key of Object.keys(images)) {
        if (!isValidKey(key)) return res.status(400).json({ error: `Invalid image key: ${key}` });
      }
      cfg.images = images;
    }
    if (newSecret) cfg.secret = String(newSecret);
    writeConfig(cfg);
    res.json({ ok: true });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Server error' });
  }
});

app.use((err, req, res, next) => {
  if (err) {
    if (err.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({ error: 'Image file is too large. Maximum size is 5MB.' });
    }
    return res.status(400).json({ error: err.message || 'Upload error' });
  }
  next();
});

app.listen(PORT, () => console.log(`Server listening on port ${PORT}`));
