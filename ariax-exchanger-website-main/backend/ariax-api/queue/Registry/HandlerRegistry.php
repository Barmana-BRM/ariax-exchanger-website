<?php

declare(strict_types=1);

namespace Ariax\Queue\Registry;

use Ariax\Queue\Models\Job;
use RuntimeException;

final class HandlerRegistry
{
    /**
     * @var array<string, callable>
     */
    private array $handlers = [];

    public function register(string $jobType, callable $handler): void
    {
        $this->handlers[$jobType] = $handler;
    }

    public function has(string $jobType): bool
    {
        return isset($this->handlers[$jobType]);
    }

    public function resolve(string $jobType): callable
    {
        if (!$this->has($jobType)) {
            throw new RuntimeException(sprintf('No handler registered for job type "%s".', $jobType));
        }

        return $this->handlers[$jobType];
    }

    public function handle(Job $job): void
    {
        $handler = $this->resolve($job->getType());
        $handler($job);
    }
}
