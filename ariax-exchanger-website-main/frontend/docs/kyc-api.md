# KYC API

## Overview

The KYC flow is split into three resumable steps:

1. Base identity data and ID image
2. Live selfie with ID in hand
3. Optional address and supporting documents

Drafts are saved under a `draftToken` so the user can continue later from the same browser or session.

## Endpoints

### `POST /kyc/drafts`

Saves a KYC step draft.

Required form fields depend on the step:

- `step=1`
- `firstName`, `lastName`, `nationalId`, `phone`
- `email` optional
- `nationalIdImage` file required

For step 2:

- `step=2`
- `draftToken`
- `selfieImage`
- `faceMatchScore` optional
- `faceMatchStatus` optional

For step 3:

- `step=3`
- `draftToken`
- `homeAddress` optional
- `supportingDocument` optional
- `supportingDocumentType` optional

### `GET /kyc/drafts/{draftToken}`

Returns the saved draft snapshot and the current status of each step.

### `POST /auth/register`

Finalizes the draft and creates the user account.

Recommended payload:

- `draftToken`
- `username`
- `password`
- `email` optional

### `GET /kyc/me`

Returns the latest KYC snapshot for the authenticated user.

### `GET /kyc/report`

Admin-only report endpoint.

Response includes:

- `rows`: latest KYC applications
- `summary`: counts by `draft`, `pending_review`, `approved`, `rejected`

### `PUT /kyc/report/{id}`

Admin-only approval endpoint.

Body:

- `overallStatus`: `approved` or `rejected`
- `rejectionReason` optional

## Step Statuses

- `pending`
- `approved`
- `rejected`

## Security Notes

- Uploaded files are encrypted on the server before persistence.
- KYC data payloads are sealed server-side before storage.
- Access to report/review endpoints is restricted to authenticated admins.
- The browser face-check step uses the native `FaceDetector` API when available and falls back to manual review when it is not.
