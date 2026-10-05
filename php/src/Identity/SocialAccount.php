<?php

declare(strict_types=1);

namespace Convenux\Kit\Identity;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/** One provider identity of one person; `(provider, provider_user_id)` decides who is signing in. */
final class SocialAccount extends Model
{
    protected $fillable = ['provider', 'provider_user_id', 'handle'];

    public function getConnectionName(): ?string
    {
        return (new (Resolver::userModel()))->getConnectionName();
    }

    /** @return BelongsTo<Model, $this> */
    public function user(): BelongsTo
    {
        return $this->belongsTo(Resolver::userModel(), 'user_id');
    }
}
