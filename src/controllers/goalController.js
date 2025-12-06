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

const updateGoal = async (req, res) => {
    try {
        const { id } = req.params;
        const { name, description, deadline, status } = req.body;
        
        // can be empty, set to null
        const deadlineVal = deadline && deadline.trim() !== "" ? deadline : null;

        const result = await pool.query(
            'UPDATE goals SET name = $1, description = $2, deadline = $3, status = $4 WHERE id = $5 AND user_id = $6 RETURNING *',
            [name, description, deadlineVal, status || 'in_progress', id, req.userId]
        );
        
        if (result.rows.length === 0) return res.status(404).json({ message: "Goal not found" });
        res.json(result.rows[0]);
    } catch (err) { console.error(err); res.status(500).send('Server Error'); }
};

const deleteGoal = async (req, res) => {
    try {
        const { id } = req.params;
        const result = await pool.query('DELETE FROM goals WHERE id = $1 AND user_id = $2 RETURNING *', [id, req.userId]);
        if (result.rows.length === 0) return res.status(404).json({ message: "Goal not found" });
        res.json({ message: "Goal deleted" });
    } catch (err) { console.error(err); res.status(500).send('Server Error'); }
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

const updateGoalStep = async (req, res) => {
    try {
        const { stepId } = req.params;
        const { description, is_completed } = req.body;

        const current = await pool.query('SELECT * FROM goal_steps WHERE id = $1', [stepId]);
        if (current.rows.length === 0) return res.status(404).json({ message: "Step not found" });

        const newDesc = description !== undefined ? description : current.rows[0].description;
        const newStatus = is_completed !== undefined ? is_completed : current.rows[0].is_completed;

        const result = await pool.query(
            'UPDATE goal_steps SET description = $1, is_completed = $2 WHERE id = $3 RETURNING *',
            [newDesc, newStatus, stepId]
        );
        res.json(result.rows[0]);
    } catch (err) { console.error(err); res.status(500).send('Server Error'); }
};

const deleteGoalStep = async (req, res) => {
    try {
        const { stepId } = req.params;
        await pool.query('DELETE FROM goal_steps WHERE id = $1', [stepId]);
        res.json({ message: "Step deleted" });
    } catch (err) { console.error(err); res.status(500).send('Server Error'); }
};

module.exports = { getGoals, createGoal, updateGoal, deleteGoal, getGoalSteps, addGoalStep, updateGoalStep, deleteGoalStep };