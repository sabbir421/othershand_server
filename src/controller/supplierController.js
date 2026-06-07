const SupplierModel = require('../models/SupplierModel');
const QuotationFolderModel = require('../models/QuotationFolderModel');
const { calculateQuoteCosts } = require('../utils/supplierQuoteCalculations');

const NUMERIC_FIELDS = [
  'unitPrice', 'packagingPrice', 'shippingAir', 'shippingSea',
  'samplePrice', 'sampleCost', 'shippingCost', 'quantity', 'moq', 'leadTime',
];

const normalizeQuotePayload = (data) => {
  const payload = { ...data };

  NUMERIC_FIELDS.forEach((field) => {
    if (payload[field] === '' || payload[field] === undefined) {
      payload[field] = null;
    }
  });

  if (payload.sampleCost != null && payload.samplePrice == null) {
    payload.samplePrice = payload.sampleCost;
  }

  payload.shippingAirType = payload.shippingAirType === 'per_unit' ? 'per_unit' : 'total';
  payload.shippingSeaType = payload.shippingSeaType === 'per_unit' ? 'per_unit' : 'total';

  const costs = calculateQuoteCosts(payload);

  return {
    ...payload,
    quantity: costs.quantity,
    finalUnitPriceAir: costs.finalUnitPriceAir,
    finalUnitPriceSea: costs.finalUnitPriceSea,
  };
};

// --- FOLDER MANAGEMENT ---

const createFolder = async (req, res) => {
  try {
    const { folderName } = req.body;
    if (!folderName) return res.status(400).json({ message: 'Folder name is required' });

    const folder = await QuotationFolderModel.create({
      userId: req.user.id,
      folderName,
    });
    res.status(201).json(folder);
  } catch (error) {
    console.error('Create Folder Error:', error);
    res.status(500).json({ message: 'Server Error creating folder' });
  }
};

const getFolders = async (req, res) => {
  try {
    const folders = await QuotationFolderModel.findAll({
      where: { userId: req.user.id },
      include: [{ model: SupplierModel, as: 'quotes' }],
      order: [['createdAt', 'DESC']],
    });
    res.json(folders);
  } catch (error) {
    console.error('Get Folders Error:', error);
    res.status(500).json({ message: 'Server Error fetching folders' });
  }
};

const deleteFolder = async (req, res) => {
  try {
    const folder = await QuotationFolderModel.findOne({
      where: { id: req.params.id, userId: req.user.id },
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

const createSupplierQuote = async (req, res) => {
  try {
    const payload = normalizeQuotePayload(req.body);

    const quote = await SupplierModel.create({
      userId: req.user.id,
      ...payload,
    });

    res.status(201).json(quote);
  } catch (error) {
    console.error('Supplier Quote Error:', error);
    res.status(500).json({ message: 'Server Error saving quotation' });
  }
};

const getAllSupplierQuotes = async (req, res) => {
  try {
    const quotes = await SupplierModel.findAll({
      where: { userId: req.user.id },
      include: [{ model: QuotationFolderModel, as: 'folder' }],
      order: [['createdAt', 'DESC']],
    });
    res.json(quotes);
  } catch (error) {
    console.error('Get Supplier Quotes Error:', error);
    res.status(500).json({ message: 'Server Error fetching quotations' });
  }
};

const deleteSupplierQuote = async (req, res) => {
  try {
    const quote = await SupplierModel.findOne({
      where: { id: req.params.id, userId: req.user.id },
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

const updateSupplierQuote = async (req, res) => {
  try {
    const payload = normalizeQuotePayload(req.body);

    const quote = await SupplierModel.findOne({
      where: { id: req.params.id, userId: req.user.id },
    });

    if (!quote) return res.status(404).json({ message: 'Quotation not found' });

    await quote.update(payload);

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
  updateSupplierQuote,
};
