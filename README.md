# Sellebeww Arcade

![Sellebeww Arcade](docs/screenshot.png)

An interactive pixel-art arcade. Answer four short questions, then play your own custom mini game on a 3D arcade cabinet.

## About

Sellebeww Arcade turns a player's answers into a game that is ready to play.

1. **Answer 4 questions.** Name, genre, main character and vibe.
2. **Design card.** The answers are summarized into one game design card with a title, hero, enemies, collectible, color palette and mechanics.
3. **Game generation.** Gemini writes the game code from that card. While you wait, you can play a built-in sample game.
4. **Play on a 3D cabinet.** The marquee, side panel and CRT screen all follow your design card.
5. **Share.** Save your best score as a PNG card to share.

Available genres are platformer, runner, shooter, breakout, dodger and maze.

## Tech Stack

React 19 and TypeScript, Vite, three.js for the 3D cabinet, XState for screen flow, Express for the server and API proxy, and Google Gemini through `@google/genai`. Games run in a sandboxed iframe on a custom pixel engine in [engine/](engine/).

## Getting Started

Requires Node.js 20 or newer and a Gemini API key.

```bash
npm install
cp .env.example .env.local   # set GEMINI_API_KEY
npm run dev
```

Open localhost on port 8787 in your browser (change it with `PORT=xxxx`). Without an API key the app still loads, but new games cannot be generated.

## Commands

| Command | Description |
|---|---|
| `npm run dev` | Start the development server |
| `npm run build` | Create a production build in `dist/` |
| `npm start` | Run the production build |
| `npm run typecheck` | Run the TypeScript type check |
| `npm run build-cart` | Rebuild the game engine in `public/cart/` |

## Project Structure

- `src/` holds the React UI, the 3D stage (`stage/`), the design card (`card/`), cabinet skins (`skin/`) and the share card (`share/`)
- `engine/` holds the pixel game engine and six sample games, one per genre
- `server/` holds the Express server and the Gemini proxy with per-IP usage limits
- `agent/` and `agents/` hold the instructions for the game-building agent
- `public/` holds assets, sample games and the iframe game host

## Author & License

Created by Vassel Goleyu. Copyright (c) 2026 Vassel Goleyu. All rights reserved.
