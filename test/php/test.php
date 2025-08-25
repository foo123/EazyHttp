<?php
// run "php -S localhost:9000 server.php"

include(dirname(__FILE__) . '/../../src/php/EazyHttp.php');

function test()
{
    $http = new EazyHttp();

    $response1 = $http->option('return_type','string')->get('http://localhost:9000/test.txt');
    file_put_contents(dirname(__FILE__).'/test.txt', $response1->content);

    $response2 = $http->option('return_type','buffer'/*same*/)->get('http://localhost:9000/test.jpg');
    file_put_contents(dirname(__FILE__).'/test.jpg', $response2->content);

    $response3 = $http->option('return_type','string')->get('http://localhost:9000/test.php', ['foo' => 'bar']);
    file_put_contents(dirname(__FILE__).'/get-test.php.txt', json_encode($response3));

    $response4 = $http->option('return_type','string')->post('http://localhost:9000/test.php', ['foo' => 'bar']);
    file_put_contents(dirname(__FILE__).'/post-test.php.txt', json_encode($response4));
}

test();