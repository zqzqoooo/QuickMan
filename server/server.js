const express = require('express');
const cors = require('cors');
const mysql = require('mysql2/promise');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const JWT_SECRET = 'heshanws_tim_quickman_key_quanzhou';

const app = express();
app.use(cors());
app.use(express.json({ limit: '50mb' }));

const uploadDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir);
}
app.use('/uploads', express.static(uploadDir));

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, 'uploads/')
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, 'IMG_' + uniqueSuffix + path.extname(file.originalname));
  }
});
const upload = multer({ storage: storage });

const pool = mysql.createPool({
  host: '127.0.0.1',
  user: 'root',
  password: 'zq710609ZQ.', 
  database: 'quickman',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
});

app.post('/api/upload', upload.single('photo'), (req, res) => {
  if (!req.file) return res.status(400).json({ success: false, error: 'No image file received' });
  const imageUrl = `https://api.heshanws.top/uploads/${req.file.filename}`;
  console.log(`\n🖼️ [Upload Success] Image saved: ${imageUrl}`);
  res.json({ success: true, url: imageUrl });
});

app.post('/api/sync/push', async (req, res) => {
  const payload = req.body;
  console.log(`\n📥 [${new Date().toLocaleTimeString()}] Received sync request from device [${payload.device_id}]...`);

  const cabinets = payload.data?.cabinets || [];
  const assets = payload.data?.assets || [];
  const transactions = payload.data?.transactions || [];

  if (cabinets.length === 0 && assets.length === 0 && transactions.length === 0) {
    return res.json({ success: true, message: 'No data to sync' });
  }

  const connection = await pool.getConnection();
  await connection.beginTransaction();

  try {
    // 🌟 修复: Complete all 9 fields of the cabinet
    if (cabinets.length > 0) {
      const cabinetValues = cabinets.map(c => [
        c.id, c.code, c.name, c.gps_lat, c.gps_lng, c.label_status || 0, c.last_printed_at || null, c.updated_at, c.is_deleted || 0
      ]);
      const cabSql = `
        INSERT INTO cabinets (id, code, name, gps_lat, gps_lng, label_status, last_printed_at, updated_at, is_deleted)
        VALUES ? ON DUPLICATE KEY UPDATE
          code=VALUES(code), name=VALUES(name), gps_lat=VALUES(gps_lat), gps_lng=VALUES(gps_lng),
          label_status=VALUES(label_status), last_printed_at=VALUES(last_printed_at), 
          updated_at=VALUES(updated_at), is_deleted=VALUES(is_deleted)
      `;
      await connection.query(cabSql, [cabinetValues]);
    }

    if (assets.length > 0) {
      const assetValues = assets.map(a => [
        a.id, a.code, a.cabinet_id, a.name, a.category, a.photo_uri, a.item_status, a.label_status || 0, a.last_printed_at || null, a.updated_at, a.is_deleted || 0
      ]);
      const assetSql = `
        INSERT INTO assets (id, code, cabinet_id, name, category, photo_uri, item_status, label_status, last_printed_at, updated_at, is_deleted)
        VALUES ? ON DUPLICATE KEY UPDATE 
          code=VALUES(code), cabinet_id=VALUES(cabinet_id), name=VALUES(name), category=VALUES(category),
          photo_uri=VALUES(photo_uri), item_status=VALUES(item_status), label_status=VALUES(label_status),
          last_printed_at=VALUES(last_printed_at), updated_at=VALUES(updated_at), is_deleted=VALUES(is_deleted)
      `;
      await connection.query(assetSql, [assetValues]);
    }

    if (transactions.length > 0) {
      const txValues = transactions.map(t => [
        t.id, t.asset_id, t.action_type, t.operator_id, t.action_time, t.remarks
      ]);
      const txSql = `
        INSERT INTO transactions (id, asset_id, action_type, operator_id, action_time, remarks)
        VALUES ? ON DUPLICATE KEY UPDATE remarks=VALUES(remarks) 
      `;
      await connection.query(txSql, [txValues]);
    }

    await connection.commit();
    res.json({ success: true, message: 'Data sync successful' });

  } catch (error) {
    await connection.rollback();
    console.error('❌ Database write failed:', error);
    res.status(500).json({ success: false, error: 'Internal server error' });
  } finally {
    connection.release();
  }
});

app.get('/api/sync/pull', async (req, res) => {
  try {
    const lastSyncTime = parseInt(req.query.last_sync_time) || 0;
    const [cabinets] = await pool.query('SELECT * FROM cabinets WHERE updated_at > ?', [lastSyncTime]);
    const [assets] = await pool.query('SELECT * FROM assets WHERE updated_at > ?', [lastSyncTime]);
    const [transactions] = await pool.query('SELECT * FROM transactions WHERE action_time > ?', [lastSyncTime]); 

    res.json({
      success: true,
      data: { cabinets, assets, transactions },
      server_timestamp: Date.now() 
    });
  } catch (error) {
    console.error('❌ PULL read database failed:', error);
    res.status(500).json({ success: false, error: 'Failed to read cloud data' });
  }
});

const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) return res.status(401).json({ success: false, error: 'Unauthorized, please login first' });

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) return res.status(403).json({ success: false, error: 'Token expired or invalid' });
    req.user = user; 
    next();
  });
};

const requireAdmin = (req, res, next) => {
  if (req.user && req.user.role === 'admin') {
    next();
  } else {
    res.status(403).json({ success: false, error: 'Unauthorized: This API is limited to Web dashboard administrators' });
  }
};

app.post('/api/login', async (req, res) => {
  const { username, password } = req.body;
  try {
    const [rows] = await pool.query('SELECT * FROM users WHERE username = ?', [username]);
    const user = rows[0];

    if (!user) return res.status(401).json({ success: false, error: 'User does not exist' });

    const isMatch = await bcrypt.compare(password, user.password_hash);
    if (!isMatch) return res.status(401).json({ success: false, error: 'Incorrect password' });

    const token = jwt.sign(
      { id: user.id, username: user.username, role: user.role },
      JWT_SECRET,
      { expiresIn: '30d' }
    );

    res.json({
      success: true,
      token,
      user: { username: user.username, role: user.role }
    });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

app.post('/api/sync/push', authenticateToken, async (req, res) => { /* Logic already implemented above */ });
app.get('/api/sync/pull', authenticateToken, async (req, res) => { /* Logic already implemented above */ });

app.get('/api/cabinets', [authenticateToken, requireAdmin], async (req, res) => {
  try {
    const [cabinets] = await pool.query('SELECT * FROM cabinets WHERE is_deleted = 0 ORDER BY updated_at DESC');
    res.json({ success: true, data: cabinets });
  } catch (error) { res.status(500).json({ success: false, error: 'Internal server error' }); }
});

app.get('/api/assets', [authenticateToken, requireAdmin], async (req, res) => {
  try {
    const [assets] = await pool.query(`
      SELECT a.*, c.name as cabinet_name 
      FROM assets a 
      LEFT JOIN cabinets c ON a.cabinet_id = c.id 
      WHERE a.is_deleted = 0 
      ORDER BY a.updated_at DESC
    `);
    res.json({ success: true, data: assets });
  } catch (error) { res.status(500).json({ success: false, error: 'Internal server error' }); }
});

app.get('/api/transactions', [authenticateToken, requireAdmin], async (req, res) => {
  try {
    const { asset_id } = req.query;
    let query = 'SELECT * FROM transactions WHERE is_deleted = 0';
    let params = [];
    if (asset_id) { query += ' AND asset_id = ?'; params.push(asset_id); }
    query += ' ORDER BY action_time DESC';
    const [transactions] = await pool.query(query, params);
    res.json({ success: true, data: transactions });
  } catch (error) { res.status(500).json({ success: false, error: 'Internal server error' }); }
});

app.post('/api/cabinets', [authenticateToken, requireAdmin], async (req, res) => {
  const { code, name, gps_lat, gps_lng } = req.body;
  const id = 'CAB_' + Date.now();
  try {
    await pool.query(
      'INSERT INTO cabinets (id, code, name, gps_lat, gps_lng, updated_at, is_deleted) VALUES (?, ?, ?, ?, ?, ?, 0)',
      [id, code, name, gps_lat || 0, gps_lng || 0, Date.now()]
    );
    res.json({ success: true, message: 'Added successfully' });
  } catch (error) { res.status(500).json({ success: false, error: error.message }); }
});

app.put('/api/cabinets/:id', [authenticateToken, requireAdmin], async (req, res) => {
  const { code, name, gps_lat, gps_lng } = req.body;
  try {
    await pool.query(
      'UPDATE cabinets SET code = ?, name = ?, gps_lat = ?, gps_lng = ?, updated_at = ? WHERE id = ?',
      [code, name, gps_lat || 0, gps_lng || 0, Date.now(), req.params.id]
    );
    res.json({ success: true });
  } catch (error) { res.status(500).json({ success: false, error: error.message }); }
});

app.get('/api/cabinets/:id/assets', [authenticateToken, requireAdmin], async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT * FROM assets WHERE cabinet_id = ? AND is_deleted = 0', [req.params.id]);
    res.json({ success: true, data: rows });
  } catch (error) { res.status(500).json({ success: false, error: error.message }); }
});

app.delete('/api/cabinets/:id', [authenticateToken, requireAdmin], async (req, res) => {
  try {
    await pool.query('UPDATE cabinets SET is_deleted = 1, updated_at = ? WHERE id = ?', [Date.now(), req.params.id]);
    res.json({ success: true, message: 'Deleted successfully' });
  } catch (error) { res.status(500).json({ success: false, error: 'Internal server error' }); }
});

app.post('/api/assets', [authenticateToken, requireAdmin], async (req, res) => {
  const { code, name, category, cabinet_id } = req.body;
  const id = 'AST_' + Date.now() + '_' + Math.floor(Math.random() * 1000);
  try {
    await pool.query(
      'INSERT INTO assets (id, code, cabinet_id, name, category, item_status, updated_at, is_deleted) VALUES (?, ?, ?, ?, ?, 0, ?, 0)',
      [id, code, cabinet_id, name, category, Date.now()]
    );
    res.json({ success: true, message: 'Added successfully', id });
  } catch (error) { res.status(500).json({ success: false, error: 'Internal server error' }); }
});

app.put('/api/assets/:id', [authenticateToken, requireAdmin], async (req, res) => {
  const { code, name, category, cabinet_id } = req.body;
  try {
    await pool.query(
      'UPDATE assets SET code = ?, name = ?, category = ?, cabinet_id = ?, updated_at = ? WHERE id = ?',
      [code, name, category, cabinet_id, Date.now(), req.params.id]
    );
    res.json({ success: true, message: 'Updated successfully' });
  } catch (error) { res.status(500).json({ success: false, error: 'Internal server error' }); }
});

app.delete('/api/assets/:id', [authenticateToken, requireAdmin], async (req, res) => {
  try {
    await pool.query('UPDATE assets SET is_deleted = 1, updated_at = ? WHERE id = ?', [Date.now(), req.params.id]);
    res.json({ success: true, message: 'Deleted successfully' });
  } catch (error) { res.status(500).json({ success: false, error: 'Internal server error' }); }
});

app.get('/api/users', [authenticateToken, requireAdmin], async (req, res) => {
  try {
    const [users] = await pool.query('SELECT id, username, role, created_at FROM users ORDER BY created_at DESC');
    res.json({ success: true, data: users });
  } catch (error) { 
    console.error('Failed to fetch users:', error);
    res.status(500).json({ success: false, error: 'Internal server error' }); 
  }
});

app.post('/api/users', [authenticateToken, requireAdmin], async (req, res) => {
  const { username, password, role } = req.body;
  try {
    const hash = await bcrypt.hash(password, 10);
    await pool.query('INSERT INTO users (username, password_hash, role) VALUES (?, ?, ?)', [username, hash, role || 'staff']);
    res.json({ success: true, message: 'User created successfully' });
  } catch (error) {
    if (error.code === 'ER_DUP_ENTRY') return res.status(400).json({ success: false, error: 'Username already exists' });
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

app.put('/api/users/:id', [authenticateToken, requireAdmin], async (req, res) => {
  const { username, password, role } = req.body;
  try {
    if (password && password.trim() !== '') {
      const hash = await bcrypt.hash(password, 10);
      await pool.query('UPDATE users SET username = ?, role = ?, password_hash = ? WHERE id = ?', [username, role, hash, req.params.id]);
    } else {
      await pool.query('UPDATE users SET username = ?, role = ? WHERE id = ?', [username, role, req.params.id]);
    }
    res.json({ success: true, message: 'User updated successfully' });
  } catch (error) { res.status(500).json({ success: false, error: 'Internal server error' }); }
});

app.delete('/api/users/:id', [authenticateToken, requireAdmin], async (req, res) => {
  if (req.user.id == req.params.id) return res.status(403).json({ success: false, error: 'Cannot delete current account' });
  try {
    await pool.query('DELETE FROM users WHERE id = ?', [req.params.id]);
    res.json({ success: true, message: 'User deleted successfully' });
  } catch (error) { res.status(500).json({ success: false, error: 'Internal server error' }); }
});

const PORT = 3000;
app.listen(PORT, () => {
  console.log(`🚀 API Server started, listening on port: http://127.0.0.1:${PORT}`);
  console.log(`🌐 External access via Nginx proxy: https://api.heshanws.top/api/`);
});