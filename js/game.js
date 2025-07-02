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
        
        // Speeds
        this.paddleSpeed = 5;
        this.ballSpeedX = 5;
        this.ballSpeedY = 5;
        
        // Scores
        this.playerScore = 0;
        this.computerScore = 0;
        
        // Game state
        this.isPlaying = false;
        
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
    }

    setCanvasSize() {
        this.canvas.width = Math.min(800, window.innerWidth - 40);
        this.canvas.height = this.canvas.width * 0.6;
    }

    startGame() {
        if (!this.isPlaying) {
            this.isPlaying = true;
            this.gameLoop();
        }
    }

    handleKeyDown(e) {
        if (e.key === 'ArrowUp') this.upPressed = true;
        if (e.key === 'ArrowDown') this.downPressed = true;
    }

    handleKeyUp(e) {
        if (e.key === 'ArrowUp') this.upPressed = false;
        if (e.key === 'ArrowDown') this.downPressed = false;
    }

    updatePaddles() {
        // Player paddle
        if (this.upPressed && this.playerY > 0) {
            this.playerY -= this.paddleSpeed;
        }
        if (this.downPressed && this.playerY < this.canvas.height - this.paddleHeight) {
            this.playerY += this.paddleSpeed;
        }

        // Computer paddle (verbesserte KI mit Fehlerquote)
        const computerCenter = this.computerY + this.paddleHeight / 2;
        const ballCenter = this.ballY;
        // Fehlerquote: 10% Chance, dass die KI nichts macht
        if (Math.random() < 0.1) return;
        if (computerCenter < ballCenter - 35) {
            this.computerY += this.paddleSpeed * 0.7;
        } else if (computerCenter > ballCenter + 35) {
            this.computerY -= this.paddleSpeed * 0.7;
        }
    }

    updateBall() {
        this.ballX += this.ballSpeedX;
        this.ballY += this.ballSpeedY;

        // Vertical collisions (Ballgröße berücksichtigen)
        if (this.ballY - this.ballSize <= 0 || this.ballY + this.ballSize >= this.canvas.height) {
            this.ballSpeedY = -this.ballSpeedY;
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
            this.ballSpeedX = Math.abs(this.ballSpeedX) * 1.05;
            // Ball springt etwas weiter weg, damit er nicht "klebt"
            this.ballX = this.paddleWidth + this.ballSize;
        }
        // Rechtes Paddle
        if (
            this.ballX + this.ballSize >= this.canvas.width - this.paddleWidth &&
            this.ballY + this.ballSize >= this.computerY &&
            this.ballY - this.ballSize <= this.computerY + this.paddleHeight
        ) {
            this.ballSpeedX = -Math.abs(this.ballSpeedX) * 1.05;
            this.ballX = this.canvas.width - this.paddleWidth - this.ballSize;
        }

        // Ballgeschwindigkeit begrenzen
        const maxSpeed = 14;
        this.ballSpeedX = Math.max(-maxSpeed, Math.min(this.ballSpeedX, maxSpeed));
        this.ballSpeedY = Math.max(-maxSpeed, Math.min(this.ballSpeedY, maxSpeed));

        // Scoring
        if (this.ballX + this.ballSize <= 0) {
            this.computerScore++;
            this.resetBall();
        } else if (this.ballX - this.ballSize >= this.canvas.width) {
            this.playerScore++;
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
        const speed = 6;
        this.ballSpeedX = Math.cos(angle) * speed;
        this.ballSpeedY = Math.sin(angle) * speed;
    }

    draw() {
        // Clear canvas
        this.ctx.fillStyle = '#000';
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

        // Draw middle line
        this.ctx.setLineDash([5, 15]);
        this.ctx.beginPath();
        this.ctx.moveTo(this.canvas.width / 2, 0);
        this.ctx.lineTo(this.canvas.width / 2, this.canvas.height);
        this.ctx.strokeStyle = '#fff';
        this.ctx.stroke();
        this.ctx.setLineDash([]);

        // Schatten für Paddles
        this.ctx.save();
        this.ctx.shadowColor = 'rgba(0,0,0,0.5)';
        this.ctx.shadowBlur = 10;
        this.ctx.fillStyle = '#fff';
        this.ctx.fillRect(0, this.playerY, this.paddleWidth, this.paddleHeight);
        this.ctx.fillRect(this.canvas.width - this.paddleWidth, this.computerY, this.paddleWidth, this.paddleHeight);
        this.ctx.restore();

        // Ball mit Schatten
        this.ctx.save();
        this.ctx.shadowColor = 'rgba(0,0,0,0.7)';
        this.ctx.shadowBlur = 15;
        this.ctx.fillStyle = '#fff';
        this.ctx.beginPath();
        this.ctx.arc(this.ballX, this.ballY, this.ballSize, 0, Math.PI * 2);
        this.ctx.fill();
        this.ctx.restore();
    }

    gameLoop() {
        if (!this.isPlaying) return;

        this.updatePaddles();
        this.updateBall();
        this.draw();

        requestAnimationFrame(() => this.gameLoop());
    }
}

// Start the game when the page loads
window.onload = () => {
    new Pong();
};
