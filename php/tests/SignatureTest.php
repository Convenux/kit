<?php

declare(strict_types=1);

namespace Convenux\Kit\Tests;

use Convenux\Kit\Signature;
use PHPUnit\Framework\TestCase;

final class SignatureTest extends TestCase
{
    public function test_signs_and_verifies_the_shared_vectors_as_the_typescript_side_does(): void
    {
        foreach (json_decode((string) file_get_contents(__DIR__.'/../../fixtures/signature.json'), true) as $v) {
            $this->assertSame($v['header'], Signature::sign($v['body'], $v['secret'], $v['timestamp']));
            $this->assertTrue(Signature::verify($v['header'], $v['body'], $v['secret'], now: $v['timestamp']));
        }
    }

    public function test_rejects_a_changed_body_another_secret_a_stale_timestamp_and_garbage(): void
    {
        $header = Signature::sign('{"id":"1"}', 'secret', 1_000_000);

        $this->assertFalse(Signature::verify($header, '{"id":"2"}', 'secret', now: 1_000_000));
        $this->assertFalse(Signature::verify($header, '{"id":"1"}', 'other', now: 1_000_000));
        $this->assertTrue(Signature::verify($header, '{"id":"1"}', 'secret', now: 1_000_060));
        $this->assertFalse(Signature::verify($header, '{"id":"1"}', 'secret', now: 1_000_360));
        foreach ([null, '', 'garbage', 't=1000000'] as $bad) {
            $this->assertFalse(Signature::verify($bad, '{"id":"1"}', 'secret', now: 1_000_000));
        }
    }
}
