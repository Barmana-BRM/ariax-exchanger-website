<?php

declare(strict_types=1);

namespace Ariax\Monitoring\Services;

use Ariax\Monitoring\Logging\ErrorLogger;

final class HealthCheckService
{
    private SystemStatusChecker $checker;

    private ErrorLogger $logger;

    private ?AlertManager $alertManager;

    public function __construct(SystemStatusChecker $checker, ErrorLogger $logger, ?AlertManager $alertManager = null)
    {
        $this->checker = $checker;
        $this->logger = $logger;
        $this->alertManager = $alertManager;
    }

    public function run(): array
    {
        $payload = $this->checker->check();
        $this->logger->log('info', 'Health check executed.', ['status' => $payload['status'] ?? 'unknown']);

        if ($this->alertManager instanceof AlertManager) {
            $this->alertManager->dispatchIfNeeded($payload);
        }

        return $payload;
    }
}
