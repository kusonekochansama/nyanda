const { Engine, Render, Runner, World, Bodies, Events } = Matter;

const MAX_SCREEN_WIDTH = 540;
const INIT_SCREEN_HEIGHT = 960;
const ASPECT_RATIO = MAX_SCREEN_WIDTH / INIT_SCREEN_HEIGHT;
const BALL_TYPES = [
    { radius: 10, image: 'maru/001.png' },
    { radius: 20, image: 'maru/002.png' },
    { radius: 30, image: 'maru/003.png' },
    { radius: 40, image: 'maru/004.png' },
    { radius: 50, image: 'maru/005.png' },
    { radius: 60, image: 'maru/006.png' },
    { radius: 70, image: 'maru/007.png' },
    { radius: 80, image: 'maru/008.png' },
    { radius: 90, image: 'maru/009.png' },
    { radius: 100, image: 'maru/010.png' }
];

let balls = [];
let score = 0;
let comboCount = 0;
const COMBO_BONUS = [1, 1, 2, 3, 4, 5];
let nextBallType = BALL_TYPES[0];
let highScores = JSON.parse(localStorage.getItem('highScores')) || [];
let backgroundImg = null;
let gameOverBackgroundImg = null;
let scoreImages = {};
let lastBallTime = 0;
let isGameOver = false;
let comboSounds = {};
let startTime = null;
let elapsedTime = 0;

let bgmAudio = null;
let isBgmPlayed = false; // BGMが再生されたかどうかを追跡

const canvas = document.getElementById('gameCanvas');
const engine = Engine.create();
const world = engine.world;
const render = Render.create({
    canvas: canvas,
    engine: engine,
    options: {
        width: window.innerWidth > MAX_SCREEN_WIDTH ? MAX_SCREEN_WIDTH : window.innerWidth,
        height: window.innerWidth > MAX_SCREEN_WIDTH ? (window.innerHeight / window.innerWidth) * MAX_SCREEN_WIDTH : window.innerHeight,
        wireframes: false,
        background: 'transparent'
    }
});

Render.run(render);
const runner = Runner.create();
Runner.run(runner, engine);

const log = (...messages) => {
    console.log(...messages);
};

const resizeCanvas = () => {
    const screenWidth = window.innerWidth > MAX_SCREEN_WIDTH ? MAX_SCREEN_WIDTH : window.innerWidth;
    const screenHeight = screenWidth / ASPECT_RATIO;
    canvas.width = screenWidth;
    canvas.height = screenHeight;
    const ctx = canvas.getContext('2d');
    drawBackground(ctx, isGameOver ? gameOverBackgroundImg : backgroundImg);
    log('Canvas resized', screenWidth, screenHeight);
};

window.addEventListener('resize', resizeCanvas);

const loadImage = (src) => {
    return new Promise((resolve, reject) => {
        const img = new Image();
        img.src = src;
        img.onload = () => {
            log(`Image loaded: ${src}`);
            resolve(img);
        };
        img.onerror = (err) => {
            log(`Failed to load image at ${src}: ${err.message}`);
            reject(new Error(`Failed to load image at ${src}: ${err.message}`));
        };
    });
};

const loadAudio = (src) => {
    return new Promise((resolve, reject) => {
        const audio = new Audio(src);
        audio.oncanplaythrough = () => resolve(audio);
        audio.onerror = (err) => reject(new Error(`Failed to load audio at ${src}: ${err.message}`));
    });
};

const ballImages = {};
Promise.all(BALL_TYPES.map(type => loadImage(type.image)))
    .then(images => {
        images.forEach((img, index) => {
            ballImages[BALL_TYPES[index].radius] = img;
        });
    })
    .catch(err => {
        log("Failed to load images:", err);
    });

for (let i = 0; i <= 9; i++) {
    const filename = `count/${i.toString().padStart(2, '0')}.png`;
    loadImage(filename)
        .then(img => {
            scoreImages[i] = img;
        })
        .catch(err => {
            log(`Failed to load score image at ${filename}: ${err.message}`);
        });
}

Promise.all([
    loadAudio('sound/001.mp3').then(audio => { comboSounds[1] = audio; }),
    loadAudio('sound/002.mp3').then(audio => { comboSounds[2] = audio; }),
    loadAudio('sound/003.mp3').then(audio => { comboSounds[3] = audio; }),
    loadAudio('sound/004.mp3').then(audio => { comboSounds[4] = audio; }),
    loadAudio('sound/005.mp3').then(audio => { comboSounds[5] = audio; }),
    loadAudio('sound/000.mp3').then(audio => { bgmAudio = audio; bgmAudio.volume = 0.2; }) // BGMのロードとデフォルト音量の設定
]).catch(err => {
    log(err);
});

const createBall = (x, y, radius, image) => {
    const ball = Bodies.circle(x, y, radius, {
        render: {
            sprite: {
                texture: image.src,
                xScale: (radius * 2) / image.width,
                yScale: (radius * 2) / image.height
            }
        },
        restitution: 0.5,
        friction: 0.5
    });
    World.add(world, ball);
    log('Ball created', { x, y, radius });
    return ball;
};

const increaseScore = (amount, combo) => {
    score += amount * COMBO_BONUS[Math.min(combo, COMBO_BONUS.length - 1)];
    log('Score increased:', score);
};

const resetCombo = () => {
    comboCount = 0;
    log('Combo reset');
};

const handleCollision = (event) => {
    const pairs = event.pairs;
    pairs.forEach(pair => {
        const { bodyA, bodyB } = pair;
        if (bodyA.circleRadius === bodyB.circleRadius) {
            const index = BALL_TYPES.findIndex(type => type.radius === bodyA.circleRadius);
            if (index >= 0 && index < BALL_TYPES.length - 1) {
                World.remove(world, bodyA);
                World.remove(world, bodyB);
                balls = balls.filter(ball => ball !== bodyA && ball !== bodyB);
                comboCount += 1;
                increaseScore(bodyA.circleRadius, comboCount);
                const newBallType = BALL_TYPES[index + 1];
                const newBall = createBall(bodyA.position.x, bodyA.position.y, newBallType.radius, ballImages[newBallType.radius]);
                balls.push(newBall);
                const comboSound = comboSounds[Math.min(comboCount, 5)];
                if (comboSound) {
                    comboSound.play();
                }
                log('Balls merged and new ball created', { radius: newBallType.radius });
            } else {
                World.remove(world, bodyA);
                World.remove(world, bodyB);
                balls = balls.filter(ball => ball !== bodyA && ball !== bodyB);
                comboCount += 1;
                increaseScore(100, comboCount);
                const comboSound = comboSounds[Math.min(comboCount, 5)];
                if (comboSound) {
                    comboSound.play();
                }
                log('Balls removed, no merge possible');
            }
        }
    });
};

Events.on(engine, 'collisionStart', handleCollision);

const resetGame = () => {
    World.clear(world);
    Engine.clear(engine);
    balls = [];
    score = 0;
    comboCount = 0;
    lastBallTime = 0;
    isGameOver = false;
    startTime = Date.now();
    elapsedTime = 0;
    isBgmPlayed = false; // BGMフラグをリセット
    log('Game reset');

    const floor = Bodies.rectangle(MAX_SCREEN_WIDTH / 2, INIT_SCREEN_HEIGHT - 25, MAX_SCREEN_WIDTH, 50, { isStatic: true });
    const wallLeft = Bodies.rectangle(-25, INIT_SCREEN_HEIGHT / 2, 50, INIT_SCREEN_HEIGHT, { isStatic: true });
    const wallRight = Bodies.rectangle(MAX_SCREEN_WIDTH + 25, INIT_SCREEN_HEIGHT / 2, 50, INIT_SCREEN_HEIGHT, { isStatic: true });
    World.add(world, [floor, wallLeft, wallRight]);

    nextBallType = BALL_TYPES[0];
    log('Walls and floor created');

    if (bgmAudio) {
        bgmAudio.currentTime = 0;
        bgmAudio.volume = 0.2; // デフォルトの音量を設定
        bgmAudio.loop = true;
    }
};

const playBGM = () => {
    if (bgmAudio && !isBgmPlayed) {
        bgmAudio.play();
        isBgmPlayed = true;
    }
};

const drawBackground = (ctx, img) => {
    if (img) {
        log('Drawing background');
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
    } else {
        log('Background image not loaded');
    }
};

const formatTime = (milliseconds) => {
    const totalSeconds = Math.floor(milliseconds / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
};

const drawTime = (ctx, time) => {
    const x = canvas.width / 2;
    const y = 30;
    ctx.fillStyle = 'white';
    ctx.font = '24px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(`Time: ${formatTime(time)}`, x, y);
    log('Time drawn:', formatTime(time));
};

const getCanvasMousePosition = (event) => {
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    const x = (event.clientX - rect.left) * scaleX;
    const y = (event.clientY - rect.top) * scaleY;
    return { x, y };
};

document.addEventListener('mousedown', (event) => {
    playBGM();
    if (isGameOver) return;
    const currentTime = Date.now();
    if (currentTime - lastBallTime >= 1000) {
        const { x } = getCanvasMousePosition(event);
        if (ballImages[nextBallType.radius]) {
            const newBall = createBall(x, 50, nextBallType.radius, ballImages[nextBallType.radius]);
            balls.push(newBall);
            nextBallType = BALL_TYPES[Math.floor(Math.random() * BALL_TYPES.length)];
            comboCount = 0;
            lastBallTime = currentTime;
            log('New ball created on mouse click');
        }
    }
});

document.addEventListener('keydown', (event) => {
    playBGM();
    if (event.code === 'Space') {
        resetGame();
        runner.enabled = true;
        isGameOver = false;
        requestAnimationFrame(mainLoop);
        log('Game restarted');
    }
    if (event.code === 'Enter') {
        gameOver();
    }
});

const drawScore = (ctx, score, x, y) => {
    const scoreStr = score.toString();
    for (let char of scoreStr) {
        const digit = parseInt(char);
        const img = scoreImages[digit];
        if (img) {
            ctx.drawImage(img, x, y, img.width, img.height);
            x += img.width + 5;
        }
    }
    log('Score drawn:', score);
};

const drawHighScores = (ctx, scores, x, y) => {
    ctx.fillStyle = 'black';
    ctx.font = '24px sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText('スコアランキング', x, y);
    scores.slice(0, 3).forEach((score, index) => {
        ctx.fillText(`${index + 1}. ${Math.floor(score)}`, x, y + 30 + index * 30); // 小数点以下を切り捨て
    });
    log('High scores drawn:', scores);
};

const drawNextBall = (ctx) => {
    if (ballImages[nextBallType.radius]) {
        const radius = nextBallType.radius;
        const x = canvas.width - radius;
        const y = 100;
        const img = ballImages[nextBallType.radius];
        ctx.drawImage(img, x - radius, y - radius, radius * 2, radius * 2);
        log('Next ball drawn:', nextBallType.radius);
    }
};

const saveHighScore = (score) => {
    highScores.push(score);
    highScores.sort((a, b) => b - a);
    highScores = highScores.slice(0, 10);
    localStorage.setItem('highScores', JSON.stringify(highScores));
    log('High scores saved:', highScores);
};

const drawRestartButtonArea = (ctx) => {
    const areaHeight = 150;
    const areaY = canvas.height - 200;
    ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
    ctx.fillRect(0, areaY, canvas.width, areaHeight);
    log('Restart area drawn');

    canvas.addEventListener('click', handleRestartClick);
};

const handleRestartClick = (event) => {
    if (!isGameOver) return;

    const rect = canvas.getBoundingClientRect();
    const clickY = event.clientY - rect.top;
    const areaHeight = 150;
    const areaY = canvas.height - 200;

    if (clickY >= areaY && clickY <= areaY + areaHeight) {
        resetGame();
        runner.enabled = true;
        isGameOver = false;
        requestAnimationFrame(mainLoop);
        log('Game restarted by clicking restart area');
        canvas.removeEventListener('click', handleRestartClick);
    }
};

const drawFinalScore = (ctx, score) => {
    const x = canvas.width / 2;
    const y = canvas.height / 2;
    const scoreStr = score.toString();
    let totalWidth = 0;

    // 各数字の幅を合計してスコア全体の幅を計算
    for (let char of scoreStr) {
        const digit = parseInt(char);
        const img = scoreImages[digit];
        if (img) {
            totalWidth += img.width + 5; // 画像の幅と間隔を合計
        }
    }

    let startX = x - totalWidth / 2; // 中央揃えのための開始位置

    for (let char of scoreStr) {
        const digit = parseInt(char);
        const img = scoreImages[digit];
        if (img) {
            ctx.drawImage(img, startX, y - img.height / 2, img.width, img.height);
            startX += img.width + 5; // 次の数字の位置を調整
        }
    }
    log('Final score drawn:', score);
};

const fadeOutAudio = (audio, duration) => {
    const step = audio.volume / (duration / 100);
    const fade = setInterval(() => {
        if (audio.volume > step) {
            audio.volume -= step;
        } else {
            audio.volume = 0;
            audio.pause();
            clearInterval(fade);
        }
    }, 100);
};

const gameOver = () => {
    if (isGameOver) return;
    isGameOver = true;
    runner.enabled = false;
    elapsedTime = Date.now() - startTime;

    saveHighScore(score);

    const ctx = canvas.getContext('2d');
    drawBackground(ctx, gameOverBackgroundImg); // まず背景を描画
    drawRestartButtonArea(ctx); // リスタートボタンを描画

    if (bgmAudio) {
        fadeOutAudio(bgmAudio, 2000); // BGMを2秒でフェードアウト
    }

    log('Game over');
};

const mainLoop = () => {
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    drawBackground(ctx, isGameOver ? gameOverBackgroundImg : backgroundImg);

    if (!isGameOver) {
        const scaleX = canvas.width / MAX_SCREEN_WIDTH;
        const scaleY = canvas.height / INIT_SCREEN_HEIGHT;

        balls.forEach(ball => {
            const posX = ball.position.x * scaleX;
            const posY = ball.position.y * scaleY;
            const radius = ball.circleRadius * scaleX;
            const img = ballImages[ball.circleRadius];
            if (img) {
                ctx.save();
                ctx.translate(posX, posY);
                ctx.rotate(ball.angle);
                ctx.drawImage(img, -radius, -radius, radius * 2, radius * 2);
                ctx.restore();
            }
        });

        drawScore(ctx, score, 10, 15);

        const currentTime = Date.now();
        const timeElapsed = currentTime - startTime;
        drawTime(ctx, timeElapsed);

        drawHighScores(ctx, highScores, 10, 70);

        drawNextBall(ctx);

        if (timeElapsed >= 60000) {
            gameOver();
        }
    } else {
        drawFinalScore(ctx, score); // ゲームオーバー時にスコアを描画
    }

    requestAnimationFrame(mainLoop);
    log('Main loop running');
};

canvas.setAttribute('tabindex', 0);
canvas.focus();

Promise.all([
    loadImage('bg/0001.jpg').then(img => { backgroundImg = img; }),
    loadImage('bg/0002.jpg').then(img => { gameOverBackgroundImg = img; }).catch(err => log(`Error loading game over background image: ${err.message}`))
]).then(() => {
    return Promise.all(BALL_TYPES.map(type => loadImage(type.image)));
}).then(images => {
    images.forEach((img, index) => {
        ballImages[BALL_TYPES[index].radius] = img;
    });
    resetGame();
    resizeCanvas();
    requestAnimationFrame(mainLoop);
    log('Game started');
}).catch(err => {
    log(`Error loading images: ${err.message}`);
});
