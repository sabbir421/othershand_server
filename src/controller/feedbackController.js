const FeedbackModel = require('../models/FeedbackModel');

// @desc    Submit Feedback
// @route   POST /api/feedback
// @access  Private
const submitFeedback = async (req, res) => {
  try {
    const { type, rating, subject, message } = req.body;
    
    if (!rating || !subject || !message) {
      return res.status(400).json({ message: 'Please provide rating, subject, and message' });
    }

    const feedback = await FeedbackModel.create({
      userId: req.user.id,
      userName: req.user.name,
      type,
      rating,
      subject,
      message
    });

    res.status(201).json({ message: 'Feedback submitted successfully', feedback });
  } catch (error) {
    console.error('Submit Feedback Error:', error);
    res.status(500).json({ message: 'Server Error submitting feedback' });
  }
};

// @desc    Get All Feedbacks (Admin only)
// @route   GET /api/feedback
// @access  Private/Admin
const getAllFeedbacks = async (req, res) => {
  try {
    const feedbacks = await FeedbackModel.findAll({
      order: [['createdAt', 'DESC']]
    });
    res.json(feedbacks);
  } catch (error) {
    console.error('Get Feedbacks Error:', error);
    res.status(500).json({ message: 'Server Error fetching feedbacks' });
  }
};

// @desc    Update Feedback Status (Admin only)
// @route   PUT /api/feedback/:id
// @access  Private/Admin
const updateFeedbackStatus = async (req, res) => {
  try {
    const { status } = req.body;
    const feedback = await FeedbackModel.findByPk(req.params.id);
    
    if (!feedback) {
      return res.status(404).json({ message: 'Feedback not found' });
    }

    feedback.status = status;
    await feedback.save();

    res.json({ message: 'Feedback status updated', feedback });
  } catch (error) {
    console.error('Update Feedback Error:', error);
    res.status(500).json({ message: 'Server Error updating feedback' });
  }
};

module.exports = {
  submitFeedback,
  getAllFeedbacks,
  updateFeedbackStatus
};
