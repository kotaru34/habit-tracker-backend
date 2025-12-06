const { Pool } = require('pg');
require('dotenv').config();

// FIX: Make pg driver treat DATE type (ID 1082) as a simple string,
// not converting it to Date Object with timezone.
const types = require('pg').types;

types.setTypeParser(1082, (val) => val);

const pool = new Pool({
  user: process.env.DB_USER,
  host: process.env.DB_HOST,
  database: process.env.DB_NAME,
  password: process.env.DB_PASSWORD,
  port: process.env.DB_PORT,
});

module.exports = pool;