<?php

declare(strict_types=1);

namespace Ariax\Tests\Core;

abstract class TestCase
{
    protected string $name;

    public function __construct(string $name)
    {
        $this->name = $name;
    }

    public function getName(): string
    {
        return $this->name;
    }

    /**
     * @return array<string, mixed>
     */
    abstract public function definition(): array;
}
