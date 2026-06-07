-- Migration v3: ایمیل در KYC (مرحله اول ثبت‌نام)
USE ariax_exchange;

ALTER TABLE kyc_details ADD COLUMN email VARCHAR(255) DEFAULT NULL;
