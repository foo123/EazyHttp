<?php
/**
    HttpRequest
    A simple htp-request class for PHP, Python, Node/JS
    https://github.com/foo123/HttpRequest
**/
if ( !class_exists('HttpRequest') )
{
class HttpRequest
{
    private static $carrier = null;
    
    public static function init( )
    {
        if ( function_exists('http_request') )
        {
            self::$carrier = 'PECL';
        }
        elseif ( function_exists('curl_init') )
        {
            self::$carrier = 'CURL';
        }
        elseif ( function_exists('fsockopen') )
        {
            self::$carrier = 'SOCKET';
        }
        else
        {
            self::$carrier = 'FILE';
        }
    }
    
    public function __construct( )
    {
    }
    
    public function request( $url, $method='GET', $data=null, $params=array() )
    {
        if ( 'PECL' === self::$carrier )
        {
            return $this->peclRequest( $url, $method, $data, $params );
        }
        elseif ( 'CURL' === self::$carrier )
        {
            return $this->curlRequest( $url, $method, $data, $params );
        }
        elseif ( 'SOCKET' === self::$carrier )
        {
            return $this->socketRequest( $url, $method, $data, $params );
        }
        else
        {
            return $this->fileRequest( $url, $method, $data, $params );
        }
    }
    
    private function peclRequest( $url, $method='GET', $data=null, $params=array() )
    {
        $resp = http_request ( $method, $url, $body, array $options, array &$info );
        if( !$resp )
        {
            $resp = new Exception('Error: "' . '' . '" - Code: ' . '');
        }
        return $resp;
    }
    
    private function curlRequest( $url, $method='GET', $data=null, $params=array() )
    {
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
        $resp = curl_exec( $curl );
        if( !$resp )
        {
            $resp = new Exception('Error: "' . curl_error($curl) . '" - Code: ' . curl_errno($curl));
        }
        curl_close( $curl );
        return $resp;
    }
    
    private function socketRequest( $url, $method='GET', $data=null, $params=array() )
    {
        $fp = fsockopen('example.com', 80);
        $resp = '';

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
        
        while ( !feof($fp) ) $resp .= fgets($fp, 1024);
        fclose( $fp );
        
        if( !$resp )
        {
            $resp = new Exception('Error: "' . '' . '" - Code: ' . '');
        }
        return $resp;
    }
    
    private function fileRequest( $url, $method='GET', $data=null, $params=array() )
    {
        $aContext = array(
            'http' => array(
                'proxy' => 'proxy:8080',
                'request_fulluri' => true,
            )
        );
        $cxContext = stream_context_create( $aContext );

        $resp = file_get_contents($url, false, $cxContext);
        if( !$resp )
        {
            $resp = new Exception('Error: "' . '' . '" - Code: ' . '');
        }
        return $resp;
    }
}
HttpRequest::init( );
}