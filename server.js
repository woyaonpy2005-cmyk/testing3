const express = require('express');
const fs = require('fs');
const path = require('path');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 3000;
const DATA_FILE = path.join(__dirname, 'records.json');

app.use(cors());
app.use(express.json());
app.use(express.static(__dirname));

// 获取所有记录
app.get('/api/records', (req, res) => {
    fs.readFile(DATA_FILE, 'utf8', (err, data) => {
        if (err) return res.json([]);
        try {
            res.json(JSON.parse(data || '[]'));
        } catch (e) {
            res.json([]);
        }
    });
});

// 保存新记录
app.post('/api/records', (req, res) => {
    const newRecord = req.body;
    fs.readFile(DATA_FILE, 'utf8', (err, data) => {
        let records = [];
        if (!err && data) {
            try {
                records = JSON.parse(data);
            } catch (e) {
                records = [];
            }
        }
        records.push(newRecord);

        fs.writeFile(DATA_FILE, JSON.stringify(records, null, 2), (err) => {
            if (err) return res.status(500).json({ error: '数据写入失败' });
            res.json({ success: true });
        });
    });
});

app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});