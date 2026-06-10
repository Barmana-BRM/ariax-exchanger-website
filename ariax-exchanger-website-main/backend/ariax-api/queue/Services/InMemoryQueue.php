<?php

declare(strict_types=1);

namespace Ariax\Queue\Services;

use Ariax\Queue\Contracts\QueueInterface;
use Ariax\Queue\Models\Job;

final class InMemoryQueue implements QueueInterface
{
    /**
     * @var array<int, Job>
     */
    private array $jobs = [];

    /**
     * @var array<int, Job>
     */
    private array $deadLetter = [];

    /**
     * @var array<string, mixed>
     */
    private array $stats = [
        'enqueuedCount' => 0,
        'processedCount' => 0,
        'retriedCount' => 0,
        'deadLetterCount' => 0,
        'lastProcessedJobId' => null,
        'lastProcessedAt' => null,
        'lastError' => null,
        'worker' => [
            'id' => null,
            'heartbeatAt' => null,
        ],
    ];

    public function addJob(Job $job): void
    {
        $this->jobs[] = $job;
        $this->stats['enqueuedCount']++;
    }

    public function getNextJob(): ?Job
    {
        foreach ($this->jobs as $index => $job) {
            if ($job->getAvailableAt() > time()) {
                continue;
            }

            array_splice($this->jobs, $index, 1);

            return $job;
        }

        return null;
    }

    public function acknowledge(Job $job): void
    {
        $this->stats['processedCount']++;
        $this->stats['lastProcessedJobId'] = $job->getId();
        $this->stats['lastProcessedAt'] = time();
        $this->stats['lastError'] = null;
    }

    public function releaseJob(Job $job, int $delaySeconds = 0): void
    {
        $job->setStatus(Job::STATUS_PENDING);
        $job->scheduleAfter($delaySeconds);
        $this->jobs[] = $job;
        $this->stats['retriedCount']++;
        $this->stats['lastError'] = $job->getLastError();
    }

    public function moveToDeadLetter(Job $job, string $reason = ''): void
    {
        $job->setStatus(Job::STATUS_FAILED);
        $job->setLastError($reason !== '' ? $reason : $job->getLastError());
        $this->deadLetter[] = $job;
        $this->stats['deadLetterCount']++;
        $this->stats['lastError'] = $job->getLastError();
    }

    public function getQueueSize(): int
    {
        return count($this->jobs);
    }

    /**
     * @return array<string, mixed>
     */
    public function getStats(): array
    {
        return $this->stats + [
            'queueSize' => count($this->jobs),
            'deadLetterSize' => count($this->deadLetter),
        ];
    }

    public function recordWorkerHeartbeat(string $workerId): void
    {
        $this->stats['worker'] = [
            'id' => $workerId,
            'heartbeatAt' => time(),
        ];
    }
}
