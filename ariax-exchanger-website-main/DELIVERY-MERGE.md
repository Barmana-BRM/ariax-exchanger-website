# Delivery Merge Notes

Unified project root:

- `ariax-exchanger-website-main/` is now the single working project folder.
- `secure-storage/` has been copied inside the project root so KYC assets live with the app instead of as a separate sibling project.

Merged components now present in the project:

- `backend/ariax-api` and `frontend/ariax-api`: live application surface with the existing security and RBAC changes.
- `backend/ariax-api-refactored` and `frontend/ariax-api-refactored`: modular refactored API package preserved for later consolidation work.
- `backend/ariax-api/monitoring`: monitoring and health-check utilities brought in from the archive.
- `backend/ariax-api/queue`: queue worker and handler package brought in from the archive.
- `backend/ariax-api/tests`: scenario-based backend test utilities brought in from the archive.

Storage compatibility:

- KYC storage now prefers `ariax-exchanger-website-main/secure-storage`.
- If `KYC_STORAGE_DIR` is set, that explicit path still wins.
- A legacy fallback remains in the PHP API so older external `secure-storage` layouts do not break immediately.

Validation performed:

- Verified archive-only backend modules were copied into the main project.
- Verified `secure-storage/kyc` is present inside the project root.
