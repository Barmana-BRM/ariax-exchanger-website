<?php

declare(strict_types=1);

namespace Ariax\Monitoring\Logging;

final class ErrorLogger
{
    private string $channel;

    public function __construct(string $channel = 'monitoring')
    {
        $this->channel = $channel;
    }

    /**
     * @param array<string, mixed> $context
     */
    public function log(string $level, string $message, array $context = []): void
    {
        $entry = [
            'channel' => $this->channel,
            'level' => strtoupper($level),
            'message' => $message,
            'context' => $context,
            'timestamp' => time(),
        ];

        error_log(json_encode($entry, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES));
    }
}
