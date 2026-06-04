'use strict';

const express = require('express');
const fs = require('fs');
const path = require('path');
const { requireApiAuth } = require('../middleware/auth');
const { verifyApiCsrf } = require('../middleware/csrf');
const { uploadDir, deleteUpload } = require('../services/uploadService');
const { getSlugsByImagePath } = require('../repositories/presellRepository');

const router = express.Router();

const IMAGE_EXTENSIONS = new Set(['.jpg', '.jpeg', '.png', '.webp', '.gif']);

router.get('/', requireApiAuth, (req, res) => {
  let files;
  try {
    files = fs.readdirSync(uploadDir);
  } catch {
    return res.json({ images: [] });
  }

  const images = files
    .filter(f => IMAGE_EXTENSIONS.has(path.extname(f).toLowerCase()))
    .map(filename => {
      const stat = fs.statSync(path.join(uploadDir, filename));
      return {
        url: `/media/${filename}`,
        filename,
        size: stat.size,
        createdAt: stat.birthtime.toISOString(),
      };
    })
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

  res.json({ images });
});

router.delete('/:filename', requireApiAuth, verifyApiCsrf, (req, res) => {
  const { filename } = req.params;
  const filePath = path.join(uploadDir, filename);

  if (!fs.existsSync(filePath)) {
    return res.status(404).json({ error: 'Arquivo não encontrado' });
  }

  const usedBy = getSlugsByImagePath(filename);

  if (req.query.check === 'true') {
    return res.json({ usedBy });
  }

  deleteUpload(filename);
  res.json({ success: true });
});

module.exports = router;
