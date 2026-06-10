-- ═══════════════════════════════════════════════════════════════
--  V004__create_audit_logs.sql
--  تسک ۸: جدول Audit Log برای تمام عملیات حساس
-- ═══════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS audit_logs (
  id          BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,

  -- نوع رویداد: 'user.login', 'kyc.approved', 'transaction.created', ...
  event       VARCHAR(80)   NOT NULL,

  -- کاربری که عملیات را انجام داده (NULL = سیستم)
  actor_id    VARCHAR(36)   DEFAULT NULL,

  -- موجودیت تحت‌تأثیر
  target_id   VARCHAR(36)   DEFAULT NULL,
  target_type VARCHAR(30)   DEFAULT NULL,  -- 'user','transaction','kyc',...

  -- اطلاعات شبکه
  ip_address  VARCHAR(45)   DEFAULT NULL,
  user_agent  VARCHAR(300)  DEFAULT NULL,

  -- جزئیات اضافه به صورت JSON
  meta        JSON          DEFAULT NULL,

  created_at  DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,

  INDEX idx_al_event      (event),
  INDEX idx_al_actor      (actor_id),
  INDEX idx_al_target     (target_id, target_type),
  INDEX idx_al_created    (created_at),
  INDEX idx_al_ip         (ip_address)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
