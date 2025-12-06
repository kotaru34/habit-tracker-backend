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

// --- CHECKINS ---
router.get('/checkins', checkinController.getCheckIns);
router.post('/checkins', checkinController.createCheckIn);

// --- GOALS ---
router.get('/goals', goalController.getGoals);
router.post('/goals', goalController.createGoal);

// --- GOAL STEPS ---
router.get('/goals/:goalId/steps', goalController.getGoalSteps); // get goal steps
router.post('/goals/:goalId/steps', goalController.addGoalStep); // add a new step
router.put('/goal-steps/:stepId', goalController.toggleGoalStep); // check a step as completed

module.exports = router;