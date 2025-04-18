<?php
declare(strict_types=1);
require_once __DIR__ . '/../spotify/spotify_token.php';

header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');

if (!isset($_GET['q']) || trim($_GET['q']) === '') {
    http_response_code(400);
    echo json_encode(['error' => 'Parâmetro "q" (nome do artista) é obrigatório']);
    exit;
}

$q = urlencode($_GET['q']);
$token = SpotifyToken::getSpotifyAccessToken();

if (!$token) {
    http_response_code(500);
    echo json_encode(['error' => 'Erro ao obter token do Spotify']);
    exit;
}

$url = "https://api.spotify.com/v1/search?q={$q}&type=artist&limit=1";

$ch = curl_init($url);
curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
curl_setopt($ch, CURLOPT_HTTPHEADER, [
    "Authorization: Bearer $token"
]);

$response = curl_exec($ch);
curl_close($ch);

$data = json_decode($response, true);

if (empty($data['artists']['items'])) {
    http_response_code(404);
    echo json_encode(['error' => 'Artista não encontrado']);
    exit;
}

$artist = $data['artists']['items'][0];
$image = $artist['images'][0]['url'] ?? null;

foreach($data['artists']['items'][0]['images'] as $image) {
    if (
        $image['height'] > 300 &&
        $image['width'] > 300
    ) {
        $image = $image['url'];
        break;
    }
}

echo json_encode([
    'nome' => $artist['name'],
    'imagem' => $image
]);
