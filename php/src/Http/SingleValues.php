<?php

declare(strict_types=1);

namespace Convenux\Kit\Http;

use Closure;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

/** No API parameter is a list: `q[]=x` would reach a controller as an array, and a 500. */
final class SingleValues
{
    public function handle(Request $request, Closure $next): Response
    {
        foreach ($request->query() as $name => $value) {
            if (is_array($value)) {
                return new JsonResponse([
                    'error' => 'invalid_parameter',
                    'message' => "{$name} takes one value; separate several with commas.",
                ], 422);
            }
        }

        return $next($request);
    }
}
