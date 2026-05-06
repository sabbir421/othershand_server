const express = require('express');
const upload = require('../utils/s3Upload');
const { protect } = require('../middleware/authMiddleware');

const router = express.Router();

// @desc    Upload multiple images
// @route   POST /api/upload
// @access  Private
router.post('/', protect, upload.array('images', 5), (req, res) => {
  try {
    if (!req.files || req.files.length === 0) {
      return res.status(400).json({ message: 'No files uploaded' });
    }

    const urls = req.files.map(file => file.location);
    res.json({ urls });
  } catch (error) {
    console.error('Upload Error:', error);
    res.status(500).json({ message: 'Server Error during upload' });
  }
});

module.exports = router;
