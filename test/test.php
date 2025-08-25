<?php

if (!empty($_POST))
{
    setcookie("test_cookie", 'cookie value', time()+3600);  /* expire in 1 hour */
    echo "POST:\n\n";
    echo json_encode($_POST);
}
elseif (!empty($_GET))
{
    setcookie("test_cookie", 'cookie value', time()+3600);  /* expire in 1 hour */
    echo "GET:\n\n";
    echo json_encode($_GET);
}
else
{
    echo "UNKNOWN\n\n";
}
