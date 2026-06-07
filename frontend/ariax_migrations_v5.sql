-- Migration v5: updated_at for KYC draft updates (step 2 selfie, etc.)
USE ariax_exchange;

ALTER TABLE kyc_details
  ADD COLUMN updated_at DATETIME DEFAULT NULL ON UPDATE CURRENT_TIMESTAMP;
