import mysql from 'mysql2/promise';

const TARGET_DB_CONFIG = {
  host: 'gz-cdb-e3z4b5ql.sql.tencentcdb.com',
  port: 63453,
  user: 'root',
  password: 'zsj12345678',
  database: 'data_analysis',
  charset: 'utf8mb4',
  connectTimeout: 60000,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
};

let pool: mysql.Pool | null = null;

export function getPool(): mysql.Pool {
  if (!pool) {
    pool = mysql.createPool(TARGET_DB_CONFIG);
  }
  return pool;
}

export async function query<T = any>(sql: string, params?: any[]): Promise<T> {
  const connection = await getPool().getConnection();
  try {
    const [rows] = await connection.execute(sql, params);
    return rows as T;
  } finally {
    connection.release();
  }
}

export async function initDatabase() {
  const createAnalysisConfigTable = `
    CREATE TABLE IF NOT EXISTS analysis_configs (
      id INT AUTO_INCREMENT PRIMARY KEY,
      name VARCHAR(255) NOT NULL,
      description TEXT,
      base_indicators JSON NOT NULL,
      extended_indicators JSON NOT NULL,
      time_dimension ENUM('minute', 'hour', 'day') NOT NULL DEFAULT 'minute',
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      INDEX idx_name (name),
      INDEX idx_created_at (created_at)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
  `;

  const createSavedQueriesTable = `
    CREATE TABLE IF NOT EXISTS saved_queries (
      id INT AUTO_INCREMENT PRIMARY KEY,
      name VARCHAR(255) NOT NULL,
      config_id INT NOT NULL,
      query_params JSON NOT NULL,
      chart_styles JSON,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      INDEX idx_name (name),
      INDEX idx_created_at (created_at),
      FOREIGN KEY (config_id) REFERENCES analysis_configs(id) ON DELETE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
  `;

  const createImportConfigTable = `
    CREATE TABLE IF NOT EXISTS import_configs (
      id INT AUTO_INCREMENT PRIMARY KEY,
      name VARCHAR(255) NOT NULL,
      description TEXT,
      data_type ENUM('minute', 'hour', 'day') NOT NULL,
      start_row INT NOT NULL DEFAULT 1,
      start_column INT NOT NULL DEFAULT 1,
      data_format ENUM('row', 'column') NOT NULL DEFAULT 'column',
      date_format VARCHAR(100),
      label_mappings JSON NOT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      INDEX idx_name (name),
      INDEX idx_data_type (data_type),
      INDEX idx_created_at (created_at)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
  `;

  const createDataImportTable = `
    CREATE TABLE IF NOT EXISTS data_import (
      id BIGINT AUTO_INCREMENT PRIMARY KEY,
      timestamp DATETIME NOT NULL,
      label1 VARCHAR(255) NOT NULL,
      label2 VARCHAR(255),
      value DOUBLE NOT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      UNIQUE KEY idx_time_label (timestamp, label1),
      INDEX idx_timestamp (timestamp),
      INDEX idx_label1 (label1),
      INDEX idx_label2 (label2)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
  `;

  const createDataHourImportTable = `
    CREATE TABLE IF NOT EXISTS data_hour_import (
      id BIGINT AUTO_INCREMENT PRIMARY KEY,
      timestamp DATETIME NOT NULL,
      label1 VARCHAR(255) NOT NULL,
      label2 VARCHAR(255),
      value DOUBLE NOT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      UNIQUE KEY idx_time_label (timestamp, label1),
      INDEX idx_timestamp (timestamp),
      INDEX idx_label1 (label1),
      INDEX idx_label2 (label2)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
  `;

  const createDataDailyImportTable = `
    CREATE TABLE IF NOT EXISTS data_daily_import (
      id BIGINT AUTO_INCREMENT PRIMARY KEY,
      timestamp DATE NOT NULL,
      label1 VARCHAR(255) NOT NULL,
      label2 VARCHAR(255),
      value DOUBLE NOT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      UNIQUE KEY idx_time_label (timestamp, label1),
      INDEX idx_timestamp (timestamp),
      INDEX idx_label1 (label1),
      INDEX idx_label2 (label2)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
  `;

  await query(createAnalysisConfigTable);
  await query(createSavedQueriesTable);
  await query(createImportConfigTable);
  await query(createDataImportTable);
  await query(createDataHourImportTable);
  await query(createDataDailyImportTable);
  console.log('Database initialized successfully');
}
