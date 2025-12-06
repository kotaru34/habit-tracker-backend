const pool = require('../config/db');

const getCategories = async (req, res) => {
    try {
        const query = `
            SELECT * FROM categories 
            WHERE user_id IS NULL OR user_id = $1 
            ORDER BY id ASC
        `;
        const result = await pool.query(query, [req.userId]);
        res.json(result.rows);
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
};

module.exports = { getCategories };