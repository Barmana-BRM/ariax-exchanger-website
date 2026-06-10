<?php

declare(strict_types=1);

namespace Ariax\Queue\Models;

final class Job
{
    public const STATUS_PENDING = 'pending';
    public const STATUS_PROCESSING = 'processing';
    public const STATUS_COMPLETED = 'completed';
    public const STATUS_FAILED = 'failed';

    private string $id;

    private string $type;

    /**
     * @var array<string, mixed>
     */
    private array $payload;

    private string $status;

    private int $retryCount;

    private int $createdAt;

    private int $availableAt;

    private int $updatedAt;

    private ?string $lastError;

    /**
     * @param array<string, mixed> $payload
     */
    public function __construct(
        string $id,
        string $type,
        array $payload = [],
        string $status = self::STATUS_PENDING,
        int $retryCount = 0,
        ?int $createdAt = null,
        ?int $availableAt = null,
        ?int $updatedAt = null,
        ?string $lastError = null
    ) {
        $this->id = $id;
        $this->type = $type;
        $this->payload = $payload;
        $this->status = $status;
        $this->retryCount = $retryCount;
        $this->createdAt = $createdAt ?? time();
        $this->availableAt = $availableAt ?? $this->createdAt;
        $this->updatedAt = $updatedAt ?? $this->createdAt;
        $this->lastError = $lastError;
    }

    public function getId(): string
    {
        return $this->id;
    }

    public function getType(): string
    {
        return $this->type;
    }

    /**
     * @return array<string, mixed>
     */
    public function getPayload(): array
    {
        return $this->payload;
    }

    public function getStatus(): string
    {
        return $this->status;
    }

    public function setStatus(string $status): void
    {
        $this->status = $status;
        $this->updatedAt = time();
    }

    public function getRetryCount(): int
    {
        return $this->retryCount;
    }

    public function setRetryCount(int $retryCount): void
    {
        $this->retryCount = $retryCount;
        $this->updatedAt = time();
    }

    public function incrementRetryCount(): void
    {
        $this->retryCount++;
        $this->updatedAt = time();
    }

    public function getCreatedAt(): int
    {
        return $this->createdAt;
    }

    public function getAvailableAt(): int
    {
        return $this->availableAt;
    }

    public function setAvailableAt(int $availableAt): void
    {
        $this->availableAt = $availableAt;
        $this->updatedAt = time();
    }

    public function scheduleAfter(int $delaySeconds): void
    {
        $this->setAvailableAt(time() + max(0, $delaySeconds));
    }

    public function getUpdatedAt(): int
    {
        return $this->updatedAt;
    }

    public function getLastError(): ?string
    {
        return $this->lastError;
    }

    public function setLastError(?string $lastError): void
    {
        $this->lastError = $lastError;
        $this->updatedAt = time();
    }

    /**
     * @return array<string, mixed>
     */
    public function toArray(): array
    {
        return [
            'id' => $this->id,
            'type' => $this->type,
            'payload' => $this->payload,
            'status' => $this->status,
            'retryCount' => $this->retryCount,
            'createdAt' => $this->createdAt,
            'availableAt' => $this->availableAt,
            'updatedAt' => $this->updatedAt,
            'lastError' => $this->lastError,
        ];
    }

    /**
     * @param array<string, mixed> $data
     */
    public static function fromArray(array $data): self
    {
        return new self(
            (string) ($data['id'] ?? ''),
            (string) ($data['type'] ?? ''),
            is_array($data['payload'] ?? null) ? $data['payload'] : [],
            (string) ($data['status'] ?? self::STATUS_PENDING),
            (int) ($data['retryCount'] ?? 0),
            isset($data['createdAt']) ? (int) $data['createdAt'] : null,
            isset($data['availableAt']) ? (int) $data['availableAt'] : null,
            isset($data['updatedAt']) ? (int) $data['updatedAt'] : null,
            isset($data['lastError']) ? (string) $data['lastError'] : null
        );
    }
}
