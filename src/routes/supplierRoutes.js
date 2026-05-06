const express = require('express');
const { 
  createSupplierQuote, 
  getAllSupplierQuotes, 
  deleteSupplierQuote, 
  updateSupplierQuote,
  createFolder,
  getFolders,
  deleteFolder
} = require('../controller/supplierController');
const { protect } = require('../middleware/authMiddleware');

const router = express.Router();

// Folder Routes
router.post('/folders', protect, createFolder);
router.get('/folders', protect, getFolders);
router.delete('/folders/:id', protect, deleteFolder);

// Quotation Routes
router.post('/', protect, createSupplierQuote);
router.get('/', protect, getAllSupplierQuotes);
router.put('/:id', protect, updateSupplierQuote);
router.delete('/:id', protect, deleteSupplierQuote);

module.exports = router;
