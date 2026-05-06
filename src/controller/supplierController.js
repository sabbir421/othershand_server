const SupplierModel = require('../models/SupplierModel');
const QuotationFolderModel = require('../models/QuotationFolderModel');

// --- FOLDER MANAGEMENT ---

// @desc    Create new quotation folder
// @route   POST /api/suppliers/folders
// @access  Private
const createFolder = async (req, res) => {
  try {
    const { folderName } = req.body;
    if (!folderName) return res.status(400).json({ message: 'Folder name is required' });

    const folder = await QuotationFolderModel.create({
      userId: req.user.id,
      folderName
    });
    res.status(201).json(folder);
  } catch (error) {
    console.error('Create Folder Error:', error);
    res.status(500).json({ message: 'Server Error creating folder' });
  }
};

// @desc    Get all folders for user
// @route   GET /api/suppliers/folders
// @access  Private
const getFolders = async (req, res) => {
  try {
    const folders = await QuotationFolderModel.findAll({
      where: { userId: req.user.id },
      include: [{ model: SupplierModel, as: 'quotes' }],
      order: [['createdAt', 'DESC']]
    });
    res.json(folders);
  } catch (error) {
    console.error('Get Folders Error:', error);
    res.status(500).json({ message: 'Server Error fetching folders' });
  }
};

// @desc    Delete folder
// @route   DELETE /api/suppliers/folders/:id
// @access  Private
const deleteFolder = async (req, res) => {
  try {
    const folder = await QuotationFolderModel.findOne({
      where: { id: req.params.id, userId: req.user.id }
    });
    if (!folder) return res.status(404).json({ message: 'Folder not found' });

    await folder.destroy();
    res.json({ message: 'Folder removed' });
  } catch (error) {
    console.error('Delete Folder Error:', error);
    res.status(500).json({ message: 'Server Error deleting folder' });
  }
};

// --- QUOTATION MANAGEMENT ---

// @desc    Save new supplier quotation
// @route   POST /api/suppliers
// @access  Private
const createSupplierQuote = async (req, res) => {
  try {
    const data = { ...req.body };
    
    // Clean empty strings for numeric fields
    const numericFields = [
      'unitPrice', 'packagingPrice', 'shippingAir', 'shippingSea', 'samplePrice'
    ];
    
    numericFields.forEach(field => {
      if (data[field] === '' || data[field] === undefined) {
        data[field] = null;
      }
    });

    // Auto-calculate Final Unit Prices for DB
    const unitPrice = parseFloat(data.unitPrice || 0);
    const pkgPrice = parseFloat(data.packagingPrice || 0);
    const sAir = parseFloat(data.shippingAir || 0);
    const sSea = parseFloat(data.shippingSea || 0);

    const finalAir = unitPrice + pkgPrice + sAir;
    const finalSea = unitPrice + pkgPrice + sSea;

    const quote = await SupplierModel.create({
      userId: req.user.id,
      ...data,
      finalUnitPriceAir: finalAir,
      finalUnitPriceSea: finalSea
    });

    res.status(201).json(quote);
  } catch (error) {
    console.error('Supplier Quote Error:', error);
    res.status(500).json({ message: 'Server Error saving quotation' });
  }
};

// @desc    Get all supplier quotes for user
// @route   GET /api/suppliers
// @access  Private
const getAllSupplierQuotes = async (req, res) => {
  try {
    const quotes = await SupplierModel.findAll({
      where: { userId: req.user.id },
      include: [{ model: QuotationFolderModel, as: 'folder' }],
      order: [['createdAt', 'DESC']]
    });
    res.json(quotes);
  } catch (error) {
    console.error('Get Supplier Quotes Error:', error);
    res.status(500).json({ message: 'Server Error fetching quotations' });
  }
};

// @desc    Delete supplier quote
// @route   DELETE /api/suppliers/:id
// @access  Private
const deleteSupplierQuote = async (req, res) => {
  try {
    const quote = await SupplierModel.findOne({
      where: { id: req.params.id, userId: req.user.id }
    });

    if (!quote) {
      return res.status(404).json({ message: 'Quotation not found' });
    }

    await quote.destroy();
    res.json({ message: 'Quotation removed' });
  } catch (error) {
    console.error('Delete Supplier Quote Error:', error);
    res.status(500).json({ message: 'Server Error deleting quotation' });
  }
};

// @desc    Update supplier quote
// @route   PUT /api/suppliers/:id
// @access  Private
const updateSupplierQuote = async (req, res) => {
  try {
    const data = { ...req.body };
    const numericFields = ['unitPrice', 'packagingPrice', 'shippingAir', 'shippingSea', 'samplePrice'];
    numericFields.forEach(field => {
      if (data[field] === '' || data[field] === undefined) data[field] = null;
    });

    const unitPrice = parseFloat(data.unitPrice || 0);
    const pkgPrice = parseFloat(data.packagingPrice || 0);
    const sAir = parseFloat(data.shippingAir || 0);
    const sSea = parseFloat(data.shippingSea || 0);
    const finalAir = unitPrice + pkgPrice + sAir;
    const finalSea = unitPrice + pkgPrice + sSea;

    const quote = await SupplierModel.findOne({
      where: { id: req.params.id, userId: req.user.id }
    });

    if (!quote) return res.status(404).json({ message: 'Quotation not found' });

    await quote.update({
      ...data,
      finalUnitPriceAir: finalAir,
      finalUnitPriceSea: finalSea
    });

    res.json(quote);
  } catch (error) {
    console.error('Update Supplier Quote Error:', error);
    res.status(500).json({ message: 'Server Error updating quotation' });
  }
};

module.exports = {
  createFolder,
  getFolders,
  deleteFolder,
  createSupplierQuote,
  getAllSupplierQuotes,
  deleteSupplierQuote,
  updateSupplierQuote
};
