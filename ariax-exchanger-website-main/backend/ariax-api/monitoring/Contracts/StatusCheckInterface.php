<?php

declare(strict_types=1);

namespace Ariax\Monitoring\Contracts;

interface StatusCheckInterface
{
    /**
     * @return array<string, mixed>
     */
    public function check(): array;
}
