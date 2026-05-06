const jwt = require('jsonwebtoken');

const generateToken = (id) => {
  return jwt.sign({ id }, 'doorap_fba_secret_2026', {
    expiresIn: '30d',
  });
};

module.exports = generateToken;
