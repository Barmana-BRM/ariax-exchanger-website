<?php

declare(strict_types=1);

namespace Ariax\Queue\Services;

use Ariax\Queue\Contracts\QueueInterface;
use Ariax\Queue\Models\Job;
use RuntimeException;

final class FileQueue implements QueueInterface
{
    private string $storagePath;

    public function __construct(string $storagePath)
    {
        $this->storagePath = $storagePath;
        $directory = dirname($storagePath);

        if (!is_dir($directory) && !mkdir($directory, 0775, true) && !is_dir($directory)) {
            throw new RuntimeException(sprintf('Unable to create queue storage directory "%s".', $directory));
        }

        if (!is_file($storagePath) && file_put_contents($storagePath, json_encode($this->defaultState(), JSON_PRETTY_PRINT)) === false) {
            throw new RuntimeException(sprintf('Unable to initialize queue storage "%s".', $storagePath));
        }
    }

    public function addJob(Job $job): void
    {
        $this->mutate(function (array &$state) use ($job): void {
            $state['queue'][] = $job->toArray();
            $state['stats']['enqueuedCount']++;
        });
    }

    public function getNextJob(): ?Job
    {
        return $this->mutate(function (array &$state): ?Job {
            foreach ($state['queue'] as $index => $jobData) {
                $job = Job::fromArray($jobData);

                if ($job->getAvailableAt() > time()) {
                    continue;
                }

                array_splice($state['queue'], $index, 1);

                return $job;
            }

            return null;
        });
    }

    public function acknowledge(Job $job): void
    {
        $this->mutate(function (array &$state) use ($job): void {
            $state['stats']['processedCount']++;
            $state['stats']['lastProcessedJobId'] = $job->getId();
            $state['stats']['lastProcessedAt'] = time();
            $state['stats']['lastError'] = null;
        });
    }

    public function releaseJob(Job $job, int $delaySeconds = 0): void
    {
        $this->mutate(function (array &$state) use ($job, $delaySeconds): void {
            $job->setStatus(Job::STATUS_PENDING);
            $job->scheduleAfter($delaySeconds);
            $state['queue'][] = $job->toArray();
            $state['stats']['retriedCount']++;
            $state['stats']['lastError'] = $job->getLastError();
        });
    }

    public function moveToDeadLetter(Job $job, string $reason = ''): void
    {
        $this->mutate(function (array &$state) use ($job, $reason): void {
            $job->setStatus(Job::STATUS_FAILED);
            $job->setLastError($reason !== '' ? $reason : $job->getLastError());
            $state['deadLetter'][] = [
                'job' => $job->toArray(),
                'reason' => $job->getLastError(),
                'movedAt' => time(),
            ];
            $state['stats']['deadLetterCount']++;
            $state['stats']['lastError'] = $job->getLastError();
        });
    }

    public function getQueueSize(): int
    {
        $state = $this->read();

        return count($state['queue']);
    }

    /**
     * @return array<string, mixed>
     */
    public function getStats(): array
    {
        $state = $this->read();

        return $state['stats'] + [
            'queueSize' => count($state['queue']),
            'deadLetterSize' => count($state['deadLetter']),
        ];
    }

    public function recordWorkerHeartbeat(string $workerId): void
    {
        $this->mutate(function (array &$state) use ($workerId): void {
            $state['stats']['worker'] = [
                'id' => $workerId,
                'heartbeatAt' => time(),
            ];
        });
    }

    /**
     * @return array<string, mixed>
     */
    private function defaultState(): array
    {
        return [
            'queue' => [],
            'deadLetter' => [],
            'stats' => [
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
            ],
        ];
    }

    /**
     * @template T
     *
     * @param callable(array<string, mixed>&): T $callback
     *
     * @return T
     */
    private function mutate(callable $callback)
    {
        $handle = fopen($this->storagePath, 'c+');

        if ($handle === false) {
            throw new RuntimeException(sprintf('Unable to open queue storage "%s".', $this->storagePath));
        }

        try {
            if (!flock($handle, LOCK_EX)) {
                throw new RuntimeException(sprintf('Unable to lock queue storage "%s".', $this->storagePath));
            }

            $contents = stream_get_contents($handle);
            $state = $this->decodeState($contents === false ? '' : $contents);
            $result = $callback($state);

            rewind($handle);
            ftruncate($handle, 0);
            fwrite($handle, json_encode($state, JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES));
            fflush($handle);
            flock($handle, LOCK_UN);

            return $result;
        } finally {
            fclose($handle);
        }
    }

    /**
     * @return array<string, mixed>
     */
    private function read(): array
    {
        $handle = fopen($this->storagePath, 'c+');

        if ($handle === false) {
            throw new RuntimeException(sprintf('Unable to open queue storage "%s".', $this->storagePath));
        }

        try {
            if (!flock($handle, LOCK_SH)) {
                throw new RuntimeException(sprintf('Unable to lock queue storage "%s".', $this->storagePath));
            }

            $contents = stream_get_contents($handle);
            $state = $this->decodeState($contents === false ? '' : $contents);

            flock($handle, LOCK_UN);

            return $state;
        } finally {
            fclose($handle);
        }
    }

    /**
     * @return array<string, mixed>
     */
    private function decodeState(string $contents): array
    {
        if (trim($contents) === '') {
            return $this->defaultState();
        }

        $decoded = json_decode($contents, true);

        return is_array($decoded) ? array_replace_recursive($this->defaultState(), $decoded) : $this->defaultState();
    }
}
