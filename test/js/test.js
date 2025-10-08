// run "php -S 127.0.0.1:9000 test-server.php"
"use strict";

const fs = require('fs');
const EazyHttp = require('../../src/js/EazyHttp.js');

async function test()
{
    function file_put_contents(file, content)
    {
        // promisify
        return new Promise(function(resolve, reject) {
            fs.writeFile(file, content, err => {
                if (err) reject(err);
                else resolve(true);
            });
        });
    }
    function request(method, do_http, uri, data, headers, cookies, return_type)
    {
        // returns promise
        return (new EazyHttp()).option('methods', [do_http]).option('return_type', return_type || 'string')['POST' === method ? 'post' : 'get']('http://127.0.0.1:9000' + uri, data, headers, cookies);
    }

    let response;

    try {
        response = await request('GET', 'http', '/test/test.txt');
        await file_put_contents(__dirname+'/test-http.txt', response.content);
    } catch (error) {
        console.error(error);
    }

    try {
        response = await request('GET', 'fetch', '/test/test.txt');
        await file_put_contents(__dirname+'/test-fetch.txt', response.content);
    } catch (error) {
        console.error(error);
    }

    try {
        response = await request('GET', 'http', '/test/test.jpg', null, null, null, 'buffer');
        await file_put_contents(__dirname+'/test-http.jpg', response.content);
    } catch (error) {
        console.error(error);
    }

    try {
        response = await request('GET', 'fetch', '/test/test.jpg', null, null, null, 'buffer');
        await file_put_contents(__dirname+'/test-fetch.jpg', response.content);
    } catch (error) {
        console.error(error);
    }

    try {
        response = await request('GET', 'http', '/test/test.php', {'foo' : ['bar']}, {}, {'cookie' : 'value'});
        await file_put_contents(__dirname+'/test-get-http.php.txt', JSON.stringify(response));
    } catch (error) {
        console.error(error);
    }

    try {
        response = await request('GET', 'fetch', '/test/test.php', {'foo' : ['bar']}, {}, {'cookie' : 'value'});
        await file_put_contents(__dirname+'/test-get-fetch.php.txt', JSON.stringify(response));
    } catch (error) {
        console.error(error);
    }

    try {
        response = await request('POST', 'http', '/test/test.php', {'foo' : ['bar']}, {}, {'cookie' : 'value'});
        await file_put_contents(__dirname+'/test-post-http.php.txt', JSON.stringify(response));
    } catch (error) {
        console.error(error);
    }

    try {
        response = await request('POST', 'fetch', '/test/test.php', {'foo' : ['bar']}, {}, {'cookie' : 'value'});
        await file_put_contents(__dirname+'/test-post-fetch.php.txt', JSON.stringify(response));
    } catch (error) {
        console.error(error);
    }
}

test().then(() => 1).catch((error) => console.error(error));


