const express = require('express');
const router = express.Router();

const habitController = require('../controllers/habitController');
const checkinController = require('../controllers/checkinController');
const categoryController = require('../controllers/categoryController');
const goalController = require('../controllers/goalController');
const getUserId = require('../middleware/userMiddleware');

// Middleware authentication (simulation) for all routes
router.use(getUserId);

// --- CATEGORIES ---
router.get('/categories', categoryController.getCategories);

// --- HABITS ---
router.get('/habits', habitController.getHabits);
router.post('/habits', habitController.createHabit);
router.put('/habits/:id', habitController.updateHabit);
router.delete('/habits/:id', habitController.deleteHabit);

// --- CHECKINS ---
router.get('/checkins', checkinController.getCheckIns);
router.post('/checkins', checkinController.createCheckIn);

// --- GOALS ---
router.get('/goals', goalController.getGoals);
router.post('/goals', goalController.createGoal);
router.put('/goals/:id', goalController.updateGoal);
router.delete('/goals/:id', goalController.deleteGoal);

// --- GOAL STEPS ---
router.get('/goals/:goalId/steps', goalController.getGoalSteps);
router.post('/goals/:goalId/steps', goalController.addGoalStep);
router.put('/goal-steps/:stepId', goalController.updateGoalStep);
router.delete('/goal-steps/:stepId', goalController.deleteGoalStep);

module.exports = router;