"use strict";

const fs = require('fs');
const EazyHttp = require('../../src/js/EazyHttp.js');

function test()
{
    function request(method, uri)
    {
        // returns promise
        return (new EazyHttp()).get(uri);
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

    return request('GET', 'https://github.com/foo123/EazyHttp').then(
        (response) => write(__dirname+'/test2-https.js.html', response.content)
    ).catch(
        (error) => console.error(error)
    );
}

test().then(() => process.exit());


