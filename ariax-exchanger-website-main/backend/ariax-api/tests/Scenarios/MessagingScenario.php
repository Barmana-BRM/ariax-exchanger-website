<?php

declare(strict_types=1);

namespace Ariax\Tests\Scenarios;

use Ariax\Tests\Core\TestCase;

final class MessagingScenario extends TestCase
{
    /**
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [
            'module' => 'messaging',
            'positive' => [
                'authenticated user can list messages',
                'authenticated user can send non-empty message',
            ],
            'negative' => [
                'empty message submission is rejected',
                'unauthenticated access is rejected',
            ],
        ];
    }
}
