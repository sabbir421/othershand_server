const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');
const bcrypt = require('bcryptjs');

const SellerModel = sequelize.define('Seller', {
  id: {
    type: DataTypes.INTEGER,
    autoIncrement: true,
    primaryKey: true,
  },
  firstName: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  email: {
    type: DataTypes.STRING,
    unique: true,
    allowNull: false,
    validate: { isEmail: true }
  },
  password: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  country: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  phone: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  experienceYears: {
    type: DataTypes.INTEGER,
    allowNull: false,
  },
  status: {
    type: DataTypes.ENUM('active', 'inactive', 'pending'),
    defaultValue: 'active',
  },
  resetOtp: {
    type: DataTypes.STRING,
  },
  resetOtpExpires: {
    type: DataTypes.DATE,
  },
  isVerified: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
  },
  verificationOtp: {
    type: DataTypes.STRING,
  },
  verificationOtpExpires: {
    type: DataTypes.DATE,
  },
}, {
  tableName: 'sellers',
  timestamps: true,
  hooks: {
    beforeCreate: async (seller) => {
      const salt = await bcrypt.genSalt(10);
      seller.password = await bcrypt.hash(seller.password, salt);
    },
    beforeUpdate: async (seller) => {
      if (seller.changed('password')) {
        const salt = await bcrypt.genSalt(10);
        seller.password = await bcrypt.hash(seller.password, salt);
      }
    }
  }
});

SellerModel.prototype.comparePassword = async function (enteredPassword) {
  return await bcrypt.compare(enteredPassword, this.password);
};

module.exports = SellerModel;
