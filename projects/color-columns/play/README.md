# Color Columns: Rust browser adaptation

This is an adaptation of [Color Columns](https://github.com/rdrmic/color-columns) by Rade Drmić, made available under the MIT license. The original game uses Rust and ggez for a desktop window. This adaptation uses a Rust WebAssembly gameplay core with a small HTML Canvas interface. It is a browser adaptation rather than the original desktop executable.

## How the pieces fit together

1. `src/lib.rs` keeps the board, falling three-color column, movement, color cycling, matching, gravity, cascading and score in Rust. The four match directions and scoring formula follow the desktop project's rules. The code exports small functions for the browser to call.
2. `game.wasm` is the compiled WebAssembly output of that Rust file. It is a real compiled artifact, not a placeholder. Build it with the Rust compiler and the `wasm32-unknown-unknown` target.
3. `game.js` fetches `game.wasm`, sends input commands to those exports, and asks Rust for each board cell and score. Canvas draws the result. The game starts only after the visitor asks to play.
4. The site creates the game frame only after a visitor presses Play. Exiting or selecting a different tab/project unloads it, so a session resets when reopened.

## Build and test

Install Rust, Node.js, and the `wasm32-unknown-unknown` target. From this folder, compile both the real game and a separate test-only build. The second build exposes internal checks; keep it out of the public release:

```powershell
rustup target add wasm32-unknown-unknown
rustc --edition 2021 --target wasm32-unknown-unknown --crate-type cdylib -C opt-level=z -C lto -C strip=symbols src/lib.rs -o game.wasm
rustc --edition 2021 --target wasm32-unknown-unknown --crate-type cdylib --cfg test_exports -O src/lib.rs -o game-test.wasm
node --test test-wasm.cjs
node --test test-ui.cjs
```

The test-only build executes Rust tests for the four match directions, cascades, column limits, and game-over cases. Node also tests the actual release WebAssembly exports for movement, color cycling, dropping and game over. You can alternatively run `rustc --edition 2021 --test src/lib.rs -o game-tests.exe` and then `.\game-tests.exe` if a working native Windows C linker is installed. The machine used for this build did not have the MSVC linker, so the tests were run through WebAssembly instead.

Serve this directory over HTTP for browser testing, because loading a local `file:` page cannot reliably fetch WebAssembly. Confirm movement, both color rotations, hard drop, horizontal/vertical/diagonal matches, cascading, scoring, game over, pause, exit and focus. Verify the featured project loads and unloads the frame as intended.

## Differences from the original

The browser adaptation has its own noir interface and a simplified menu. Its pseudorandom generator does not reproduce the desktop random sequence. Match-clearing is immediate rather than animated. High scores and desktop snapshots are not saved. The original source and MIT notice should remain available whenever this adaptation is distributed.
