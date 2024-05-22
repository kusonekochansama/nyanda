const express = require('express');
const cors = require('cors');
const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

const { Client } = require('pg');

// PostgreSQLクライアントの設定
const client = new Client({
    host: process.env.DB_HOST,
    port: process.env.DB_PORT,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    ssl: {
        rejectUnauthorized: false
    }
});

// データベースに接続
client.connect();

app.get('/api/highscores', async (req, res) => {
    try {
        const result = await client.query('SELECT * FROM highscores ORDER BY score DESC LIMIT 10');
        res.json(result.rows);
    } catch (error) {
        console.error('Error fetching high scores:', error);
        res.status(500).json({ error: 'Failed to fetch high scores' });
    }
});

app.post('/api/highscores', async (req, res) => {
    const { name, score } = req.body;
    try {
        const result = await client.query('INSERT INTO highscores (name, score) VALUES ($1, $2) RETURNING *', [name, score]);
        res.status(201).json(result.rows[0]);
    } catch (error) {
        console.error('Error saving high score:', error);
        res.status(500).json({ error: 'Failed to save high score' });
    }
});

app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});
