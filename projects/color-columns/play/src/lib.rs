//! Browser adaptation of Color Columns, originally by Rade Drmić (MIT).
//! The core remains Rust. The desktop drawing and file APIs are replaced by
//! simple WebAssembly exports that the browser interface can call.

const W: usize = 9;
const H: usize = 18;
const EMPTY: u8 = 0;

#[derive(Clone)]
struct Game {
    board: [[u8; W]; H],
    x: i32,
    y: i32,
    piece: [u8; 3],
    next: [u8; 3],
    rng: u32,
    score: u32,
    dropped: u32,
    over: bool,
}

impl Game {
    fn new(seed: u32) -> Self {
        let mut g = Self {
            board: [[EMPTY; W]; H], x: 4, y: -3, piece: [1; 3], next: [1; 3],
            rng: if seed == 0 { 0x7135_9ac1 } else { seed }, score: 0, dropped: 0, over: false,
        };
        g.piece = g.random_piece();
        g.next = g.random_piece();
        g.x = (g.random() % W as u32) as i32;
        g
    }

    // Xorshift supplies reproducible piece colors without relying on browser
    // APIs from inside Rust. The browser supplies a seed when the game starts.
    fn random(&mut self) -> u32 {
        let mut n = self.rng;
        n ^= n << 13; n ^= n >> 17; n ^= n << 5;
        self.rng = n;
        n
    }
    fn random_piece(&mut self) -> [u8; 3] {
        [1 + (self.random() % 6) as u8, 1 + (self.random() % 6) as u8, 1 + (self.random() % 6) as u8]
    }
    fn fits(&self, x: i32, y: i32) -> bool {
        if !(0..W as i32).contains(&x) { return false; }
        (0..3).all(|i| {
            let row = y + i;
            row < H as i32 && (row < 0 || self.board[row as usize][x as usize] == EMPTY)
        })
    }
    fn input(&mut self, command: u32) {
        if self.over { return; }
        match command {
            0 => { if self.fits(self.x, self.y + 1) { self.y += 1; } else { self.lock(); } }
            1 => { if self.fits(self.x - 1, self.y) { self.x -= 1; } }
            2 => { if self.fits(self.x + 1, self.y) { self.x += 1; } }
            3 => self.piece.rotate_left(1),
            4 => self.piece.rotate_right(1),
            5 => { while self.fits(self.x, self.y + 1) { self.y += 1; } self.lock(); }
            _ => {}
        }
    }
    fn lock(&mut self) {
        // Desktop fills the available spaces when a piece protrudes above the
        // board, then checks matches before deciding whether the game is over.
        let reaches_top = self.y <= 0;
        for i in 0..3 {
            let row = self.y + i as i32;
            if row >= 0 && row < H as i32 { self.board[row as usize][self.x as usize] = self.piece[i]; }
        }
        self.dropped += 1;
        self.resolve_matches();
        if reaches_top && self.board[0].iter().any(|&v| v != EMPTY) {
            self.over = true;
            return;
        }
        self.piece = self.next;
        self.next = self.random_piece();
        self.x = (self.random() % W as u32) as i32;
        self.y = -3;
    }
    fn resolve_matches(&mut self) {
        let dirs = [(1, 0), (0, 1), (1, 1), (1, -1)];
        let mut chain = 0u32;
        loop {
            let mut marked = [[false; W]; H];
            let mut lengths = Vec::new();
            for y in 0..H as i32 {
                for x in 0..W as i32 {
                    let color = self.board[y as usize][x as usize];
                    if color == EMPTY { continue; }
                    for (dx, dy) in dirs {
                        let (px, py) = (x - dx, y - dy);
                        if px >= 0 && px < W as i32 && py >= 0 && py < H as i32
                            && self.board[py as usize][px as usize] == color { continue; }
                        let (mut tx, mut ty, mut len) = (x, y, 0usize);
                        while tx >= 0 && tx < W as i32 && ty >= 0 && ty < H as i32
                            && self.board[ty as usize][tx as usize] == color {
                            len += 1; tx += dx; ty += dy;
                        }
                        if len >= 3 {
                            lengths.push(len as u32);
                            for i in 0..len as i32 { marked[(y + i * dy) as usize][(x + i * dx) as usize] = true; }
                        }
                    }
                }
            }
            if lengths.is_empty() { break; }
            chain += 1;
            // This follows the desktop score's line bonuses and cascade
            // multiplier. Overlapping cells are removed once, but each line
            // still contributes to the score.
            let line_count = lengths.len() as u32;
            let base: u32 = lengths.into_iter().map(|n| 3 + (2..=(n - 2)).sum::<u32>()).sum();
            let multiplier = if chain > 1 { chain + 1 } else { 1 };
            self.score += base * line_count * multiplier;
            for x in 0..W {
                let mut destination = H as i32 - 1;
                for y in (0..H).rev() {
                    if self.board[y][x] != EMPTY && !marked[y][x] {
                        self.board[destination as usize][x] = self.board[y][x];
                        destination -= 1;
                    }
                }
                for y in 0..=destination { self.board[y as usize][x] = EMPTY; }
            }
        }
    }
}

// WebAssembly runs this game on one browser thread. RefCell lets the browser
// make one safe read or update at a time without a mutable global reference.
use std::cell::RefCell;
thread_local! { static GAME: RefCell<Option<Game>> = const { RefCell::new(None) }; }
#[no_mangle] pub extern "C" fn game_start(seed: u32) { GAME.with(|cell| { *cell.borrow_mut() = Some(Game::new(seed)); }); }
#[no_mangle] pub extern "C" fn game_input(command: u32) { GAME.with(|cell| { if let Some(g) = cell.borrow_mut().as_mut() { g.input(command); } }); }
#[no_mangle] pub extern "C" fn game_cell(x: u32, y: u32) -> u32 { GAME.with(|cell| {
    let borrowed = cell.borrow();
    let Some(g) = borrowed.as_ref() else { return 0; };
    if x >= W as u32 || y >= H as u32 { return 0; }
    if !g.over && x as i32 == g.x && (y as i32) >= g.y && (y as i32) < g.y + 3 {
        return g.piece[(y as i32 - g.y) as usize] as u32;
    }
    g.board[y as usize][x as usize] as u32
}) }
#[no_mangle] pub extern "C" fn game_next(i: u32) -> u32 { GAME.with(|c| c.borrow().as_ref().and_then(|g| g.next.get(i as usize)).copied().unwrap_or(0) as u32) }
#[no_mangle] pub extern "C" fn game_score() -> u32 { GAME.with(|c| c.borrow().as_ref().map_or(0, |g| g.score)) }
#[no_mangle] pub extern "C" fn game_dropped() -> u32 { GAME.with(|c| c.borrow().as_ref().map_or(0, |g| g.dropped)) }
#[no_mangle] pub extern "C" fn game_over() -> u32 { GAME.with(|c| c.borrow().as_ref().map_or(0, |g| u32::from(g.over))) }

#[cfg(any(test, test_exports))]
mod tests {
    use super::*;
    #[cfg_attr(test, test)] fn starts_empty_with_three_colors_and_no_score() {
        let g = Game::new(42); assert_eq!(g.score, 0); assert!(g.piece.iter().all(|v| (1..=6).contains(v))); assert_eq!(g.board, [[0;W];H]);
    }
    #[cfg_attr(test, test)] fn vertical_horizontal_and_diagonal_matches_clear() {
        for (dx,dy) in [(1,0),(0,1),(1,1),(1,-1)] {
            let mut g = Game::new(1); for i in 0..3 { g.board[(10+i*dy) as usize][(3+i*dx) as usize]=1; }
            g.resolve_matches(); assert_eq!(g.score,3); assert!(g.board.iter().flatten().all(|&v|v==0));
        }
    }
    #[cfg_attr(test, test)] fn gravity_creates_and_scores_a_cascade() {
        let mut g=Game::new(1);
        g.board[17][0]=2; g.board[17][1]=1; g.board[17][2]=2;
        g.board[16][1]=1; g.board[15][1]=1; g.board[14][1]=2;
        g.resolve_matches(); assert_eq!(g.score,12); assert!(g.board.iter().flatten().all(|&v|v==0));
    }
    #[cfg_attr(test, test)] fn horizontal_movement_cannot_leave_the_board() {
        let mut g=Game::new(1); for _ in 0..20 {g.input(1)} assert_eq!(g.x,0);
        for _ in 0..20 {g.input(2)} assert_eq!(g.x,(W-1) as i32);
    }
    #[cfg_attr(test, test)] fn exact_full_column_ends_game_without_a_match() {
        let mut g=Game::new(1); g.x=0; g.y=0; g.piece=[1,2,3];
        for y in 3..H { g.board[y][0] = (y % 6 + 1) as u8; }
        g.lock(); assert!(g.over);
    }
    #[cfg_attr(test, test)] fn match_can_clear_top_before_game_over() {
        let mut g=Game::new(1); g.x=0; g.y=0; g.piece=[1,1,1];
        for y in 3..H { g.board[y][0] = (y % 2 + 2) as u8; }
        g.lock(); assert!(!g.over); assert_eq!(g.score,3);
    }
    #[cfg_attr(test, test)] fn overflow_ends_game_if_top_is_still_blocked() {
        let mut g=Game::new(1); g.x=0; g.y=-1; g.piece=[1,2,3];
        for y in 2..H { g.board[y][0] = (y % 2 + 4) as u8; }
        g.lock(); assert!(g.over);
    }
    #[cfg(test_exports)]
    pub(super) fn run_wasm_checks() {
        starts_empty_with_three_colors_and_no_score();
        vertical_horizontal_and_diagonal_matches_clear();
        gravity_creates_and_scores_a_cascade();
        horizontal_movement_cannot_leave_the_board();
        exact_full_column_ends_game_without_a_match();
        match_can_clear_top_before_game_over();
        overflow_ends_game_if_top_is_still_blocked();
    }
}
// The separate test-only build exposes its checks to Node; this export is not
// included in the release build distributed to website visitors.
#[cfg(test_exports)]
#[no_mangle] pub extern "C" fn game_run_checks() { tests::run_wasm_checks(); }
