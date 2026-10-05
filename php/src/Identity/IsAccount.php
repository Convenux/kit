<?php

declare(strict_types=1);

namespace Convenux\Kit\Identity;

use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Relations\HasMany;

/**
 * The `users` row both apps share. `avatar_custom` marks a photo the person chose (or chose
 * to go without), which a provider's picture never replaces.
 */
trait IsAccount
{
    public function initializeIsAccount(): void
    {
        $this->mergeFillable(['name', 'email', 'email_verified_at', 'avatar_url']);
        $this->mergeCasts(['email_verified_at' => 'datetime', 'avatar_custom' => 'boolean']);
        $this->makeHidden(['password', 'remember_token']);
    }

    /** @return HasMany<SocialAccount, $this> */
    public function socialAccounts(): HasMany
    {
        return $this->hasMany(SocialAccount::class, 'user_id');
    }

    /** Case-insensitively: Postgres compares text exactly, and Ada@x is ada@x. */
    public function scopeEmail(Builder $query, string $email): void
    {
        $query->whereRaw('lower(email) = lower(?)', [$email]);
    }
}
