<?php

declare(strict_types=1);

namespace Convenux\Kit\Http;

use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\HttpFoundation\Response;

/** An ETag from the body, and a 304 when the client already has it. */
final class Etag
{
    public static function apply(Request $request, Response $response): Response
    {
        $response->setEtag(md5((string) $response->getContent()));
        $response->isNotModified($request);

        return $response;
    }
}
