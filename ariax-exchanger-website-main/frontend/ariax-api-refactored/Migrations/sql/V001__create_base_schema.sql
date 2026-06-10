-- ═══════════════════════════════════════════════════════════════
--  V001__create_base_schema.sql
--  تسک ۷: Migration پایه — تمام جداول اصلی
-- ═══════════════════════════════════════════════════════════════

-- ─────────────────────────────────────────────────────────────
--  جدول کاربران
-- ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS users (
  id            VARCHAR(36)  NOT NULL PRIMARY KEY,
  name          VARCHAR(100) NOT NULL,
  username      VARCHAR(50)  NOT NULL UNIQUE,
  password_hash VARCHAR(255) NOT NULL,
  role          ENUM('admin','user') NOT NULL DEFAULT 'user',
  avatar_color  VARCHAR(20)  NOT NULL DEFAULT '#3b82f6',

  balance_irt   DECIMAL(20,2) NOT NULL DEFAULT 0,
  balance_btc   DECIMAL(18,8) NOT NULL DEFAULT 0,
  balance_eth   DECIMAL(18,8) NOT NULL DEFAULT 0,
  balance_usdt  DECIMAL(18,2) NOT NULL DEFAULT 0,
  balance_trx   DECIMAL(18,6) NOT NULL DEFAULT 0,

  addr_btc      VARCHAR(100)  DEFAULT NULL,
  addr_usdt     VARCHAR(100)  DEFAULT NULL,
  addr_trx      VARCHAR(100)  DEFAULT NULL,
  card_no       VARCHAR(20)   DEFAULT NULL,
  shiba_no      VARCHAR(30)   DEFAULT NULL,

  kyc_status    ENUM('unverified','pending','verified','rejected') NOT NULL DEFAULT 'unverified',
  is_active     TINYINT(1) NOT NULL DEFAULT 1,
  created_at    DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at    DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;


-- ─────────────────────────────────────────────────────────────
--  جدول KYC
-- ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS kyc_details (
  id               INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  user_id          VARCHAR(36)  NOT NULL,
  full_name        VARCHAR(100) NOT NULL,
  national_id      VARCHAR(10)  NOT NULL,
  phone            VARCHAR(11)  NOT NULL,
  rejection_reason VARCHAR(300) DEFAULT NULL,
  submitted_at     DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  reviewed_at      DATETIME DEFAULT NULL,
  reviewed_by      VARCHAR(36)  DEFAULT NULL,

  CONSTRAINT fk_kyc_user  FOREIGN KEY (user_id)     REFERENCES users(id) ON DELETE CASCADE,
  CONSTRAINT fk_kyc_admin FOREIGN KEY (reviewed_by) REFERENCES users(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;


-- ─────────────────────────────────────────────────────────────
--  جدول تراکنش‌ها
-- ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS transactions (
  id          VARCHAR(36)   NOT NULL PRIMARY KEY,
  user_id     VARCHAR(36)   NOT NULL,
  user_name   VARCHAR(100)  NOT NULL,
  type        ENUM('deposit','withdraw','trade') NOT NULL,
  asset       ENUM('IRT','BTC','ETH','USDT','TRX') NOT NULL,
  amount      DECIMAL(20,8) NOT NULL,
  fee         DECIMAL(20,8) NOT NULL DEFAULT 0,
  destination VARCHAR(200)  DEFAULT NULL,
  tx_id       VARCHAR(100)  DEFAULT NULL,
  status      ENUM('pending','completed','rejected') NOT NULL DEFAULT 'pending',
  note        VARCHAR(300)  DEFAULT NULL,
  created_at  DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at  DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

  INDEX idx_tx_user   (user_id),
  INDEX idx_tx_status (status),
  INDEX idx_tx_type   (type),
  INDEX idx_tx_date   (created_at),

  CONSTRAINT fk_tx_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;


-- ─────────────────────────────────────────────────────────────
--  پیام‌های تیمی
-- ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS team_messages (
  id          INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  sender_id   VARCHAR(36)  NOT NULL,
  sender_name VARCHAR(100) NOT NULL,
  message     TEXT         NOT NULL,
  created_at  DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,

  INDEX idx_msg_sender (sender_id),
  INDEX idx_msg_date   (created_at),

  CONSTRAINT fk_msg_sender FOREIGN KEY (sender_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;


-- ─────────────────────────────────────────────────────────────
--  وظایف تیمی
-- ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS team_tasks (
  id          INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  title       VARCHAR(200) NOT NULL,
  assigned_to VARCHAR(36)  NOT NULL,
  created_by  VARCHAR(36)  NOT NULL,
  status      ENUM('todo','in_progress','done') NOT NULL DEFAULT 'todo',
  category    ENUM('wallet','support','technical','liquidity') NOT NULL,
  created_at  DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at  DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

  INDEX idx_task_assigned (assigned_to),
  INDEX idx_task_status   (status),

  CONSTRAINT fk_task_assigned FOREIGN KEY (assigned_to) REFERENCES users(id) ON DELETE CASCADE,
  CONSTRAINT fk_task_creator  FOREIGN KEY (created_by)  REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;


-- ─────────────────────────────────────────────────────────────
--  قیمت بازار
-- ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS market_prices (
  id          INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  symbol      ENUM('BTC','ETH','USDT','TRX') NOT NULL,
  price_irt   DECIMAL(20,2) NOT NULL,
  price_usd   DECIMAL(18,6) NOT NULL,
  change_24h  DECIMAL(8,4)  NOT NULL DEFAULT 0,
  volume_24h  DECIMAL(20,2) NOT NULL DEFAULT 0,
  high_24h    DECIMAL(20,2) NOT NULL DEFAULT 0,
  low_24h     DECIMAL(20,2) NOT NULL DEFAULT 0,
  recorded_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,

  INDEX idx_price_symbol (symbol),
  INDEX idx_price_time   (recorded_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;


-- ─────────────────────────────────────────────────────────────
--  سشن‌ها
-- ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS sessions (
  token       VARCHAR(64)  NOT NULL PRIMARY KEY,
  user_id     VARCHAR(36)  NOT NULL,
  ip_address  VARCHAR(45)  DEFAULT NULL,
  user_agent  VARCHAR(300) DEFAULT NULL,
  expires_at  DATETIME NOT NULL,
  created_at  DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,

  INDEX idx_session_user    (user_id),
  INDEX idx_session_expires (expires_at),

  CONSTRAINT fk_session_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;


-- ─────────────────────────────────────────────────────────────
--  Views
-- ─────────────────────────────────────────────────────────────
CREATE OR REPLACE VIEW v_user_summary AS
SELECT
  u.id, u.name, u.username, u.role, u.kyc_status,
  u.balance_irt, u.balance_btc, u.balance_eth, u.balance_usdt, u.balance_trx,
  COUNT(t.id)                                          AS total_txs,
  SUM(CASE WHEN t.status='pending' THEN 1 ELSE 0 END) AS pending_txs,
  SUM(CASE WHEN t.type='deposit'  AND t.asset='IRT' THEN t.amount ELSE 0 END) AS total_deposits_irt,
  SUM(CASE WHEN t.type='withdraw' AND t.asset='IRT' THEN t.amount ELSE 0 END) AS total_withdrawals_irt,
  SUM(t.fee)                                           AS total_fees_paid,
  u.created_at
FROM users u
LEFT JOIN transactions t ON t.user_id = u.id
GROUP BY u.id;

CREATE OR REPLACE VIEW v_today_transactions AS
SELECT
  t.id, t.type, t.asset, t.amount, t.fee, t.status,
  t.destination, t.created_at,
  u.name AS user_name, u.username
FROM transactions t
JOIN users u ON u.id = t.user_id
WHERE DATE(t.created_at) = CURDATE()
ORDER BY t.created_at DESC;

CREATE OR REPLACE VIEW v_system_stats AS
SELECT
  (SELECT COUNT(*) FROM users WHERE role='user')                  AS total_users,
  (SELECT COUNT(*) FROM users WHERE kyc_status='pending')         AS pending_kyc,
  (SELECT COUNT(*) FROM users WHERE kyc_status='verified')        AS verified_users,
  (SELECT COUNT(*) FROM transactions WHERE status='pending')      AS pending_txs,
  (SELECT COUNT(*) FROM transactions WHERE DATE(created_at)=CURDATE()) AS today_txs,
  (SELECT SUM(balance_irt) FROM users WHERE role='user')          AS total_irt_held,
  (SELECT SUM(fee) FROM transactions WHERE status='completed')    AS total_fees_collected;
