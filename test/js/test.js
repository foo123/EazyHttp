// run "php -S localhost:9000 server.php"
"use strict";

const fs = require('fs');
const EazyHttp = require('../../src/js/EazyHttp.js');

function test()
{
    function request(method, uri, data, type)
    {
        // returns promise
        return (new EazyHttp()).option('return_type',type)['POST' === method ? 'post' : 'get'](uri, data);
    }
    function write(file, content)
    {
        return new Promise(function(resolve, reject) {
            fs.writeFile(file, content, err => {
                if (err) reject(err);
                else resolve(true);
            });
        });
    }

    return request('GET', 'http://localhost:9000/test.txt', null, 'string').then(
        (response) => write(__dirname+'/test.txt', response.content)
    ).then(
        () => request('GET', 'http://localhost:9000/test.jpg', null, 'buffer')
    ).then(
        (response) => write(__dirname+'/test.jpg', Buffer.from(response.content))
    ).then(
        () => request('GET', 'http://localhost:9000/test.php', {'foo' : 'bar'}, 'string')
    ).then(
        (response) => write(__dirname+'/get-test.php.txt', JSON.stringify(response))
    ).then(
        () => request('POST', 'http://localhost:9000/test.php', {'foo' : 'bar'}, 'string')
    ).then(
        (response) => write(__dirname+'/post-test.php.txt', JSON.stringify(response))
    ).catch(
        (error) => console.error(error)
    );
}

test().then(() => process.exit());


