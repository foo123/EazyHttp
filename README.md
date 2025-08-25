EazyHttp
=========

EazyHttp, easy, simple and fast HTTP requests for PHP, JavaScript, Python

(**in progress**)

**supports**

**PHP (in order of priority)**

* `curl` (if available)
* `file_get_contents` (if available)
* `sockets/fsockopen` (if available)

**JavaScript/Browser (in order of priority)**

* `fetch` (if available)
* `xmlhttprequest` (if available)

**JavaScript/Node**

* `http`/`https` (if available)

**example**

**PHP**
```php
$http = new EazyHttp();

// HTTP GET request, with custom URL params, custom Headers and custom Cookies
$response = $http
->option('timeout', 30/*secs*/) // default
->get(
    'https://example.com/',
    ['foo' => 'bar'],
    ['User-Agent' => 'EazyHttp'],
    [['name' => 'a_cookie', 'value' => 'some cookie value']]
);

// HTTP POST request, with custom POST data, custom Headers and custom Cookies
$response = $http
->option('timeout', 30/*secs*/) // default
->post(
    'https://example.com/',
    ['foo' => 'bar'],
    ['User-Agent' => 'EazyHttp'],
    [['name' => 'a_cookie', 'value' => 'some cookie value']]
);

print_r($response); // stdClass: {status}, {content}, {headers}, {cookies}
```

**JavaScript (browser and node)**
```js
const http = new EazyHttp();

// HTTP GET request, with custom URL params, custom Headers and custom Cookies
http
.option('timeout', 30/*secs*/) // default
.option('return_type', 'string') // default
.get(
    'https://example.com/',
    {'foo' : 'bar'},
    {'User-Agent' : 'EazyHttp'},
    [{'name' : 'a_cookie', 'value' : 'some cookie value'}]
).then(function(response) {
    console.log(response); // Object: {status}, {content}, {headers}, {cookies}
});

// HTTP POST request, with custom POST data, custom Headers and custom Cookies
http
.option('timeout', 30/*secs*/) // default
.option('return_type', 'string') // default
.post(
    'https://example.com/',
    {'foo' : 'bar'},
    {'User-Agent' : 'EazyHttp'},
    [{'name' : 'a_cookie', 'value' : 'some cookie value'}]
).then(function(response) {
    console.log(response); // Object: {status}, {content}, {headers}, {cookies}
});
```

