<?php
// run "php -S localhost:9000 server.php"

include(dirname(__FILE__) . '/../../src/php/EazyHttp.php');

function test()
{
    $response1c = (new EazyHttp())
        ->option('return_type', 'string')
        ->option('methods',     ['curl'])
        ->get('http://localhost:9000/test.txt')
    ;
    $response1f = (new EazyHttp())
        ->option('return_type', 'string')
        ->option('methods',     ['file'])
        ->get('http://localhost:9000/test.txt')
    ;
    $response1s = (new EazyHttp())
        ->option('return_type', 'string')
        ->option('methods',     ['socket'])
        ->get('http://localhost:9000/test.txt')
    ;
    file_put_contents(dirname(__FILE__).'/test.txt', implode("\n\n----\n\n", [$response1c->content,$response1f->content,$response1s->content]));

    $response2 = (new EazyHttp())
        ->option('return_type', 'buffer' /*same as 'string'*/)
        ->get('http://localhost:9000/test.jpg')
    ;
    file_put_contents(dirname(__FILE__).'/test.jpg', $response2->content);

    $response3 = (new EazyHttp())
        ->option('return_type', 'string')
        ->get('http://localhost:9000/test.php', ['foo' => 'bar'], [], [['name' => 'cookie', 'value' => 'value']])
    ;
    file_put_contents(dirname(__FILE__).'/get-test.php.txt', json_encode($response3));

    $response4 = (new EazyHttp())
        ->option('return_type', 'string')
        ->post('http://localhost:9000/test.php', ['foo' => 'bar'], [], [['name' => 'cookie', 'value' => 'value']])
    ;
    file_put_contents(dirname(__FILE__).'/post-test.php.txt', json_encode($response4));
}

test();