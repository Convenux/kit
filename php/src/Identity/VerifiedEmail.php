<?php

declare(strict_types=1);

namespace Convenux\Kit\Identity;

/**
 * An address only where the provider says it checked it: an unverified one never joins an
 * existing account (the classic takeover). Apple sends the flag as the string "true";
 * Facebook releases confirmed addresses only and has no flag.
 */
final class VerifiedEmail
{
    /** @param  array<string, mixed>  $raw  the provider's own user payload, or Apple's token claims */
    public static function from(string $provider, ?string $email, array $raw): ?string
    {
        if ($email === null || $email === '') {
            return null;
        }

        $verified = match ($provider) {
            'google' => ($raw['email_verified'] ?? false) === true,
            'discord' => ($raw['verified'] ?? false) === true,
            'apple' => filter_var($raw['email_verified'] ?? false, FILTER_VALIDATE_BOOL),
            'facebook' => true,
            default => false,
        };

        return $verified ? $email : null;
    }
}
