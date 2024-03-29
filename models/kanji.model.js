const axios = require('axios');
const pool = require('../common/utils/db');

module.exports = {
	async getKanjis() {
		const conn = await pool.getConnection();

		const sql = 'SELECT * FROM kanji';
		const rows = await conn.query(sql);

		conn.end();
		return rows;
	},
	async getKanjiById(id) {
		const conn = await pool.getConnection();

		const sql = 'SELECT * FROM kanji WHERE id=?';
		const rows = await conn.query(sql, id);

		conn.end();
		return rows;
	},
	async addKanji(kanji, available) {
		const kanjiInfo = await this.getKanjiInfo(kanji);

		const conn = await pool.getConnection();

		const sql_kanji = 'INSERT INTO kanji (kanji, strokeCount, meanings, kunReadings, onReadings, jlpt) VALUES (?, ?, ?, ?, ?, ?);';
		const rows = await conn.query(sql_kanji, [
			kanji,
			kanjiInfo.stroke_count,
			JSON.stringify(kanjiInfo.meanings),
			JSON.stringify(kanjiInfo.kun_readings),
			JSON.stringify(kanjiInfo.on_readings),
			kanjiInfo.jlpt,
		]);

		if (!available) {
			const sql_used_kanji = 'INSERT INTO used_kanji (kanjiId, serverId, used) VALUES (?, 1, true);';
			await conn.query(sql_used_kanji, Number(rows.insertId));
		}

		conn.end();
		return rows;
	},
	async updateKanji(kanji, strokeCount, meanings, kunReadings, onReadings, jlpt) {
		const conn = await pool.getConnection();

		const sql = 'Update kanji SET strokeCount=?, meanings=?, kunReadings=?, onReadings=?, jlpt=? WHERE kanji=?';
		const updatedKanji = await conn.query(sql, [strokeCount, meanings, kunReadings, onReadings, jlpt, kanji]);

		conn.end();
		return updatedKanji;
	},
	async getUsedKanjis(serverId) {
		const conn = await pool.getConnection();

		const sql = ` SELECT kanji.*, used_kanji.timestamp
                    FROM used_kanji
                    INNER JOIN server ON used_kanji.serverId=server.id
                    INNER JOIN kanji ON used_kanji.kanjiId=kanji.id
                    WHERE used=1 AND server.serverId=?
					order by used_kanji.timestamp;`;
		const rows = await conn.query(sql, serverId);

		conn.end();
		return rows;
	},
	async getAvailableKanjis(serverId) {
		const conn = await pool.getConnection();

		const sql = ` SELECT *
                    FROM kanji 
                    WHERE kanji NOT IN
                        (SELECT kanji
                        FROM used_kanji
                        INNER JOIN server ON used_kanji.serverId=server.id
                        INNER JOIN kanji ON used_kanji.kanjiId=kanji.id
                        WHERE used=1 AND server.serverId=?);`;
		const rows = await conn.query(sql, serverId);

		conn.end();
		return rows;
	},
	async getAvailableRandomKanji(serverId) {
		const availableKanjis = await this.getAvailableKanjis(serverId);
		const length = availableKanjis.length;

		if (!length) {
			return null;
		} else {
			return availableKanjis[Math.floor(Math.random() * length)];
		}
	},
	async getRandomKanji() {
		const kanjis = await this.getKanjis();
		const length = kanjis.length;

		if (!length) {
			return null;
		} else {
			return kanjis[Math.floor(Math.random() * length)];
		}
	},
	async useKanji(kanji, serverId) {
		const conn = await pool.getConnection();

		const sql = ` INSERT INTO used_kanji (kanjiId, serverId) 
                    VALUES ( 
                        (select id from kanji where kanji.kanji=?), 
                        (select id from server where serverId=?)
                    )
                    ON DUPLICATE KEY update
                    used=true,
                    timestamp=current_timestamp();`;

		const rows = await conn.query(sql, [kanji, serverId]);

		conn.end();
		return rows;
	},
	async useKanjiById(id, serverId) {
		const conn = await pool.getConnection();

		const sql = ` INSERT INTO used_kanji (kanjiId, serverId) 
                    VALUES ( 
                        ?, 
                        (select id from server where serverId=?)
                    )
                    ON DUPLICATE KEY update
	                used=true,
                    timestamp=current_timestamp();`;

		const rows = await conn.query(sql, [id, serverId]);

		conn.end();
		return rows;
	},
	async clearKanjis(serverId) {
		const conn = await pool.getConnection();

		const sql = ` UPDATE used_kanji 
                    INNER JOIN server ON used_kanji.serverId=server.id
                    SET used=false 
                    WHERE server.serverId=?`;

		const rows = await conn.query(sql, serverId);

		conn.end();
		return rows;
	},
	async restoreKanjis(serverId) {
		const conn = await pool.getConnection();

		const sql = ` UPDATE used_kanji 
                    INNER JOIN server ON used_kanji.serverId=server.id
                    SET used=true 
                    WHERE server.serverId=?`;

		const rows = await conn.query(sql, serverId);

		conn.end();
		return rows;
	},
	async getKanjiInfo(kanji) {
		const path = encodeURI(`https://kanjiapi.dev/v1/kanji/${kanji}`);
		const res = await axios.get(path, { timeout: 100000 });
		return res.data;
	},
};