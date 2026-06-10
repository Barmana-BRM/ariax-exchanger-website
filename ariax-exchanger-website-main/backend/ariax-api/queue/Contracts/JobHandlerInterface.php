<?php

declare(strict_types=1);

namespace Ariax\Queue\Contracts;

use Ariax\Queue\Models\Job;

interface JobHandlerInterface
{
    public function __invoke(Job $job): void;
}
