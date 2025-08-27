// run "php -S localhost:9000 server.php"
"use strict";

const fs = require('fs');
const EazyHttp = require('../../src/js/EazyHttp.js');

function test()
{
    function request(uri, redirects)
    {
        // returns promise
        return (new EazyHttp()).option('follow_redirects', redirects).get(uri);
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

    return request('http://localhost:9000/redirect.php?max_redirects=2', 3).then(
        (response) => write(__dirname+'/redirect.php.txt', response.content)
    ).then(
        () => request('http://localhost:9000/redirect.php?max_redirects=10', 3)
    ).then(
        (response) => write(__dirname+'/max-redirect.php.txt', JSON.stringify(response))
    );
}

test().then(() => 1).catch((error) => console.error(error));


