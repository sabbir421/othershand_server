const express = require('express');
const { createLaunchPlan, getAllLaunchPlans, deleteLaunchPlan, updateLaunchPlan } = require('../controller/launchController');
const { protect } = require('../middleware/authMiddleware');

const router = express.Router();

router.post('/', protect, createLaunchPlan);
router.get('/', protect, getAllLaunchPlans);
router.put('/:id', protect, updateLaunchPlan);
router.delete('/:id', protect, deleteLaunchPlan);

module.exports = router;
