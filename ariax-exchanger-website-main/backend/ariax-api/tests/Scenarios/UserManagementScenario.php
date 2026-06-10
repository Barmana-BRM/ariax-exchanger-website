<?php

declare(strict_types=1);

namespace Ariax\Tests\Scenarios;

use Ariax\Tests\Core\TestCase;

final class UserManagementScenario extends TestCase
{
    /**
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [
            'module' => 'user-management',
            'positive' => [
                'admin can list users',
                'authenticated user can fetch own profile',
                'user profile update accepts valid payload',
            ],
            'negative' => [
                'non-admin user list access is rejected',
                'invalid update payload is rejected',
            ],
        ];
    }
}
