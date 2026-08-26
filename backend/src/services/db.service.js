const pool = require('../config/database');

/**
 * Database service with query helpers and transaction support
 */
const dbService = {
  /**
   * Execute a query
   * @param {string} text - SQL query
   * @param {Array} params - Query parameters
   * @returns {Promise<Object>} Query result
   */
  async query(text, params = []) {
    const start = Date.now();
    try {
      const result = await pool.query(text, params);
      const duration = Date.now() - start;
      console.log('Executed query:', { text, duration, rows: result.rowCount });
      return result;
    } catch (error) {
      console.error('Database query error:', error);
      throw error;
    }
  },

  /**
   * Get a single row
   * @param {string} text - SQL query
   * @param {Array} params - Query parameters
   * @returns {Promise<Object|null>} Single row or null
   */
  async queryOne(text, params = []) {
    const result = await this.query(text, params);
    return result.rows[0] || null;
  },

  /**
   * Get multiple rows
   * @param {string} text - SQL query
   * @param {Array} params - Query parameters
   * @returns {Promise<Array>} Array of rows
   */
  async queryMany(text, params = []) {
    const result = await this.query(text, params);
    return result.rows;
  },

  /**
   * Insert a record and return it
   * @param {string} table - Table name
   * @param {Object} data - Data to insert
   * @returns {Promise<Object>} Inserted row
   */
  async insert(table, data) {
    const keys = Object.keys(data);
    const values = Object.values(data);
    const placeholders = keys.map((_, i) => `$${i + 1}`).join(', ');
    const query = `
      INSERT INTO ${table} (${keys.join(', ')})
      VALUES (${placeholders})
      RETURNING *
    `;
    return this.queryOne(query, values);
  },

  /**
   * Update a record by ID
   * @param {string} table - Table name
   * @param {string|number} id - Record ID
   * @param {Object} data - Data to update
   * @returns {Promise<Object>} Updated row
   */
  async updateById(table, id, data) {
    const keys = Object.keys(data);
    const values = Object.values(data);
    const setClause = keys.map((key, i) => `${key} = $${i + 1}`).join(', ');
    const query = `
      UPDATE ${table}
      SET ${setClause}
      WHERE id = $${keys.length + 1}
      RETURNING *
    `;
    return this.queryOne(query, [...values, id]);
  },

  /**
   * Delete a record by ID
   * @param {string} table - Table name
   * @param {string|number} id - Record ID
   * @returns {Promise<Object>} Deleted row
   */
  async deleteById(table, id) {
    const query = `DELETE FROM ${table} WHERE id = $1 RETURNING *`;
    return this.queryOne(query, [id]);
  },

  /**
   * Find a record by criteria
   * @param {string} table - Table name
   * @param {Object} criteria - Search criteria
   * @returns {Promise<Object|null>} Found row or null
   */
  async findOne(table, criteria) {
    const keys = Object.keys(criteria);
    const values = Object.values(criteria);
    const whereClause = keys.map((key, i) => `${key} = $${i + 1}`).join(' AND ');
    const query = `SELECT * FROM ${table} WHERE ${whereClause} LIMIT 1`;
    return this.queryOne(query, values);
  },

  /**
   * Find multiple records by criteria
   * @param {string} table - Table name
   * @param {Object} criteria - Search criteria
   * @param {Object} options - Query options (orderBy, limit, offset)
   * @returns {Promise<Array>} Array of rows
   */
  async findMany(table, criteria, options = {}) {
    const keys = Object.keys(criteria);
    const values = Object.values(criteria);
    const whereClause = keys.length > 0
      ? 'WHERE ' + keys.map((key, i) => `${key} = $${i + 1}`).join(' AND ')
      : '';

    let query = `SELECT * FROM ${table} ${whereClause}`;

    if (options.orderBy) {
      query += ` ORDER BY ${options.orderBy}`;
    }
    if (options.limit) {
      query += ` LIMIT ${options.limit}`;
    }
    if (options.offset) {
      query += ` OFFSET ${options.offset}`;
    }

    return this.queryMany(query, values);
  },

  /**
   * Execute a transaction
   * @param {Function} callback - Transaction callback function
   * @returns {Promise<any>} Transaction result
   */
  async transaction(callback) {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      const result = await callback(client);
      await client.query('COMMIT');
      return result;
    } catch (error) {
      await client.query('ROLLBACK');
      console.error('Transaction error:', error);
      throw error;
    } finally {
      client.release();
    }
  },
};

module.exports = dbService;
