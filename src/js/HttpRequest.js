/**
    HttpRequest
    A simple htp-request class for PHP, Python, Node/JS
    https://github.com/foo123/HttpRequest
**/
!function(root, undef){
    
    var toString = Function.prototype.call.bind( Object.prototype.toString ),
        slice = Function.prototype.call.bind( Array.prototype.slice ),
        isNode = 'undefined' !== global && '[object Global]' === toString(global),
        http = isNode ? require('http') : (root.XMLHttpRequest ? root.XMLHttpRequest : function(){ return new ActiveXObject("Microsoft.XMLHTTP");})
    ;
    
    function NodeRequest( inst, url, method, data, params, callback )
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
    
    function ClientRequest( inst, url, method, data, params, callback ) 
    {
        var xmlhttp = new http() ;
        xmlhttp.onload = function( ) {
            if ( 200 === xmlhttp.status ) callback( xmlhttp.responseText );
            else callback( '' );
        };
        xmlhttp.open(method, url, true);  // 'true' makes the request asynchronous
        xmlhttp.send(params);
    }
    
    var HttpRequest = root.HttpRequest = function( ){ };
    HttpRequest.prototype = {
        constructor: HttpRequest,
        
        request: function( url, method, data, params, callback )  {
            if ( isNode )
                return NodeRequest( this, url, method, data, params, callback );
            else
                return ClientRequest( this, url, method, data, params, callback );
        }
    };
    
}(this);