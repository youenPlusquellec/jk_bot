const pool = require("../common/utils/db");

module.exports = {
    async getHistory() {
        try {
            conn = await pool.getConnection();

            sql = "SELECT * FROM history";
            const rows = await conn.query(sql);

            conn.end();
            return rows;
        } catch (err) {
            throw err;
        }
    },
    async addToHistory(type, userId, serverId) {
        try {
            
            conn = await pool.getConnection();

            sql = "INSERT INTO history (userId, serverId, type) VALUES ((SELECT id FROM user_account WHERE userId=?), (SELECT id FROM server WHERE serverId=?), ?);";
            const rows = await conn.query(sql, [userId, serverId, type]);

            conn.end();
            return rows;
        } catch (err) {
            throw err;
        }
    },
};