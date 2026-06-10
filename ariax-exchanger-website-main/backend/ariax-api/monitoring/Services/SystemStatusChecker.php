<?php

declare(strict_types=1);

namespace Ariax\Monitoring\Services;

use Ariax\Monitoring\Contracts\StatusCheckInterface;

final class SystemStatusChecker
{
    /**
     * @var array<int, StatusCheckInterface>
     */
    private array $checks = [];

    public function addCheck(StatusCheckInterface $check): void
    {
        $this->checks[] = $check;
    }

    /**
     * @return array<string, mixed>
     */
    public function check(): array
    {
        $results = [];
        $overallStatus = 'ok';

        foreach ($this->checks as $check) {
            $result = $check->check();
            $results[] = $result;

            $status = (string) ($result['status'] ?? 'error');
            if ($status === 'error') {
                $overallStatus = 'error';
                continue;
            }

            if ($status !== 'ok' && $overallStatus !== 'error') {
                $overallStatus = 'degraded';
            }
        }

        return [
            'status' => $overallStatus,
            'checks' => $results,
            'checkedAt' => time(),
        ];
    }
}
