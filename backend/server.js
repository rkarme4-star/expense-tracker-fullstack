require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { Pool } = require('pg');

const app = express();
const PORT = 3000;

app.use(cors());
app.use(express.json());

const pool = new Pool({
  host: process.env.DB_HOST,
  port: process.env.DB_PORT,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
});

const ALLOWED_CATEGORIES = ['Food', 'Transport', 'Bills', 'Entertainment', 'Other'];

app.get('/api/expenses', async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT id, title, amount::float8 AS amount, category,
              to_char(date, 'YYYY-MM-DD') AS date
       FROM expenses ORDER BY id`
    );
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

app.get('/api/expenses/:id', async (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isInteger(id)) {
    return res.status(404).json({ message: 'Invalid id' });
  }

  try {
    const result = await pool.query(
      `SELECT id, title, amount::float8 AS amount, category,
              to_char(date, 'YYYY-MM-DD') AS date
       FROM expenses WHERE id = $1`,
      [id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'Expense not found' });
    }
    res.json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

app.post('/api/expenses', async (req, res) => {
  const { title, amount, category, date } = req.body;

  if (!title || typeof title !== 'string' || title.trim() === '') {
    return res.status(400).json({ message: 'Title is required' });
  }
  if (typeof amount !== 'number' || amount <= 0) {
    return res.status(400).json({ message: 'Amount must be a number greater than 0' });
  }
  if (!ALLOWED_CATEGORIES.includes(category)) {
    return res.status(400).json({ message: 'Invalid category' });
  }
  if (!date) {
    return res.status(400).json({ message: 'Date is required' });
  }

  try {
    const result = await pool.query(
      `INSERT INTO expenses (title, amount, category, date)
       VALUES ($1, $2, $3, $4)
       RETURNING id, title, amount::float8 AS amount, category,
                 to_char(date, 'YYYY-MM-DD') AS date`,
      [title, amount, category, date]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

app.put('/api/expenses/:id', async (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isInteger(id)) {
    return res.status(404).json({ message: 'Invalid id' });
  }

  const { title, amount, category, date } = req.body;

  if (!title || typeof title !== 'string' || title.trim() === '') {
    return res.status(400).json({ message: 'Title is required' });
  }
  if (typeof amount !== 'number' || amount <= 0) {
    return res.status(400).json({ message: 'Amount must be a number greater than 0' });
  }
  if (!ALLOWED_CATEGORIES.includes(category)) {
    return res.status(400).json({ message: 'Invalid category' });
  }
  if (!date) {
    return res.status(400).json({ message: 'Date is required' });
  }

  try {
    const result = await pool.query(
      `UPDATE expenses SET title = $1, amount = $2, category = $3, date = $4
       WHERE id = $5
       RETURNING id, title, amount::float8 AS amount, category,
                 to_char(date, 'YYYY-MM-DD') AS date`,
      [title, amount, category, date, id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'Expense not found' });
    }
    res.json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

app.delete('/api/expenses/:id', async (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isInteger(id)) {
    return res.status(404).json({ message: 'Invalid id' });
  }

  try {
    const result = await pool.query(
      'DELETE FROM expenses WHERE id = $1 RETURNING id',
      [id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'Expense not found' });
    }
    res.json({ message: 'Deleted successfully', id: result.rows[0].id });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});