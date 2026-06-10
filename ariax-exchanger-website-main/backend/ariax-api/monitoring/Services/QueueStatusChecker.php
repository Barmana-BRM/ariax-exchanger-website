<?php

declare(strict_types=1);

namespace Ariax\Monitoring\Services;

use Ariax\Monitoring\Contracts\StatusCheckInterface;
use Ariax\Queue\Contracts\QueueInterface;

final class QueueStatusChecker implements StatusCheckInterface
{
    private QueueInterface $queue;

    public function __construct(QueueInterface $queue)
    {
        $this->queue = $queue;
    }

    /**
     * @return array<string, mixed>
     */
    public function check(): array
    {
        $stats = $this->queue->getStats();
        $deadLetter = (int) ($stats['deadLetterCount'] ?? 0);
        $status = $deadLetter > 0 ? 'degraded' : 'ok';

        return [
            'component' => 'queue',
            'status' => $status,
            'queueSize' => $this->queue->getQueueSize(),
            'stats' => $stats,
            'checkedAt' => time(),
        ];
    }
}
