<?php
// run "php -S localhost:9000 server.php"

include(dirname(__FILE__) . '/../../src/php/EazyHttp.php');

function test()
{
    $response1c = (new EazyHttp())
        ->option('timeout', 5)
        ->option('methods',     ['curl'])
        ->get('http://localhost:9000/timeout.php?delay=2')
    ;
    $response1f = (new EazyHttp())
        ->option('timeout', 5)
        ->option('methods',     ['file'])
        ->get('http://localhost:9000/timeout.php?delay=2')
    ;
    $response1s = (new EazyHttp())
        ->option('timeout', 5)
        ->option('methods',     ['socket'])
        ->get('http://localhost:9000/timeout.php?delay=2')
    ;
    file_put_contents(dirname(__FILE__).'/timeout.php.txt', implode("\n\n----\n\n", [$response1c->content, $response1f->content, $response1s->content]));

    $response2c = (new EazyHttp())
        ->option('timeout', 5)
        ->option('methods',     ['curl'])
        ->get('http://localhost:9000/timeout.php?delay=10')
    ;
    $response2f = (new EazyHttp())
        ->option('timeout', 5)
        ->option('methods',     ['file'])
        ->get('http://localhost:9000/timeout.php?delay=10')
    ;
    $response2s = (new EazyHttp())
        ->option('timeout', 5)
        ->option('methods',     ['socket'])
        ->get('http://localhost:9000/timeout.php?delay=10')
    ;
    file_put_contents(dirname(__FILE__).'/max-timeout.php.txt', json_encode([$response2c, $response2f, $response2s]));
}

test();