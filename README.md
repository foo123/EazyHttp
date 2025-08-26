EazyHttp
=========

EazyHttp, easy, simple and fast HTTP requests for PHP, JavaScript, Python

version **1.0.0**

**supports**

**PHP (in any desired order)**

* `curl` (if available)
* `file_get_contents` (if available)
* `sockets/fsockopen` (if available)

**JavaScript/Browser (in any desired order)**

* `fetch` (if available)
* `xmlhttprequest` (if available)

**JavaScript/Node**

* `http`/`https` (if available)

**example**

**PHP**
```php
$http = new EazyHttp();

// HTTP GET request
$response = $http
->option('timeout',             30/*secs*/) // default
->option('follow_redirects',    3) // default
->option('methods',             ['curl', 'file', 'socket']) // default order
->get(
    'https://example.com/',
    ['foo' => 'bar'], // custom URL params
    ['User-Agent' => 'EazyHttp'], // custom Headers
    [['name' => 'a_cookie', 'value' => 'some cookie value']] // custom Cookies
);

// HTTP POST request
$response = $http
->option('timeout',             30/*secs*/) // default
->option('follow_redirects',    3) // default
->option('methods',             ['curl', 'file', 'socket']) // default order
->post(
    'https://example.com/',
    ['foo' => 'bar'], // custom post data
    ['User-Agent' => 'EazyHttp'], // custom Headers
    [['name' => 'a_cookie', 'value' => 'some cookie value']] // custom Cookies
);

echo json_encode($response); // stdClass: {status}, {content}, {headers}, {cookies}
```

**JavaScript (browser and node)**
```js
const http = new EazyHttp();

// HTTP GET request
http
.option('timeout',              30/*secs*/) // default
.option('follow_redirects',     3) // default
.option('methods',              ['http', 'fetch', 'xhr']) // default order
.option('return_type',          'string') // default, 'string' or 'buffer'
.get(
    'https://example.com/',
    {'foo' : 'bar'}, // custom URL params
    {'User-Agent' : 'EazyHttp'}, // custom Headers
    [{'name' : 'a_cookie', 'value' : 'some cookie value'}] // custom Cookies
).then(
    (response)  => console.log(JSON.stringify(response)) // Object: {status}, {content}, {headers}, {cookies}
);

// HTTP POST request
http
.option('timeout',              30/*secs*/) // default
.option('follow_redirects',     3) // default
.option('methods',              ['http', 'fetch', 'xhr']) // default order
.option('return_type',          'string') // default, 'string' or 'buffer'
.post(
    'https://example.com/',
    {'foo' : 'bar'}, // custom post data
    {'User-Agent' : 'EazyHttp'}, // custom Headers
    [{'name' : 'a_cookie', 'value' : 'some cookie value'}] // custom Cookies
).then(
    (response)  => console.log(JSON.stringify(response)) // Object: {status}, {content}, {headers}, {cookies}
);
```

**see also:**

* [ModelView](https://github.com/foo123/modelview.js) a simple, fast, powerful and flexible MVVM framework for JavaScript
* [tico](https://github.com/foo123/tico) a tiny, super-simple MVC framework for PHP
* [LoginManager](https://github.com/foo123/LoginManager) a simple, barebones agnostic login manager for PHP, JavaScript, Python
* [SimpleCaptcha](https://github.com/foo123/simple-captcha) a simple, image-based, mathematical captcha with increasing levels of difficulty for PHP, JavaScript, Python
* [Dromeo](https://github.com/foo123/Dromeo) a flexible, and powerful agnostic router for PHP, JavaScript, Python
* [PublishSubscribe](https://github.com/foo123/PublishSubscribe) a simple and flexible publish-subscribe pattern implementation for PHP, JavaScript, Python
* [Localizer](https://github.com/foo123/Localizer) a simple and versatile localization class (l10n) for PHP, JavaScript, Python
* [Importer](https://github.com/foo123/Importer) simple class &amp; dependency manager and loader for PHP, JavaScript, Python
* [EazyHttp](https://github.com/foo123/EazyHttp), easy, simple and fast HTTP requests for PHP, JavaScript, Python
* [Contemplate](https://github.com/foo123/Contemplate) a fast and versatile isomorphic template engine for PHP, JavaScript, Python
* [HtmlWidget](https://github.com/foo123/HtmlWidget) html widgets, made as simple as possible, both client and server, both desktop and mobile, can be used as (template) plugins and/or standalone for PHP, JavaScript, Python (can be used as [plugins for Contemplate](https://github.com/foo123/Contemplate/blob/master/src/js/plugins/plugins.txt))
* [Paginator](https://github.com/foo123/Paginator)  simple and flexible pagination controls generator for PHP, JavaScript, Python
* [Formal](https://github.com/foo123/Formal) a simple and versatile (Form) Data validation framework based on Rules for PHP, JavaScript, Python
* [Dialect](https://github.com/foo123/Dialect) a cross-vendor &amp; cross-platform SQL Query Builder, based on [GrammarTemplate](https://github.com/foo123/GrammarTemplate), for PHP, JavaScript, Python
* [DialectORM](https://github.com/foo123/DialectORM) an Object-Relational-Mapper (ORM) and Object-Document-Mapper (ODM), based on [Dialect](https://github.com/foo123/Dialect), for PHP, JavaScript, Python
* [Unicache](https://github.com/foo123/Unicache) a simple and flexible agnostic caching framework, supporting various platforms, for PHP, JavaScript, Python
* [Xpresion](https://github.com/foo123/Xpresion) a simple and flexible eXpression parser engine (with custom functions and variables support), based on [GrammarTemplate](https://github.com/foo123/GrammarTemplate), for PHP, JavaScript, Python
* [Regex Analyzer/Composer](https://github.com/foo123/RegexAnalyzer) Regular Expression Analyzer and Composer for PHP, JavaScript, Python
