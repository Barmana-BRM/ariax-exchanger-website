<?php

declare(strict_types=1);

namespace Ariax\Tests\Scenarios;

use Ariax\Tests\Core\TestCase;

final class AuthenticationScenario extends TestCase
{
    /**
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [
            'module' => 'authentication',
            'positive' => [
                'login with valid credentials returns authenticated user',
                'refresh with valid cookie renews session',
                'logout clears session successfully',
            ],
            'negative' => [
                'login with invalid password returns unauthorized',
                'refresh without token returns unauthorized',
            ],
        ];
    }
}
