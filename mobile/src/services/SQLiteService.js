import * as SQLite from 'expo-sqlite';

const DB_NAME = 'gearstack_offline.db';

export const SQLiteService = {
  // =========================================================
  // 1. 初始化数据库和表结构
  // =========================================================
  initDB: async () => {
    try {
      const db = await SQLite.openDatabaseAsync(DB_NAME);
      await db.execAsync(`
        PRAGMA foreign_keys = ON;

        CREATE TABLE IF NOT EXISTS cabinets (
          id TEXT PRIMARY KEY NOT NULL,
          code TEXT,
          name TEXT,
          gps_lat REAL,
          gps_lng REAL,
          label_status INTEGER DEFAULT 0,
          last_printed_at INTEGER,
          updated_at INTEGER,
          is_deleted INTEGER DEFAULT 0,
          sync_status INTEGER DEFAULT 1
        );

        CREATE TABLE IF NOT EXISTS assets (
          id TEXT PRIMARY KEY NOT NULL,
          code TEXT,
          cabinet_id TEXT,
          name TEXT,
          category TEXT,
          photo_uri TEXT,
          remote_photo_uri TEXT,
          item_status INTEGER DEFAULT 0,
          label_status INTEGER DEFAULT 0,
          last_printed_at INTEGER,
          updated_at INTEGER,
          sync_status INTEGER DEFAULT 1,
          is_deleted INTEGER DEFAULT 0
        );

        CREATE TABLE IF NOT EXISTS transactions (
          id TEXT PRIMARY KEY NOT NULL,
          asset_id TEXT NOT NULL,
          action_type TEXT,
          operator_id TEXT,
          action_time INTEGER,
          remarks TEXT,
          sync_status INTEGER DEFAULT 1,
          is_deleted INTEGER DEFAULT 0,
          FOREIGN KEY (asset_id) REFERENCES assets (id) ON DELETE CASCADE
        );
      `);

      

      console.log('✅ SQLite 本地数据库初始化成功！');
      return true;
    } catch (error) {
      console.error('❌ SQLite 初始化失败:', error);
      return false;
    }
  },

  // =========================================================
  // 2. 核心业务：获取所有设备 (管理员页面用)
  // =========================================================
  getAssets: async () => {
    try {
      const db = await SQLite.openDatabaseAsync(DB_NAME);

      return await db.getAllAsync(`
        SELECT a.*, c.name as cabinet_name 
        FROM assets a 
        LEFT JOIN cabinets c ON a.cabinet_id = c.id 
        WHERE a.is_deleted = 0
      `);
    } catch (error) {
      console.error("获取资产列表失败:", error);
      return [];
    }
  },

  // =========================================================
  // 3. 核心业务：扫码借还流水处理 (主页扫码用)
  // =========================================================
  processTransfer: async (assetCode, targetStatus, operatorId, remarks) => {
    try {
      const db = await SQLite.openDatabaseAsync(DB_NAME);
      const now = Date.now();

      await db.withTransactionAsync(async () => {
        // 1. 先通过扫到的 Code 查出设备的内部 ID
        const asset = await db.getFirstAsync('SELECT * FROM assets WHERE code = ? AND is_deleted = 0', [assetCode]);
        
        if (!asset) {
          throw new Error(`系统内未找到编号为 [${assetCode}] 的有效设备`);
        }

        const assetId = asset.id;
        const actionType = targetStatus === 1 ? 'OUT' : 'IN';
        const txId = 'TX_' + now + '_' + Math.floor(Math.random() * 1000);

        // 2. 更新设备状态，触发 sync_status = 2 (表示被修改过，需要 PUSH)
        await db.runAsync(
          `UPDATE assets SET item_status = ?, updated_at = ?, sync_status = 2 WHERE id = ?`,
          [targetStatus, now, assetId]
        );

        // 3. 写入不可篡改的流水账
        await db.runAsync(
          `INSERT INTO transactions (id, asset_id, action_type, operator_id, action_time, remarks, sync_status, is_deleted) 
           VALUES (?, ?, ?, ?, ?, ?, 1, 0)`,
          [txId, assetId, actionType, operatorId, now, remarks]
        );
      });

      return { success: true };
    } catch (error) {
      console.error("流转操作失败:", error);
      throw error; // 把错误抛给 UI 层去 Alert
    }
  },

  // =========================================================
  // 4. 获取柜子详情及内部设备 (管理员扫柜子用)
  // =========================================================
  getCabinetDetailsByCode: async (cabinetCode) => {
    try {
      const db = await SQLite.openDatabaseAsync(DB_NAME);
      const cabinet = await db.getFirstAsync('SELECT * FROM cabinets WHERE code = ? AND is_deleted = 0', [cabinetCode]);
      if (!cabinet) return null;
      
      const assets = await db.getAllAsync('SELECT * FROM assets WHERE cabinet_id = ? AND is_deleted = 0', [cabinet.id]);
      return { ...cabinet, assetsList: assets };
    } catch (error) {
      return null;
    }
  },

  // =========================================================
  // 5. 调试工具：获取全盘数据 Dump
  // =========================================================
  getFullDbDump: async () => {
    try {
      const db = await SQLite.openDatabaseAsync(DB_NAME);
      const tables = await db.getAllAsync("SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%';");
      const dbDump = {};
      for (const tableObj of tables) {
        dbDump[tableObj.name] = await db.getAllAsync(`SELECT * FROM ${tableObj.name}`);
      }
      return dbDump; 
    } catch (error) {
      return {};
    }
  },

  // =========================================================
  // 6. 离线同步引擎专属方法 (PUSH 阶段抓取数据)
  // =========================================================
  getPendingCabinets: async () => {
    const db = await SQLite.openDatabaseAsync(DB_NAME);
    return await db.getAllAsync('SELECT * FROM cabinets WHERE sync_status > 0');
  },
  getPendingAssets: async () => {
    const db = await SQLite.openDatabaseAsync(DB_NAME);
    return await db.getAllAsync('SELECT * FROM assets WHERE sync_status > 0');
  },
  getPendingTransactions: async () => {
    const db = await SQLite.openDatabaseAsync(DB_NAME);
    return await db.getAllAsync('SELECT * FROM transactions WHERE sync_status > 0');
  },

  // =========================================================
  // 7. 离线同步引擎专属方法 (PUSH 成功后消灭标记)
  // =========================================================
  markCabinetsAsSynced: async (cabinetIds) => {
    if (!cabinetIds || cabinetIds.length === 0) return;
    const db = await SQLite.openDatabaseAsync(DB_NAME);
    const placeholders = cabinetIds.map(() => '?').join(',');
    await db.runAsync(`UPDATE cabinets SET sync_status = 0 WHERE id IN (${placeholders})`, cabinetIds);
  },
  markAssetsAsSynced: async (assetIds) => {
    if (!assetIds || assetIds.length === 0) return;
    const db = await SQLite.openDatabaseAsync(DB_NAME);
    const placeholders = assetIds.map(() => '?').join(',');
    await db.runAsync(`UPDATE assets SET sync_status = 0 WHERE id IN (${placeholders})`, assetIds);
  },
  markTransactionsAsSynced: async (transactionIds) => {
    if (!transactionIds || transactionIds.length === 0) return;
    const db = await SQLite.openDatabaseAsync(DB_NAME);
    const placeholders = transactionIds.map(() => '?').join(',');
    await db.runAsync(`UPDATE transactions SET sync_status = 0 WHERE id IN (${placeholders})`, transactionIds);
  },
  updateAssetRemoteUri: async (assetId, newNetworkUri) => {
    const db = await SQLite.openDatabaseAsync(DB_NAME);
    await db.runAsync(`UPDATE assets SET remote_photo_uri = ? WHERE id = ?`, [newNetworkUri, assetId]);
  },

  // =========================================================
  // 8. 离线同步引擎专属方法 (PULL 阶段写入/覆盖数据)
  // =========================================================
  savePulledData: async (cabinets = [], assets = [], transactions = []) => {
    const db = await SQLite.openDatabaseAsync(DB_NAME);
    await db.execAsync('PRAGMA foreign_keys = OFF;'); // 覆盖时临时关掉外键检查防报错

    try {
      await db.withTransactionAsync(async () => {
        for (let c of cabinets) {
          await db.runAsync(`
            INSERT INTO cabinets (id, code, name, gps_lat, gps_lng, label_status, last_printed_at, updated_at, is_deleted, sync_status) 
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 0)
            ON CONFLICT(id) DO UPDATE SET
              code=excluded.code, name=excluded.name, gps_lat=excluded.gps_lat, gps_lng=excluded.gps_lng,
              label_status=excluded.label_status, last_printed_at=excluded.last_printed_at, 
              updated_at=excluded.updated_at, is_deleted=excluded.is_deleted, sync_status=0
            WHERE excluded.updated_at > cabinets.updated_at
          `, [c.id, c.code, c.name, c.gps_lat, c.gps_lng, c.label_status, c.last_printed_at, c.updated_at, c.is_deleted || 0]);
        }

        for (let a of assets) {
          await db.runAsync(`
            INSERT INTO assets (id, code, cabinet_id, name, category, photo_uri, remote_photo_uri, item_status, label_status, last_printed_at, updated_at, is_deleted, sync_status) 
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0)
            ON CONFLICT(id) DO UPDATE SET
              code=excluded.code, cabinet_id=excluded.cabinet_id, name=excluded.name, category=excluded.category,
              photo_uri=excluded.photo_uri, remote_photo_uri=excluded.remote_photo_uri, item_status=excluded.item_status,
              label_status=excluded.label_status, last_printed_at=excluded.last_printed_at, 
              updated_at=excluded.updated_at, is_deleted=excluded.is_deleted, sync_status=0
            WHERE excluded.updated_at > assets.updated_at
          `, [a.id, a.code, a.cabinet_id, a.name, a.category, a.photo_uri, a.remote_photo_uri, a.item_status, a.label_status, a.last_printed_at, a.updated_at, a.is_deleted || 0]);
        }

        for (let t of transactions) {
          await db.runAsync(`
            INSERT INTO transactions (id, asset_id, action_type, operator_id, action_time, remarks, is_deleted, sync_status) 
            VALUES (?, ?, ?, ?, ?, ?, ?, 0)
            ON CONFLICT(id) DO NOTHING
          `, [t.id, t.asset_id, t.action_type, t.operator_id, t.action_time, t.remarks, t.is_deleted || 0]);
        }
      });
    } finally {
      await db.execAsync('PRAGMA foreign_keys = ON;');
    }
  },

  getAssetById: async (id) => {
    try {
      const db = await SQLite.openDatabaseAsync(DB_NAME);
      return await db.getFirstAsync('SELECT * FROM assets WHERE id = ?', [id]);
    } catch (error) {
      return null;
    }
  },

  // =========================================================
  // 9. 柜子 CRUD
  // =========================================================
  getCabinets: async () => {
    try {
      const db = await SQLite.openDatabaseAsync(DB_NAME);
      return await db.getAllAsync('SELECT * FROM cabinets WHERE is_deleted = 0 ORDER BY updated_at DESC');
    } catch (error) {
      console.error("获取柜子列表失败:", error);
      return [];
    }
  },

  getCabinetById: async (id) => {
    try {
      const db = await SQLite.openDatabaseAsync(DB_NAME);
      return await db.getFirstAsync('SELECT * FROM cabinets WHERE id = ? AND is_deleted = 0', [id]);
    } catch (error) {
      return null;
    }
  },

  updateCabinet: async (id, updates) => {
    try {
      const db = await SQLite.openDatabaseAsync(DB_NAME);
      const now = Date.now();
      const fields = Object.keys(updates);
      const values = Object.values(updates);
      const setClause = fields.map(f => `${f} = ?`).join(', ');
      await db.runAsync(
        `UPDATE cabinets SET ${setClause}, updated_at = ?, sync_status = 2 WHERE id = ?`,
        [...values, now, id]
      );
      return true;
    } catch (error) {
      console.error("更新柜子失败:", error);
      return false;
    }
  },

  deleteCabinet: async (id) => {
    try {
      const db = await SQLite.openDatabaseAsync(DB_NAME);
      const now = Date.now();
      await db.runAsync(
        `UPDATE cabinets SET is_deleted = 1, updated_at = ?, sync_status = 2 WHERE id = ?`,
        [now, id]
      );
      return true;
    } catch (error) {
      console.error("删除柜子失败:", error);
      return false;
    }
  },

  // =========================================================
  // 10. 设备 CRUD
  // =========================================================
  getAssetsByCabinet: async (cabinetId) => {
    try {
      const db = await SQLite.openDatabaseAsync(DB_NAME);
      return await db.getAllAsync(
        'SELECT * FROM assets WHERE cabinet_id = ? AND is_deleted = 0 ORDER BY updated_at DESC',
        [cabinetId]
      );
    } catch (error) {
      console.error("Failed to query assets by cabinet:", error);
      return [];
    }
  },

  getAssetByCode: async (code) => {
    try {
      const db = await SQLite.openDatabaseAsync(DB_NAME);
      return await db.getFirstAsync(
        'SELECT a.*, c.name as cabinet_name FROM assets a LEFT JOIN cabinets c ON a.cabinet_id = c.id WHERE a.code = ? AND a.is_deleted = 0',
        [code]
      );
    } catch (error) {
      console.error("Failed to query asset by code:", error);
      return null;
    }
  },

  updateAsset: async (id, updates) => {
    try {
      const db = await SQLite.openDatabaseAsync(DB_NAME);
      const now = Date.now();
      const fields = Object.keys(updates);
      const values = Object.values(updates);
      const setClause = fields.map(f => `${f} = ?`).join(', ');
      await db.runAsync(
        `UPDATE assets SET ${setClause}, updated_at = ?, sync_status = 2 WHERE id = ?`,
        [...values, now, id]
      );
      return true;
    } catch (error) {
      console.error("Failed to update asset:", error);
      return false;
    }
  },

  deleteAsset: async (id) => {
    try {
      const db = await SQLite.openDatabaseAsync(DB_NAME);
      const now = Date.now();
      await db.runAsync(
        `UPDATE assets SET is_deleted = 1, updated_at = ?, sync_status = 2 WHERE id = ?`,
        [now, id]
      );
      return true;
    } catch (error) {
      console.error("Failed to delete asset:", error);
      return false;
    }
  },

  addAsset: async (code, name, category, cabinetId, photoUri) => {
    try {
      const db = await SQLite.openDatabaseAsync(DB_NAME);
      const now = Date.now();
      const id = 'AST_' + now + '_' + Math.floor(Math.random() * 1000);
      await db.runAsync(
        `INSERT INTO assets (id, code, name, category, cabinet_id, photo_uri, item_status, updated_at, sync_status, is_deleted)
         VALUES (?, ?, ?, ?, ?, ?, 0, ?, 1, 0)`,
        [id, code, name, category, cabinetId, photoUri, now]
      );
      return id;
    } catch (error) {
      console.error("Failed to add asset:", error);
      return null;
    }
  },

  addCabinet: async (code, name) => {
    try {
      const db = await SQLite.openDatabaseAsync(DB_NAME);
      const now = Date.now();
      const id = 'CAB_' + now + '_' + Math.floor(Math.random() * 1000);
      await db.runAsync(
        `INSERT INTO cabinets (id, code, name, updated_at, sync_status, is_deleted)
         VALUES (?, ?, ?, ?, 1, 0)`,
        [id, code, name, now]
      );
      return id;
    } catch (error) {
      console.error("添加柜子失败:", error);
      return null;
    }
  },

  // =========================================================
  // 11. 记录设备操作流水
  // =========================================================
  recordTransaction: async (assetId, actionType, operatorId, remarks) => {
    try {
      const db = await SQLite.openDatabaseAsync(DB_NAME);
      const now = Date.now();
      const txId = 'TX_' + now + '_' + Math.floor(Math.random() * 1000);
      await db.runAsync(
        `INSERT INTO transactions (id, asset_id, action_type, operator_id, action_time, remarks, sync_status, is_deleted)
         VALUES (?, ?, ?, ?, ?, ?, 1, 0)`,
        [txId, assetId, actionType, operatorId, now, remarks]
      );
      return txId;
    } catch (error) {
      console.error("记录流水失败:", error);
      return null;
    }
  },

  // =========================================================
  // 12. 设备流水记录查询
  // =========================================================
  getTransactionsByAssetId: async (assetId) => {
    try {
      const db = await SQLite.openDatabaseAsync(DB_NAME);
      return await db.getAllAsync(
        'SELECT * FROM transactions WHERE asset_id = ? AND is_deleted = 0 ORDER BY action_time DESC',
        [assetId]
      );
    } catch (error) {
      console.error("获取设备流水失败:", error);
      return [];
    }
  },

  // =========================================================
  // 12. 更新打印状态
  // =========================================================
  updateLabelStatus: async (id, type, status, printedAt) => {
    try {
      const db = await SQLite.openDatabaseAsync(DB_NAME);
      const now = Date.now();
      if (type === 'cabinet') {
        await db.runAsync(
          'UPDATE cabinets SET label_status = ?, last_printed_at = ?, updated_at = ?, sync_status = 2 WHERE id = ?',
          [status, printedAt || now, now, id]
        );
      } else {
        await db.runAsync(
          'UPDATE assets SET label_status = ?, last_printed_at = ?, updated_at = ?, sync_status = 2 WHERE id = ?',
          [status, printedAt || now, now, id]
        );
      }
      return true;
    } catch (error) {
      console.error("更新打印状态失败:", error);
      return false;
    }
  }
};