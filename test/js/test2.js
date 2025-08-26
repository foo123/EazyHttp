"use strict";

const fs = require('fs');
const EazyHttp = require('../../src/js/EazyHttp.js');

function test()
{
    function write(file, content)
    {
        return new Promise(function(resolve, reject) {
            fs.writeFile(file, content, err => {
                if (err) reject(err);
                else resolve(true);
            });
        });
    }

    return (new EazyHttp()).get('https://github.com/foo123/EazyHttp').then(
        (response) => write(__dirname+'/test2-https.js.html', response.content)
    ).catch(
        (error) => console.error(error)
    );
}

test().then(() => process.exit());


