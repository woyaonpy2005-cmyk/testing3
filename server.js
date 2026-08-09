const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

// 读取 Render 的环境变量 MONGO_URI，若无则使用默认连接字符串
const MONGO_URI = process.env.MONGO_URI || "mongodb+srv://woyaonpy2005_db_user:Lim050831.@cluster0.ztvp8bb.mongodb.net/ticket_system?appName=Cluster0";

app.use(cors());
app.use(express.json());
app.use(express.static(__dirname));

// 1. 连接 MongoDB Atlas 云数据库
mongoose.connect(MONGO_URI)
    .then(() => console.log('✅ 成功连接至 MongoDB Atlas 云数据库'))
    .catch(err => console.error('❌ MongoDB 连接失败:', err));

// 2. 数据结构定义 (支持 RM/RMB 及导览服务 hasGuide 字段)
const recordSchema = new mongoose.Schema({
    id: { type: String, required: true, unique: true },
    date: { type: String, required: true }, // 格式通常为 "YYYY-MM-DD"
    time: { type: String, required: true },
    currency: { type: String, default: 'MYR' },
    adultCount: { type: Number, default: 0 },
    childCount: { type: Number, default: 0 },
    hasGuide: { type: Boolean, default: false }, // 导览服务字段
    totalCount: { type: Number, default: 0 },
    paymentMethod: { type: String, required: true },
    totalPrice: { type: Number, default: 0 },
    totalPriceRM: { type: Number, default: 0 },
    totalPriceRMB: { type: Number, default: 0 },
    convertedRMB: { type: Number, default: 0 },
    displayPrice: { type: String, default: '' },
    details: { type: String }
}, { timestamps: true });

const Record = mongoose.model('Record', recordSchema);

// 3. API 路由接口配置

// GET: 获取所有售票记录
app.get('/api/records', async (req, res) => {
    try {
        const records = await Record.find().sort({ createdAt: 1 });
        res.json(records);
    } catch (err) {
        console.error("GET 错误:", err);
        res.status(500).json({ error: '获取数据失败' });
    }
});

// ✅ 新增 GET: 获取按指定月份（默认当月）结算的收入拆解数据（票种与导览服务）
app.get('/api/records/monthly-summary', async (req, res) => {
    try {
        // 允许通过 query 传入年月，例如 /api/records/monthly-summary?year=2026&month=08
        const now = new Date();
        const year = req.query.year || now.getFullYear().toString();
        const month = req.query.month || String(now.getMonth() + 1).padStart(2, '0');
        
        const monthPrefix = `${year}-${month}`; // 例如 "2026-08"

        // 筛选出属于该月份的订单记录
        const records = await Record.find({ date: { $regex: `^${monthPrefix}` } });

        // 统计初始值
        let summary = {
            period: monthPrefix,
            adult: { count: 0, amountRM: 0, amountRMB: 0 },
            child: { count: 0, amountRM: 0, amountRMB: 0 },
            guide: { count: 0, amountRM: 0, amountRMB: 0 },
            grandTotalRM: 0,
            grandTotalRMB: 0
        };

        // 假设的单价定义（可根据实际逻辑自行设置或在前端传入计算）
        const ADULT_PRICE_RM = 50;  
        const CHILD_PRICE_RM = 25;  
        const GUIDE_PRICE_RM = 100; 

        records.forEach(rec => {
            const adult = rec.adultCount || 0;
            const child = rec.childCount || 0;
            const guide = rec.hasGuide ? 1 : 0;

            summary.adult.count += adult;
            summary.child.count += child;
            summary.guide.count += guide;

            // 如果使用固定单价累计 RM 收入：
            summary.adult.amountRM += adult * ADULT_PRICE_RM;
            summary.child.amountRM += child * CHILD_PRICE_RM;
            summary.guide.amountRM += guide * GUIDE_PRICE_RM;

            // 订单总金额累计
            summary.grandTotalRM += (rec.totalPriceRM || rec.totalPrice || 0);
            summary.grandTotalRMB += (rec.totalPriceRMB || rec.convertedRMB || 0);
        });

        res.json({ success: true, summary });
    } catch (err) {
        console.error("月度结算接口错误:", err);
        res.status(500).json({ error: '月度结算计算失败' });
    }
});

// POST: 添加新售票记录
app.post('/api/records', async (req, res) => {
    try {
        const newRecord = new Record(req.body);
        await newRecord.save();
        res.json({ success: true, record: newRecord });
    } catch (err) {
        console.error("POST 提交失败，具体原因:", err);
        res.status(500).json({ error: '数据保存失败', details: err.message });
    }
});

// PUT: 修改门票记录
app.put('/api/records/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const updatedRecord = await Record.findOneAndUpdate({ id: id }, req.body, { new: true });
        if (!updatedRecord) return res.status(404).json({ error: '未找到该记录' });
        res.json({ success: true, record: updatedRecord });
    } catch (err) {
        console.error("PUT 错误:", err);
        res.status(500).json({ error: '更新失败' });
    }
});

// DELETE: 删除门票记录
app.delete('/api/records/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const deletedRecord = await Record.findOneAndDelete({ id: id });
        if (!deletedRecord) return res.status(404).json({ error: '未找到要删除的记录' });
        res.json({ success: true });
    } catch (err) {
        console.error("DELETE 错误:", err);
        res.status(500).json({ error: '删除失败' });
    }
});

// 4. 路由兜底，确保前端页面能正常加载
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

app.listen(PORT, () => {
    console.log(`🚀 服务已启动，监听端口: ${PORT}`);
});
