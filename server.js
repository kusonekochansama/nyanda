const { Pool } = require('pg');
const express = require('express');
const fs = require('fs');
const cors = require('cors'); // 追加
const app = express();
const PORT = process.env.PORT || 10000;

// CORSミドルウェアを使用
app.use(cors({
    origin: 'http://nyandaru.starfree.jp' // 必要に応じて適切なオリジンを指定
}));

app.use(express.json());  // JSONボディのパース用ミドルウェア

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: {
        rejectUnauthorized: true,
        ca: fs.readFileSync('combined-certificates.crt').toString(),
    },
});

pool.connect((err, client, release) => {
    if (err) {
        console.error('Database connection error:', err.stack);
        return;
    }
    console.log('Database connected successfully');
    release();
});

app.get('/', (req, res) => {
    res.send('Hello World!');
});

// ハイスコアの取得エンドポイント
app.get('/highscores', async (req, res) => {
    try {
        const result = await pool.query('SELECT * FROM highscores ORDER BY score DESC LIMIT 10');
        res.json(result.rows);
    } catch (err) {
        console.error('Error retrieving highscores', err);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

// ハイスコアの保存エンドポイント
app.post('/highscores', async (req, res) => {
    const { name, score } = req.body;
    try {
        const result = await pool.query('INSERT INTO highscores (name, score) VALUES ($1, $2) RETURNING *', [name, score]);
        res.json(result.rows[0]);
    } catch (err) {
        console.error('Error saving highscore', err);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});
