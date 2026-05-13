const fs = require('fs');
const path = require('path');
const cloudinary = require('cloudinary').v2;
const streamifier = require('streamifier');

// configure from env (CLOUDINARY_URL or CLOUDINARY_CLOUD_NAME/API_KEY/API_SECRET)
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

const ASSETS_FILE = path.resolve(__dirname, '../../../uploads/assets.json');
const LEGACY_ASSETS_FILE = path.resolve(__dirname, '../../uploads/assets.json');

function saveAssets(data) {
  try {
    fs.mkdirSync(path.dirname(ASSETS_FILE), { recursive: true });
    fs.writeFileSync(ASSETS_FILE, JSON.stringify(data, null, 2));
    console.log('Assets file saved', ASSETS_FILE);
  } catch (e) {
    console.error('Failed to save assets file', e);
  }
}

function loadAssets() {
  try {
    // Prefer canonical assets file under server/uploads
    if (fs.existsSync(ASSETS_FILE)) {
      return JSON.parse(fs.readFileSync(ASSETS_FILE, 'utf8') || '{}');
    }

    // If legacy assets exist under server/src/uploads, attempt migration
    if (fs.existsSync(LEGACY_ASSETS_FILE)) {
      try {
        const legacy = JSON.parse(fs.readFileSync(LEGACY_ASSETS_FILE, 'utf8') || '{}');
        const migrated = {};
        const newDir = path.resolve(__dirname, '../../../uploads/assets');
        fs.mkdirSync(newDir, { recursive: true });

        for (const [key, val] of Object.entries(legacy)) {
          if (val && val.path && fs.existsSync(val.path)) {
            const srcPath = val.path;
            const filename = path.basename(srcPath);
            const destPath = path.join(newDir, filename);
            try {
              if (!fs.existsSync(destPath)) fs.renameSync(srcPath, destPath);
              const hostUrl = 'https://bestodds-bookings.onrender.com:' + (process.env.PORT || 5000);
              migrated[key] = { url: hostUrl + `/uploads/assets/${filename}`, local: true, path: destPath };
            } catch (e) {
              console.error('Failed to migrate asset file', srcPath, e.message);
              // keep original URL if present
              migrated[key] = val;
            }
          } else if (val && val.url) {
            migrated[key] = val;
          }
        }

        saveAssets(migrated);
        try { fs.unlinkSync(LEGACY_ASSETS_FILE); } catch (e) {}
        return migrated;
      } catch (e) {
        console.error('Failed to load legacy assets file', e);
        return {};
      }
    }

    return {};
  } catch (e) {
    console.error('Failed to load assets file', e);
    return {};
  }
}

exports.uploadAsset = async (req, res) => {
  try {
    console.log('uploadAsset called', { type: req.body.type, file: req.file && req.file.originalname });
    const type = req.body.type; // logo|background|flyer
    if (!type) return res.status(400).json({ message: 'missing_type' });
    if (!req.file || !req.file.buffer) return res.status(400).json({ message: 'missing_file' });
    // attempt Cloudinary upload first (if configured)
    const doCloudinary = process.env.CLOUDINARY_API_KEY && process.env.CLOUDINARY_API_SECRET && process.env.CLOUDINARY_CLOUD_NAME;
    if (doCloudinary) {
      const stream = cloudinary.uploader.upload_stream({ resource_type: 'auto', folder: `bestodds/${type}` }, (error, result) => {
        if (error) {
          console.error('Cloudinary upload error', error);
          // fall through to local save
        } else if (result) {
          const assets = loadAssets();
          assets[type] = { url: result.secure_url, public_id: result.public_id, raw: result };
          saveAssets(assets);
          return res.json({ asset: assets[type] });
        }

        // If Cloudinary failed, save locally below
        try {
          const ext = path.extname(req.file.originalname || '') || '';
          const filename = `${type}-${Date.now()}${ext}`;
          const dir = path.resolve(__dirname, '../../../uploads/assets');
          fs.mkdirSync(dir, { recursive: true });
          const outPath = path.join(dir, filename);
              fs.writeFileSync(outPath, req.file.buffer);
              // verify file was written
              const written = fs.existsSync(outPath);
              if (!written) {
                console.error('Local save reported success but file missing at', outPath);
                return res.status(500).json({ message: 'upload_failed', error: 'file_not_written' });
              }
              const hostUrl = req.protocol + '://' + req.get('host');
              const assets = loadAssets();
              assets[type] = { url: hostUrl + `/uploads/assets/${filename}`, local: true, path: outPath };
              saveAssets(assets);
              console.log('Saved asset locally', { type, outPath, url: assets[type].url });
              return res.json({ asset: assets[type] });
        } catch (e) {
          console.error('Local save fallback failed', e);
          return res.status(500).json({ message: 'upload_failed', error: e.message });
        }
      });

      stream.on('error', (e) => {
        console.error('cloudinary stream error', e && e.message);
      });

      try {
        streamifier.createReadStream(req.file.buffer).pipe(stream);
      } catch (e) {
        console.error('streamifier pipe failed', e && e.message);
      }
      return;
    }

    // Cloudinary not configured: save locally
    try {
      const ext = path.extname(req.file.originalname || '') || '';
      const filename = `${type}-${Date.now()}${ext}`;
      const dir = path.resolve(__dirname, '../../../uploads/assets');
      console.log('Local save (no cloudinary) starting', { dir, filename, bufferLength: req.file.buffer && req.file.buffer.length });
      fs.mkdirSync(dir, { recursive: true });
      const outPath = path.join(dir, filename);
      fs.writeFileSync(outPath, req.file.buffer);
      const written = fs.existsSync(outPath);
      console.log('Local save wrote file', { outPath, written });
      if (!written) {
        console.error('Local save reported success but file missing at', outPath);
        return res.status(500).json({ message: 'upload_failed', error: 'file_not_written' });
      }
      const hostUrl = req.protocol + '://' + req.get('host');
      const assets = loadAssets();
      assets[type] = { url: hostUrl + `/uploads/assets/${filename}`, local: true, path: outPath };
      saveAssets(assets);
      console.log('Saved asset locally (no cloudinary)', { type, outPath, url: assets[type].url });
      return res.json({ asset: assets[type] });
    } catch (e) {
      console.error('Local save failed', e);
      return res.status(500).json({ message: 'upload_failed', error: e.message });
    }
  } catch (err) {
    console.error('Asset upload failed', err);
    res.status(500).json({ message: 'server_error' });
  }
};

exports.getCurrent = (req, res) => {
  try {
    const assets = loadAssets();

    // Provide local fallback for logo (page_logo.png) if Cloudinary asset missing
    if ((!assets.logo || !assets.logo.url) ) {
      const localLogo = path.resolve(__dirname, '../../../uploads/page_logo.png');
      if (fs.existsSync(localLogo)) {
        const hostUrl = req.protocol + '://' + req.get('host');
        assets.logo = assets.logo || {};
        assets.logo.url = hostUrl + '/uploads/page_logo.png';
        assets.logo.fallback = true;
      }
    }

    res.json({ assets });
  } catch (err) {
    res.status(500).json({ message: 'server_error' });
  }
};

module.exports = exports;
