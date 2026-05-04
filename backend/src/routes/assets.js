const path = require("path");
const express = require("express");
const { uploadDir } = require("../services/uploadService");

const router = express.Router();

router.get("/:file", (req, res) => {
  const fileName = path.basename(req.params.file);
  res.sendFile(path.join(uploadDir, fileName));
});

module.exports = router;
