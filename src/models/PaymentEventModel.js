const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const PaymentEventModel = sequelize.define(
  'PaymentEvent',
  {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
    },
    provider: {
      type: DataTypes.ENUM('paddle', 'stripe', 'system'),
      allowNull: false,
    },
    eventId: {
      type: DataTypes.STRING(255),
      allowNull: false,
      unique: true,
    },
    eventType: {
      type: DataTypes.STRING(128),
      allowNull: false,
    },
    referenceType: {
      type: DataTypes.STRING(32),
      allowNull: true,
    },
    referenceId: {
      type: DataTypes.INTEGER,
      allowNull: true,
    },
    payload: {
      type: DataTypes.JSON,
      allowNull: true,
    },
    processedAt: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
    },
  },
  {
    tableName: 'payment_events',
    timestamps: true,
    updatedAt: false,
  }
);

module.exports = PaymentEventModel;
