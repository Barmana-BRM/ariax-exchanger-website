-- RBAC / security baseline migration
-- Apply after importing the main schema dump.

ALTER TABLE users
  MODIFY role ENUM('admin', 'kyc_operator', 'support', 'finance_manager', 'user') NOT NULL DEFAULT 'user';

UPDATE users
SET role = 'admin'
WHERE role = 'admin';

-- Staff-oriented indexes for high-traffic queries
ALTER TABLE kyc_details
  ADD INDEX idx_kyc_overall_status (overall_status),
  ADD INDEX idx_kyc_submitted_at (submitted_at);

ALTER TABLE transactions
  ADD INDEX idx_tx_user_created (user_id, created_at),
  ADD INDEX idx_tx_status_created (status, created_at),
  ADD INDEX idx_tx_asset_created (asset, created_at);

ALTER TABLE tickets
  ADD INDEX idx_tickets_user_updated (user_id, updated_at);

ALTER TABLE ticket_messages
  ADD INDEX idx_ticket_messages_ticket_created (ticket_id, created_at);

