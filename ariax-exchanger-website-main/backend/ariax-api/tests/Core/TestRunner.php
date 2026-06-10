<?php

declare(strict_types=1);

namespace Ariax\Tests\Core;

final class TestRunner
{
    /**
     * @var array<int, TestCase>
     */
    private array $tests = [];

    public function add(TestCase $test): void
    {
        $this->tests[] = $test;
    }

    /**
     * @return array<string, mixed>
     */
    public function listDefinitions(): array
    {
        $definitions = [];

        foreach ($this->tests as $test) {
            $definitions[] = [
                'name' => $test->getName(),
                'definition' => $test->definition(),
            ];
        }

        return [
            'total' => count($definitions),
            'tests' => $definitions,
        ];
    }
}
