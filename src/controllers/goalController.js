const pool = require('../config/db');

const getGoals = async (req, res) => {
  try {
    const query = `
      SELECT g.*, 
        (SELECT COUNT(*)::int FROM goal_steps WHERE goal_id = g.id) as total_steps,
        (SELECT COUNT(*)::int FROM goal_steps WHERE goal_id = g.id AND is_completed = TRUE) as completed_steps
      FROM goals g
      WHERE user_id = $1
      ORDER BY deadline ASC NULLS LAST, id ASC
    `;
    const result = await pool.query(query, [req.userId]);

    const today = new Date();
    const todayDateOnly = new Date(today.toISOString().slice(0, 10));

    const goals = result.rows.map((g) => {
      const total = g.total_steps || 0;
      const completed = g.completed_steps || 0;
      const hasDeadline = !!g.deadline;

      const deadlineDate = hasDeadline ? new Date(g.deadline) : null;

      let status = 'in_progress';

      if (total > 0 && completed === total) {
        status = 'completed';
      }
      else if (hasDeadline && deadlineDate < todayDateOnly && completed < total) {
        status = 'overdue';
      }
      else {
        status = 'in_progress';
      }

      return { ...g, status };
    });

    res.json(goals);
  } catch (err) {
    console.error(err);
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
    const { name, description, deadline } = req.body;
    
    const deadlineVal = deadline && deadline.trim() !== "" ? deadline : null;

    const result = await pool.query(
      'UPDATE goals SET name = $1, description = $2, deadline = $3 WHERE id = $4 AND user_id = $5 RETURNING *',
      [name, description, deadlineVal, id, req.userId]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({ message: "Goal not found" });
    }

    res.json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).send('Server Error');
  }
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