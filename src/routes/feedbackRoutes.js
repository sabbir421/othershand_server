const express = require('express');
const { submitFeedback, getAllFeedbacks, updateFeedbackStatus, getMyFeedbacks } = require('../controller/feedbackController');
const { protect, admin } = require('../middleware/authMiddleware');

const router = express.Router();

router.post('/', protect, submitFeedback);
router.get('/my', protect, getMyFeedbacks);
router.get('/', protect, admin, getAllFeedbacks);
router.put('/:id', protect, admin, updateFeedbackStatus);

module.exports = router;
