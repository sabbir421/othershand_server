const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const UserModel = sequelize.define('User', {
  id: {
    type: DataTypes.INTEGER,
    autoIncrement: true,
    primaryKey: true,
  },
  name: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  email: {
    type: DataTypes.STRING,
    allowNull: false,
    unique: true,
  },
  password: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  plan: {
    type: DataTypes.ENUM('free', 'pro'),
    defaultValue: 'free',
  },
  role: {
    type: DataTypes.ENUM('user', 'admin'),
    defaultValue: 'user',
  },
  stripeCustomerId: {
    type: DataTypes.STRING,
  },
  stripeSubscriptionId: {
    type: DataTypes.STRING,
  },
  paddleCustomerId: {
    type: DataTypes.STRING,
  },
  paddleSubscriptionId: {
    type: DataTypes.STRING,
  },
  subscriptionStatus: {
    type: DataTypes.STRING,
    defaultValue: 'inactive', // inactive, active, past_due, canceled
  },
}, {
  tableName: 'users',
  timestamps: true,
});

module.exports = UserModel;
