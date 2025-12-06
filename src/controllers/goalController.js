const pool = require('../config/db');

const getGoals = async (req, res) => {
    try {
        const result = await pool.query(
            'SELECT * FROM goals WHERE user_id = $1 ORDER BY deadline ASC', 
            [req.userId]
        );
        res.json(result.rows);
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
};

const createGoal = async (req, res) => {
    try {
        const { name, description, deadline } = req.body;
        // status automatically set to 'in_progress' by the database (in_progress is default)
        const result = await pool.query(
            'INSERT INTO goals (user_id, name, description, deadline) VALUES ($1, $2, $3, $4) RETURNING *',
            [req.userId, name, description, deadline]
        );
        res.json(result.rows[0]);
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
};

const getGoalSteps = async (req, res) => {
    try {
        const { goalId } = req.params;
        const result = await pool.query(
            'SELECT * FROM goal_steps WHERE goal_id = $1 ORDER BY step_order ASC, id ASC',
            [goalId]
        );
        res.json(result.rows);
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
};

const addGoalStep = async (req, res) => {
    try {
        const { goalId } = req.params;
        const { description } = req.body;
        // by default step_order is 0
        // TODO: In the future, implement logic to set step_order properly
        const result = await pool.query(
            'INSERT INTO goal_steps (goal_id, description) VALUES ($1, $2) RETURNING *',
            [goalId, description]
        );
        res.json(result.rows[0]);
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
};

const toggleGoalStep = async (req, res) => {
    try {
        const { stepId } = req.params;
        const { is_completed } = req.body; 
        const result = await pool.query(
            'UPDATE goal_steps SET is_completed = $1 WHERE id = $2 RETURNING *',
            [is_completed, stepId]
        );
        res.json(result.rows[0]);
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
};

module.exports = { getGoals, createGoal, getGoalSteps, addGoalStep, toggleGoalStep };