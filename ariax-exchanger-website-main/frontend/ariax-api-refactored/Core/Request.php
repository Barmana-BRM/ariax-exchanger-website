<?php
// ═══════════════════════════════════════════════════════════════
//  Core/Request.php — پارسر درخواست HTTP
// ═══════════════════════════════════════════════════════════════
declare(strict_types=1);

namespace Ariax\Core;

class Request
{
    private array  $body;
    private string $method;
    private array  $parts;
    private string $resource;
    private ?string $id;

    public function __construct()
    {
        $this->method   = $_SERVER['REQUEST_METHOD'] ?? 'GET';
        $this->body     = json_decode(file_get_contents('php://input'), true) ?? [];

        $path    = trim(parse_url($_SERVER['REQUEST_URI'] ?? '/', PHP_URL_PATH), '/');
        $parts   = explode('/', $path);
        if (($parts[0] ?? '') === 'ariax-api') array_shift($parts);

        $this->parts    = $parts;
        $this->resource = $parts[0] ?? '';
        $this->id       = $parts[1] ?? null;
    }

    public function method(): string   { return $this->method; }
    public function resource(): string { return $this->resource; }
    public function id(): ?string      { return $this->id; }
    public function part(int $n): ?string { return $this->parts[$n] ?? null; }

    public function input(string $key, mixed $default = null): mixed
    {
        return $this->body[$key] ?? $_GET[$key] ?? $default;
    }

    public function all(): array { return $this->body; }

    public function bearerToken(): string
    {
        $header = $_SERVER['HTTP_AUTHORIZATION'] ?? '';
        return str_replace('Bearer ', '', $header);
    }

    public function ip(): string
    {
        return $_SERVER['REMOTE_ADDR'] ?? '';
    }

    public function userAgent(): string
    {
        return $_SERVER['HTTP_USER_AGENT'] ?? '';
    }

    public function isMethod(string $m): bool
    {
        return strtoupper($m) === $this->method;
    }
}
