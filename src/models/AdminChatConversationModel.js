const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const AdminChatConversation = sequelize.define('AdminChatConversation', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
  },
  adminId: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  title: {
    type: DataTypes.STRING,
    allowNull: false,
    defaultValue: 'New chat',
  },
}, {
  timestamps: true,
  indexes: [
    { fields: ['adminId'] },
    { fields: ['updatedAt'] },
  ],
});

module.exports = AdminChatConversation;
