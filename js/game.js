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
        this.difficulty = localStorage.getItem('difficulty') || 'medium'; // easy, medium, hard
        this.soundEnabled = true;
        this.isDarkTheme = localStorage.getItem('darkTheme') !== 'false'; // Default to dark theme
        
        // Multiplayer state
        this.gameMode = 'singleplayer'; // 'singleplayer', 'local-multiplayer', or 'online-multiplayer'
        this.isHost = false;
        this.peer = null;
        this.connection = null;
        this.isConnected = false;
        this.remotePlayerY = (this.canvas.height - this.paddleHeight) / 2;
        this.gameId = null;
        
        // Sound-Effekte (Web Audio API für bessere Performance)
        this.audioContext = null;
        this.initAudio();
        
        // Controls
        this.upPressed = false;
        this.downPressed = false;
        this.player2UpPressed = false;
        this.player2DownPressed = false;
        
        // Event listeners
        window.addEventListener('resize', () => this.setCanvasSize());
        window.addEventListener('keydown', (e) => this.handleKeyDown(e));
        window.addEventListener('keyup', (e) => this.handleKeyUp(e));
        
        // Mobile controls
        document.getElementById('upButton').addEventListener('touchstart', () => this.upPressed = true);
        document.getElementById('upButton').addEventListener('touchend', () => this.upPressed = false);
        document.getElementById('downButton').addEventListener('touchstart', () => this.downPressed = true);
        document.getElementById('downButton').addEventListener('touchend', () => this.downPressed = false);
        
        // Game controls
        document.getElementById('startButton').addEventListener('click', () => this.startGame());
        document.getElementById('pauseButton').addEventListener('click', () => this.togglePause());
        document.getElementById('resetButton').addEventListener('click', () => this.resetGame());
        document.getElementById('difficulty').addEventListener('change', (e) => this.changeDifficulty(e.target.value));
        document.getElementById('soundToggle').addEventListener('click', () => this.toggleSound());
        document.getElementById('themeToggle').addEventListener('click', () => this.toggleTheme());
        
        // Multiplayer controls
        document.getElementById('gameMode').addEventListener('change', (e) => this.changeGameMode(e.target.value));
        document.getElementById('hostButton').addEventListener('click', () => this.hostGame());
        document.getElementById('joinButton').addEventListener('click', () => this.joinGame());
        document.getElementById('copyIdButton').addEventListener('click', () => this.copyGameId());
        
        // Initialize theme
        this.updateTheme();
        
        // Initialize difficulty dropdown to match current difficulty
        document.getElementById('difficulty').value = this.difficulty;
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
        if (this.gameMode === 'online-multiplayer' && !this.isConnected) {
            this.updateConnectionStatus('Erst Verbindung zu einem anderen Spieler herstellen');
            return;
        }
        
        if (!this.isPlaying) {
            this.isPlaying = true;
            this.isPaused = false;
            document.getElementById('startButton').disabled = true;
            document.getElementById('pauseButton').disabled = false;
            
            if (this.gameMode === 'online-multiplayer') {
                this.sendData({ type: 'gameState', isPlaying: true, isPaused: false });
            }
            
            this.gameLoop();
        }
    }

    handleKeyDown(e) {
        // Player 1 controls (left paddle)
        if (e.key === 'ArrowUp') this.upPressed = true;
        if (e.key === 'ArrowDown') this.downPressed = true;
        
        // Player 2 controls (right paddle) - W/S keys for local multiplayer
        if (this.gameMode === 'local-multiplayer') {
            if (e.key === 'w' || e.key === 'W') this.player2UpPressed = true;
            if (e.key === 's' || e.key === 'S') this.player2DownPressed = true;
        }
        
        // Online multiplayer - send player movements to remote peer
        if (this.gameMode === 'online-multiplayer' && this.isConnected) {
            if (e.key === 'ArrowUp' || e.key === 'ArrowDown') {
                this.sendData({ 
                    type: 'playerMove', 
                    up: this.upPressed, 
                    down: this.downPressed 
                });
            }
        }
        
        if (e.key === ' ') { // Leertaste für Pause
            e.preventDefault();
            this.togglePause();
        }
    }

    handleKeyUp(e) {
        // Player 1 controls
        if (e.key === 'ArrowUp') this.upPressed = false;
        if (e.key === 'ArrowDown') this.downPressed = false;
        
        // Player 2 controls for local multiplayer
        if (this.gameMode === 'local-multiplayer') {
            if (e.key === 'w' || e.key === 'W') this.player2UpPressed = false;
            if (e.key === 's' || e.key === 'S') this.player2DownPressed = false;
        }
        
        // Online multiplayer - send player movements to remote peer
        if (this.gameMode === 'online-multiplayer' && this.isConnected) {
            if (e.key === 'ArrowUp' || e.key === 'ArrowDown') {
                this.sendData({ 
                    type: 'playerMove', 
                    up: this.upPressed, 
                    down: this.downPressed 
                });
            }
        }
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
        
        // Player 1 paddle (left)
        if (this.upPressed && this.playerY > 0) {
            this.playerY -= paddleMovement;
        }
        if (this.downPressed && this.playerY < this.canvas.height - this.paddleHeight) {
            this.playerY += paddleMovement;
        }
        
        // Send player movement to remote peer in online multiplayer
        if (this.gameMode === 'online-multiplayer' && this.isConnected && (this.upPressed || this.downPressed)) {
            this.sendData({ 
                type: 'playerMove', 
                playerY: this.playerY
            });
        }

        // Computer/Player 2 paddle (right)
        if (this.gameMode === 'singleplayer') {
            // Computer paddle mit Schwierigkeitsgrad
            const computerCenter = this.computerY + this.paddleHeight / 2;
            const ballCenter = this.ballY;
            
            // Schwierigkeitsgrad-basierte Parameter
            const difficultySettings = {
                easy: { errorRate: 0.3, speed: 0.5, tolerance: 50 },
                medium: { errorRate: 0.1, speed: 0.7, tolerance: 35 },
                hard: { errorRate: 0.05, speed: 0.9, tolerance: 20 }
            };
            
            const settings = difficultySettings[this.difficulty] || difficultySettings.medium;
            
            // Fehlerquote basierend auf Schwierigkeit
            if (Math.random() < settings.errorRate) return;
            
            if (computerCenter < ballCenter - settings.tolerance) {
                this.computerY += paddleMovement * settings.speed;
            } else if (computerCenter > ballCenter + settings.tolerance) {
                this.computerY -= paddleMovement * settings.speed;
            }
            
            // Computer paddle bleibt im Spielfeld
            this.computerY = Math.max(0, Math.min(this.computerY, this.canvas.height - this.paddleHeight));
        } else if (this.gameMode === 'local-multiplayer') {
            // Player 2 controls (W/S keys)
            if (this.player2UpPressed && this.computerY > 0) {
                this.computerY -= paddleMovement;
            }
            if (this.player2DownPressed && this.computerY < this.canvas.height - this.paddleHeight) {
                this.computerY += paddleMovement;
            }
        } else if (this.gameMode === 'online-multiplayer') {
            // Use remote player position received from peer
            if (this.isConnected) {
                this.computerY = this.remotePlayerY;
            }
        }
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
        // Linkes Paddle (Player 1)
        if (
            this.ballX - this.ballSize <= this.paddleWidth &&
            this.ballY + this.ballSize >= this.playerY &&
            this.ballY - this.ballSize <= this.playerY + this.paddleHeight
        ) {
            this.ballSpeedX = Math.abs(this.ballSpeedX) * 1.01;
            this.playSound(200, 0.1); // Paddle-Hit Sound
            this.ballX = this.paddleWidth + this.ballSize;
        }
        // Rechtes Paddle (Computer/Player 2)
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
            
            // Sync score in online multiplayer
            if (this.gameMode === 'online-multiplayer' && this.isConnected && this.isHost) {
                this.sendData({ 
                    type: 'score', 
                    player: this.playerScore, 
                    computer: this.computerScore 
                });
            }
        } else if (this.ballX - this.ballSize >= this.canvas.width) {
            this.playerScore++;
            this.playSound(400, 0.3); // Gewinn Sound
            this.resetBall();
            
            // Sync score in online multiplayer
            if (this.gameMode === 'online-multiplayer' && this.isConnected && this.isHost) {
                this.sendData({ 
                    type: 'score', 
                    player: this.playerScore, 
                    computer: this.computerScore 
                });
            }
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
            
            // Send game state to remote player in online multiplayer (only host controls ball)
            if (this.gameMode === 'online-multiplayer' && this.isConnected && this.isHost) {
                // Send ball position periodically (every few frames)
                if (Math.random() < 0.1) { // 10% chance per frame
                    this.sendData({
                        type: 'ballPosition',
                        x: this.ballX,
                        y: this.ballY,
                        speedX: this.ballSpeedX,
                        speedY: this.ballSpeedY
                    });
                }
            }
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
        
        // Redraw canvas with new theme colors
        this.draw();
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
        localStorage.setItem('difficulty', difficulty);
        // Difficulty affects computer paddle speed in updatePaddles method
    }

    changeGameMode(mode) {
        this.gameMode = mode;
        const multiplayerControls = document.getElementById('multiplayerControls');
        const localMultiplayerControls = document.getElementById('localMultiplayerControls');
        
        // Hide all multiplayer controls first
        multiplayerControls.style.display = 'none';
        localMultiplayerControls.style.display = 'none';
        
        if (mode === 'local-multiplayer') {
            localMultiplayerControls.style.display = 'block';
            this.isConnected = true; // Local multiplayer is always "connected"
        } else if (mode === 'online-multiplayer') {
            multiplayerControls.style.display = 'block';
            this.disconnectPeer(); // Reset connection state
        } else {
            this.disconnectPeer();
        }
        
        this.resetGame();
    }

    initPeer() {
        // Initialize WebRTC for peer-to-peer connection
        this.updateConnectionStatus('WebRTC wird initialisiert...');
        
        // Generate a random game ID for this session
        this.gameId = Math.random().toString(36).substr(2, 9);
        
        // For demo purposes, we'll use a simple WebRTC setup
        // In a real implementation, you'd need a signaling server
        this.updateConnectionStatus('Bereit für P2P-Verbindung');
    }

    async hostGame() {
        this.isHost = true;
        this.updateConnectionStatus('Erstelle Online-Spiel...');
        
        try {
            // Create WebRTC peer connection
            this.peerConnection = new RTCPeerConnection({
                iceServers: [
                    { urls: 'stun:stun.l.google.com:19302' },
                    { urls: 'stun:stun1.l.google.com:19302' }
                ]
            });
            
            // Create data channel for game communication
            this.dataChannel = this.peerConnection.createDataChannel('gameData', {
                ordered: true
            });
            
            this.setupDataChannelHandlers(this.dataChannel);
            this.setupPeerConnectionHandlers();
            
            // Generate unique game ID
            this.gameId = Date.now().toString(36) + Math.random().toString(36).substr(2);
            
            // Create offer
            const offer = await this.peerConnection.createOffer();
            await this.peerConnection.setLocalDescription(offer);
            
            // Display game ID and offer for sharing
            this.displayGameId();
            this.updateConnectionStatus(`Warten auf Spieler... Teile die Spiel-ID: ${this.gameId}`);
            
            // In a real implementation, you'd send this offer through a signaling server
            // For now, we'll store it locally and display instructions
            this.pendingOffer = offer;
            this.showOfferInstructions();
            
        } catch (error) {
            console.error('Fehler beim Erstellen des Online-Spiels:', error);
            this.updateConnectionStatus('Fehler beim Erstellen des Online-Spiels');
        }
    }

    async joinGame() {
        this.isHost = false;
        const gameId = document.getElementById('gameIdInput').value.trim();
        
        if (!gameId) {
            this.updateConnectionStatus('Bitte Spiel-ID eingeben');
            return;
        }
        
        this.updateConnectionStatus('Verbinde mit Online-Spiel...');
        
        try {
            // Create WebRTC peer connection
            this.peerConnection = new RTCPeerConnection({
                iceServers: [
                    { urls: 'stun:stun.l.google.com:19302' },
                    { urls: 'stun:stun1.l.google.com:19302' }
                ]
            });
            
            this.setupPeerConnectionHandlers();
            
            // In a real implementation, you'd get the offer from a signaling server
            // For now, we'll simulate this with localStorage or prompt
            this.updateConnectionStatus('Hole Spieldetails... (In einer echten Implementierung würde hier ein Signaling-Server verwendet)');
            
            // Set up data channel handler for incoming connection
            this.peerConnection.ondatachannel = (event) => {
                this.dataChannel = event.channel;
                this.setupDataChannelHandlers(this.dataChannel);
            };
            
            this.showJoinInstructions();
            
        } catch (error) {
            console.error('Fehler beim Beitreten des Online-Spiels:', error);
            this.updateConnectionStatus('Fehler beim Beitreten des Online-Spiels');
        }
    }

    setupPeerConnectionHandlers() {
        this.peerConnection.onicecandidate = (event) => {
            if (event.candidate) {
                // In a real implementation, send this to the other peer via signaling server
                console.log('ICE candidate:', event.candidate);
            }
        };
        
        this.peerConnection.onconnectionstatechange = () => {
            console.log('Connection state:', this.peerConnection.connectionState);
            if (this.peerConnection.connectionState === 'connected') {
                this.isConnected = true;
                this.updateConnectionStatus('Online-Verbindung hergestellt! Spiel kann gestartet werden.');
                document.getElementById('startButton').disabled = false;
            } else if (this.peerConnection.connectionState === 'disconnected' || 
                      this.peerConnection.connectionState === 'failed') {
                this.isConnected = false;
                this.updateConnectionStatus('Verbindung verloren');
                document.getElementById('startButton').disabled = true;
            }
        };
    }

    setupDataChannelHandlers(channel) {
        channel.onopen = () => {
            console.log('Data channel opened');
            this.isConnected = true;
            this.updateConnectionStatus('Online-Verbindung hergestellt! Spiel kann gestartet werden.');
            document.getElementById('startButton').disabled = false;
        };
        
        channel.onclose = () => {
            console.log('Data channel closed');
            this.isConnected = false;
            this.updateConnectionStatus('Verbindung getrennt');
            document.getElementById('startButton').disabled = true;
        };
        
        channel.onmessage = (event) => {
            this.handleRemoteData(JSON.parse(event.data));
        };
        
        channel.onerror = (error) => {
            console.error('Data channel error:', error);
            this.updateConnectionStatus('Verbindungsfehler');
        };
    }

    showOfferInstructions() {
        const instructions = `
Um einen anderen Spieler einzuladen:

1. Der andere Spieler sollte "Online-Spiel beitreten" wählen
2. Die Spiel-ID ${this.gameId} eingeben
3. In einer vollständigen Implementierung würde ein Signaling-Server verwendet

Hinweis: Dies ist eine Demo-Implementierung. Für echtes P2P zwischen verschiedenen Netzwerken wird ein Signaling-Server benötigt.
        `;
        
        this.updateConnectionStatus(instructions);
    }

    showJoinInstructions() {
        const instructions = `
Hinweis: Dies ist eine Demo der WebRTC P2P-Funktionalität.

Für eine vollständige Implementierung wird ein Signaling-Server benötigt, um:
- Offers und Answers zwischen Peers auszutauschen
- ICE candidates zu übertragen
- Verbindungen zwischen verschiedenen Netzwerken zu ermöglichen

Aktuell können nur Verbindungen im gleichen lokalen Netzwerk getestet werden.
        `;
        
        this.updateConnectionStatus(instructions);
    }

    displayGameId() {
        document.getElementById('gameId').textContent = this.gameId;
        document.getElementById('gameIdDisplay').style.display = 'block';
    }

    setupConnection() {
        // WebRTC connection setup is handled in hostGame() and joinGame()
        this.isConnected = !!this.dataChannel && this.dataChannel.readyState === 'open';
    }

    handleRemoteData(data) {
        if (!data) return;
        
        switch (data.type) {
            case 'playerMove':
                // Update remote player position
                this.remotePlayerY = data.playerY;
                break;
                
            case 'gameState':
                // Sync game state
                if (data.isPlaying !== undefined) {
                    this.isPlaying = data.isPlaying;
                    this.isPaused = data.isPaused;
                    
                    // Update UI
                    document.getElementById('startButton').disabled = data.isPlaying;
                    document.getElementById('pauseButton').disabled = !data.isPlaying;
                }
                break;
                
            case 'ballPosition':
                // Sync ball position (host controls ball physics)
                if (!this.isHost) {
                    this.ballX = data.x;
                    this.ballY = data.y;
                    this.ballSpeedX = data.speedX;
                    this.ballSpeedY = data.speedY;
                }
                break;
                
            case 'score':
                // Sync score
                this.playerScore = data.player;
                this.computerScore = data.computer;
                document.getElementById('playerScore').textContent = this.playerScore;
                document.getElementById('computerScore').textContent = this.computerScore;
                break;
        }
    }

    sendData(data) {
        if (this.dataChannel && this.dataChannel.readyState === 'open') {
            try {
                // Add current player position for movement updates
                if (data.type === 'playerMove') {
                    data.playerY = this.playerY;
                }
                
                this.dataChannel.send(JSON.stringify(data));
            } catch (error) {
                console.error('Fehler beim Senden der Daten:', error);
            }
        }
    }

    copyGameId() {
        const gameId = document.getElementById('gameId').textContent;
        navigator.clipboard.writeText(gameId).then(() => {
            this.updateConnectionStatus('Spiel-ID kopiert!');
        }).catch(() => {
            this.updateConnectionStatus('Fehler beim Kopieren');
        });
    }

    updateConnectionStatus(message) {
        document.getElementById('connectionStatus').textContent = message;
    }

    disconnectPeer() {
        if (this.dataChannel) {
            this.dataChannel.close();
            this.dataChannel = null;
        }
        if (this.peerConnection) {
            this.peerConnection.close();
            this.peerConnection = null;
        }
        this.isConnected = false;
        this.isHost = false;
        this.gameId = null;
        document.getElementById('gameIdDisplay').style.display = 'none';
        this.updateConnectionStatus('');
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
        this.remotePlayerY = (this.canvas.height - this.paddleHeight) / 2;
        
        // Update UI
        document.getElementById('startButton').disabled = (this.gameMode === 'online-multiplayer' && !this.isConnected);
        document.getElementById('pauseButton').disabled = true;
        document.getElementById('playerScore').textContent = this.playerScore;
        document.getElementById('computerScore').textContent = this.computerScore;
        
        // Send reset state to remote player in online multiplayer mode
        if (this.gameMode === 'online-multiplayer' && this.isConnected) {
            this.sendData({ type: 'gameState', isPlaying: false, isPaused: false });
            this.sendData({ type: 'score', player: 0, computer: 0 });
        }
        
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
