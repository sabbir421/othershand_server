const express = require('express');
const { createResearch, getAllResearch, deleteResearch } = require('../controller/researchController');
const { protect } = require('../middleware/authMiddleware');

const router = express.Router();

router.post('/', protect, createResearch);
router.get('/', protect, getAllResearch);
router.delete('/:id', protect, deleteResearch);

module.exports = router;
