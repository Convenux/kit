<?php

declare(strict_types=1);

namespace Convenux\Kit\Identity;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Carbon;
use InvalidArgumentException;
use Laravel\Socialite\Contracts\User as SocialiteUser;

/**
 * Who is signing in: the linked identity, else the account with the same VERIFIED email,
 * else a new account. Both the website's and the app's sign-ins go through here.
 */
final class Resolver
{
    /** @var class-string<Model>|null set in tests; the apps use auth.providers.users.model */
    public static ?string $userModel = null;

    /** @return class-string<Model> */
    public static function userModel(): string
    {
        return self::$userModel ?? config('auth.providers.users.model');
    }

    public static function fromSocialite(string $provider, SocialiteUser $identity): Model
    {
        $id = (string) $identity->getId();
        if ($id === '') {
            throw new InvalidArgumentException("{$provider} returned no user id.");
        }
        $raw = method_exists($identity, 'getRaw') ? (array) $identity->getRaw() : [];

        return self::resolve(
            $provider,
            $id,
            VerifiedEmail::from($provider, $identity->getEmail(), $raw),
            $identity->getName() ?: $identity->getNickname(),
            $identity->getAvatar(),
            self::handle($identity),
        );
    }

    /** What a sign-in list shows for a provider account. */
    public static function handle(SocialiteUser $identity): ?string
    {
        return $identity->getNickname() ?: $identity->getEmail();
    }

    public static function resolve(
        string $provider,
        string $providerUserId,
        ?string $verifiedEmail,
        ?string $name,
        ?string $avatar,
        ?string $handle,
    ): Model {
        $users = self::userModel();
        $db = (new $users)->getConnection();

        return $db->transaction(function () use ($db, $users, $provider, $providerUserId, $verifiedEmail, $name, $avatar, $handle): Model {
            // A row lock cannot cover a row that does not exist yet: two first sign-ins at
            // once would both create an account. This serialises them per identity.
            if ($db->getDriverName() === 'pgsql') {
                $db->select('SELECT pg_advisory_xact_lock(hashtextextended(?, 0))', ["{$provider}:{$providerUserId}"]);
            }

            $account = SocialAccount::query()->where('provider', $provider)->where('provider_user_id', $providerUserId)->first();
            if ($account !== null) {
                if ($handle !== null) {
                    $account->update(['handle' => $handle]);
                }
                $user = $account->user;
                $user->fill(array_filter(['name' => $name, 'avatar_url' => $user->avatar_custom ? null : $avatar]))->save();

                return $user;
            }

            $user = $verifiedEmail === null ? null : $users::query()->email($verifiedEmail)->first();
            // That address's account already signs in with another account at this provider:
            // a new account (without the address, which is taken) rather than a merge.
            $taken = $user !== null && $user->socialAccounts()->where('provider', $provider)->exists();
            if ($taken) {
                $user = null;
            } elseif ($user !== null && $avatar !== null && ! $user->avatar_custom) {
                $user->update(['avatar_url' => $avatar]);
            }

            $user ??= $users::query()->create([
                'name' => $name ?: $handle,
                'email' => $taken ? null : $verifiedEmail,
                'email_verified_at' => $verifiedEmail === null || $taken ? null : Carbon::now(),
                'avatar_url' => $avatar,
            ]);
            $user->socialAccounts()->create(['provider' => $provider, 'provider_user_id' => $providerUserId, 'handle' => $handle]);

            return $user;
        });
    }

    /**
     * Add a way in to someone signed in. False when that provider account signs in to
     * somebody else, or this person already has another account at that provider.
     */
    public static function link(int $userId, string $provider, string $providerUserId, ?string $handle): bool
    {
        $account = SocialAccount::query()->firstOrNew(['provider' => $provider, 'provider_user_id' => $providerUserId]);
        if ($account->exists) {
            return (int) $account->user_id === $userId;
        }
        if (SocialAccount::query()->where('user_id', $userId)->where('provider', $provider)->exists()) {
            return false;
        }
        $account->forceFill(['user_id' => $userId, 'handle' => $handle])->save();

        return true;
    }
}
