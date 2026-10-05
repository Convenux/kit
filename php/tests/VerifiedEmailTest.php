<?php

declare(strict_types=1);

namespace Convenux\Kit\Tests;

use Convenux\Kit\Identity\VerifiedEmail;
use PHPUnit\Framework\TestCase;

final class VerifiedEmailTest extends TestCase
{
    public function test_keeps_an_address_only_where_the_provider_checked_it(): void
    {
        $this->assertSame('a@x.test', VerifiedEmail::from('google', 'a@x.test', ['email_verified' => true]));
        $this->assertNull(VerifiedEmail::from('google', 'a@x.test', ['email_verified' => 'true']));
        $this->assertSame('a@x.test', VerifiedEmail::from('apple', 'a@x.test', ['email_verified' => 'true']));
        $this->assertSame('a@x.test', VerifiedEmail::from('discord', 'a@x.test', ['verified' => true]));
        $this->assertNull(VerifiedEmail::from('discord', 'a@x.test', []));
        $this->assertSame('a@x.test', VerifiedEmail::from('facebook', 'a@x.test', []));
        $this->assertNull(VerifiedEmail::from('x', 'a@x.test', ['verified' => true]));
        $this->assertNull(VerifiedEmail::from('google', '', ['email_verified' => true]));
    }
}
