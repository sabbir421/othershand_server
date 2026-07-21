const OpenAI = require('openai');
const AdminChatConversation = require('../models/AdminChatConversationModel');
const AdminChatMessage = require('../models/AdminChatMessageModel');

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY || 'dummy_api_key_to_prevent_startup_crash',
});

const SYSTEM_PROMPT = `You are FBA Pilot Admin Assistant — a helpful, sharp AI copilot for FBA Pilot platform administrators.

You help with:
- Amazon FBA strategy, product research, sourcing, pricing, and launch decisions
- Platform operations: users, marketplace listings, payouts, plans, feedback
- Writing clear admin copy, policies, and internal docs
- Brainstorming product/feature ideas for the SaaS

Be concise when possible, structured when useful (bullets, steps). Ask clarifying questions if needed. Do not invent private user data. If asked about live database records you don't have, explain what you would need.`;

const titleFromMessage = (text = '') => {
  const cleaned = String(text).replace(/\s+/g, ' ').trim();
  if (!cleaned) return 'New chat';
  return cleaned.length > 48 ? `${cleaned.slice(0, 48)}…` : cleaned;
};

const ensureConversation = async (conversationId, adminId) => {
  const conversation = await AdminChatConversation.findOne({
    where: { id: conversationId, adminId: String(adminId) },
  });
  if (!conversation) {
    const err = new Error('Conversation not found');
    err.status = 404;
    throw err;
  }
  return conversation;
};

// @desc    List admin AI conversations
// @route   GET /api/admin/ai-chat/conversations
// @access  Admin
const listConversations = async (req, res) => {
  try {
    const conversations = await AdminChatConversation.findAll({
      where: { adminId: String(req.user.id) },
      order: [['updatedAt', 'DESC']],
      attributes: ['id', 'title', 'createdAt', 'updatedAt'],
    });
    res.json(conversations);
  } catch (error) {
    console.error('List admin chats error:', error);
    res.status(500).json({ message: 'Failed to load conversations' });
  }
};

// @desc    Create conversation
// @route   POST /api/admin/ai-chat/conversations
// @access  Admin
const createConversation = async (req, res) => {
  try {
    const title = (req.body?.title || 'New chat').toString().slice(0, 120);
    const conversation = await AdminChatConversation.create({
      adminId: String(req.user.id),
      title,
    });
    res.status(201).json(conversation);
  } catch (error) {
    console.error('Create admin chat error:', error);
    res.status(500).json({ message: 'Failed to create conversation' });
  }
};

// @desc    Get conversation + messages
// @route   GET /api/admin/ai-chat/conversations/:id
// @access  Admin
const getConversation = async (req, res) => {
  try {
    const conversation = await ensureConversation(req.params.id, req.user.id);
    const messages = await AdminChatMessage.findAll({
      where: { conversationId: conversation.id },
      order: [['createdAt', 'ASC']],
      attributes: ['id', 'role', 'content', 'createdAt'],
    });
    res.json({ conversation, messages });
  } catch (error) {
    console.error('Get admin chat error:', error);
    res.status(error.status || 500).json({ message: error.message || 'Failed to load conversation' });
  }
};

// @desc    Rename conversation
// @route   PATCH /api/admin/ai-chat/conversations/:id
// @access  Admin
const renameConversation = async (req, res) => {
  try {
    const conversation = await ensureConversation(req.params.id, req.user.id);
    const title = (req.body?.title || '').toString().trim().slice(0, 120);
    if (!title) {
      return res.status(400).json({ message: 'Title is required' });
    }
    conversation.title = title;
    await conversation.save();
    res.json(conversation);
  } catch (error) {
    console.error('Rename admin chat error:', error);
    res.status(error.status || 500).json({ message: error.message || 'Failed to rename conversation' });
  }
};

// @desc    Delete conversation
// @route   DELETE /api/admin/ai-chat/conversations/:id
// @access  Admin
const deleteConversation = async (req, res) => {
  try {
    const conversation = await ensureConversation(req.params.id, req.user.id);
    await AdminChatMessage.destroy({ where: { conversationId: conversation.id } });
    await conversation.destroy();
    res.json({ message: 'Conversation deleted' });
  } catch (error) {
    console.error('Delete admin chat error:', error);
    res.status(error.status || 500).json({ message: error.message || 'Failed to delete conversation' });
  }
};

// @desc    Send message (SSE stream)
// @route   POST /api/admin/ai-chat/conversations/:id/messages
// @access  Admin
const sendMessage = async (req, res) => {
  const { content } = req.body || {};
  const messageText = (content || '').toString().trim();

  if (!messageText) {
    return res.status(400).json({ message: 'Message content is required' });
  }

  if (!process.env.OPENAI_API_KEY) {
    return res.status(503).json({ message: 'OpenAI API key is not configured on the server' });
  }

  try {
    const conversation = await ensureConversation(req.params.id, req.user.id);

    const userMessage = await AdminChatMessage.create({
      conversationId: conversation.id,
      role: 'user',
      content: messageText,
    });

    // Auto-title first user message
    const messageCount = await AdminChatMessage.count({ where: { conversationId: conversation.id } });
    if (messageCount === 1 || conversation.title === 'New chat') {
      conversation.title = titleFromMessage(messageText);
    }
    conversation.changed('updatedAt', true);
    await conversation.save();

    const history = await AdminChatMessage.findAll({
      where: { conversationId: conversation.id },
      order: [['createdAt', 'ASC']],
      attributes: ['role', 'content'],
      limit: 40,
    });

    const openaiMessages = [
      { role: 'system', content: SYSTEM_PROMPT },
      ...history
        .filter((m) => m.role === 'user' || m.role === 'assistant')
        .map((m) => ({ role: m.role, content: m.content })),
    ];

    res.setHeader('Content-Type', 'text/event-stream; charset=utf-8');
    res.setHeader('Cache-Control', 'no-cache, no-transform');
    res.setHeader('Connection', 'keep-alive');
    res.flushHeaders?.();

    const writeEvent = (event, data) => {
      res.write(`event: ${event}\n`);
      res.write(`data: ${JSON.stringify(data)}\n\n`);
    };

    writeEvent('user_message', {
      id: userMessage.id,
      role: userMessage.role,
      content: userMessage.content,
      createdAt: userMessage.createdAt,
      conversation: {
        id: conversation.id,
        title: conversation.title,
        updatedAt: conversation.updatedAt,
      },
    });

    const stream = await openai.chat.completions.create({
      model: process.env.OPENAI_CHAT_MODEL || process.env.OPENAI_RESPONSES_MODEL || 'gpt-4o-mini',
      messages: openaiMessages,
      temperature: Number(process.env.OPENAI_CHAT_TEMPERATURE || 0.7),
      stream: true,
    });

    let assistantText = '';

    for await (const chunk of stream) {
      const delta = chunk.choices?.[0]?.delta?.content || '';
      if (!delta) continue;
      assistantText += delta;
      writeEvent('delta', { content: delta });
    }

    const assistantMessage = await AdminChatMessage.create({
      conversationId: conversation.id,
      role: 'assistant',
      content: assistantText || '…',
    });

    conversation.changed('updatedAt', true);
    await conversation.save();

    writeEvent('done', {
      id: assistantMessage.id,
      role: assistantMessage.role,
      content: assistantMessage.content,
      createdAt: assistantMessage.createdAt,
      conversation: {
        id: conversation.id,
        title: conversation.title,
        updatedAt: conversation.updatedAt,
      },
    });

    res.write('event: close\ndata: {}\n\n');
    res.end();
  } catch (error) {
    console.error('Admin AI chat stream error:', error);

    if (res.headersSent) {
      res.write(`event: error\ndata: ${JSON.stringify({ message: error.message || 'Stream failed' })}\n\n`);
      return res.end();
    }

    res.status(error.status || 500).json({
      message: error.message || 'Failed to send message',
    });
  }
};

module.exports = {
  listConversations,
  createConversation,
  getConversation,
  renameConversation,
  deleteConversation,
  sendMessage,
};
