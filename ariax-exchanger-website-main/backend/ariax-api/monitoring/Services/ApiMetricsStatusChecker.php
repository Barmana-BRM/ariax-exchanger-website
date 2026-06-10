<?php

declare(strict_types=1);

namespace Ariax\Monitoring\Services;

use Ariax\Monitoring\Contracts\StatusCheckInterface;

final class ApiMetricsStatusChecker implements StatusCheckInterface
{
    private ApiMetricsStore $metricsStore;

    public function __construct(ApiMetricsStore $metricsStore)
    {
        $this->metricsStore = $metricsStore;
    }

    public function check(): array
    {
        $summary = $this->metricsStore->summary();
        $status = 'ok';

        if (($summary['errorRate'] ?? 0) >= 20 || ($summary['averageResponseTimeMs'] ?? 0) >= 1500) {
            $status = 'degraded';
        }

        return [
            'component' => 'api',
            'status' => $status,
            'details' => $summary,
            'checkedAt' => time(),
        ];
    }
}
