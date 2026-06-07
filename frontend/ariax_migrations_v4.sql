-- Migration v4: multi-step KYC drafts, face verification, and secure document storage
USE ariax_exchange;

ALTER TABLE kyc_details
  MODIFY user_id VARCHAR(36) DEFAULT NULL,
  ADD COLUMN draft_token VARCHAR(64) DEFAULT NULL UNIQUE,
  ADD COLUMN selfie_image VARCHAR(255) DEFAULT NULL,
  ADD COLUMN supporting_document VARCHAR(255) DEFAULT NULL,
  ADD COLUMN supporting_document_type VARCHAR(50) DEFAULT NULL,
  ADD COLUMN current_step TINYINT NOT NULL DEFAULT 1,
  ADD COLUMN step1_status ENUM('pending','approved','rejected') NOT NULL DEFAULT 'pending',
  ADD COLUMN step2_status ENUM('pending','approved','rejected') NOT NULL DEFAULT 'pending',
  ADD COLUMN step3_status ENUM('pending','approved','rejected') NOT NULL DEFAULT 'pending',
  ADD COLUMN overall_status ENUM('draft','pending_review','approved','rejected') NOT NULL DEFAULT 'draft',
  ADD COLUMN face_match_score DECIMAL(5,2) DEFAULT NULL,
  ADD COLUMN step1_payload LONGTEXT DEFAULT NULL,
  ADD COLUMN step2_payload LONGTEXT DEFAULT NULL,
  ADD COLUMN step3_payload LONGTEXT DEFAULT NULL;
