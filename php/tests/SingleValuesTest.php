<?php

declare(strict_types=1);

namespace Convenux\Kit\Tests;

use Convenux\Kit\Http\Proxies;
use Convenux\Kit\Http\SingleValues;
use Illuminate\Http\Request;
use PHPUnit\Framework\TestCase;
use Symfony\Component\HttpFoundation\Response;

final class SingleValuesTest extends TestCase
{
    public function test_a_parameter_sent_as_a_list_is_refused_before_the_controller(): void
    {
        $reached = false;
        $next = static function () use (&$reached): Response {
            $reached = true;

            return new Response('ok');
        };

        $refused = (new SingleValues)->handle(Request::create('/editions?q[]=dokomi'), $next);
        $this->assertSame(422, $refused->getStatusCode());
        $this->assertSame('invalid_parameter', json_decode((string) $refused->getContent(), true)['error']);
        $this->assertFalse($reached);

        $this->assertSame('ok', (new SingleValues)->handle(Request::create('/editions?q=dokomi&country=DE,FR'), $next)->getContent());
    }

    public function test_the_trusted_ranges_are_cidr_blocks(): void
    {
        foreach (Proxies::TRUSTED as $range) {
            [$address, $bits] = explode('/', $range);
            $this->assertNotFalse(filter_var($address, FILTER_VALIDATE_IP), $range);
            $this->assertLessThanOrEqual(str_contains($address, ':') ? 128 : 32, (int) $bits, $range);
        }
    }
}
