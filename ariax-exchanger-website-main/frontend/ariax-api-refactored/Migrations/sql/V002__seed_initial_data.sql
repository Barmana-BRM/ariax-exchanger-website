-- ═══════════════════════════════════════════════════════════════
--  V002__seed_initial_data.sql
--  تسک ۷: داده‌های اولیه (Seed)
-- ═══════════════════════════════════════════════════════════════

-- ادمین پیش‌فرض (رمز: admin123)
INSERT IGNORE INTO users (id, name, username, password_hash, role, avatar_color,
  balance_irt, balance_btc, balance_eth, balance_usdt, balance_trx, kyc_status)
VALUES (
  'admin-001', 'مدیر سیستم', 'admin',
  '$2y$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi',
  'admin', '#10b981', 0, 0, 0, 0, 0, 'verified'
);

-- کاربر نمونه (رمز: user1234)
INSERT IGNORE INTO users (id, name, username, password_hash, role, avatar_color,
  balance_irt, balance_btc, balance_eth, balance_usdt, balance_trx,
  addr_btc, addr_usdt, addr_trx, card_no, shiba_no, kyc_status)
VALUES (
  'user-001', 'علی رضایی', 'user1',
  '$2y$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi',
  'user', '#3b82f6',
  28500000, 0.0042, 0.35, 240, 1200,
  'bc1qxy2kgdygjrsqtzq2n0yrf2493p83kkfjhx0wlh',
  'TQn9Y2khEsLJW1ChVWFMSMeRDow5KcbLSE',
  'TXQ8v2LsQeEaFMG7Rx8vJ9Ep6sDtaVXnFR',
  '6037991234567890', 'IR120570028080013447370101', 'verified'
);

INSERT IGNORE INTO kyc_details (user_id, full_name, national_id, phone, reviewed_at, reviewed_by)
VALUES ('user-001', 'علی رضایی', '0012345678', '09121234567', NOW(), 'admin-001');

INSERT IGNORE INTO transactions (id, user_id, user_name, type, asset, amount, fee, destination, status) VALUES
  ('tx-001', 'user-001', 'علی رضایی', 'deposit',  'IRT',  10000000, 50000,   'بانک ملی',      'completed'),
  ('tx-002', 'user-001', 'علی رضایی', 'trade',    'BTC',  0.002,    0.000004,'تبدیل به USDT', 'completed'),
  ('tx-003', 'user-001', 'علی رضایی', 'withdraw', 'IRT',  3000000,  15000,   'بانک صادرات',   'pending'),
  ('tx-004', 'user-001', 'علی رضایی', 'deposit',  'IRT',  20000000, 100000,  'بانک ملی',      'completed');

INSERT IGNORE INTO market_prices (symbol, price_irt, price_usd, change_24h, volume_24h, high_24h, low_24h) VALUES
  ('BTC',  3800000000, 67000.00,  2.40, 28500, 3850000000, 3720000000),
  ('ETH',   190000000,  3350.00, -1.20, 14200,  195000000,  187000000),
  ('USDT',      56000,     1.00,  0.10, 95000,      56200,      55800),
  ('TRX',         680,     0.12,  3.10,  8700,        700,        660);

INSERT IGNORE INTO team_messages (sender_id, sender_name, message) VALUES
  ('admin-001', 'مدیر سیستم', 'سلام تیم! لطفاً درخواست‌های برداشت امروز رو بررسی کنید.'),
  ('user-001',  'علی رضایی',  'چشم، الان بررسی می‌کنم.');

INSERT IGNORE INTO team_tasks (title, assigned_to, created_by, status, category) VALUES
  ('بررسی درخواست‌های برداشت', 'user-001', 'admin-001', 'in_progress', 'wallet'),
  ('به‌روزرسانی نرخ کارمزد',    'admin-001','admin-001', 'todo',        'technical');
