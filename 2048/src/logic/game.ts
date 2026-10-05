import { createEmptyGrid, addRandomTile, getEmptyCells } from './grid';
import type { TileData, GridState } from './grid';

export interface GameState {
    grid: GridState;
    score: number;
    bestScore: number;
    status: 'playing' | 'won' | 'over' | 'continue';
    history: { grid: GridState; score: number }[];
}

export type Direction = 'up' | 'down' | 'left' | 'right';

const STORAGE_KEY = '2048-game-state';

export const saveGameState = (state: GameState) => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({
        grid: state.grid,
        score: state.score,
        bestScore: state.bestScore,
        status: state.status,
        history: state.history,
    }));
};

export const loadGameState = (): GameState | null => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
        try {
            return JSON.parse(saved) as GameState;
        } catch (e) {
            console.error("Failed to parse saved game", e);
            return null;
        }
    }
    return null;
};

export const initializeGame = (size: number = 4, reset: boolean = false): GameState => {
    if (!reset) {
        const saved = loadGameState();
        if (saved) return saved;
    }

    const existingBest = loadGameState()?.bestScore || 0;

    let grid = createEmptyGrid(size);
    grid = addRandomTile(grid);
    grid = addRandomTile(grid);

    return {
        grid,
        score: 0,
        bestScore: existingBest,
        status: 'playing',
        history: [],
    };
};

// --- Movement Logic ---

const slideLine = (line: (TileData | null)[]): { newLine: (TileData | null)[], scoreDelta: number } => {
    // 1. Remove nulls
    let filtered = line.filter(t => t !== null) as TileData[];
    let scoreDelta = 0;

    // 2. Merge adjacent equals
    for (let i = 0; i < filtered.length - 1; i++) {
        if (filtered[i].value === filtered[i + 1].value) {
            filtered[i] = {
                ...filtered[i],
                value: filtered[i].value * 2,
                mergedFrom: [filtered[i], filtered[i + 1]],
                isNew: false
            };
            scoreDelta += filtered[i].value;
            filtered.splice(i + 1, 1);
        }
    }

    // 3. Pad with nulls in a new Array to satisfy TS
    const newLine: (TileData | null)[] = [...filtered];
    while (newLine.length < line.length) {
        newLine.push(null);
    }

    return { newLine, scoreDelta };
};

export const moveGrid = (state: GameState, direction: Direction): GameState => {
    if (state.status !== 'playing') return state;

    const size = state.grid.length;
    let newGrid = createEmptyGrid(size);
    let scoreDelta = 0;
    let moved = false;

    // Process rows or columns based on direction
    for (let i = 0; i < size; i++) {
        let line: (TileData | null)[] = [];

        // Extract line
        for (let j = 0; j < size; j++) {
            if (direction === 'left') line.push(state.grid[i][j]);
            if (direction === 'right') line.push(state.grid[i][size - 1 - j]);
            if (direction === 'up') line.push(state.grid[j][i]);
            if (direction === 'down') line.push(state.grid[size - 1 - j][i]);
        }

        // Slide line
        const { newLine, scoreDelta: lineScore } = slideLine(line);
        scoreDelta += lineScore;

        // Put line back
        for (let j = 0; j < size; j++) {
            let r = 0, c = 0;
            if (direction === 'left') { r = i; c = j; }
            if (direction === 'right') { r = i; c = size - 1 - j; }
            if (direction === 'up') { r = j; c = i; }
            if (direction === 'down') { r = size - 1 - j; c = i; }

            const newTile = newLine[j];
            if (newTile) {
                newGrid[r][c] = { ...(newTile as TileData), position: [r, c], isNew: false };
            } else {
                newGrid[r][c] = null;
            }

            // Check if grid actually changed
            if (state.grid[r][c]?.id !== newGrid[r][c]?.id || state.grid[r][c]?.value !== newGrid[r][c]?.value) {
                moved = true;
            }
        }
    }

    if (moved) {
        newGrid = addRandomTile(newGrid);
    }

    // Check Game Over or Win
    let newStatus: GameState['status'] = state.status;

    if (getEmptyCells(newGrid).length === 0) {
        if (!canMove(newGrid)) {
            newStatus = 'over';
        }
    }

    // Check for 2048 tile win condition
    if (newStatus === 'playing') {
        for (let r = 0; r < size; r++) {
            for (let c = 0; c < size; c++) {
                if (newGrid[r][c]?.value === 2048) {
                    newStatus = 'won';
                }
            }
        }
    }

    const nextScore = state.score + scoreDelta;

    const nextState: GameState = {
        grid: newGrid,
        score: nextScore,
        bestScore: Math.max(nextScore, state.bestScore),
        status: newStatus,
        history: [{ grid: state.grid, score: state.score }, ...state.history].slice(0, 5), // Keep last 5 moves
    };

    saveGameState(nextState);
    return nextState;
};

export const continueGame = (state: GameState): GameState => {
    const nextState = { ...state, status: 'continue' as const };
    saveGameState(nextState);
    return nextState;
};

export const undoMove = (state: GameState): GameState => {
    if (state.history.length === 0) return state;

    const prevState = state.history[0];
    const nextState: GameState = {
        ...state,
        grid: prevState.grid,
        score: prevState.score,
        status: 'playing', // Reset win/loss status on undo
        history: state.history.slice(1),
    };

    saveGameState(nextState);
    return nextState;
};

const canMove = (grid: GridState): boolean => {
    const size = grid.length;
    for (let r = 0; r < size; r++) {
        for (let c = 0; c < size; c++) {
            if (grid[r][c] === null) return true;
            if (r < size - 1 && grid[r][c]?.value === grid[r + 1][c]?.value) return true; // check down
            if (c < size - 1 && grid[r][c]?.value === grid[r][c + 1]?.value) return true; // check right
        }
    }
    return false;
};
