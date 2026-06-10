-- ═══════════════════════════════════════════════════════════════
--  V003__kyc_add_email.sql
--  تسک ۷: اضافه کردن ایمیل به KYC (از migration قبلی پروژه)
-- ═══════════════════════════════════════════════════════════════

ALTER TABLE kyc_details ADD COLUMN IF NOT EXISTS email VARCHAR(255) DEFAULT NULL;
