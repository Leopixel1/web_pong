# Web Pong

Ein modernes, responsives Pong-Spiel, das sowohl auf Desktop als auch auf mobilen Geräten funktioniert.

## Features

- Klassisches Pong-Gameplay
- **Neu: Lokaler Mehrspieler-Modus** - Zwei Spieler am selben Gerät
- Responsive Design für Desktop und Mobile
- Touch-Steuerung für mobile Geräte
- Keyboard-Steuerung für Desktop
- Automatischer Computer-Gegner im Einzelspieler-Modus
- Punktestand-Anzeige
- Zunehmende Spielgeschwindigkeit

## Steuerung

### Einzelspieler
- Pfeiltaste nach oben: Schläger nach oben bewegen
- Pfeiltaste nach unten: Schläger nach unten bewegen

### Mehrspieler (Lokal)
- **Spieler 1 (linker Schläger)**: Pfeiltasten ↑/↓
- **Spieler 2 (rechter Schläger)**: W/S Tasten

### Mobile
- Buttons auf dem Bildschirm zum Hoch- und Runterbewegen

## Installation

1. Repository klonen:
```bash
git clone https://github.com/[username]/web_pong.git
```

2. In das Projektverzeichnis wechseln:
```bash
cd web_pong
```

3. Eine lokale Entwicklungsumgebung starten (z.B. mit Python):
```bash
python -m http.server 8000
```

4. Im Browser öffnen:
```
http://localhost:8000
```

## Technologien

- HTML5 Canvas
- CSS3
- Vanilla JavaScript

## Lizenz

MIT
