<?php

declare(strict_types=1);

namespace Ariax\Tests\Scenarios;

use Ariax\Tests\Core\TestCase;

final class TaskManagementScenario extends TestCase
{
    /**
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [
            'module' => 'task-management',
            'positive' => [
                'authenticated user can list tasks',
                'task creation accepts valid payload',
                'task status update accepts valid state',
                'task deletion removes existing task',
            ],
            'negative' => [
                'invalid task status is rejected',
                'delete unknown task returns not found',
            ],
        ];
    }
}
