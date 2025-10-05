const express = require('express');
const router = express.Router();
const Machine = require('../models/Machine');
const { protect, adminOnly } = require('../middlewares/authMiddleware');

router.get('/', async (req, res) => {
  try {
    const machines = await Machine.find();
    res.json(machines);
  } catch (err) {
    console.error('Error fetching machines:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

router.post('/', protect, adminOnly, async (req, res) => {
  try {
    const { name, averageProcessingTime } = req.body;

    const existingMachine = await Machine.findOne({ name });
    if (existingMachine) {
      return res.status(400).json({ message: 'Machine already exists' });
    }

    const machine = new Machine({
      name,
      averageProcessingTime: averageProcessingTime || 15
    });

    await machine.save();
    res.status(201).json(machine);
  } catch (err) {
    console.error('Error adding machine:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

// Update machine status (admin only)
router.put('/:id', protect, adminOnly, async (req, res) => {
  try {
    const { isActive, averageProcessingTime } = req.body;
    const machine = await Machine.findById(req.params.id);

    if (!machine) {
      return res.status(404).json({ message: 'Machine not found' });
    }

    if (isActive !== undefined) machine.isActive = isActive;
    if (averageProcessingTime) machine.averageProcessingTime = averageProcessingTime;

    await machine.save();
    res.json(machine);
  } catch (err) {
    console.error('Error updating machine:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;