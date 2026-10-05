import React from 'react';
import type { TileData } from '../logic/grid';

interface TileProps {
    tile: TileData;
}

const colorMap: Record<number, string> = {
    2: 'var(--color-2)',
    4: 'var(--color-4)',
};

const Tile: React.FC<TileProps> = ({ tile }) => {
    const { value, position, isNew, mergedFrom } = tile;
    const [row, col] = position;

    // We rely on CSS absolute positioning to place the tile correctly on the grid
    // Width is calc(25% - 11.25px) because there's 3 gaps of 15px in a 4-col grid
    // Position = col * (width + gap) = col * (25% - 11.25px + 15px) = col * (25% + 3.75px)

    const topCalc = `calc(${row * 25}% + ${row * 3.75}px)`;
    const leftCalc = `calc(${col * 25}% + ${col * 3.75}px)`;

    // Calculate specific tile class for background color
    const valClass = value > 2048 ? 'super' : value;

    const bgColor = value > 2048 ? '#3c3a32' : `var(--tile-${valClass})`;
    const color = colorMap[value] || 'var(--color-light)';
    const fontSize = value > 1000 ? '2.5rem' : value > 100 ? '3rem' : '3.5rem';

    return (
        <div
            style={{
                position: 'absolute',
                top: topCalc,
                left: leftCalc,
                width: 'calc(25% - 11.25px)', // 3 gaps of 15px in a 4 col grid
                height: 'calc(25% - 11.25px)',
                backgroundColor: bgColor,
                color: color,
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center',
                fontSize: fontSize,
                fontWeight: 'bold',
                borderRadius: '3px',
                transition: 'top 100ms ease-in-out, left 100ms ease-in-out, transform 100ms ease-in-out',
                animation: isNew ? 'pop 200ms ease' : mergedFrom ? 'merge 200ms ease' : 'none',
                zIndex: 10
            }}
        >
            {value}
        </div>
    );
};

export default Tile;
