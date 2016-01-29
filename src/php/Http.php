<?php
/**
*    Http
*    http utilities class for PHP, Python, Node/XPCOM/JS
*    https://github.com/foo123/Http
**/
if ( !class_exists('Http') )
{
class Http
{
    const HTTP_REQUEST = 1;
    const CURL = 2;
    const SOCKET = 4;
    const FILE = 8;
    
    private static $carrier = null;
    
    // build/glue together a uri component from a params object
    public static function glue( $params ) 
    {
        $component = '';
        // http://php.net/manual/en/function.http-build-query.php (for '+' sign convention)
        if ( $params ) $component .= str_replace('+', '%20', http_build_query( $params, '', '&'/*,  PHP_QUERY_RFC3986*/ ));
        return $component;
    }
        
    // unglue/extract params object from uri component
    public static function unglue( $s ) 
    {
        $PARAMS = array( );
        if ( $s ) parse_str( $s, $PARAMS );
        return $PARAMS;
    }

    // parse and extract uri components and optional query/fragment params
    public static function parse_url( $s, $query_p='query_params', $fragment_p='fragment_params' ) 
    {
        $COMPONENTS = array( );
        if ( $s )
        {
            $COMPONENTS = parse_url( $s );
            
            if ( $query_p  )
            {
                if ( isset($COMPONENTS[ 'query' ]) && $COMPONENTS[ 'query' ] ) 
                    $COMPONENTS[ $query_p ] = self::unglue( $COMPONENTS[ 'query' ] );
                else
                    $COMPONENTS[ $query_p ] = array( );
            }
            if ( $fragment_p )
            {
                if ( isset($COMPONENTS[ 'fragment' ]) && $COMPONENTS[ 'fragment' ] ) 
                    $COMPONENTS[ $fragment_p ] = self::unglue( $COMPONENTS[ 'fragment' ] );
                else
                    $COMPONENTS[ $fragment_p ] = array( );
            }
        }
        return $COMPONENTS;
    }

    // build a url from baseUrl plus query/hash params
    public static function build_url( $baseUrl, $query=null, $hash=null, $q='?', $h='#' ) 
    {
        $url = '' . $baseUrl;
        if ( $query )  $url .= $q . self::glue( $query );
        if ( $hash )  $url .= $h . self::glue( $hash );
        return $url;
    }
        
    // parse and extract headers from header_str
    public static function parse_headers( $s ) 
    {
        $headers = array( );
        $key = null;
        if ( $s && strlen($s) )
        {
            $lines = preg_split("/(\r\n)|\r|\n/", $s);
            foreach ($lines as $line)
            {
                $parts = explode(":", $line);
                if ( isset($parts[1]) )
                {
                    $key = trim(array_shift($parts));
                    $headers[$key] = implode(":", $parts);
                }
                elseif ($key)
                {
                    $headers[$key] .= "\r\n" . $parts[0];
                }
            }
        }
        return $headers;
    }

    public static function build_headers( $headers ) 
    {
        $header = '';
        return $header;
    }

    // parse and extract cookie obj from string
    public static function parse_cookie( $s ) 
    {
        $headers = array( );
        $key = null;
        if ( $s && strlen($s) )
        {
            $lines = preg_split("/(\r\n)|\r|\n/", $s);
            foreach ($lines as $line)
            {
                $parts = explode(":", $line);
                if ( isset($parts[1]) )
                {
                    $key = trim(array_shift($parts));
                    $headers[$key] = implode(":", $parts);
                }
                elseif ($key)
                {
                    $headers[$key] .= "\r\n" . $parts[0];
                }
            }
        }
        return $headers;
    }

    public static function build_cookie( $cookie ) 
    {
        $str = '';
        return $str;
    }

    private static function request_http( $url, $options )
    {
        $method = $options['method'];
        $response = http_request ( $method, $url, $body, array $options, array &$info );
        if( !$response )
        {
            $response = new Exception('Error: "' . '' . '" - Code: ' . '');
        }
        return $response;
    }
    
    private static function request_curl( $url, $options )
    {
        $method = $options['method'];
        $curl = curl_init();
        if ( 'POST' === $method )
        {
            curl_setopt_array($curl, array(
                CURLOPT_RETURNTRANSFER => 1,
                CURLOPT_URL => $url,
                CURLOPT_USERAGENT => $params['useragent'],
                CURLOPT_POST => 1,
                CURLOPT_POSTFIELDS => $data
            ));
        }
        else
        {
            curl_setopt_array($curl, array(
                CURLOPT_RETURNTRANSFER => 1,
                CURLOPT_URL => $url,
                CURLOPT_USERAGENT => $params['useragent'],
            ));
        }
        $response = curl_exec( $curl );
        if( !$response )
        {
            $response = new Exception('Error: "' . curl_error($curl) . '" - Code: ' . curl_errno($curl));
        }
        curl_close( $curl );
        return $response;
    }
    
    private static function request_socket( $url, $options )
    {
        $fp = fsockopen('example.com', 80);
        $response = '';

        $vars = array(
            'hello' => 'world'
        );
        $content = http_build_query($vars);

        fwrite($fp, "POST /reposter.php HTTP/1.1\r\n");
        fwrite($fp, "Host: example.com\r\n");
        fwrite($fp, "Content-Type: application/x-www-form-urlencoded\r\n");
        fwrite($fp, "Content-Length: ".strlen($content)."\r\n");
        fwrite($fp, "Connection: close\r\n");
        fwrite($fp, "\r\n");
        fwrite($fp, $content);
        
        while ( !feof($fp) ) $response .= fgets($fp, 1024);
        fclose( $fp );
        
        if( !$response )
        {
            $response = new Exception('Error: "' . '' . '" - Code: ' . '');
        }
        return $response;
    }
    
    private static function request_file( $url, $options )
    {
        $aContext = array(
            'http' => array(
                'proxy' => 'proxy:8080',
                'request_fulluri' => true,
            )
        );
        $cxContext = stream_context_create( $aContext );

        $response = file_get_contents($url, false, $cxContext);
        if( !$response )
        {
            $response = new Exception('Error: "' . '' . '" - Code: ' . '');
        }
        return $response;
    }
    
    public static function init( )
    {
        if ( function_exists('http_request') )
        {
            self::$carrier = self::HTTP_REQUEST;
        }
        elseif ( function_exists('curl_init') )
        {
            self::$carrier = self::CURL;
        }
        elseif ( function_exists('fsockopen') )
        {
            self::$carrier = self::SOCKET;
        }
        else
        {
            self::$carrier = self::FILE;
        }
    }
    
    public function __construct( )
    {
    }
    
    public function request( $url, $options=array() )
    {
        $options = array_merge(array(
            'method'    => 'GET',
            'port'      => 80,
            'user'      => null,
            'password'  => null,
            'cookies'   => array(),
            'headers'   => array(),
            'body'      => '',
            'data'      => array(),
            'params'    => array()
        ), (array)$options);
        
        if ( self::HTTP_REQUEST === self::$carrier )
        {
            return self::request_http( $url, $options );
        }
        elseif ( self::CURL === self::$carrier )
        {
            return self::request_curl( $url, $options );
        }
        elseif ( self::SOCKET === self::$carrier )
        {
            return self::request_socket( $url, $options );
        }
        else
        {
            return self::request_file( $url, $options );
        }
    }
    
    public function get( $url )
    {
        $options = array(
            'method'    => 'GET'
        );
        return $this->request($url, $options);
    }
    
    public function post( $url, $data=array() )
    {
        $options = array(
            'method'    => 'POST',
            'data'      => (array)$data
        );
        return $this->request($url, $options);
    }
}
Http::init( );
}