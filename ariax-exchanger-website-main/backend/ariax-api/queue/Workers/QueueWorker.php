<?php

declare(strict_types=1);

namespace Ariax\Queue\Workers;

use Ariax\Queue\Contracts\QueueInterface;
use Ariax\Queue\Models\Job;
use Ariax\Queue\Registry\HandlerRegistry;
use Throwable;

final class QueueWorker
{
    private QueueInterface $queue;

    private HandlerRegistry $registry;

    /** @var callable */
    private $logger;

    private string $workerId;

    private int $maxRetries;

    private bool $running = false;

    public function __construct(
        QueueInterface $queue,
        HandlerRegistry $registry,
        ?callable $logger = null,
        ?string $workerId = null,
        int $maxRetries = 3
    ) {
        $this->queue = $queue;
        $this->registry = $registry;
        $this->logger = $logger ?? static function (string $message): void {
            error_log($message);
        };
        $this->workerId = $workerId ?? sprintf('worker-%d', getmypid());
        $this->maxRetries = max(0, $maxRetries);
    }

    public function processNextJob(): ?Job
    {
        $this->queue->recordWorkerHeartbeat($this->workerId);
        $job = $this->queue->getNextJob();

        if (!$job instanceof Job) {
            return null;
        }

        $job->setStatus(Job::STATUS_PROCESSING);
        $this->log(sprintf('Processing job %s of type %s.', $job->getId(), $job->getType()));

        try {
            $this->registry->handle($job);
            $job->setStatus(Job::STATUS_COMPLETED);
            $job->setLastError(null);
            $this->queue->acknowledge($job);
            $this->log(sprintf('Job %s completed successfully.', $job->getId()));
        } catch (Throwable $exception) {
            $job->incrementRetryCount();
            $job->setStatus(Job::STATUS_FAILED);
            $job->setLastError($exception->getMessage());
            $this->log(sprintf(
                'Job %s failed: %s',
                $job->getId(),
                $exception->getMessage()
            ));

            if ($job->getRetryCount() <= $this->maxRetries) {
                $delaySeconds = $this->retryDelaySeconds($job->getRetryCount());
                $this->queue->releaseJob($job, $delaySeconds);
                $this->log(sprintf(
                    'Job %s scheduled for retry %d in %d seconds.',
                    $job->getId(),
                    $job->getRetryCount(),
                    $delaySeconds
                ));
            } else {
                $this->queue->moveToDeadLetter($job, $exception->getMessage());
                $this->log(sprintf(
                    'Job %s moved to dead-letter queue after %d retries.',
                    $job->getId(),
                    $job->getRetryCount()
                ));
            }
        }

        return $job;
    }

    public function run(int $pollIntervalMicroseconds = 500000, ?int $maxIterations = null): void
    {
        $this->running = true;
        $iterations = 0;

        while ($this->running) {
            $this->queue->recordWorkerHeartbeat($this->workerId);
            $this->processNextJob();
            $iterations++;

            if ($maxIterations !== null && $iterations >= $maxIterations) {
                $this->running = false;
                break;
            }

            if ($pollIntervalMicroseconds > 0) {
                usleep($pollIntervalMicroseconds);
            }
        }
    }

    public function stop(): void
    {
        $this->running = false;
    }

    private function log(string $message): void
    {
        ($this->logger)($message);
    }

    private function retryDelaySeconds(int $retryCount): int
    {
        return min(60, (int) pow(2, max(0, $retryCount - 1)));
    }
}
