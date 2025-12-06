const pool = require('../config/db');

const createCheckIn = async (req, res) => {
    try {
        const { habit_id, date } = req.body;

        const newCheckIn = await pool.query(
            `INSERT INTO check_ins (habit_id, checkin_date) 
             VALUES ($1, $2) 
             ON CONFLICT (habit_id, checkin_date) DO NOTHING 
             RETURNING *`,
            [habit_id, date]
        );
        
        if (newCheckIn.rows.length === 0) {
             return res.json({ message: "Already checked in", habit_id, checkin_date: date });
        }

        res.json(newCheckIn.rows[0]);
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
};

const getCheckIns = async (req, res) => {
    try {
        const query = `
            SELECT c.checkin_date, c.habit_id 
            FROM check_ins c
            JOIN habits h ON c.habit_id = h.id
            WHERE h.user_id = $1
        `;
        const result = await pool.query(query, [req.userId]);

        const formattedData = result.rows.map(row => ({
            habit_id: row.habit_id,
            checkin_date: new Date(row.checkin_date).toISOString().split('T')[0]
        }));

        res.json(formattedData);
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
};

module.exports = { createCheckIn, getCheckIns };