# Queue Infrastructure — Phase 1

## Purpose

This module provides a fully isolated queue core for future backend workloads.
It is infrastructure-only and is intentionally not integrated with the current
API, routing, database, authentication, KYC, email, SMS, reporting, or any
other business module.

## Architecture

The queue module is split into small reusable components:

- `Contracts/QueueInterface.php`
  Defines the abstraction that future queue adapters must implement.
- `Models/Job.php`
  A generic job model that carries type, payload, status, retry count, and
  creation time.
- `Services/InMemoryQueue.php`
  A simple in-memory FIFO queue implementation for Phase 1.
- `Registry/HandlerRegistry.php`
  Stores and resolves job handlers by job type.
- `Workers/QueueWorker.php`
  Polls the queue, resolves handlers, executes jobs, logs results, and handles
  failures safely.

## How it works internally

1. A `Job` object is created with an `id`, `type`, and `payload`.
2. The job is pushed into a `QueueInterface` implementation.
3. The `QueueWorker` asks the queue for the next job.
4. The worker resolves the job handler from `HandlerRegistry`.
5. The worker executes the handler and updates job status.
6. Failures are caught safely and logged without embedding business logic.

## Adding a new future job type

No worker changes are required to support new job types.

Example flow:

1. Choose a new job type string such as `EMAIL`, `SMS`, `KYC`, or `REPORT`.
2. Register a handler in `HandlerRegistry` for that type.
3. Push `Job` instances with that same type into the queue.

Because handler resolution is delegated to the registry, the worker remains
unchanged.

## Phase 1 limitations

- Queue storage is in-memory only.
- Jobs do not survive process restarts.
- No retry policy beyond incrementing retry count on failure.
- No dead-letter queue.
- No distributed workers.
- No monitoring integration.
- No persistence layer.

## Future-ready design

The current contract supports replacing `InMemoryQueue` later with:

- Redis-backed queue
- Database-backed queue
- RabbitMQ-backed queue
- Monitoring or metrics wrappers
- Advanced retry and backoff policies

Those upgrades can be introduced by adding new implementations of
`QueueInterface` and optional supporting components, without changing the
worker contract.
