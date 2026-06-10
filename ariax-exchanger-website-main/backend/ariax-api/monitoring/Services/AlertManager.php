<?php

declare(strict_types=1);

namespace Ariax\Monitoring\Services;

use Ariax\Monitoring\Logging\ErrorLogger;

final class AlertManager
{
    private string $statePath;

    private ErrorLogger $logger;

    /** @var callable|null */
    private $dispatcher;

    public function __construct(string $statePath, ErrorLogger $logger, ?callable $dispatcher = null)
    {
        $this->statePath = $statePath;
        $this->logger = $logger;
        $this->dispatcher = $dispatcher;
    }

    public function dispatchIfNeeded(array $healthPayload): void
    {
        $status = (string) ($healthPayload['status'] ?? 'ok');
        if ($status === 'ok') {
            return;
        }

        $state = $this->readState();
        $lastSentAt = (int) ($state['lastSentAt'] ?? 0);
        $now = time();

        if ($lastSentAt > 0 && ($now - $lastSentAt) < 300) {
            return;
        }

        $message = sprintf('System health is %s.', $status);
        $context = ['health' => $healthPayload];
        $this->logger->log('warning', $message, $context);

        if (is_callable($this->dispatcher)) {
            ($this->dispatcher)($status, $healthPayload);
        }

        $this->writeState(['lastSentAt' => $now]);
    }

    private function readState(): array
    {
        if (!is_file($this->statePath)) {
            return [];
        }

        $decoded = json_decode((string) file_get_contents($this->statePath), true);

        return is_array($decoded) ? $decoded : [];
    }

    private function writeState(array $state): void
    {
        $directory = dirname($this->statePath);
        if (!is_dir($directory)) {
            mkdir($directory, 0775, true);
        }

        file_put_contents(
            $this->statePath,
            json_encode($state, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES),
            LOCK_EX
        );
    }
}
