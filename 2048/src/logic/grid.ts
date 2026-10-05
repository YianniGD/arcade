export type TileId = string;

export interface TileData {
    id: TileId;
    value: number;
    position: [number, number]; // [row, col]
    mergedFrom?: [TileData, TileData];
    isNew?: boolean;
}

export type GridState = (TileData | null)[][];

export const createEmptyGrid = (size: number): GridState => {
    const grid: GridState = [];
    for (let r = 0; r < size; r++) {
        const row: (TileData | null)[] = [];
        for (let c = 0; c < size; c++) {
            row.push(null);
        }
        grid.push(row);
    }
    return grid;
};

export const getEmptyCells = (grid: GridState): [number, number][] => {
    const emptyCells: [number, number][] = [];
    for (let r = 0; r < grid.length; r++) {
        for (let c = 0; c < grid[r].length; c++) {
            if (grid[r][c] === null) {
                emptyCells.push([r, c]);
            }
        }
    }
    return emptyCells;
};

export const getRandomEmptyCell = (grid: GridState): [number, number] | null => {
    const emptyCells = getEmptyCells(grid);
    if (emptyCells.length === 0) return null;
    const randomIndex = Math.floor(Math.random() * emptyCells.length);
    return emptyCells[randomIndex];
};

let tileIdCounter = 0;

export const createTile = (value: number, row: number, col: number): TileData => {
    return {
        id: `tile-${tileIdCounter++}`,
        value,
        position: [row, col],
        isNew: true,
    };
};

export const addRandomTile = (grid: GridState): GridState => {
    const emptyCell = getRandomEmptyCell(grid);
    if (!emptyCell) return grid;

    const [row, col] = emptyCell;
    const newValue = Math.random() < 0.9 ? 2 : 4;
    const newTile = createTile(newValue, row, col);

    const newGrid = [...grid];
    newGrid[row] = [...newGrid[row]];
    newGrid[row][col] = newTile;

    return newGrid;
};
