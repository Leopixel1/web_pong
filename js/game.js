class Pong {
    constructor() {
        this.canvas = document.getElementById('gameCanvas');
        this.ctx = this.canvas.getContext('2d');
        this.setCanvasSize();

        // Game objects
        this.paddleHeight = 100;
        this.paddleWidth = 10;
        this.ballSize = 10;
        
        // Initial positions
        this.playerY = (this.canvas.height - this.paddleHeight) / 2;
        this.computerY = (this.canvas.height - this.paddleHeight) / 2;
        this.ballX = this.canvas.width / 2;
        this.ballY = this.canvas.height / 2;
        
        // Speeds (frameratunabhängig - Pixel pro Sekunde)
        this.paddleSpeed = 300; // Pixel pro Sekunde
        this.ballSpeedX = 200;  // wird in resetBall überschrieben
        this.ballSpeedY = 200;  // wird in resetBall überschrieben
        
        // Timing für frameratunabhängige Bewegung
        this.lastTime = 0;
        
        // Scores
        this.playerScore = 0;
        this.computerScore = 0;
        
        // Game state
        this.isPlaying = false;
        this.isPaused = false;
        this.difficulty = 'medium'; // easy, medium, hard
        this.soundEnabled = true;
        this.isDarkTheme = localStorage.getItem('darkTheme') !== 'false'; // Default to dark theme
        
        // Sound-Effekte (Web Audio API für bessere Performance)
        this.audioContext = null;
        this.initAudio();
        
        // Controls
        this.upPressed = false;
        this.downPressed = false;
        
        // Event listeners
        window.addEventListener('resize', () => this.setCanvasSize());
        window.addEventListener('keydown', (e) => this.handleKeyDown(e));
        window.addEventListener('keyup', (e) => this.handleKeyUp(e));
        
        // Mobile controls
        document.getElementById('upButton').addEventListener('touchstart', () => this.upPressed = true);
        document.getElementById('upButton').addEventListener('touchend', () => this.upPressed = false);
        document.getElementById('downButton').addEventListener('touchstart', () => this.downPressed = true);
        document.getElementById('downButton').addEventListener('touchend', () => this.downPressed = false);
        
        // Start button
        document.getElementById('startButton').addEventListener('click', () => this.startGame());
        document.getElementById('pauseButton').addEventListener('click', () => this.togglePause());
        document.getElementById('resetButton').addEventListener('click', () => this.resetGame());
        document.getElementById('difficulty').addEventListener('change', (e) => this.changeDifficulty(e.target.value));
        document.getElementById('soundToggle').addEventListener('click', () => this.toggleSound());
        document.getElementById('themeToggle').addEventListener('click', () => this.toggleTheme());
        
        // Initialize theme
        this.updateTheme();
    }

    initAudio() {
        try {
            this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
        } catch (e) {
            console.log('Web Audio API nicht unterstützt');
            this.soundEnabled = false;
        }
    }

    playSound(frequency, duration, type = 'sine') {
        if (!this.soundEnabled || !this.audioContext) return;
        
        const oscillator = this.audioContext.createOscillator();
        const gainNode = this.audioContext.createGain();
        
        oscillator.connect(gainNode);
        gainNode.connect(this.audioContext.destination);
        
        oscillator.frequency.value = frequency;
        oscillator.type = type;
        
        gainNode.gain.setValueAtTime(0.1, this.audioContext.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, this.audioContext.currentTime + duration);
        
        oscillator.start(this.audioContext.currentTime);
        oscillator.stop(this.audioContext.currentTime + duration);
    }

    setCanvasSize() {
        this.canvas.width = Math.min(800, window.innerWidth - 40);
        this.canvas.height = this.canvas.width * 0.6;
    }

    startGame() {
        if (!this.isPlaying) {
            this.isPlaying = true;
            this.isPaused = false;
            document.getElementById('startButton').disabled = true;
            document.getElementById('pauseButton').disabled = false;
            this.gameLoop();
        }
    }

    handleKeyDown(e) {
        if (e.key === 'ArrowUp') this.upPressed = true;
        if (e.key === 'ArrowDown') this.downPressed = true;
        if (e.key === ' ') { // Leertaste für Pause
            e.preventDefault();
            this.togglePause();
        }
    }

    handleKeyUp(e) {
        if (e.key === 'ArrowUp') this.upPressed = false;
        if (e.key === 'ArrowDown') this.downPressed = false;
    }

    togglePause() {
        if (this.isPlaying) {
            this.isPaused = !this.isPaused;
            if (!this.isPaused) {
                this.lastTime = performance.now(); // Reset timing nach Pause
                this.gameLoop();
            }
        }
    }

    updatePaddles(deltaTime) {
        const paddleMovement = this.paddleSpeed * deltaTime;
        
        // Player paddle
        if (this.upPressed && this.playerY > 0) {
            this.playerY -= paddleMovement;
        }
        if (this.downPressed && this.playerY < this.canvas.height - this.paddleHeight) {
            this.playerY += paddleMovement;
        }

        // Computer paddle mit Schwierigkeitsgrad
        const computerCenter = this.computerY + this.paddleHeight / 2;
        const ballCenter = this.ballY;
        
        // Schwierigkeitsgrad-basierte Parameter
        const difficultySettings = {
            easy: { errorRate: 0.3, speed: 0.5, tolerance: 50 },
            medium: { errorRate: 0.1, speed: 0.7, tolerance: 35 },
            hard: { errorRate: 0.05, speed: 0.9, tolerance: 20 }
        };
        
        const settings = difficultySettings[this.difficulty];
        
        // Fehlerquote basierend auf Schwierigkeit
        if (Math.random() < settings.errorRate) return;
        
        if (computerCenter < ballCenter - settings.tolerance) {
            this.computerY += paddleMovement * settings.speed;
        } else if (computerCenter > ballCenter + settings.tolerance) {
            this.computerY -= paddleMovement * settings.speed;
        }
        
        // Computer paddle bleibt im Spielfeld
        this.computerY = Math.max(0, Math.min(this.computerY, this.canvas.height - this.paddleHeight));
    }

    updateBall(deltaTime) {
        this.ballX += this.ballSpeedX * deltaTime;
        this.ballY += this.ballSpeedY * deltaTime;

        // Vertical collisions (Ballgröße berücksichtigen)
        if (this.ballY - this.ballSize <= 0 || this.ballY + this.ballSize >= this.canvas.height) {
            this.ballSpeedY = -this.ballSpeedY;
            this.playSound(300, 0.1); // Wandkollision Sound
            // Ball bleibt im Spielfeld
            this.ballY = Math.max(this.ballSize, Math.min(this.ballY, this.canvas.height - this.ballSize));
        }

        // Paddle collisions (Ballgröße berücksichtigen)
        // Linkes Paddle
        if (
            this.ballX - this.ballSize <= this.paddleWidth &&
            this.ballY + this.ballSize >= this.playerY &&
            this.ballY - this.ballSize <= this.playerY + this.paddleHeight
        ) {
            this.ballSpeedX = Math.abs(this.ballSpeedX) * 1.01;
            this.playSound(200, 0.1); // Paddle-Hit Sound
            this.ballX = this.paddleWidth + this.ballSize;
        }
        // Rechtes Paddle
        if (
            this.ballX + this.ballSize >= this.canvas.width - this.paddleWidth &&
            this.ballY + this.ballSize >= this.computerY &&
            this.ballY - this.ballSize <= this.computerY + this.paddleHeight
        ) {
            this.ballSpeedX = -Math.abs(this.ballSpeedX) * 1.01;
            this.playSound(200, 0.1); // Paddle-Hit Sound
            this.ballX = this.canvas.width - this.paddleWidth - this.ballSize;
        }

        // Ballgeschwindigkeit begrenzen (Pixel pro Sekunde)
        const maxSpeed = 400;
        this.ballSpeedX = Math.max(-maxSpeed, Math.min(this.ballSpeedX, maxSpeed));
        this.ballSpeedY = Math.max(-maxSpeed, Math.min(this.ballSpeedY, maxSpeed));

        // Scoring
        if (this.ballX + this.ballSize <= 0) {
            this.computerScore++;
            this.playSound(150, 0.3); // Tor Sound
            this.resetBall();
        } else if (this.ballX - this.ballSize >= this.canvas.width) {
            this.playerScore++;
            this.playSound(400, 0.3); // Gewinn Sound
            this.resetBall();
        }

        // Update score display
        document.getElementById('playerScore').textContent = this.playerScore;
        document.getElementById('computerScore').textContent = this.computerScore;
    }

    resetBall() {
        this.ballX = this.canvas.width / 2;
        this.ballY = this.canvas.height / 2;
        // Zufälliger Winkel zwischen -45° und 45° oder 135° und 225°
        let angle = (Math.random() * Math.PI / 2) - Math.PI / 4;
        if (Math.random() > 0.5) angle += Math.PI; // nach links oder rechts
        const speed = 220; // Pixel pro Sekunde
        this.ballSpeedX = Math.cos(angle) * speed;
        this.ballSpeedY = Math.sin(angle) * speed;
    }

    draw() {
        const colors = this.getThemeColors();
        
        // Clear canvas
        this.ctx.fillStyle = colors.canvasBg;
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

        // Draw middle line
        this.ctx.setLineDash([5, 15]);
        this.ctx.beginPath();
        this.ctx.moveTo(this.canvas.width / 2, 0);
        this.ctx.lineTo(this.canvas.width / 2, this.canvas.height);
        this.ctx.strokeStyle = colors.gameElement;
        this.ctx.stroke();
        this.ctx.setLineDash([]);

        // Schatten für Paddles
        this.ctx.save();
        this.ctx.shadowColor = colors.shadowColor;
        this.ctx.shadowBlur = 10;
        this.ctx.fillStyle = colors.gameElement;
        this.ctx.fillRect(0, this.playerY, this.paddleWidth, this.paddleHeight);
        this.ctx.fillRect(this.canvas.width - this.paddleWidth, this.computerY, this.paddleWidth, this.paddleHeight);
        this.ctx.restore();

        // Ball mit Schatten
        this.ctx.save();
        this.ctx.shadowColor = colors.ballShadow;
        this.ctx.shadowBlur = 15;
        this.ctx.fillStyle = colors.gameElement;
        this.ctx.beginPath();
        this.ctx.arc(this.ballX, this.ballY, this.ballSize, 0, Math.PI * 2);
        this.ctx.fill();
        this.ctx.restore();
    }

    gameLoop(currentTime = 0) {
        if (!this.isPlaying || this.isPaused) return;

        // Berechne deltaTime in Sekunden
        const deltaTime = (currentTime - this.lastTime) / 1000;
        this.lastTime = currentTime;

        // Überspringe den ersten Frame (deltaTime wäre zu groß)
        if (deltaTime < 0.1) {
            this.updatePaddles(deltaTime);
            this.updateBall(deltaTime);
            this.draw();
        }

        this.animationId = requestAnimationFrame((time) => this.gameLoop(time));
    }

    toggleSound() {
        this.soundEnabled = !this.soundEnabled;
        const button = document.getElementById('soundToggle');
        button.textContent = this.soundEnabled ? '🔊 Sound' : '🔇 Sound';
    }

    toggleTheme() {
        this.isDarkTheme = !this.isDarkTheme;
        localStorage.setItem('darkTheme', this.isDarkTheme.toString());
        this.updateTheme();
    }

    updateTheme() {
        const body = document.body;
        const button = document.getElementById('themeToggle');
        
        if (this.isDarkTheme) {
            body.classList.remove('light-theme');
            button.textContent = '🌙 Dark';
        } else {
            body.classList.add('light-theme');
            button.textContent = '☀️ Light';
        }
    }

    getThemeColors() {
        const root = document.documentElement;
        const computedStyle = getComputedStyle(root);
        
        return {
            canvasBg: computedStyle.getPropertyValue('--canvas-bg').trim(),
            gameElement: computedStyle.getPropertyValue('--game-element-color').trim(),
            shadowColor: this.isDarkTheme ? 'rgba(0,0,0,0.5)' : 'rgba(255,255,255,0.8)',
            ballShadow: this.isDarkTheme ? 'rgba(0,0,0,0.7)' : 'rgba(255,255,255,0.9)'
        };
    }

    changeDifficulty(difficulty) {
        this.difficulty = difficulty;
        // Difficulty affects computer paddle speed in updatePaddles method
    }

    resetGame() {
        this.isPlaying = false;
        this.isPaused = false;
        this.playerScore = 0;
        this.computerScore = 0;
        this.resetBall();
        
        // Reset positions
        this.playerY = (this.canvas.height - this.paddleHeight) / 2;
        this.computerY = (this.canvas.height - this.paddleHeight) / 2;
        
        // Update UI
        document.getElementById('startButton').disabled = false;
        document.getElementById('pauseButton').disabled = true;
        document.getElementById('playerScore').textContent = this.playerScore;
        document.getElementById('computerScore').textContent = this.computerScore;
        
        // Redraw game
        this.draw();
        
        if (this.animationId) {
            cancelAnimationFrame(this.animationId);
        }
    }
}

// Start the game when the page loads
window.onload = () => {
    new Pong();
};
