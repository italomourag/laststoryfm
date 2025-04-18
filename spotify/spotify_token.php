<?php
declare(strict_types=1);
class SpotifyToken
{
    public static function getSpotifyAccessToken(): ?string
    {
        $tokenFile = __DIR__ . '/access_token.json';
        $config = require __DIR__ . '/config.php';

        if (file_exists($tokenFile)) {
            $data = json_decode(file_get_contents($tokenFile), true);
            if ($data['expires_at'] > time()) {
                return $data['access_token'];
            }
        }

        $headers = [
            'Authorization: Basic ' . base64_encode($config['client_id'] . ':' . $config['client_secret']),
            'Content-Type: application/x-www-form-urlencoded'
        ];
        $data = [
            'grant_type' => 'client_credentials'
        ];

        $ch = curl_init('https://accounts.spotify.com/api/token');
        curl_setopt($ch, CURLOPT_POST, true);
        curl_setopt($ch, CURLOPT_POSTFIELDS, http_build_query($data));
        curl_setopt($ch, CURLOPT_HTTPHEADER, $headers);
        curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
        $res = curl_exec($ch);
        curl_close($ch);

        $resData = json_decode($res, true);

        if(!isset($resData['access_token'])) {
            return null;
        }

        $resData['expires_at'] = time() + $resData['expires_in'];
        file_put_contents($tokenFile, json_encode($resData));
        return $resData['access_token'];
    }
}