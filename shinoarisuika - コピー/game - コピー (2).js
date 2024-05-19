const { Engine, Render, Runner, World, Bodies, Body, Events } = Matter;

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
let highScores = [];
let backgroundImg = null; // 背景画像
let scoreImages = {}; // スコア数字の画像
let lastBallTime = 0; // ボールが最後に出現した時刻
let remainingTime = 100; // 残り時間（秒）

let comboSounds = {}; // コンボ効果音

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
        background: 'transparent' // 背景を透明に設定
    }
});

Render.run(render);
const runner = Runner.create();
Runner.run(runner, engine);

const resizeCanvas = () => {
    const screenWidth = window.innerWidth > MAX_SCREEN_WIDTH ? MAX_SCREEN_WIDTH : window.innerWidth;
    const screenHeight = screenWidth / ASPECT_RATIO;
    canvas.width = screenWidth;
    canvas.height = screenHeight;
    if (backgroundImg) {
        drawBackground(canvas.getContext('2d'));
    }
};

window.addEventListener('resize', resizeCanvas);

const loadImage = (src) => {
    return new Promise((resolve, reject) => {
        const img = new Image();
        img.src = src;
        img.onload = () => resolve(img);
        img.onerror = (err) => {
            console.error(`Failed to load image at ${src}: ${err.message}`);
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
        console.error("Failed to load images:", err);
    });

// スコア画像のロード
for (let i = 0; i <= 9; i++) {
    const filename = `count/${i.toString().padStart(2, '0')}.png`;
    loadImage(filename)
        .then(img => {
            scoreImages[i] = img;
        })
        .catch(err => {
            console.error(`Failed to load score image at ${filename}: ${err.message}`);
        });
}

// 効果音のロード
Promise.all([
    loadAudio('sound/001.mp3').then(audio => { comboSounds[1] = audio; }),
    loadAudio('sound/002.mp3').then(audio => { comboSounds[2] = audio; }),
    loadAudio('sound/003.mp3').then(audio => { comboSounds[3] = audio; }),
    loadAudio('sound/004.mp3').then(audio => { comboSounds[4] = audio; }),
    loadAudio('sound/005.mp3').then(audio => { comboSounds[5] = audio; })
]).catch(err => {
    console.error(err);
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
    return ball;
};

const increaseScore = (amount, combo) => {
    score += amount * COMBO_BONUS[Math.min(combo, COMBO_BONUS.length - 1)];
    console.log("Score increased:", score);
};

const resetCombo = () => {
    comboCount = 0;
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
                // 効果音を再生
                const comboSound = comboSounds[Math.min(comboCount, 5)];
                if (comboSound) {
                    comboSound.play();
                }
            } else {
                World.remove(world, bodyA);
                World.remove(world, bodyB);
                balls = balls.filter(ball => ball !== bodyA && ball !== bodyB);
                comboCount += 1;
                increaseScore(100, comboCount);
                // 効果音を再生
                const comboSound = comboSounds[Math.min(comboCount, 5)];
                if (comboSound) {
                    comboSound.play();
                }
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
    lastBallTime = 0; // ボールが最後に出現した時刻をリセット
    remainingTime = 100; // 残り時間をリセット

    const floor = Bodies.rectangle(MAX_SCREEN_WIDTH / 2, INIT_SCREEN_HEIGHT - 25, MAX_SCREEN_WIDTH, 50, { isStatic: true });
    const wallLeft = Bodies.rectangle(0, INIT_SCREEN_HEIGHT / 2, 50, INIT_SCREEN_HEIGHT, { isStatic: true });
    const wallRight = Bodies.rectangle(MAX_SCREEN_WIDTH, INIT_SCREEN_HEIGHT / 2, 50, INIT_SCREEN_HEIGHT, { isStatic: true });
    World.add(world, [floor, wallLeft, wallRight]);

    nextBallType = BALL_TYPES[0];
};

const drawBackground = (ctx) => {
    if (backgroundImg) {
        ctx.drawImage(backgroundImg, 0, 0, canvas.width, canvas.height);
    }
};

document.addEventListener('mousedown', (event) => {
    const currentTime = Date.now();
    if (currentTime - lastBallTime >= 1000) { // 1秒以上経過しているか確認
        const x = event.clientX;
        const newBall = createBall(x, 50, nextBallType.radius, ballImages[nextBallType.radius]);
        balls.push(newBall);
        nextBallType = BALL_TYPES[Math.floor(Math.random() * BALL_TYPES.length)];
        comboCount = 0;
        lastBallTime = currentTime; // 最後にボールを出現させた時刻を更新
    }
});

const drawScore = (ctx, score, x, y) => {
    const scoreStr = score.toString();
    for (let char of scoreStr) {
        const digit = parseInt(char);
        const img = scoreImages[digit];
        if (img) {
            ctx.drawImage(img, x, y, img.width, img.height);
            x += img.width + 5; // 次の数字の位置を調整
        }
    }
};

const drawTime = (ctx, time, x, y) => {
    const timeStr = time.toString();
    for (let char of timeStr) {
        const digit = parseInt(char);
        const img = scoreImages[digit];
        if (img) {
            ctx.drawImage(img, x, y, img.width, img.height);
            x += img.width + 5; // 次の数字の位置を調整
        }
    }
};

const drawHighScores = (ctx, scores) => {
    ctx.fillStyle = 'black';
    ctx.font = '36px sans-serif';
    ctx.fillText('High Scores:', 10, 100);
    scores.forEach((score, index) => {
        ctx.fillText(`${index + 1}. ${Math.floor(score)}`, 10, 150 + index * 40);
    });
};

const drawNextBall = (ctx) => {
    if (ballImages[nextBallType.radius]) {
        const x = 450; // 次のボールの位置（調整可能）
        const y = 100; // 次のボールの位置（調整可能）
        const radius = nextBallType.radius;
        const img = ballImages[nextBallType.radius];
        ctx.drawImage(img, x - radius, y - radius, radius * 2, radius * 2); // 次のボールを描画
    }
};

const gameOver = () => {
    runner.enabled = false;
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    drawBackground(ctx);
    ctx.fillStyle = 'rgba(255, 255, 255, 0.7)';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    drawScore(ctx, score, (canvas.width - scoreImages[0].width * score.toString().length) / 2, canvas.height / 2 - scoreImages[0].height / 2);
    highScores.push(score);
    highScores = highScores.sort((a, b) => b - a).slice(0, 3);
    drawHighScores(ctx, highScores);
};

let timer;
let startTime;

const startTimer = () => {
    startTime = Date.now();
    timer = setTimeout(gameOver, 100000); // 100秒後にgameOverを呼び出す
};

const mainLoop = () => {
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    drawBackground(ctx);

    // 座標変換のスケーリング係数を計算
    const scaleX = canvas.width / MAX_SCREEN_WIDTH;
    const scaleY = canvas.height / INIT_SCREEN_HEIGHT;

    // ボールを描画
    balls.forEach(ball => {
        const posX = ball.position.x * scaleX;
        const posY = ball.position.y * scaleY;
        const radius = ball.circleRadius * scaleX; // スケールを適用
        const img = ballImages[ball.circleRadius];
        if (img) {
            ctx.save();
            ctx.translate(posX, posY);
            ctx.rotate(ball.angle); // ボールの回転角度を適用
            ctx.drawImage(img, -radius, -radius, radius * 2, radius * 2);
            ctx.restore();
        }
    });

    // スコアを左上に描画
    drawScore(ctx, score, 10, 15);

    // 残り時間を右上に描画
    drawTime(ctx, remainingTime, canvas.width - 100, 15);

    // 次に出現するボールを描画
    drawNextBall(ctx);

    if (runner.enabled) {
        requestAnimationFrame(mainLoop);
    }
};

document.addEventListener('keydown', (event) => {
    if (event.code === 'Space') {
        resetGame();
        runner.enabled = true;
        startTimer();
        requestAnimationFrame(mainLoop);
    }
});

canvas.setAttribute('tabindex', 0);
canvas.focus();

Promise.all([
    loadImage('bg/0001.jpg').then(img => { backgroundImg = img; })
]).then(() => {
    resetGame();
    resizeCanvas(); // 初期のキャンバスサイズ設定を追加
    requestAnimationFrame(mainLoop); // ゲームループの開始をここで行う
}).catch(err => {
    console.error(err);
});
