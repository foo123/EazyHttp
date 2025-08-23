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

    // adapted from tico ------------------------
    public function http($method = 'get', $uri = '', $data = null, $headers = null, &$responseBody = '', &$responseStatus = 0, &$responseHeaders = null)
    {
        // TODO: support POST files ??
        if (!empty($uri))
        {
            $method = strtoupper((string)$method);
            if (function_exists('curl_init'))
            {
                switch ($method)
                {
                    case 'POST':
                    $responseBody = $this->httpCURL('POST', $uri, !empty($data) ? http_build_query($data, '', '&') : '', $this->formatHttpHeader($headers, array('Content-type: application/x-www-form-urlencoded'), ': '), $responseStatus, $responseHeaders);
                    break;

                    case 'GET':
                    default:
                    $responseBody = $this->httpCURL('GET', $uri.(!empty($data) ? ((false === strpos($uri, '?') ? '?' : '&').http_build_query($data, '', '&')) : ''), '', $this->formatHttpHeader($headers, array(), ': '), $responseStatus, $responseHeaders);
                    break;
                }
            }
            elseif (function_exists('stream_context_create') && function_exists('file_get_contents') && ini_get('allow_url_fopen'))
            {
                switch ($method)
                {
                    case 'POST':
                    $responseBody = $this->httpFILE('POST', $uri, !empty($data) ? http_build_query($data, '', '&') : '', $this->formatHttpHeader($headers, array('Content-type: application/x-www-form-urlencoded'), ': '), $responseStatus, $responseHeaders);
                    break;

                    case 'GET':
                    default:
                    $responseBody = $this->httpFILE('GET', $uri.(!empty($data) ? ((false === strpos($uri, '?') ? '?' : '&').http_build_query($data, '', '&')) : ''), '', $this->formatHttpHeader($headers, array(), ': '), $responseStatus, $responseHeaders);
                    break;
                }
            }
            elseif ('http://' === substr(strtolower($uri), 0, 7) && function_exists('fsockopen'))
            {
                switch ($method)
                {
                    case 'POST':
                    $responseBody = $this->httpSOCKET('POST', $uri, !empty($data) ? http_build_query($data, '', '&') : '', $this->formatHttpHeader($headers, array('Content-type: application/x-www-form-urlencoded'), ': '), $responseStatus, $responseHeaders);
                    break;

                    case 'GET':
                    default:
                    $responseBody = $this->httpSOCKET('GET', $uri.(!empty($data) ? ((false === strpos($uri, '?') ? '?' : '&').http_build_query($data, '', '&')) : ''), '', $this->formatHttpHeader($headers, array(), ': '), $responseStatus, $responseHeaders);
                    break;
                }
            }
            else
            {
                switch ($method)
                {
                    case 'POST':
                    $responseBody = $this->httpCLIENT('POST', $uri, $data);
                    break;

                    case 'GET':
                    default:
                    $responseBody = $this->httpCLIENT('GET', $uri.(!empty($data) ? ((false === strpos($uri, '?') ? '?' : '&').http_build_query($data, '', '&')) : ''));
                    break;
                }
            }
        }
        return $this;
    }

    public function datetime($time = null)
    {
        if (is_null($time)) $time = time();
        $dt = \DateTime::createFromFormat('U', $time);
        $dt->setTimezone(new \DateTimeZone('UTC'));
        return $dt->format('D, d M Y H:i:s').' GMT';
    }

    public function flatten($input, $output = array(), $prefix = null)
    {
        if (!empty($input))
        {
            foreach ($input as $key => $val)
            {
                $name = empty($prefix) ? $key : ($prefix."[$key]");

                if (is_array($val)) $output = $this->flatten($val, $output, $name);
                else $output[$name] = $val;
            }
        }
        return $output;
    }

    protected function formatHttpHeader($input, $output = array(), $glue = '')
    {
        if (!empty($input))
        {
            foreach ($input as $key => $val)
            {
                if (is_array($val))
                {
                    foreach ($val as $v)
                    {
                        $output[] = ((string)$key) . $glue . ((string)$v);
                    }
                }
                else
                {
                    $output[] = ((string)$key) . $glue . ((string)$val);
                }
            }
        }
        return $output;
    }

    protected function parseHttpHeader($responseHeader)
    {
        $responseHeaders = array();
        foreach ($responseHeader as $header)
        {
            $header = explode(':', $header, 2);
            if (count($header) >= 2)
            {
                $k = strtolower(trim($header[0])); $v = trim($header[1]);
                if (!isset($responseHeaders[$k])) $responseHeaders[$k] = array($v);
                else $responseHeaders[$k][] = $v;
            }
        }
        return $responseHeaders;
    }

    protected function httpCLIENT($method, $uri, $requestBody = '', $requestHeaders = array(), &$responseStatus = 0, &$responseHeaders = null)
    {
        switch (strtoupper($method))
        {
            case 'POST':
            if (!empty($requestBody))
            {
                if (is_array($requestBody))
                {
                    $requestData = $requestBody;
                }
                else
                {
                    $requestData = array();
                    @parse_str((string)$requestBody, $requestData);
                }
                $requestData = $this->flatten($requestData);
                $formData = implode('', array_map(function($name, $value) {return '<input type="hidden" name="'.$name.'" value="'.$value.'" />';}, array_keys($requestData), $requestData));
            }
            else
            {
                $formData = '';
            }
            try {
                @header('Content-Type: text/html; charset=UTF-8', true, 200);
                @header('Date: '.$this->datetime(time()), true, 200);
                echo ('<!DOCTYPE html><html><head><meta http-equiv="content-type" content="text/html; charset=UTF-8"/><title>POST '.$uri.'</title></head><body onload="do_post();"><form name="post_form" id="post_form" method="post" enctype="application/x-www-form-urlencoded" action="'.$uri.'">'.$formData.'</form><script type="text/javascript">function do_post() {document.post_form.submit();}</script></body></html>');
            } catch (Exception $e) {
            }
            break;

            case 'GET':
            default:
            try {
                @header("Location: $uri", true, 303);
                @header('Content-Type: text/html; charset=UTF-8', true, 303);
                @header('Date: '.$this->datetime(time()), true, 303);
                echo ('<!DOCTYPE html><html><head><meta http-equiv="content-type" content="text/html; charset=UTF-8"/><meta http-equiv="refresh" content="0; URL='.$uri.'"/><title>GET '.$uri.'</title></head><body onload="do_get();"><script type="text/javascript">function do_get() {window.location.href = "'.$uri.'";}</script></body></html>');
            } catch (Exception $e) {
            }
            break;
        }
        return null;
    }

    protected function httpCURL($method, $uri, $requestBody = '', $requestHeaders = array(), &$responseStatus = 0, &$responseHeaders = null)
    {
        $responseHeader = array();
        // init
        $curl = curl_init($uri);

        // setup
        curl_setopt($curl, CURLOPT_RETURNTRANSFER, true);
        curl_setopt($curl, CURLOPT_FOLLOWLOCATION, true);
        curl_setopt($curl, CURLOPT_MAXREDIRS, 3);
        curl_setopt($curl, CURLOPT_HEADERFUNCTION, function($curl, $header) use (&$responseHeader) {
            $responseHeader[] = trim($header);
            return strlen($header);
        });
        curl_setopt($curl, CURLOPT_HTTPHEADER, $requestHeaders);

        if ('POST' === strtoupper($method))
        {
            curl_setopt($curl, CURLOPT_POST, true);
            curl_setopt($curl, CURLOPT_POSTFIELDS, $requestBody);
        }
        else
        {
            curl_setopt($curl, CURLOPT_HTTPGET, true);
        }

        // make request
        try {
            $responseBody = @curl_exec($curl);
            $responseStatus = @curl_getinfo($curl, CURLINFO_HTTP_CODE);
        } catch (Exception $e) {
            $responseBody = false;
        }

        // close connection
        curl_close($curl);

        $responseHeaders = $this->parseHttpHeader($responseHeader);
        return $responseBody;
    }

    protected function httpSOCKET($method, $uri, $requestBody = '', $requestHeaders = array(), &$responseStatus = 0, &$responseHeaders = null)
    {
        // NOTE: cannot handle HTTPS, results in redirect to https://
        $redirects = 0; $max_redirects = 3;
        while ($redirects <= $max_redirects)
        {
            $uri = parse_url($uri);
            $host = $uri['host'];
            $port = isset($uri['port']) ? intval($uri['port']) : 80;
            $path = $uri['path'];
            if (empty($path)) $path = '/';
            $query = $uri['query'];
            if (!empty($query)) $path .= '?'.$query;
            $timeout = 120; // sec
            $chunk = 1024; // bytes

            // open socket
            try {
                $fp = @fsockopen($host, $port, $errno, $errstr, $timeout);
            } catch (Exception $e) {
                $fp = null;
            }
            if (!$fp) return false;

            // make request
            $content_length = strlen((string)$requestBody);
            fputs($fp, ('POST' === strtoupper($method) ? "POST" : "GET")." $path HTTP/1.1");
            fputs($fp, "\r\n"."Host: $host");
            if (!empty($requestHeaders)) fputs($fp, "\r\n".implode("\r\n", (array)$requestHeaders));
            fputs($fp, "\r\n"."Content-length: $content_length");
            fputs($fp, "\r\n"."Connection: close");
            fputs($fp, "\r\n\r\n".($content_length ? ((string)$requestBody) : ""));

            // receive response
            $response = '';
            while (!feof($fp)) $response .= fgets($fp, $chunk);

            // close socket
            fclose($fp);

            // parse headers and content
            $response = explode("\r\n\r\n", $response, 2);
            $responseHeader = isset($response[0]) ? $response[0] : '';
            $responseBody = isset($response[1]) ? $response[1] : '';
            $responseHeaders = $this->parseHttpHeader(empty($responseHeader) ? array() : array_map('trim', explode("\r\n", $responseHeader)));
            if (!empty($responseHeader) && preg_match('#HTTP/\\S*\\s+(\\d{3})#', $responseHeader, $m)) $responseStatus = (int)$m[1];
            if ((301 <= $responseStatus && $responseStatus <= 304) && preg_match('#Location:\\s+(\\S+)#', $responseHeader, $m))
            {
                ++$redirects;
                $uri = $m[1];
                continue;
            }
            else
            {
                break;
            }
        }
        return $responseBody;
    }

    protected function httpFILE($method, $uri, $requestBody = '', $requestHeaders = array(), &$responseStatus = 0, &$responseHeaders = null)
    {
        // setup
        $contentLength = strlen((string)$requestBody);
        // is content-length needed?? probably not
        $requestHeader = '';
        if (!empty($requestHeaders))
        {
            $requestHeader = implode("\r\n", (array)$requestHeaders);
            //$requestHeader .= "\r\nContent-length: $contentLength";
        }
        else
        {
            //$requestHeader = "Content-length: $contentLength";
        }
        $http = stream_context_create(array(
            "http" => array(
                "method"            => 'POST' === strtoupper($method) ? 'POST' : 'GET',
                "header"            => $requestHeader,
                "content"           => (string)$requestBody,
                "follow_location"   => 1,
                "max_redirects"     => 3,
                "ignore_errors"     => true,
            ),
        ));

        // open, make request and close
        try {
            $responseBody = @file_get_contents($uri, false, $http);
        } catch (Exception $e) {
            $responseBody = false;
        }

        if (!empty($http_response_header))
        {
            $responseHeader = array_merge(array(), $http_response_header);
            if (!empty($responseHeader) && preg_match('#HTTP/\\S*\\s+(\\d{3})#', $responseHeader[0], $m)) $responseStatus = (int)$m[1];
            $responseHeaders = $this->parseHttpHeader($responseHeader);
        }
        else
        {
            $responseStatus = 0;
            $responseHeaders = array();
        }
        return $responseBody;
    }
}
Http::init( );
}