<?php

declare(strict_types=1);

namespace Convenux\Kit\Tests;

use Convenux\Kit\Identity\IsAccount;
use Convenux\Kit\Identity\Resolver;
use Convenux\Kit\Identity\SocialAccount;
use Illuminate\Database\Capsule\Manager;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Schema\Blueprint;
use PHPUnit\Framework\TestCase;

final class Account extends Model
{
    use IsAccount;

    protected $table = 'users';
}

final class ResolverTest extends TestCase
{
    protected function setUp(): void
    {
        $db = new Manager;
        $db->addConnection(['driver' => 'sqlite', 'database' => ':memory:']);
        $db->setAsGlobal();
        $db->bootEloquent();
        $schema = $db->schema();
        $schema->create('users', function (Blueprint $t): void {
            $t->id();
            $t->string('name')->nullable();
            $t->string('email')->nullable()->unique();
            $t->timestamp('email_verified_at')->nullable();
            $t->string('avatar_url')->nullable();
            $t->boolean('avatar_custom')->default(false);
            $t->timestamps();
        });
        $schema->create('social_accounts', function (Blueprint $t): void {
            $t->id();
            $t->foreignId('user_id');
            $t->string('provider');
            $t->string('provider_user_id');
            $t->string('handle')->nullable();
            $t->timestamps();
            $t->unique(['provider', 'provider_user_id']);
            $t->unique(['user_id', 'provider']);
        });
        Resolver::$userModel = Account::class;
    }

    public function test_the_same_identity_signs_in_to_the_same_account_and_keeps_it_current(): void
    {
        $first = Resolver::resolve('google', 'g1', 'ada@x.test', 'Ada', 'https://pic/1', 'ada');
        $again = Resolver::resolve('google', 'g1', 'ada@x.test', 'Ada L.', 'https://pic/2', null);

        $this->assertSame($first->id, $again->id);
        $this->assertSame('Ada L.', $again->name);
        $this->assertSame('https://pic/2', $again->avatar_url);
        $this->assertSame('ada', SocialAccount::query()->value('handle'));
    }

    public function test_a_chosen_photo_is_never_replaced_by_the_providers(): void
    {
        $user = Resolver::resolve('google', 'g1', null, 'Ada', 'https://pic/1', null);
        $user->forceFill(['avatar_custom' => true, 'avatar_url' => 'https://mine'])->save();

        $this->assertSame('https://mine', Resolver::resolve('google', 'g1', null, 'Ada', 'https://pic/2', null)->avatar_url);
    }

    public function test_only_a_verified_address_joins_an_existing_account_case_insensitively(): void
    {
        $ada = Resolver::resolve('google', 'g1', 'Ada@x.test', 'Ada', null, null);

        $this->assertSame($ada->id, Resolver::resolve('discord', 'd1', 'ada@X.test', 'ada', 'https://pic', 'ada')->id);
        $this->assertSame('https://pic', $ada->fresh()->avatar_url);
        $this->assertNotSame($ada->id, Resolver::resolve('facebook', 'f1', null, 'Ada', null, null)->id);
    }

    public function test_an_address_whose_account_already_has_that_provider_gets_a_new_account_not_an_error(): void
    {
        $ada = Resolver::resolve('discord', 'd1', 'ada@x.test', 'Ada', null, null);
        $other = Resolver::resolve('discord', 'd2', 'ada@x.test', 'Ada Two', null, null);

        $this->assertNotSame($ada->id, $other->id);
        $this->assertNull($other->email);
    }

    public function test_link_refuses_an_identity_of_someone_else_and_a_second_account_at_the_same_provider(): void
    {
        $ada = Resolver::resolve('google', 'g1', null, 'Ada', null, null);
        $bob = Resolver::resolve('google', 'g2', null, 'Bob', null, null);

        $this->assertFalse(Resolver::link($ada->id, 'google', 'g2', null));
        $this->assertFalse(Resolver::link($ada->id, 'google', 'g3', null));
        $this->assertTrue(Resolver::link($ada->id, 'google', 'g1', null));
        $this->assertTrue(Resolver::link($bob->id, 'discord', 'd1', 'bob'));
    }
}
