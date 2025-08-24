/**
*    EazyHttp
*    easy, simple and fast HTTP requests for PHP, JavaScript, Python
*    https://github.com/foo123/EazyHttp
**/
!function(root, name, factory) {
"use strict";
var m;
if (('object' === typeof module) && module.exports) /* CommonJS */
    module.exports = factory.call(root);
else if (('function' === typeof(define)) && define.amd && ('function' === typeof(require)) && ('function' === typeof(require.specified)) && require.specified(name)) /* AMD */
    define(name,['require','exports','module'],function() {return factory.call(root);});
else if (!(name in root)) /* Browser/WebWorker/.. */
    (root[name] = (m=factory.call(root))) && ('function' === typeof(define)) && define.amd && define(function() {return m;});
}(/* current root */          'undefined' !== typeof self ? self : this,
  /* module name */           "EazyHttp",
  /* module factory */        function(undef) {
"use strict";

var VERSION = '0.1.0',  xFormData,

    PROTO = "prototype",
    HAS = Object[PROTO].hasOwnProperty,
    toString = Object[PROTO].toString,

    isNode = ('undefined' !== typeof(global)) && ('[object Global]' === toString.call(global)),

    http = isNode ? require('http') : ("undefined" !== typeof(XMLHttpRequest) ? function() {return new XMLHttpRequest();} : function() {return new ActiveXObject("Microsoft.XMLHTTP");}),

    stdMath = Math, KEYS = Object.keys,

    __id = 0,

    uuid = function uuid(namespace) {
        return [namespace||'uuid', ++__id, new Date().getTime()].join('_');
    },

    trim = String[PROTO].trim
        ? function(s) {return s.trim();}
        : function(s) {return s.replace(/^\s+|\s+$/g, '');},

    toBase64 = function toBase64(str) {
        return (new Buffer(str || "", "ascii")).toString("base64");
    },

    json_encode = JSON.stringify, json_decode = JSON.parse,
    base64_encode = btoa, base64_decode = atob
;

function EazyHttp()
{
}
EazyHttp[PROTO] = {
    constructor: EazyHttp,

    get: function(uri, data, headers, cookies, cb) {
        return this._request('GET', uri, data, headers, cookies, cb);
    },

    post: function(uri, data, headers, cookies, cb) {
        return this._request('POST', uri, data, headers, cookies, cb);
    },

    _request: function(method, uri, data, headers, cookies, cb)  {
        var self = this;

        method = String(method).toUpperCase();
        if ('POST' !== method) method = 'GET';

        if (isNode)
        {
            self._do_http_server(
                method,
                uri,
                requestBody,
                requestHeaders,
                requestCookies,
                {
                    'timeout': 30,
                },
                function(err, status, content, headers, cookies) {
                }
            );
        }
        else
        {
            self._do_http_client(
                method,
                uri,
                requestBody,
                requestHeaders,
                requestCookies,
                {
                    'timeout': 30,
                },
                function(err, status, content, headers, cookies) {
                }
            );
        }
        return self;
    },

    _do_http_server: function(method, uri, requestBody, requestHeaders, requestCookies, options, cb) {
        var options = {
            host: 'example.com',
            port: 80,
            path: '/foo.html'
        };

        var responseHeaders = null, responseBody = '';
        http
            .request(options, function(response) {
                responseHeaders = response.headers;
                response.on('data', function(chunk) {
                    responseBody += chunk;
                });
                response.on('end', function() {
                    onComplete(responseHeaders, responseBody);
                });
            })
            .on("error", function(e) {
                onComplete(e, null);
            })
        ;
    },

    _do_http_client: function(method, uri, requestBody, requestHeaders, requestCookies, options, cb) {
        var xmlhttp = http(), headers = null, body = '';
        xmlhttp.onload = function() {
            if (2 /*HEADERS_RECEIVED*/ === xmlhttp.readyState)
            {
                if (200 === xmlhttp.status)
                {
                    headers = parse_headers(xmlhttp.getAllResponseHeaders());
                }
            }
            else if  (3 /*LOADING*/ === xmlhttp.readyState) {}
            else if  (4 /*DONE*/ === xmlhttp.readyState)
            {
                if (200 === xmlhttp.status)
                {
                    body = xmlhttp.responseText;
                    onComplete(headers, body);
                }
                else
                {
                    onComplete(new Error('Request failed'), null);
                }
            }
        };
        // https://developer.mozilla.org/en-US/docs/Web/API/XMLHttpRequest/Synchronous_and_Asynchronous_Requests#Example.3A_using_a_timeout
        xmlhttp.ontimeout = function() {
            onComplete(new Error('Request timeout'), null);
        };
        xmlhttp.open(method, url, true /*,user,pass*/);  // 'true' makes the request asynchronous
        xmlhttp.timeout = options.timeout || 0;
        xmlhttp.send(requestBody);
    }
};

if (isNode || ("undefined" === typeof FormData))
{
    xFormData = function xFormData(form) {
        var self = this;
        self.shim = true;
        self.boundary = "--------FormDataBoundary" + base64_encode(uuid('FormData'));
        self.fields = {};
        if (!isNode && form instanceof HTMLFormElement)
            parse_form(form, self);
    };
    xFormData[PROTO] = {
        constructor: xFormData,
        shim: true,
        boundary: null,
        fields: null,

        dispose: function() {
            var self = this;
            self.boundary = null;
            self.fields = null;
            return self;
        },

        delete: function(key, value) {
            var self = this, index;
            if (key && HAS.call(self.fields,key))
            {
                if (arguments.length > 1)
                {
                    index = self.fields[key].indexOf(value);
                    if (-1 < index) self.fields[key].splice(index, 1);
                }
                else
                {
                    delete self.fields[key];
                }
            }
            return self;
        },

        has: function(key, value) {
            var self = this, index;
            if (key && HAS.call(self.fields,key))
            {
                if (arguments.length > 1)
                {
                    index = self.fields[key].indexOf(value);
                    return (-1 < index);
                }
                else
                {
                    return true;
                }
            }
            return false;
        },

        append: function(key, value) {
            var self = this;
            if (!HAS.call(self.fields,key)) self.fields[key] = is_array(value) ? value : [value];
            else if (is_array(value)) self.fields[key] = self.fields[key].concat(value);
            else self.fields[key].push(value);
            return self;
        },

        set: function(key, value) {
            var self = this;
            self.fields[key] = is_array(value) ? value : [value];
            return self;
        },

        get: function(key) {
            var self = this;
            if (key && HAS.call(self.fields,key) && self.fields[key].length)
                return self.fields[key][0];
            return undef;
        },

        getAll: function(key) {
            var self = this;
            if (key && HAS.call(self.fields,key) && self.fields[key].length)
                return self.fields[key];
            return undef;
        },

        toString: function() {
            var self = this,
                boundary = self.boundary,
                fields = self.fields,
                keys = KEYS(fields),
                f, fl, k, kl = keys.length, key, field, kfields,
                ks, file,
                body = "";
            for (k=0; k<kl; ++k)
            {
                key = keys[k];
                ks = key.toString();
                kfields = fields[key];
                fl = kfields.length;
                for (f=0; f<fl; ++f)
                {
                    field = kfields[f];
                    body += "--" + boundary + "\r\n";
                    // file upload
                    if (field.name /*|| field instanceof Blob*/)
                    {
                        file = field;
                        body += "Content-Disposition: form-data; name=\""+ ks +"\"; filename=\""+ file.name +"\"\r\n";
                        body += "Content-Type: "+ file.type +"\r\n\r\n";
                        body += file.getAsBinary() + "\r\n";
                    }
                    else
                    {
                        body += "Content-Disposition: form-data; name=\""+ ks +"\";\r\n\r\n";
                        body += field.toString('utf8') + "\r\n";
                    }
                }
            }
            body += "--" + boundary +"--";
            return body;
        }
    };
}
else
{
    xFormData = FormData;
}
EazyHttp.FormData = xFormData;

// utils ---------------------------------
function is_array(x)
{
    return ('[object Array]' === toString.call(x)) || (x instanceof Array);
}
function is_obj(x)
{
    return ('[object Object]' === toString.call(x)) || (x instanceof Object);
}
function is_string(x)
{
    return ('[object String]' === toString.call(x)) || (x instanceof String);
}
function is_number(x)
{
    return ('number' === typeof(x)) || (x instanceof Number);
}
function is_callable(x)
{
    return 'function' === typeof(x);
}
function array_keys(o)
{
    if ('function' === typeof Object.keys) return Object.keys(o);
    var v, k, l;
    if (is_array(o))
    {
        v = new Array(l=o.length);
        for (k=0; k<l; ++k)
        {
            v[k] = String(k);
        }
    }
    else
    {
        v = [];
        for (k in o)
        {
            if (HAS.call(o, k))
                v.push(k);
        }
    }
    return v;
}
function array_values(o)
{
    if (is_array(o)) return o;
    if ('function' === typeof Object.values) return Object.values(o);
    var v = [], k;
    for (k in o)
    {
        if (HAS.call(o, k))
            v.push(o[k]);
    }
    return v;
}
function is_numeric_array(o)
{
    if (is_array(o)) return true;
    if (is_obj(o))
    {
        var k = array_keys(o), i, l = k.length;
        for (i=0; i<l; ++i)
        {
            if (i !== +k[i]) return false;
        }
        return true;
    }
    return false;
}
function in_array(v, a, strict)
{
    var i, l = a.length;
    if (true === strict)
    {
        // Array.indexOf uses strict equality
        return (0 < l) && (-1 !== a.indexOf(v));
    }
    else
    {
        for (i=0; i<l; ++i)
        {
            if (v == a[i])
                return true;
        }
    }
    return false;
}
function extend(o1, o2, deep)
{
    var k, v;
    deep = true === deep;
    if (o2)
    {
        for (k in o2)
        {
            if (!HAS.call(o2,k)) continue;
            v = o2[k];
            if (is_number(v)) o1[k] = 0+v;
            else if (is_string(v)) o1[k] = v.slice();
            else if (is_array(v)) o1[k] = deep ? extend(v.length ? new Array(v.length) : [], v, deep) : v;
            else if (is_obj(v)) o1[k] = deep ? extend({}, v, deep) : v;
            else o1[k] = v;
        }
    }
    return o1;
}
// adapted from https://github.com/kvz/phpjs
var uriParser = {
    php: /^(?:([^:\/?#]+):)?(?:\/\/()(?:(?:()(?:([^:@]*):?([^:@]*))?@)?([^:\/?#]*)(?::(\d*))?))?()(?:(()(?:(?:[^?#\/]*\/)*)()(?:[^?#]*))(?:\?([^#]*))?(?:#(.*))?)/,
    strict: /^(?:([^:\/?#]+):)?(?:\/\/((?:(([^:@]*):?([^:@]*))?@)?([^:\/?#]*)(?::(\d*))?))?((((?:[^?#\/]*\/)*)([^?#]*))(?:\?([^#]*))?(?:#(.*))?)/,
    loose: /^(?:(?![^:@]+:[^:@\/]*@)([^:\/?#.]+):)?(?:\/\/\/?)?((?:(([^:@]*):?([^:@]*))?@)?([^:\/?#]*)(?::(\d*))?)(((\/(?:[^?#](?![^?#\/]*\.[^?#\/.]+(?:[?#]|$)))*\/?)?([^?#\/]*))(?:\?([^#]*))?(?:#(.*))?)/ // Added one optional slash to post-scheme to catch file:/// (should restrict this)
},
    uriComponent = ['source', 'scheme', 'authority', 'userInfo', 'user', 'pass', 'host', 'port', 'relative', 'path', 'directory', 'file', 'query', 'fragment']
;
function parse_url(s, component, mode/*, queryKey*/)
{
    var m = uriParser[mode || 'php'].exec(s),
        uri = {}, i = 14//, parser, name
    ;
    while (i--)
    {
        if (m[i])  uri[uriComponent[i]] = m[i]
    }
    if (HAS.call(uri, 'port')) uri['port'] = parseInt(uri['port'], 10);

    if (component)
    {
        return uri[component.replace('PHP_URL_', '').toLowerCase()] || null;
    }

    /*if ('php' !== mode)
    {
        name = queryKey || 'queryKey';
        parser = /(?:^|&)([^&=]*)=?([^&]*)/g;
        uri[name] = {};
        uri[uriComponent[12]].replace(parser, function ($0, $1, $2) {
            if ($1) {uri[name][$1] = $2;}
        });
    }*/
    if (null != uri.source) delete uri.source;
    return uri;
}
function rawurldecode(str)
{
    return decodeURIComponent(String(str));
}
function rawurlencode(str)
{
    return encodeURIComponent(String(str))
        .split('!').join('%21')
        .split("'").join('%27')
        .split('(').join('%28')
        .split(')').join('%29')
        .split('*').join('%2A')
        //.split('~').join('%7E')
    ;
}
function urldecode(str)
{
    return rawurldecode(String(str).split('+').join('%20'));
}
function urlencode(str)
{
    return rawurlencode(str).split('%20').join('+');
}
// adapted from https://github.com/kvz/phpjs
function parse_str(str)
{
    var strArr = str.replace(/^&+|&+$/g, '').split('&'),
        sal = strArr.length,
        i, j, ct, p, lastObj, obj, chr, tmp, key, value,
        postLeftBracketPos, keys, keysLen, lastkey,
        array = {}, possibleLists = [], prevkey, prevobj
    ;

    for (i=0; i<sal; ++i)
    {
        tmp = strArr[i].split('=');
        key = rawurldecode(trim(tmp[0]));
        value = (tmp.length < 2) ? '' : rawurldecode(trim(tmp[1]));

        j = key.indexOf('\x00');
        if (j > -1) key = key.slice(0, j);

        if (key && ('[' !== key.charAt(0)))
        {
            keys = [];

            postLeftBracketPos = 0;
            for (j=0; j<key.length; ++j)
            {
                if (('[' === key.charAt(j)) && !postLeftBracketPos)
                {
                    postLeftBracketPos = j + 1;
                }
                else if (']' === key.charAt(j))
                {
                    if (postLeftBracketPos)
                    {
                        if (!keys.length)
                        {
                            keys.push(key.slice(0, postLeftBracketPos - 1));
                        }
                        keys.push(key.substr(postLeftBracketPos, j - postLeftBracketPos));
                        postLeftBracketPos = 0;
                        if ('[' !== key.charAt(j + 1)) break;
                    }
                }
            }

            if (!keys.length) keys = [key];

            for (j=0; j<keys[0].length; ++j)
            {
                chr = keys[0].charAt(j);
                if (' ' === chr || '.' === chr || '[' === chr)
                {
                    keys[0] = keys[0].substr(0, j) + '_' + keys[0].substr(j + 1);
                }
                if ('[' === chr) break;
            }

            obj = array; key = null; lastObj = obj;
            lastkey = keys.length ? trim(keys[ keys.length-1 ].replace(/^['"]|['"]$/g, '')) : null;
            for (j=0, keysLen=keys.length; j<keysLen; ++j)
            {
                prevkey = key;
                key = keys[j].replace(/^['"]|['"]$/g, '');
                prevobj = lastObj;
                lastObj = obj;

                if ('' !== trim(key) || 0 === j)
                {
                    if (!HAS.call(obj, key)) obj[key] = (j+1 === keysLen-1) && (''===lastkey) ? [] : {};
                    obj = obj[key];
                }
                else
                {
                    // To insert new dimension
                    /*ct = -1;
                    for (p in obj)
                    {
                        if (HAS.call(obj,p))
                        {
                            if (+p > ct && p.match(/^\d+$/g))
                            {
                                ct = +p;
                            }
                        }
                    }
                    key = ct + 1;*/
                    key = true;
                }
            }
            if (true === key)
            {
                lastObj.push(value);
            }
            else
            {
                if (key == +key)
                    possibleLists.push({key:prevkey, obj:prevobj});
                lastObj[key] = value;
            }
        }
    }
    for (i=possibleLists.length-1; i>=0; --i)
    {
        // safe to pass multiple times same obj, it is possible
        obj = possibleLists[i].key ? possibleLists[i].obj[possibleLists[i].key] : possibleLists[i].obj;
        if (is_numeric_array(obj))
        {
            obj = array_values(obj);
            if (possibleLists[i].key)
                possibleLists[i].obj[possibleLists[i].key] = obj;
            else
                array = obj;
        }
    }
    return array;
}
// adapted from https://github.com/kvz/phpjs
function http_build_query_helper(key, val, arg_separator, PHP_QUERY_RFC3986)
{
    var k, tmp, encode = PHP_QUERY_RFC3986 ? rawurlencode : urlencode;

    if (true === val) val = "1";
    else if (false === val) val = "0";

    if (null != val)
    {
        if ('object' === typeof val)
        {
            tmp = [];
            for (k in val)
            {
                if (HAS.call(val, k) && (null != val[k]))
                {
                    tmp.push(http_build_query_helper(key + "[" + k + "]", val[k], arg_separator, PHP_QUERY_RFC3986));
                }
            }
            return tmp.join(arg_separator);
        }
        else
        {
            return encode(key) + "=" + encode(val);
        }
    }
    else
    {
        return '';
    }
}
function http_build_query(data, arg_separator, PHP_QUERY_RFC3986)
{
    var value, key, query, tmp = [];

    if (arguments.length < 2) arg_separator = "&";
    if (arguments.length < 3) PHP_QUERY_RFC3986 = false;

    for (key in data)
    {
        if (!HAS.call(data, key)) continue;
        value = data[key];
        query = http_build_query_helper(key, value, arg_separator, PHP_QUERY_RFC3986);
        if ('' != query) tmp.push(query);
    }

    return tmp.join(arg_separator);
}
function str_replace(from, to, str)
{
    for (var i=0,n=from.length; i<n; ++i)
    {
        str = str.split(from[i]).join(to[i]);
    }
    return str;
}
function parse_cookie(str, isRaw)
{
    var cookie, parts, part, i, n, name, value, data;
    cookie = {
        'isRaw' : isRaw,
        'expires' : 0,
        'path' : '/',
        'domain' : null,
        'secure' : false,
        'httponly' : false,
        'samesite' : null,
        'partitioned' : false
    };

    parts = String(str).split(';');
    for (i=0,n=parts.length; i<n; ++i) parts[i] = parts[i].split('=', 2);

    part = parts.shift();
    name = !isRaw ? urldecode(trim(part[0])) : trim(part[0]);
    value = (null != part[1]) ? (!isRaw ? urldecode(trim(part[1])) : trim(part[1])) : null;
    cookie['name'] = name;
    cookie['value'] = value;

    data = {};
    for (i=0,n=parts.length; i<n; ++i)
    {
        part = parts[i];
        name = trim(part[0]).toLowerCase();
        value = (null != part[1]) ? trim(part[1]) : true;
        data[name] = value;
    }
    cookie = extend(cookie, data);

    cookie['expires'] = new Date(/^[0-9]+$/.test(cookie['expires']) ? (1000*parseInt(cookie['expires'])) : cookie['expires']);

    if ((null != cookie['max-age']) && ((+cookie['max-age']) > 0 || cookie['expires'].getTime() > Date.now()))
    {
        cookie['expires'] = new Date(Date.now() + 1000*parseInt(cookie['max-age']));
    }

    return cookie;
}
function format_cookie(cookie, toSet)
{
    var RESERVED_CHARS_LIST = "=,; \t\r\n\v\f",
        RESERVED_CHARS_FROM = ['=', ',', ';', ' ', "\t", "\r", "\n", "\v", "\f"],
        RESERVED_CHARS_TO = ['%3D', '%2C', '%3B', '%20', '%09', '%0D', '%0A', '%0B', '%0C'],
        isRaw, str;

    if ((null == cookie) || !is_obj(cookie)) return '';

    if ((null == cookie['name'])) return '';

    isRaw = (true === cookie['isRaw']);

    str = '';

    if (isRaw)
    {
        str = String(cookie['name']);
    }
    else
    {
        str = str_replace(RESERVED_CHARS_FROM, RESERVED_CHARS_TO, String(cookie['name']));
    }

    str += '=';

    if (null == cookie['value'] || !String(cookie['value']).length)
    {
        if (toSet)
        {
            str += 'deleted; Expires='+(new Date(Date.now() - 1000*31536001)).toUTCString()+'; Max-Age=0';
        }
        else
        {
            return '';
        }
    }
    else
    {
        str += isRaw ? String(cookie['value']) : rawurlencode(String(cookie['value']));
        if (toSet)
        {
            if (!(cookie['expires'] instanceof Date)) cookie['expires'] = new Date();
            str += '; Expires='+cookie['expires'].toUTCString()+'; Max-Age='+Math.max(0, cookie['expires'].getTime()-Date.now());
        }
    }

    if (toSet)
    {
        if ((null != cookie['path']))
        {
            str += '; Path='+cookie['path'];
        }

        if ((null != cookie['domain']))
        {
            str += '; Domain='+cookie['domain'];
        }

        if (cookie['secure'])
        {
            str += '; Secure';
        }

        if (cookie['httponly'])
        {
            str += '; HttpOnly';
        }

        if ((null != cookie['samesite']))
        {
            str += '; SameSite='+cookie['samesite'];
        }

        if (cookie['partitioned'])
        {
            str += '; Partitioned';
        }
    }

    return str;
}
// parse and extract headers from header_str
function parse_headers(s)
{
    var headers = {},
        key = null, lines, parts, i, l, line;
    if (s && s.length)
    {
        lines = s.split("\r\n");
        l = lines.length;
        for (i=0; i<l; ++i)
        {
            line = lines[i];
            parts = line.split(":");
            if (parts.length > 1)
            {
                key = trim(parts.shift());
                headers[key] = parts.join(":");
            }
            else if (key)
            {
                headers[key] += "\r\n" + parts[0];
            }
        }
    }
    return headers;
}
// parse and extract headers from header_str
function build_headers(headers)
{
    var header = '',
        key = null, lines, parts, i, l, line;
    lines = s.split(/(\r\n)|\r|\n/g);
    l = lines.length;
    for (i=0; i<l; ++i)
    {
        line = lines[i];
        parts = line.split(":");
        if (parts.length > 1)
        {
            key = trim(parts.shift());
            headers[key] = parts.join(":");
        }
        else if (key)
        {
            headers[key] += "\r\n" + parts[0];
        }
    }
    return header;
}
function parse_form(form, formData)
{
    var data = formData && formData instanceof xFormData ? formData : new xFormData();
    // https://developer.mozilla.org/en-US/docs/Web/API/HTMLFormElement/elements
    if (form && form.elements && form.elements.length)
    {
        var i, l = form.elements.length, field, fieldtype, type, key, value;
        for (i=0; i<l; ++i)
        {
            field = form.elements[i];
            fieldtype = field.nodeName.toLowerCase();
            if ( !/input|textarea|select/.test(fieldtype) ||
                field.disabled ||
                !field.name ||
                !field.name.length ) continue;
            type = field.type.toLowerCase();
            key = field.name;
            value = null;
            switch (fieldtype)
            {
                case 'input':
                case 'textarea':
                    switch (type)
                    {
                        case 'radio':
                            if (field.checked && "false" === field.value)
                            {
                                value = false;
                                break;
                            }
                        case 'checkbox':
                            if (field.checked && "true" === field.value)
                            {
                                value = true;
                                break;
                            }
                            if (!field.checked && "true" === field.value)
                            {
                                value = false;
                                break;
                            }
                            if (field.checked)
                            {
                                value = field.value;
                                break;
                            }
                            break;

                        case 'file':
                            value = field.files/*[0]??*/;
                            break;

                        case 'button':
                        case 'reset':
                        case 'submit':
                        case 'image':
                            break;

                        default:
                            value = field.value;
                            break;
                    }
                    break;

                case 'select':
                    var selected, options, i, l;

                    if (!field.multiple)
                    {
                        value = field.value;
                        break;
                    }
                    selected = [];
                    for (options = field.getElementsByTagName("option"), i = 0, l = options.length; i < l; ++i)
                    {
                        if (options[i].selected)
                            selected.push(options[i].value);
                    }

                    value = selected;
                    break;

                default:
                    break;
            }
            if (null == value) continue;
        }
    }
    return data;
}
function form_encode(form, formData)
{
    if (form)
    {
        if (!isNode && form instanceof HTMLFormElement) form = parse_form(form, formData);
        // "multipart/form-data"
        if (form instanceof xFormData) return form.shim ? form.toString() : form;
        //'application/x-www-form-urlencoded; charset=utf-8'
        if (is_string(form)) return urlencode(form.toString('utf8'));
        else if (is_obj(form) || is_array(form) ) return glue(form)/*.toString('utf8')*/;
    }
    return '';
}

// export it
EazyHttp.VERSION = VERSION;
return EazyHttp;
});