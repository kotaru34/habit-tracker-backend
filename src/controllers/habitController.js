const pool = require('../config/db');

const getHabits = async (req, res) => {
    try {
        const query = `
            SELECT h.*, c.name as category_name, c.color as category_color 
            FROM habits h
            LEFT JOIN categories c ON h.category_id = c.id
            WHERE h.user_id = $1 AND h.is_archived = FALSE
            ORDER BY h.id ASC
        `;
        const result = await pool.query(query, [req.userId]);
        
        // Postres returns TIME as "HH:MM:SS", sometimes frontend needs to trim seconds,
        // but for now we return as is.
        res.json(result.rows);
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
};

const createHabit = async (req, res) => {
    try {
        const { name, description, category_id, frequency, reminder_time } = req.body;
        
        const freqData = frequency || { type: "daily" };

        // IMPORTANT: check for TIME type.
        // If an empty string "" is sent, convert it to NULL, otherwise Postgres will throw an error.
        const timeValue = reminder_time && reminder_time.trim() !== "" ? reminder_time : null;

        const query = `
            INSERT INTO habits (user_id, category_id, name, description, frequency, reminder_time) 
            VALUES ($1, $2, $3, $4, $5, $6) 
            RETURNING *
        `;
        
        const newHabit = await pool.query(query, [
            req.userId, 
            category_id || null, 
            name, 
            description, 
            freqData, 
            timeValue // use processed time value
        ]);
        
        res.json(newHabit.rows[0]);
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
};

const updateHabit = async (req, res) => {
    try {
        const { id } = req.params;
        const { name, description, category_id, frequency, reminder_time } = req.body;
        
        const timeValue = reminder_time && reminder_time.trim() !== "" ? reminder_time : null;
        const freqData = frequency || { type: "daily" };

        const query = `
            UPDATE habits 
            SET name = $1, description = $2, category_id = $3, frequency = $4, reminder_time = $5
            WHERE id = $6 AND user_id = $7
            RETURNING *
        `;
        
        const result = await pool.query(query, [
            name, description, category_id, freqData, timeValue, id, req.userId
        ]);

        if (result.rows.length === 0) {
            return res.status(404).json({ message: "Habit not found or not authorized" });
        }

        res.json(result.rows[0]);
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
};

const deleteHabit = async (req, res) => {
    try {
        const { id } = req.params;
        const result = await pool.query(
            'DELETE FROM habits WHERE id = $1 AND user_id = $2 RETURNING *',
            [id, req.userId]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ message: "Habit not found or not authorized" });
        }

        res.json({ message: "Habit deleted" });
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
};

module.exports = { getHabits, createHabit, updateHabit, deleteHabit };