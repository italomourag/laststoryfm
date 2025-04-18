const apiKey = '3665028fedb6ae2920627f6a08e42a4b'; // Sua chave API
const canvas = document.getElementById('collageCanvas');
const ctx = canvas.getContext('2d');
const collageDiv = document.getElementById('collage');
const downloadBtn = document.getElementById('download');

function getTypeMethod(type) {
    const methodMap = {
        album: 'user.gettopalbums',
        artist: 'user.gettopartists'
    };

    return methodMap[type] ?? 'user.gettopartists';
}

function getTypeResponseType(type) {
    const typeMap = {
        album: 'album',
        artist: 'artist'
    };

    return typeMap[type] ?? 'artist';
}

// Cálculo médio de cor da imagem
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
    r = Math.floor(r / pixelCount);
    g = Math.floor(g / pixelCount);
    b = Math.floor(b / pixelCount);

    return `rgb(${r}, ${g}, ${b})`;
}

// Verificação se a cor é escura
function isColorDark(color) {
    if (color.startsWith('rgb')) {
        const rgb = color.match(/\d+/g).map(Number);
        const luminance = 0.2126 * rgb[0] + 0.7152 * rgb[1] + 0.0722 * rgb[2];
        return luminance < 128;
    }
    return false; // Retorna falso se não for RGB
}

// Gerar a colagem
document.getElementById('generate').addEventListener('click', () => {
    const username = document.getElementById('username').value;
    const period = document.getElementById('period').value;
    const type = document.getElementById('type').value;

    if (!username) {
        alert('Por favor, insira o nome do usuário do Last.fm.');
        return;
    }

    const periodText = {
        '7day': 'Mais ouvidos da semana',
        '1month': 'Mais ouvidos do mês',
        '12month': 'Mais ouvidos do ano',
        'overall': 'Mais ouvidos de todos os tempos'
    }[period];

    const typeMethod = getTypeMethod(type);
    console.log(`Método: ${typeMethod}, Usuário: ${username}, Período: ${period}`);

    fetch(`https://ws.audioscrobbler.com/2.0/?method=${typeMethod}&user=${username}&period=${period}&limit=6&api_key=${apiKey}&format=json`)
        .then(response => response.json())
        .then(async data => {
            if (data.error) {
                console.error('Erro na API:', data.message);
                alert('Erro ao obter dados do Last.fm: ' + data.message);
                return;
            }

            const responseKeyMap = {
                artist: ['topartists', 'artist'],
                album: ['topalbums', 'album']
            };

            const [mainKey, subKey] = responseKeyMap[type] ?? ['topartists', 'artist'];
            const dataTypeResponse = data[mainKey]?.[subKey];

            collageDiv.innerHTML = '';
            ctx.clearRect(0, 0, canvas.width, canvas.height);

            const typeImages = [];
            const averageColors = [];

            // Função auxiliar para carregar imagem
            const loadImage = (url) => {
                return new Promise((resolve) => {
                    const img = new Image();
                    img.crossOrigin = "Anonymous";
                    img.src = url;
                    img.onload = () => resolve(img);
                    img.onerror = () => resolve(null);
                });
            };

            let imagePromises = [];

            if (type === 'album') {
                imagePromises = dataTypeResponse.map(typeResponse => {
                    const imageUrl = typeResponse.image[3]['#text'];
                    return loadImage(imageUrl);
                });
            } else {
                imagePromises = dataTypeResponse.map(async typeResponse => {
                    const apiUrl = `http://3.133.145.248/artist-image.php?q=${encodeURIComponent(typeResponse.name)}`;
                    try {
                        const res = await fetch(apiUrl);
                        const imageData = await res.json();
                        const imageUrl = imageData.imagem || null;
                        if (imageUrl) return await loadImage(imageUrl);
                    } catch (e) {
                        return null;
                    }
                });
            }

            const resolvedImages = (await Promise.all(imagePromises)).filter(img => img !== null);
            resolvedImages.forEach(img => {
                typeImages.push(img);
                averageColors.push(getAverageColor(img));
            });

            const collageWidth = 1100;
            const collageHeight = 1600;
            const cols = 2;
            const rows = 3;
            const imgWidth = collageWidth / cols * 0.8;
            const imgHeight = collageHeight / rows * 0.8;

            const backgroundCanvas = document.createElement('canvas');
            backgroundCanvas.width = 1080;
            backgroundCanvas.height = 1920;
            const bgCtx = backgroundCanvas.getContext('2d');

            averageColors.forEach(color => {
                const gradient = bgCtx.createLinearGradient(0, 0, 0, backgroundCanvas.height);
                gradient.addColorStop(0, color);
                gradient.addColorStop(0.5, `rgba(${Math.floor(Math.random() * 255)}, ${Math.floor(Math.random() * 255)}, ${Math.floor(Math.random() * 255)}, 0.5)`);
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

            const totalWidth = imgWidth * cols;
            const totalHeight = imgHeight * rows;
            const xOffset = (canvas.width - totalWidth) / 2;
            const yOffset = (canvas.height - totalHeight) / 2 + 80;

            typeImages.forEach((img, index) => {
                const x = xOffset + (index % cols) * imgWidth;
                const y = yOffset + Math.floor(index / cols) * imgHeight;
                ctx.drawImage(img, x, y, imgWidth, imgHeight);
            });

            const averageColor = getAverageColor(blurredCanvas);
            const textColor = isColorDark(averageColor) ? 'white' : 'black';

            ctx.fillStyle = textColor;
            ctx.font = 'bold 48px Roboto';
            ctx.textAlign = 'center';

            ctx.fillText(`/${username}`, canvas.width / 2, 310);
            ctx.font = 'bold 28px "Roboto", sans-serif';
            ctx.fillText(periodText, canvas.width / 2, 350);

            function drawLastFmIcon() {
                const iconSize = 48;
                const iconX = canvas.width / 2;
                const iconY = 250;
                ctx.font = `${iconSize}px "Font Awesome 6 Brands"`;
                ctx.textAlign = 'center';
                ctx.fillText('\uf203', iconX, iconY);
            }
            drawLastFmIcon();

            collageDiv.innerHTML = `<img src="${canvas.toDataURL('image/png')}" alt="Album Collage" />`;

            downloadBtn.href = canvas.toDataURL('image/png');
            downloadBtn.download = 'Colagem.png';
            downloadBtn.style.display = 'block';
        })
        .catch(error => {
            console.error('Erro ao fazer a requisição:', error);
            alert('Erro ao obter dados do Last.fm.');
        });
});
