<?php

declare(strict_types=1);

namespace Ariax\Queue\Contracts;

use Ariax\Queue\Models\Job;

interface QueueInterface
{
    public function addJob(Job $job): void;

    public function getNextJob(): ?Job;

    public function acknowledge(Job $job): void;

    public function releaseJob(Job $job, int $delaySeconds = 0): void;

    public function moveToDeadLetter(Job $job, string $reason = ''): void;

    public function getQueueSize(): int;

    /**
     * @return array<string, mixed>
     */
    public function getStats(): array;

    public function recordWorkerHeartbeat(string $workerId): void;
}
