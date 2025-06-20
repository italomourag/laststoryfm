const apiKey = '3665028fedb6ae2920627f6a08e42a4b';
const canvas = document.getElementById('collageCanvas');
const ctx = canvas.getContext('2d');
const collageDiv = document.getElementById('collage');
const downloadBtn = document.getElementById('download');

function getAverageColor(image) {
    const canvasTemp = document.createElement('canvas');
    const ctxTemp = canvasTemp.getContext('2d');
    canvasTemp.width = image.width;
    canvasTemp.height = image.height;
    ctxTemp.drawImage(image, 0, 0);
    const imageData = ctxTemp.getImageData(0, 0, image.width, image.height);
    const data = imageData.data;
    let r = 0, g = 0, b = 0;
    for (let i = 0; i < data.length; i += 4) {
        r += data[i];
        g += data[i + 1];
        b += data[i + 2];
    }
    const pixelCount = data.length / 4;
    return `rgb(${Math.floor(r / pixelCount)}, ${Math.floor(g / pixelCount)}, ${Math.floor(b / pixelCount)})`;
}

function isColorDark(color) {
    if (color.startsWith('rgb')) {
        const [r, g, b] = color.match(/\d+/g).map(Number);
        const luminance = 0.2126 * r + 0.7152 * g + 0.0722 * b;
        return luminance < 128;
    }
    return false;
}

async function fetchAlbumImageFromiTunes(artist, album) {
    try {
        const query = encodeURIComponent(`${artist} ${album}`);
        const res = await fetch(`https://itunes.apple.com/search?term=${query}&entity=album&limit=1`);
        const data = await res.json();
        return data.results[0]?.artworkUrl100?.replace('100x100', '600x600') || null;
    } catch {
        return null;
    }
}

document.getElementById('generate').addEventListener('click', async () => {
    const username = document.getElementById('username').value;
    const period = document.getElementById('period').value;
    if (!username) return alert('Por favor, insira o nome do usuário do Last.fm.');

    const periodText = {
        '7day': 'Mais ouvidos da semana',
        '1month': 'Mais ouvidos do mês',
        '12month': 'Mais ouvidos do ano',
        'overall': 'Mais ouvidos de todos os tempos'
    }[period];

    try {
        const response = await fetch(`https://ws.audioscrobbler.com/2.0/?method=user.gettopalbums&user=${username}&period=${period}&limit=50&api_key=${apiKey}&format=json`);
        const data = await response.json();
        if (data.error) return alert('Erro ao obter dados do Last.fm: ' + data.message);

        collageDiv.innerHTML = '';
        ctx.clearRect(0, 0, canvas.width, canvas.height);

        const albums = data.topalbums.album;
        const uniqueAlbumKeys = new Set();
        const albumImages = [];
        const averageColors = [];

        for (const album of albums) {
            if (albumImages.length >= 6) break;

            const albumKey = `${album.artist.name} - ${album.name}`;
            if (uniqueAlbumKeys.has(albumKey)) continue;

            let imageUrl = album.image?.[3]?.['#text'];
            if (!imageUrl) {
                imageUrl = await fetchAlbumImageFromiTunes(album.artist.name, album.name);
            }
            if (!imageUrl) continue;

            const img = new Image();
            img.crossOrigin = "Anonymous";
            img.src = imageUrl;

            await new Promise(resolve => {
                img.onload = () => {
                    uniqueAlbumKeys.add(albumKey);
                    albumImages.push(img);
                    averageColors.push(getAverageColor(img));
                    resolve();
                };
                img.onerror = resolve;
            });
        }

        if (albumImages.length === 0) {
            alert('Nenhum álbum com imagem foi encontrado.');
            return;
        }

        // Fundo
        const backgroundCanvas = document.createElement('canvas');
        backgroundCanvas.width = 1080;
        backgroundCanvas.height = 1920;
        const bgCtx = backgroundCanvas.getContext('2d');
        averageColors.forEach(color => {
            const gradient = bgCtx.createLinearGradient(0, 0, 0, backgroundCanvas.height);
            gradient.addColorStop(0, color);
            gradient.addColorStop(0.5, `rgba(${Math.random()*255}, ${Math.random()*255}, ${Math.random()*255}, 0.5)`);
            gradient.addColorStop(1, 'rgba(50, 50, 50, 0.5)');
            bgCtx.fillStyle = gradient;
            bgCtx.fillRect(0, 0, backgroundCanvas.width, backgroundCanvas.height);
        });

        const blurredCanvas = document.createElement('canvas');
        blurredCanvas.width = canvas.width;
        blurredCanvas.height = canvas.height;
        const blurredCtx = blurredCanvas.getContext('2d');
        blurredCtx.drawImage(backgroundCanvas, 0, 0, blurredCanvas.width, blurredCanvas.height);
        blurredCtx.filter = 'blur(10px)';
        blurredCtx.drawImage(backgroundCanvas, 0, 0, blurredCanvas.width, blurredCanvas.height);

        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(blurredCanvas, 0, 0);

        const cols = 2, rows = 3;
        const imgWidth = 1100 / cols * 0.8;
        const imgHeight = 1600 / rows * 0.8;
        const totalWidth = imgWidth * cols;
        const totalHeight = imgHeight * rows;
        const xOffset = (canvas.width - totalWidth) / 2;
        const yOffset = (canvas.height - totalHeight) / 2 + 80;

        albumImages.forEach((img, index) => {
            const x = xOffset + (index % cols) * imgWidth;
            const y = yOffset + Math.floor(index / cols) * imgHeight;
            ctx.drawImage(img, x, y, imgWidth, imgHeight);
        });

        const averageColor = getAverageColor(blurredCanvas);
        const textColor = isColorDark(averageColor) ? 'white' : 'black';

        ctx.fillStyle = textColor;
        ctx.font = 'bold 48px "Roboto", sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText(`/${username}`, canvas.width / 2, 310);
        ctx.font = 'bold 28px "Roboto", sans-serif';
        ctx.fillText(periodText, canvas.width / 2, 350);

        ctx.font = '48px "Font Awesome 6 Brands"';
        ctx.fillText('\uf203', canvas.width / 2, 250);

        collageDiv.innerHTML = `<img src="${canvas.toDataURL('image/png')}" alt="Album Collage" />`;
        downloadBtn.href = canvas.toDataURL('image/png');
        downloadBtn.download = 'Colagem.png';
        downloadBtn.style.display = 'block';

    } catch (error) {
        console.error('Erro ao fazer a requisição:', error);
        alert('Erro ao obter dados do Last.fm.');
    }
});
