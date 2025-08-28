// run "php -S localhost:9000 server.php"
"use strict";

const fs = require('fs');
const EazyHttp = require('../../src/js/EazyHttp.js');

function test()
{
    function request(method, do_http, uri, data, headers, cookies, return_type)
    {
        // returns promise
        return (new EazyHttp()).option('methods', [do_http]).option('return_type', return_type || 'string')['POST' === method ? 'post' : 'get'](uri, data, headers, cookies);
    }
    function write(file, content)
    {
        // promisify
        return new Promise(function(resolve, reject) {
            fs.writeFile(file, content, err => {
                if (err) reject(err);
                else resolve(true);
            });
        });
    }

    return request('GET', 'fetch', 'http://localhost:9000/test.txt').then(
        (response) => write(__dirname+'/test.txt', response.content)
    ).then(
        () => request('GET', 'http', 'http://localhost:9000/test.jpg', null, null, null, 'buffer')
    ).then(
        (response) => write(__dirname+'/test.jpg', response.content)
    ).then(
        () => request('GET', 'http', 'http://localhost:9000/test.php', {'foo' : ['bar']}, {}, [{'name' : 'cookie', 'value' : 'value'}])
    ).then(
        (response) => write(__dirname+'/get-test-http.php.txt', JSON.stringify(response))
    ).then(
        () => request('GET', 'fetch', 'http://localhost:9000/test.php', {'foo' : ['bar']}, {}, [{'name' : 'cookie', 'value' : 'value'}])
    ).then(
        (response) => write(__dirname+'/get-test-fetch.php.txt', JSON.stringify(response))
    ).then(
        () => request('POST', 'http', 'http://localhost:9000/test.php', {'foo' : ['bar']}, {}, [{'name' : 'cookie', 'value' : 'value'}])
    ).then(
        (response) => write(__dirname+'/post-test-http.php.txt', JSON.stringify(response))
    ).then(
        () => request('POST', 'fetch', 'http://localhost:9000/test.php', {'foo' : ['bar']}, {}, [{'name' : 'cookie', 'value' : 'value'}])
    ).then(
        (response) => write(__dirname+'/post-test-fetch.php.txt', JSON.stringify(response))
    );
}

test().then(() => 1).catch((error) => console.error(error));


