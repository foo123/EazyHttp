/**
*    HttpLayer
*    A simple http-request class for PHP, Python, Node/JS
*    https://github.com/foo123/HttpLayer
**/
!function( root, name, factory ) {
"use strict";

// export the module, umd-style (no other dependencies)
var isCommonJS = ("object" === typeof(module)) && module.exports, 
    isAMD = ("function" === typeof(define)) && define.amd, m;

// CommonJS, node, etc..
if ( isCommonJS ) 
    module.exports = (module.$deps = module.$deps || {})[ name ] = module.$deps[ name ] || (factory.call( root, {NODE:module} ) || 1);

// AMD, requireJS, etc..
else if ( isAMD && ("function" === typeof(require)) && ("function" === typeof(require.specified)) && require.specified(name) ) 
    define( name, ['require', 'exports', 'module'], function( require, exports, module ){ return factory.call( root, {AMD:module} ); } );

// browser, web worker, etc.. + AMD, other loaders
else if ( !(name in root) ) 
    (root[ name ] = (m=factory.call( root, {} ) || 1)) && isAMD && define( name, [], function( ){ return m; } );

}(  /* current root */          this, 
    /* module name */           "Dromeo",
    /* module factory */        function( exports, undef ) {
"use strict";

var PROTO = "prototype", HAS = "hasOwnProperty",
    toString = Object[PROTO].toString,
    isNode = 'undefined' !== global && '[object Global]' === toString.call(global),
    
    is_array = function( o ) { return ('[object Array]' === toString.call(o)) || (o instanceof Array); },
    is_obj = function( o ) { return ('[object Object]' === toString.call(o)) || (o instanceof Object); },
    is_string = function( o ) { return ('[object String]' === toString.call(o)) || (o instanceof String); },
    is_number = function( o ) { return ('number' === typeof(o)) || (o instanceof Number); },
    is_callable = function( o ) { return ('[object Function]' === toString.call(o)) || (o instanceof Function); },
    
    extend = function( o1, o2, deep ) {
        var k, v;
        deep = true === deep;
        if ( o2 )
        {
            for ( k in o2 )
            {
                if ( !o2[HAS](k) ) continue;
                v = o2[k];
                if ( is_number(v) ) o1[k] = 0+v;
                else if ( is_string(v) ) o1[k] = v.slice();
                else if ( is_array(v) ) o1[k] = deep ? extend(new Array(v.length), v, deep) : v;
                else if ( is_obj(v) ) o1[k] = deep ? extend({}, v, deep) : v;
                else o1[k] = v;
            }
        }
        return o1;
    },
    
    trim = String[PROTO].trim 
        ? function( s ) { return s.trim( ); }
        : function( s ) { return s.replace(/^\s+|\s+$/g, ''); },
    http = isNode 
        ? require('http') 
        : ("undefined" !== typeof XMLHttpRequest ? XMLHttpRequest : function(){ return new ActiveXObject("Microsoft.XMLHTTP");}),
    
    // adapted from https://github.com/kvz/phpjs
    uriParser = {
        php: /^(?:([^:\/?#]+):)?(?:\/\/()(?:(?:()(?:([^:@]*):?([^:@]*))?@)?([^:\/?#]*)(?::(\d*))?))?()(?:(()(?:(?:[^?#\/]*\/)*)()(?:[^?#]*))(?:\?([^#]*))?(?:#(.*))?)/,
        strict: /^(?:([^:\/?#]+):)?(?:\/\/((?:(([^:@]*):?([^:@]*))?@)?([^:\/?#]*)(?::(\d*))?))?((((?:[^?#\/]*\/)*)([^?#]*))(?:\?([^#]*))?(?:#(.*))?)/,
        loose: /^(?:(?![^:@]+:[^:@\/]*@)([^:\/?#.]+):)?(?:\/\/\/?)?((?:(([^:@]*):?([^:@]*))?@)?([^:\/?#]*)(?::(\d*))?)(((\/(?:[^?#](?![^?#\/]*\.[^?#\/.]+(?:[?#]|$)))*\/?)?([^?#\/]*))(?:\?([^#]*))?(?:#(.*))?)/ // Added one optional slash to post-scheme to catch file:/// (should restrict this)
    },
    uriComponent = ['source', 'scheme', 'authority', 'userInfo', 'user', 'pass', 'host', 'port',
        'relative', 'path', 'directory', 'file', 'query', 'fragment'],
    parse_url = function(s, component, mode/*, queryKey*/) {
        var m = uriParser[mode || 'php'].exec( s ),
            uri = { }, i = 14//, parser, name
        ;
        while ( i-- ) 
        {
            if ( m[ i ] )  uri[ uriComponent[ i ] ] = m[ i ]
        }
        if ( uri[HAS]('port') ) uri['port'] = parseInt(uri['port'], 10);
        
        if ( component ) 
        {
            return uri[ component.replace('PHP_URL_', '').toLowerCase( ) ] || null;
        }
        
        /*if ( 'php' !== mode )
        {
            name = queryKey || 'queryKey';
            parser = /(?:^|&)([^&=]*)=?([^&]*)/g;
            uri[ name ] = { };
            uri[ uriComponent[12] ].replace(parser, function ($0, $1, $2) {
                if ($1) {uri[name][$1] = $2;}
            });
        }*/
        if ( uri.source ) delete uri.source;
        return uri;
    },
    rawurldecode = function( str ){
        return decodeURIComponent( ''+str );
    },
    rawurlencode = function( str ) {
        return encodeURIComponent( ''+str )
            .split('!').join('%21')
            .split("'").join('%27')
            .split('(').join('%28')
            .split(')').join('%29')
            .split('*').join('%2A')
            //.split('~').join('%7E')
        ;        
    },
    urldecode = function( str ) { 
        return rawurldecode( ('' + str).split('+').join('%20') ); 
    },
    urlencode = function( str ) {
        return rawurlencode( str ).split('%20').join('+');
    },
    parse_str = function( str ) {
        var strArr = str.replace(/^&/, '').replace(/&$/, '').split('&'),
            sal = strArr.length,
            i, j, ct, p, lastObj, obj, chr, tmp, key, value,
            postLeftBracketPos, keys, keysLen,
            array = { }
        ;

        for (i=0; i<sal; i++) 
        {
            tmp = strArr[ i ].split( '=' );
            key = rawurldecode( trim(tmp[0]) );
            value = (tmp.length < 2) ? '' : rawurldecode( trim(tmp[1]) );

            j = key.indexOf('\x00');
            if ( j > -1 ) key = key.slice(0, j);
                
            if ( key && '[' !== key.charAt(0) ) 
            {
                keys = [ ];
                
                postLeftBracketPos = 0;
                for (j=0; j<key.length; j++) 
                {
                    if ( '[' === key.charAt(j)  && !postLeftBracketPos ) 
                    {
                        postLeftBracketPos = j + 1;
                    }
                    else if ( ']' === key.charAt(j) ) 
                    {
                        if ( postLeftBracketPos ) 
                        {
                            if ( !keys.length ) 
                            {
                                keys.push( key.slice(0, postLeftBracketPos - 1) );
                            }
                            keys.push( key.substr(postLeftBracketPos, j - postLeftBracketPos) );
                            postLeftBracketPos = 0;
                            if ( '[' !== key.charAt(j + 1) ) break;
                        }
                    }
                }
                
                if ( !keys.length ) keys = [ key ];
                
                for (j=0; j<keys[0].length; j++) 
                {
                    chr = keys[0].charAt(j);
                    if ( ' ' === chr || '.' === chr || '[' === chr ) 
                    {
                        keys[0] = keys[0].substr(0, j) + '_' + keys[0].substr(j + 1);
                    }
                    if ( '[' === chr ) break;
                }

                obj = array;
                for (j=0, keysLen=keys.length; j<keysLen; j++) 
                {
                    key = keys[ j ].replace(/^['"]/, '').replace(/['"]$/, '');
                    lastObj = obj;
                    
                    if ( ('' !== key && ' ' !== key) || 0 === j ) 
                    {
                        if ( undef === obj[key] ) obj[key] = { };
                        obj = obj[ key ];
                    }
                    else 
                    { 
                        // To insert new dimension
                        ct = -1;
                        for ( p in obj ) 
                        {
                            if ( obj[HAS](p) ) 
                            {
                                if ( +p > ct && p.match(/^\d+$/g) ) 
                                {
                                    ct = +p;
                                }
                            }
                        }
                        key = ct + 1;
                    }
                }
                lastObj[ key ] = value;
            }
        }
        return array;
    },
    
    // adapted from https://github.com/kvz/phpjs
    http_build_query_helper = function( key, val, arg_separator, PHP_QUERY_RFC3986 ) {
        var k, tmp, encode = PHP_QUERY_RFC3986 ? rawurlencode : urlencode;
        
        if ( true === val ) val = "1";
        else if ( false === val ) val = "0";
        
        if ( null != val ) 
        {
            if ( "object" === typeof(val) ) 
            {
                tmp = [ ];
                for ( k in val ) 
                {
                    if ( val[HAS](k) && null != val[k] ) 
                    {
                        tmp.push( http_build_query_helper(key + "[" + k + "]", val[k], arg_separator, PHP_QUERY_RFC3986) );
                    }
                }
                return tmp.join( arg_separator );
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
    },
    http_build_query = function( data, arg_separator, PHP_QUERY_RFC3986 ) {
        var value, key, query, tmp = [ ];

        if ( arguments.length < 2 ) arg_separator = "&";
        if ( arguments.length < 3 ) PHP_QUERY_RFC3986 = false;
        
        for ( key in data ) 
        {
            if ( !data[HAS](key) ) continue;
            value = data[ key ];
            query = http_build_query_helper(key, value, arg_separator, PHP_QUERY_RFC3986);
            if ( '' != query ) tmp.push( query );
        }

        return tmp.join( arg_separator );
    }
;

function NodeRequest( inst, url, options )
{
    var options = {
        host: 'example.com',
        port: 80,
        path: '/foo.html'
    };

    var data = '';
    http
        .get(options, function( resp ) {
            resp.on('data', function(chunk){
                //do something with chunk
                data += chunk;
            });
            callback( data );
        })
        .on("error", function(e){
            console.log("Got error: " + e.message);
            callback( e );
        })
    ;
}

function ClientRequest( inst, url, options ) 
{
    var xmlhttp = new http() ;
    xmlhttp.onload = function( ) {
        if ( 200 === xmlhttp.status ) callback( xmlhttp.responseText );
        else callback( '' );
    };
    xmlhttp.open(method, url, true);  // 'true' makes the request asynchronous
    xmlhttp.send(params);
}

var HttpLayer = function HttpLayer( ){ };

// build/glue together a uri component from a params object
HttpLayer.glue = function( params ) {
    var component = '';
    // http://php.net/manual/en/function.http-build-query.php
    if ( params )  component += http_build_query( params, '&', true );
    return component;
};

// unglue/extract params object from uri component
HttpLayer.unglue = function( s ) {
    var PARAMS = s ? parse_str( s ) : { };
    return PARAMS;
};

// parse and extract uri components and optional query/fragment params
HttpLayer.parse = function( s, query_p, fragment_p ) {
    var self = this, COMPONENTS = { };
    if ( s )
    {
        if ( arguments.length < 3 ) fragment_p = 'fragment_params';
        if ( arguments.length < 2 ) query_p = 'query_params';
        
        COMPONENTS = parse_url( s );
        
        if ( query_p ) 
        {
            if ( COMPONENTS[ 'query' ] ) 
                COMPONENTS[ query_p ] = self.unglue( COMPONENTS[ 'query' ] );
            else
                COMPONENTS[ query_p ] = { };
        }
        if ( fragment_p )
        {
            if ( COMPONENTS[ 'fragment' ] ) 
                COMPONENTS[ fragment_p ] = self.unglue( COMPONENTS[ 'fragment' ] );
            else
                COMPONENTS[ fragment_p ] = { };
        }
    }
    return COMPONENTS;
};

// build a url from baseUrl plus query/hash params
HttpLayer.build = function( baseUrl, query, hash, q, h ) {
    var self = this,
        url = '' + baseUrl;
    if ( arguments.length < 5 ) h = '#';
    if ( arguments.length < 4 ) q = '?';
    if ( query )  url += q + self.glue( query );
    if ( hash )  url += h + self.glue( hash );
    return url;
};

HttpLayer[PROTO] = {
    constructor: HttpLayer,
    
    request: function( url, options )  {
        options = extend({
            'method'    : 'GET',
            'port'      : 80,
            'user'      : null,
            'password'  : null,
            'cookies'   : [],
            'headers'   : {},
            'body'      : '',
            'data'      : {},
            'params'    : {}
        }, options||{});
        if ( isNode )
            return NodeRequest( this, url, options );
        else
            return ClientRequest( this, url, options );
    },
    
    get: function( url ) {
        var options = {
            'method'    : 'GET'
        };
        return this.request(url, options);
    },
    
    post: function( url, data ) {
        var options = array(
            'method'    : 'POST',
            'data'      : data||{}
        );
        return this.request(url, options);
    }
};

// export it
return HttpLayer;
});