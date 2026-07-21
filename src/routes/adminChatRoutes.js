const express = require('express');
const { protect, admin } = require('../middleware/authMiddleware');
const {
  listConversations,
  createConversation,
  getConversation,
  renameConversation,
  deleteConversation,
  sendMessage,
} = require('../controller/adminChatController');

const router = express.Router();

router.get('/conversations', protect, admin, listConversations);
router.post('/conversations', protect, admin, createConversation);
router.get('/conversations/:id', protect, admin, getConversation);
router.patch('/conversations/:id', protect, admin, renameConversation);
router.delete('/conversations/:id', protect, admin, deleteConversation);
router.post('/conversations/:id/messages', protect, admin, sendMessage);

module.exports = router;
