const express = require('express');
const cors = require('cors');
const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

app.get('/api/highscores', (req, res) => {
    res.json({ message: 'Highscores endpoint' });
});

app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});
