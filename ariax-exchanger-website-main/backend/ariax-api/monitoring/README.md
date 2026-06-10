# Monitoring Infrastructure — Phase 14

## Purpose

This module adds a lightweight, standalone monitoring layer for the backend
without changing existing endpoints, routing behavior, or business logic.

## Included components

- `Contracts/StatusCheckInterface.php`
  Common contract for health and status checks.
- `Logging/ErrorLogger.php`
  Minimal structured logger that writes monitoring events via `error_log`.
- `Services/SystemStatusChecker.php`
  Aggregates multiple checks into a single health summary.
- `Services/QueueStatusChecker.php`
  Reports queue size and queue component status.
- `Services/DatabaseStatusChecker.php`
  Supports injectable database probes without coupling to current DB code.
- `health-check.php`
  A standalone health script that can be called directly if exposed by the web
  server or used from CLI/PHP for diagnostics.

## Design notes

- No dependency on existing routing flow.
- No modification of current API endpoints.
- No direct dependency on production business services.
- Database probing is callback-based so real checks can be added later without
  redesigning the module.

## Phase limitations

- `health-check.php` is not wired into `router.php` or `index.php`.
- Queue status reflects only the standalone in-memory queue instance created by
  the script unless future integration injects a shared queue.
- Error tracking is intentionally minimal and additive.
