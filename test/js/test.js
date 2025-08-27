// run "php -S localhost:9000 server.php"
"use strict";

const fs = require('fs');
const EazyHttp = require('../../src/js/EazyHttp.js');

function test()
{
    function request(method, uri, data, headers, cookies, return_type)
    {
        // returns promise
        return (new EazyHttp()).option('return_type', return_type || 'string')['POST' === method ? 'post' : 'get'](uri, data, headers, cookies);
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

    return request('GET', 'http://localhost:9000/test.txt').then(
        (response) => write(__dirname+'/test.txt', response.content)
    ).then(
        () => request('GET', 'http://localhost:9000/test.jpg', null, null, null, 'buffer')
    ).then(
        (response) => write(__dirname+'/test.jpg', Buffer.from(response.content))
    ).then(
        () => request('GET', 'http://localhost:9000/test.php', {'foo' : ['bar']}, {}, [{'name' : 'cookie', 'value' : 'value'}])
    ).then(
        (response) => write(__dirname+'/get-test.php.txt', JSON.stringify(response))
    ).then(
        () => request('POST', 'http://localhost:9000/test.php', {'foo' : ['bar']}, {}, [{'name' : 'cookie', 'value' : 'value'}])
    ).then(
        (response) => write(__dirname+'/post-test.php.txt', JSON.stringify(response))
    );
}

test().then(() => 1).catch((error) => console.error(error));


