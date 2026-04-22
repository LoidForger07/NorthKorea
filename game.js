// Game Constants
const CANVAS_WIDTH = 800;
const CANVAS_HEIGHT = 600;
const GRAVITY = 0.5;
const PLAYER_SPEED = 5;
const JUMP_STRENGTH = -12;

// Device detection
const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);

// Audio Context
let audioContext = null;

function getAudioContext() {
    if (!audioContext) {
        audioContext = new (window.AudioContext || window.webkitAudioContext)();
    }
    return audioContext;
}

// Sound Effects
function playSound(frequency, duration, type = 'sine', volume = 0.3) {
    try {
        const ctx = getAudioContext();
        const oscillator = ctx.createOscillator();
        const gainNode = ctx.createGain();
        
        oscillator.connect(gainNode);
        gainNode.connect(ctx.destination);
        
        oscillator.frequency.value = frequency;
        oscillator.type = type;
        
        gainNode.gain.setValueAtTime(volume, ctx.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + duration);
        
        oscillator.start(ctx.currentTime);
        oscillator.stop(ctx.currentTime + duration);
    } catch (e) {
        console.log('Audio not available');
    }
}

function jumpSound() {
    playSound(400, 0.1, 'sine', 0.3);
    playSound(600, 0.05, 'sine', 0.2);
}

function coinSound() {
    playSound(800, 0.1, 'sine', 0.3);
    playSound(1000, 0.1, 'sine', 0.3);
}

function hitSound() {
    playSound(200, 0.2, 'square', 0.4);
    playSound(150, 0.15, 'square', 0.3);
}

function levelCompleteSound() {
    const notes = [262, 294, 330, 392]; // C, D, E, G
    notes.forEach((freq, i) => {
        setTimeout(() => playSound(freq, 0.2, 'sine', 0.3), i * 150);
    });
}

function gameOverSound() {
    playSound(400, 0.3, 'sine', 0.4);
    setTimeout(() => playSound(300, 0.3, 'sine', 0.4), 150);
    setTimeout(() => playSound(200, 0.5, 'sine', 0.4), 300);
}

// Game States
const GAME_STATES = {
    MENU: 'menu',
    PLAYING: 'playing',
    GAME_OVER: 'gameOver'
};

// Classes
class Player {
    constructor(x, y) {
        this.x = x;
        this.y = y;
        this.width = 30;
        this.height = 40;
        this.velocityX = 0;
        this.velocityY = 0;
        this.jumping = false;
        this.color = '#FF6B6B';
    }

    update(keys) {
        // Horizontal movement
        this.velocityX = 0;
        if (keys['ArrowLeft'] || keys['a']) this.velocityX = -PLAYER_SPEED;
        if (keys['ArrowRight'] || keys['d']) this.velocityX = PLAYER_SPEED;

        // Apply velocity
        this.x += this.velocityX;
        
        // Gravity
        this.velocityY += GRAVITY;
        this.y += this.velocityY;

        // Boundary checking
        if (this.x < 0) this.x = 0;
        if (this.x + this.width > CANVAS_WIDTH) this.x = CANVAS_WIDTH - this.width;

        // Fall off the bottom
        if (this.y > CANVAS_HEIGHT) {
            return false; // Player died
        }

        return true;
    }

    jump() {
        if (!this.jumping) {
            this.velocityY = JUMP_STRENGTH;
            this.jumping = true;
            jumpSound();
        }
    }

    collidesWith(rect) {
        return this.x < rect.x + rect.width &&
               this.x + this.width > rect.x &&
               this.y < rect.y + rect.height &&
               this.y + this.height > rect.y;
    }

    draw(ctx) {
        ctx.fillStyle = this.color;
        ctx.fillRect(this.x, this.y, this.width, this.height);
        // Draw eyes
        ctx.fillStyle = 'white';
        ctx.fillRect(this.x + 8, this.y + 10, 6, 6);
        ctx.fillRect(this.x + 16, this.y + 10, 6, 6);
    }
}

class Platform {
    constructor(x, y, width, height, type = 'normal') {
        this.x = x;
        this.y = y;
        this.width = width;
        this.height = height;
        this.type = type; // 'normal' or 'moving'
        this.color = type === 'moving' ? '#FFD93D' : '#4CAF50';
        this.moveDirection = 1;
        this.moveSpeed = 2;
        this.moveRange = 100;
        this.startX = x;
    }

    update() {
        if (this.type === 'moving') {
            this.x += this.moveSpeed * this.moveDirection;
            if (Math.abs(this.x - this.startX) > this.moveRange) {
                this.moveDirection *= -1;
            }
        }
    }

    draw(ctx) {
        ctx.fillStyle = this.color;
        ctx.fillRect(this.x, this.y, this.width, this.height);
        ctx.strokeStyle = '#333';
        ctx.lineWidth = 2;
        ctx.strokeRect(this.x, this.y, this.width, this.height);
    }
}

class Coin {
    constructor(x, y) {
        this.x = x;
        this.y = y;
        this.width = 15;
        this.height = 15;
        this.collected = false;
        this.rotation = 0;
    }

    update() {
        this.rotation += 0.1;
    }

    draw(ctx) {
        if (this.collected) return;
        
        ctx.save();
        ctx.translate(this.x + this.width / 2, this.y + this.height / 2);
        ctx.rotate(this.rotation);
        ctx.fillStyle = '#FFD700';
        ctx.fillRect(-this.width / 2, -this.height / 2, this.width, this.height);
        ctx.strokeStyle = '#FFA500';
        ctx.lineWidth = 2;
        ctx.strokeRect(-this.width / 2, -this.height / 2, this.width, this.height);
        ctx.restore();
    }
}

class Enemy {
    constructor(x, y, width = 30, height = 30) {
        this.x = x;
        this.y = y;
        this.width = width;
        this.height = height;
        this.velocityX = -2;
        this.color = '#FF1493';
        this.moveRange = 150;
        this.startX = x;
    }

    update() {
        this.x += this.velocityX;
        if (Math.abs(this.x - this.startX) > this.moveRange) {
            this.velocityX *= -1;
        }
    }

    draw(ctx) {
        ctx.fillStyle = this.color;
        ctx.fillRect(this.x, this.y, this.width, this.height);
        // Draw angry eyes
        ctx.fillStyle = 'white';
        ctx.fillRect(this.x + 6, this.y + 8, 6, 6);
        ctx.fillRect(this.x + 18, this.y + 8, 6, 6);
        ctx.fillStyle = 'black';
        ctx.fillRect(this.x + 8, this.y + 9, 3, 3);
        ctx.fillRect(this.x + 20, this.y + 9, 3, 3);
    }
}

// Game Class
class Game {
    constructor() {
        this.canvas = document.getElementById('game-canvas');
        this.ctx = this.canvas.getContext('2d');
        this.gameState = GAME_STATES.MENU;
        this.level = 1;
        this.score = 0;
        this.lives = 10;
        this.keys = {};
        this.player = null;
        this.platforms = [];
        this.coins = [];
        this.enemies = [];

        this.setupEventListeners();
        this.createLevel();
    }

    setupEventListeners() {
        window.addEventListener('keydown', (e) => {
            this.keys[e.key] = true;
            if (e.key === ' ') {
                e.preventDefault();
                this.player?.jump();
            }
        });

        window.addEventListener('keyup', (e) => {
            this.keys[e.key] = false;
        });

        // Check orientation on load and when device rotates
        this.checkOrientation();
        window.addEventListener('orientationchange', () => this.checkOrientation());
        window.addEventListener('resize', () => this.checkOrientation());

        // Mobile controls
        if (isMobile) {
            this.setupMobileControls();
        } else {
            document.getElementById('left-btn').style.display = 'none';
            document.getElementById('right-btn').style.display = 'none';
            document.getElementById('jump-btn').style.display = 'none';
        }

        document.getElementById('start-btn').addEventListener('click', () => this.start());
        document.getElementById('restart-btn').addEventListener('click', () => this.restart());
        document.getElementById('play-again-btn').addEventListener('click', () => this.restart());
    }

    checkOrientation() {
        const hint = document.getElementById('orientation-hint');
        const isPortrait = window.innerHeight > window.innerWidth;
        
        if (isMobile && isPortrait) {
            hint.classList.remove('hidden');
        } else {
            hint.classList.add('hidden');
        }
    }

    setupMobileControls() {
        const leftBtn = document.getElementById('left-btn');
        const rightBtn = document.getElementById('right-btn');
        const jumpBtn = document.getElementById('jump-btn');

        // Left button
        leftBtn.addEventListener('touchstart', (e) => {
            e.preventDefault();
            this.keys['ArrowLeft'] = true;
        });
        leftBtn.addEventListener('touchend', (e) => {
            e.preventDefault();
            this.keys['ArrowLeft'] = false;
        });
        leftBtn.addEventListener('mousedown', () => {
            this.keys['ArrowLeft'] = true;
        });
        leftBtn.addEventListener('mouseup', () => {
            this.keys['ArrowLeft'] = false;
        });
        leftBtn.addEventListener('mouseleave', () => {
            this.keys['ArrowLeft'] = false;
        });

        // Right button
        rightBtn.addEventListener('touchstart', (e) => {
            e.preventDefault();
            this.keys['ArrowRight'] = true;
        });
        rightBtn.addEventListener('touchend', (e) => {
            e.preventDefault();
            this.keys['ArrowRight'] = false;
        });
        rightBtn.addEventListener('mousedown', () => {
            this.keys['ArrowRight'] = true;
        });
        rightBtn.addEventListener('mouseup', () => {
            this.keys['ArrowRight'] = false;
        });
        rightBtn.addEventListener('mouseleave', () => {
            this.keys['ArrowRight'] = false;
        });

        // Jump button
        jumpBtn.addEventListener('touchstart', (e) => {
            e.preventDefault();
            this.player?.jump();
        });
        jumpBtn.addEventListener('click', () => {
            this.player?.jump();
        });
    }

    createLevel() {
        this.platforms = [];
        this.coins = [];
        this.enemies = [];
        this.player = new Player(100, 450);

        if (this.level === 1) {
            // Level 1 - Easy
            this.platforms.push(new Platform(0, 550, 800, 50));
            this.platforms.push(new Platform(150, 450, 150, 20));
            this.platforms.push(new Platform(450, 400, 150, 20));
            this.platforms.push(new Platform(100, 300, 150, 20, 'moving'));
            this.platforms.push(new Platform(500, 250, 150, 20));
            this.platforms.push(new Platform(250, 150, 150, 20));

            this.coins.push(new Coin(200, 420));
            this.coins.push(new Coin(500, 370));
            this.coins.push(new Coin(150, 270));
            this.coins.push(new Coin(550, 220));
            this.coins.push(new Coin(320, 120));

            this.enemies.push(new Enemy(300, 430, 30, 30));
            this.enemies.push(new Enemy(600, 380, 30, 30));
        } else if (this.level === 2) {
            // Level 2 - Medium
            this.platforms.push(new Platform(0, 550, 800, 50));
            this.platforms.push(new Platform(100, 450, 100, 20));
            this.platforms.push(new Platform(300, 400, 100, 20, 'moving'));
            this.platforms.push(new Platform(550, 400, 100, 20, 'moving'));
            this.platforms.push(new Platform(150, 300, 100, 20));
            this.platforms.push(new Platform(450, 300, 100, 20));
            this.platforms.push(new Platform(300, 200, 100, 20, 'moving'));
            this.platforms.push(new Platform(200, 100, 150, 20));

            for (let i = 0; i < 7; i++) {
                this.coins.push(new Coin(Math.random() * 700 + 50, Math.random() * 400 + 100));
            }

            this.enemies.push(new Enemy(200, 430, 30, 30));
            this.enemies.push(new Enemy(400, 380, 30, 30));
            this.enemies.push(new Enemy(600, 330, 30, 30));
        } else {
            // Levels 3-30 - Procedurally generated with increasing difficulty
            this.generateDynamicLevel();
        }
    }

    generateDynamicLevel() {
        const levelDifficulty = Math.min(this.level, 20); // Cap at level 30
        const difficultyMultiplier = (levelDifficulty - 2) / 28; // 0 to 1 for levels 3-30

        // Ground platform
        this.platforms.push(new Platform(0, 550, 800, 50));

        // Generate platforms - more and smaller with higher difficulty
        const platformCount = 5 + Math.floor(difficultyMultiplier * 5);
        const baseHeight = 450;
        const heightStep = 80;

        for (let i = 0; i < platformCount; i++) {
            const y = baseHeight - (i * heightStep);
            if (y < 50) break;

            const platformWidth = 150 - Math.floor(difficultyMultiplier * 50);
            const x = Math.random() * (800 - platformWidth);
            const isMoving = Math.random() < (0.2 + difficultyMultiplier * 0.5);

            this.platforms.push(new Platform(x, y, platformWidth, 20, isMoving ? 'moving' : 'normal'));
        }

        // Generate coins - more coins, higher up
        const coinCount = 5 + Math.floor(difficultyMultiplier * 8);
        for (let i = 0; i < coinCount; i++) {
            const x = Math.random() * 750 + 25;
            const y = Math.random() * 400 + 100;
            this.coins.push(new Coin(x, y));
        }

        // Generate enemies - more enemies, slightly faster
        const enemyCount = 2 + Math.floor(difficultyMultiplier * 6);
        for (let i = 0; i < enemyCount; i++) {
            const x = Math.random() * 700 + 50;
            const y = Math.random() * 350 + 200;
            const enemy = new Enemy(x, y, 30, 30);
            enemy.moveSpeed = 2 + difficultyMultiplier * 2;
            this.enemies.push(enemy);
        }
    }

    start() {
        this.gameState = GAME_STATES.PLAYING;
        document.getElementById('menu').classList.add('hidden');
        document.getElementById('ui').style.display = 'flex';
        if (isMobile) {
            document.getElementById('mobile-controls').classList.remove('hidden');
        }
    }

    restart() {
        this.level = 1;
        this.score = 0;
        this.lives = 15;
        this.createLevel();
        this.gameState = GAME_STATES.PLAYING;
        document.getElementById('game-over').classList.add('hidden');
        document.getElementById('victory').classList.add('hidden');
        document.getElementById('ui').style.display = 'flex';
        if (isMobile) {
            document.getElementById('mobile-controls').classList.remove('hidden');
        }
        this.updateUI();
    }

    update() {
        if (this.gameState !== GAME_STATES.PLAYING) return;

        // Check if player is on a platform
        let onPlatform = false;
        for (let platform of this.platforms) {
            if (this.player.velocityY >= 0 &&
                this.player.y + this.player.height <= platform.y + 5 &&
                this.player.y + this.player.height >= platform.y - 10 &&
                this.player.x + this.player.width > platform.x &&
                this.player.x < platform.x + platform.width) {
                this.player.velocityY = 0;
                this.player.y = platform.y - this.player.height;
                this.player.jumping = false;
                onPlatform = true;
            }
        }

        // Update player
        if (!this.player.update(this.keys)) {
            // Player fell
            this.lives--;
            if (this.lives <= 0) {
                this.gameState = GAME_STATES.GAME_OVER;
                this.showGameOver();
            } else {
                this.createLevel();
            }
            return;
        }

        // Update platforms
        for (let platform of this.platforms) {
            platform.update();
        }

        // Update coins
        for (let coin of this.coins) {
            coin.update();
            if (!coin.collected && this.player.collidesWith(coin)) {
                coin.collected = true;
                this.score += 10;
                coinSound();
            }
        }

        // Update enemies
        for (let enemy of this.enemies) {
            enemy.update();
            if (this.player.collidesWith(enemy)) {
                hitSound();
                this.lives--;
                if (this.lives <= 0) {
                    this.gameState = GAME_STATES.GAME_OVER;
                    this.showGameOver();
                } else {
                    this.createLevel();
                }
                return;
            }
        }

        // Check if level is complete
        if (this.coins.every(coin => coin.collected)) {
            levelCompleteSound();
            if (this.level >= 20) {
                // Victory! Player completed all 30 levels
                this.showVictory();
            } else {
                this.level++;
                this.score += 50;
                this.createLevel();
            }
        }

        this.updateUI();
    }

    draw() {
        // Clear canvas
        this.ctx.fillStyle = '#87CEEB';
        this.ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

        // Draw game elements
        for (let platform of this.platforms) {
            platform.draw(this.ctx);
        }

        for (let coin of this.coins) {
            coin.draw(this.ctx);
        }

        for (let enemy of this.enemies) {
            enemy.draw(this.ctx);
        }

        this.player.draw(this.ctx);
    }

    updateUI() {
        document.getElementById('score').textContent = `Score: ${this.score}`;
        document.getElementById('lives').textContent = `Lives: ${this.lives}`;
        document.getElementById('level').textContent = `Level: ${this.level}`;
    }

    showGameOver() {
        gameOverSound();
        document.getElementById('ui').style.display = 'none';
        if (isMobile) {
            document.getElementById('mobile-controls').classList.add('hidden');
        }
        document.getElementById('final-score').textContent = `Final Score: ${this.score}`;
        document.getElementById('game-over').classList.remove('hidden');
    }

    showVictory() {
        levelCompleteSound();
        setTimeout(() => levelCompleteSound(), 300);
        document.getElementById('ui').style.display = 'none';
        if (isMobile) {
            document.getElementById('mobile-controls').classList.add('hidden');
        }
        document.getElementById('victory-score').textContent = `Final Score: ${this.score}`;
        document.getElementById('victory').classList.remove('hidden');
        this.gameState = GAME_STATES.GAME_OVER; // Prevent further updates
    }

    gameLoop() {
        this.update();
        this.draw();
        requestAnimationFrame(() => this.gameLoop());
    }
}

// Initialize game
window.addEventListener('DOMContentLoaded', () => {
    const game = new Game();
    game.gameLoop();
});
