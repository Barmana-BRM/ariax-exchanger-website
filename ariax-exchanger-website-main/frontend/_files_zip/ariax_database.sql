-- ═══════════════════════════════════════════════════════════════
--  سامانه صرافی آریا اکس — طرح دیتابیس MySQL
--  اجرا در phpMyAdmin یا MySQL CLI
-- ═══════════════════════════════════════════════════════════════

CREATE DATABASE IF NOT EXISTS ariax_exchange
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

USE ariax_exchange;

-- ─────────────────────────────────────────────────────────────
--  جدول کاربران
-- ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS users (
  id            VARCHAR(36)  NOT NULL PRIMARY KEY,
  name          VARCHAR(100) NOT NULL,
  username      VARCHAR(50)  NOT NULL UNIQUE,
  password_hash VARCHAR(255) NOT NULL,          -- bcrypt hash
  role          ENUM('admin','user') NOT NULL DEFAULT 'user',
  avatar_color  VARCHAR(20)  NOT NULL DEFAULT '#3b82f6',

  -- موجودی‌ها
  balance_irt   DECIMAL(20,2) NOT NULL DEFAULT 0,
  balance_btc   DECIMAL(18,8) NOT NULL DEFAULT 0,
  balance_eth   DECIMAL(18,8) NOT NULL DEFAULT 0,
  balance_usdt  DECIMAL(18,2) NOT NULL DEFAULT 0,
  balance_trx   DECIMAL(18,6) NOT NULL DEFAULT 0,

  -- آدرس‌های کریپتو
  addr_btc      VARCHAR(100)  DEFAULT NULL,
  addr_usdt     VARCHAR(100)  DEFAULT NULL,
  addr_trx      VARCHAR(100)  DEFAULT NULL,
  card_no       VARCHAR(20)   DEFAULT NULL,
  shiba_no      VARCHAR(30)   DEFAULT NULL,

  -- KYC
  kyc_status    ENUM('unverified','pending','verified','rejected') NOT NULL DEFAULT 'unverified',

  is_active     TINYINT(1) NOT NULL DEFAULT 1,
  created_at    DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at    DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;


-- ─────────────────────────────────────────────────────────────
--  جدول احراز هویت KYC
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
  reviewed_by      VARCHAR(36)  DEFAULT NULL,   -- user_id ادمین بررسی‌کننده

  CONSTRAINT fk_kyc_user    FOREIGN KEY (user_id)     REFERENCES users(id) ON DELETE CASCADE,
  CONSTRAINT fk_kyc_admin   FOREIGN KEY (reviewed_by) REFERENCES users(id) ON DELETE SET NULL
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
  tx_id       VARCHAR(100)  DEFAULT NULL,        -- هش تراکنش بلاکچین
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
--  جدول پیام‌های تیمی
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
--  جدول وظایف تیمی
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
--  جدول قیمت بازار (snapshot لحظه‌ای)
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
--  جدول سشن‌ها (لاگین)
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


-- ═══════════════════════════════════════════════════════════════
--  داده‌های اولیه (Seed Data)
-- ═══════════════════════════════════════════════════════════════

-- ادمین پیش‌فرض (رمز: admin123)
INSERT INTO users (id, name, username, password_hash, role, avatar_color,
  balance_irt, balance_btc, balance_eth, balance_usdt, balance_trx,
  kyc_status)
VALUES (
  'admin-001', 'مدیر سیستم', 'admin',
  '$2y$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi',  -- admin123
  'admin', '#10b981',
  0, 0, 0, 0, 0,
  'verified'
);

-- کاربر نمونه (رمز: user1234)
INSERT INTO users (id, name, username, password_hash, role, avatar_color,
  balance_irt, balance_btc, balance_eth, balance_usdt, balance_trx,
  addr_btc, addr_usdt, addr_trx, card_no, shiba_no, kyc_status)
VALUES (
  'user-001', 'علی رضایی', 'user1',
  '$2y$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi',  -- user1234
  'user', '#3b82f6',
  28500000, 0.0042, 0.35, 240, 1200,
  'bc1qxy2kgdygjrsqtzq2n0yrf2493p83kkfjhx0wlh',
  'TQn9Y2khEsLJW1ChVWFMSMeRDow5KcbLSE',
  'TXQ8v2LsQeEaFMG7Rx8vJ9Ep6sDtaVXnFR',
  '6037991234567890', 'IR120570028080013447370101',
  'verified'
);

-- KYC کاربر نمونه
INSERT INTO kyc_details (user_id, full_name, national_id, phone, reviewed_at, reviewed_by)
VALUES ('user-001', 'علی رضایی', '0012345678', '09121234567', NOW(), 'admin-001');

-- تراکنش‌های نمونه
INSERT INTO transactions (id, user_id, user_name, type, asset, amount, fee, destination, status) VALUES
  ('tx-001', 'user-001', 'علی رضایی', 'deposit',  'IRT',  10000000, 50000,  'بانک ملی',     'completed'),
  ('tx-002', 'user-001', 'علی رضایی', 'trade',    'BTC',  0.002,    0.000004,'تبدیل به USDT','completed'),
  ('tx-003', 'user-001', 'علی رضایی', 'withdraw', 'IRT',  3000000,  15000,  'بانک صادرات',  'pending'),
  ('tx-004', 'user-001', 'علی رضایی', 'deposit',  'IRT',  20000000, 100000, 'بانک ملی',     'completed');

-- قیمت‌های اولیه بازار
INSERT INTO market_prices (symbol, price_irt, price_usd, change_24h, volume_24h, high_24h, low_24h) VALUES
  ('BTC',  3800000000, 67000.00,  2.40, 28500, 3850000000, 3720000000),
  ('ETH',   190000000,  3350.00, -1.20, 14200,  195000000,  187000000),
  ('USDT',      56000,     1.00,  0.10, 95000,      56200,      55800),
  ('TRX',         680,     0.12,  3.10,  8700,        700,        660);

-- پیام‌های اولیه تیم
INSERT INTO team_messages (sender_id, sender_name, message) VALUES
  ('admin-001', 'مدیر سیستم', 'سلام تیم! لطفاً درخواست‌های برداشت امروز رو بررسی کنید.'),
  ('user-001',  'علی رضایی',  'چشم، الان بررسی می‌کنم.');

-- وظایف اولیه
INSERT INTO team_tasks (title, assigned_to, created_by, status, category) VALUES
  ('بررسی درخواست‌های برداشت', 'user-001', 'admin-001', 'in_progress', 'wallet'),
  ('به‌روزرسانی نرخ کارمزد',    'admin-001','admin-001', 'todo',        'technical');


-- ═══════════════════════════════════════════════════════════════
--  View های مفید برای گزارش‌گیری
-- ═══════════════════════════════════════════════════════════════

-- خلاصه مالی کاربران
CREATE OR REPLACE VIEW v_user_summary AS
SELECT
  u.id, u.name, u.username, u.role, u.kyc_status,
  u.balance_irt, u.balance_btc, u.balance_eth, u.balance_usdt, u.balance_trx,
  COUNT(t.id)                                    AS total_txs,
  SUM(CASE WHEN t.status='pending' THEN 1 ELSE 0 END) AS pending_txs,
  SUM(CASE WHEN t.type='deposit'   AND t.asset='IRT' THEN t.amount ELSE 0 END) AS total_deposits_irt,
  SUM(CASE WHEN t.type='withdraw'  AND t.asset='IRT' THEN t.amount ELSE 0 END) AS total_withdrawals_irt,
  SUM(t.fee)                                     AS total_fees_paid,
  u.created_at
FROM users u
LEFT JOIN transactions t ON t.user_id = u.id
GROUP BY u.id;

-- گزارش تراکنش‌های امروز
CREATE OR REPLACE VIEW v_today_transactions AS
SELECT
  t.id, t.type, t.asset, t.amount, t.fee, t.status,
  t.destination, t.created_at,
  u.name AS user_name, u.username
FROM transactions t
JOIN users u ON u.id = t.user_id
WHERE DATE(t.created_at) = CURDATE()
ORDER BY t.created_at DESC;

-- وضعیت کلی سیستم
CREATE OR REPLACE VIEW v_system_stats AS
SELECT
  (SELECT COUNT(*) FROM users WHERE role='user')                AS total_users,
  (SELECT COUNT(*) FROM users WHERE kyc_status='pending')       AS pending_kyc,
  (SELECT COUNT(*) FROM users WHERE kyc_status='verified')      AS verified_users,
  (SELECT COUNT(*) FROM transactions WHERE status='pending')    AS pending_txs,
  (SELECT COUNT(*) FROM transactions WHERE DATE(created_at)=CURDATE()) AS today_txs,
  (SELECT SUM(balance_irt) FROM users WHERE role='user')        AS total_irt_held,
  (SELECT SUM(fee) FROM transactions WHERE status='completed')  AS total_fees_collected;
