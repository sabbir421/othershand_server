const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');
const AdminChatConversation = require('./AdminChatConversationModel');

const AdminChatMessage = sequelize.define('AdminChatMessage', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
  },
  conversationId: {
    type: DataTypes.UUID,
    allowNull: false,
    references: {
      model: AdminChatConversation,
      key: 'id',
    },
    onDelete: 'CASCADE',
  },
  role: {
    type: DataTypes.ENUM('user', 'assistant', 'system'),
    allowNull: false,
  },
  content: {
    type: DataTypes.TEXT('long'),
    allowNull: false,
  },
}, {
  timestamps: true,
  indexes: [
    { fields: ['conversationId'] },
    { fields: ['createdAt'] },
  ],
});

AdminChatConversation.hasMany(AdminChatMessage, {
  foreignKey: 'conversationId',
  as: 'messages',
  onDelete: 'CASCADE',
});

AdminChatMessage.belongsTo(AdminChatConversation, {
  foreignKey: 'conversationId',
  as: 'conversation',
});

module.exports = AdminChatMessage;
