<?php

declare(strict_types=1);

namespace Convenux\Kit;

/**
 * `Convenux-Signature: t=<unix>,v1=<hex>`: HMAC-SHA256 over "<t>.<body>". The timestamp is
 * inside the signed string, so the tolerance window is the replay guard.
 */
final class Signature
{
    public const TOLERANCE = 300;

    public static function sign(string $body, string $secret, ?int $timestamp = null): string
    {
        $timestamp ??= time();

        return "t={$timestamp},v1=".hash_hmac('sha256', $timestamp.'.'.$body, $secret);
    }

    public static function verify(?string $header, string $body, string $secret, int $tolerance = self::TOLERANCE, ?int $now = null): bool
    {
        $parts = [];
        foreach (explode(',', (string) $header) as $pair) {
            [$name, $value] = array_pad(explode('=', trim($pair), 2), 2, '');
            $parts[$name] = $value;
        }
        $timestamp = (int) ($parts['t'] ?? 0);
        $given = $parts['v1'] ?? '';
        if ($timestamp <= 0 || $given === '' || abs(($now ?? time()) - $timestamp) > $tolerance) {
            return false;
        }

        return hash_equals(hash_hmac('sha256', $timestamp.'.'.$body, $secret), $given);
    }
}
