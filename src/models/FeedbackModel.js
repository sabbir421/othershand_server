const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const FeedbackModel = sequelize.define('Feedback', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
  },
  userId: {
    type: DataTypes.UUID,
    allowNull: false,
  },
  userName: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  type: {
    type: DataTypes.ENUM('feature', 'bug', 'improvement', 'other'),
    defaultValue: 'other',
  },
  rating: {
    type: DataTypes.INTEGER,
    allowNull: false,
    validate: { min: 1, max: 5 }
  },
  subject: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  message: {
    type: DataTypes.TEXT,
    allowNull: false,
  },
  status: {
    type: DataTypes.ENUM('pending', 'reviewed', 'resolved'),
    defaultValue: 'pending',
  }
}, {
  timestamps: true,
});

module.exports = FeedbackModel;
