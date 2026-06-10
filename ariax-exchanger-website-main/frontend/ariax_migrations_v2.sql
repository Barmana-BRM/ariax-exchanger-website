-- Migration v2: تصویر کارت ملی + اطلاعات تکمیلی تراکنش‌های پرمبلغ
-- اجرا یک‌بار در phpMyAdmin (اگر دیتابیس از قبل ساخته شده)
USE ariax_exchange;

ALTER TABLE kyc_details ADD COLUMN national_id_image VARCHAR(255) DEFAULT NULL;
ALTER TABLE kyc_details ADD COLUMN home_address VARCHAR(300) DEFAULT NULL;
ALTER TABLE transactions ADD COLUMN home_address VARCHAR(300) DEFAULT NULL;
ALTER TABLE transactions ADD COLUMN postal_code VARCHAR(10) DEFAULT NULL;
ALTER TABLE transactions ADD COLUMN requires_extended TINYINT(1) NOT NULL DEFAULT 0;
