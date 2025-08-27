// run "php -S localhost:9000 server.php"
"use strict";

const fs = require('fs');
const EazyHttp = require('../../src/js/EazyHttp.js');

function test()
{
    function request(uri, timeout)
    {
        // returns promise
        return (new EazyHttp()).option('timeout', timeout).get(uri);
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

    return request('http://localhost:9000/timeout.php?delay=2', 5).then(
        (response) => write(__dirname+'/timeout.php.txt', response.content)
    ).then(
        () => request('http://localhost:9000/timeout.php?delay=10', 5)
    ).then(
        (response) => write(__dirname+'/max-timeout.php.txt', JSON.stringify(response))
    );
}

test().then(() => 1).catch((error) => console.error(error));


