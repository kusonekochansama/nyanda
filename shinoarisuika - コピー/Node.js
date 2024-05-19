const express = require('express');
const fs = require('fs');
const app = express();
const port = 3000;

app.use(express.json());

app.post('/log', (req, res) => {
    const { message } = req.body;
    fs.appendFile('log.txt', `${new Date().toISOString()} - ${message}\n`, err => {
        if (err) {
            console.error('Failed to write log:', err);
        }
    });
    res.sendStatus(200);
});

app.listen(port, () => {
    console.log(`Server listening at http://localhost:${port}`);
});
