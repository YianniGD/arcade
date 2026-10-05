import React, { useEffect, useState, useCallback, useRef } from 'react';
import { initializeGame, moveGrid, undoMove, continueGame } from '../logic/game';
import type { GameState, Direction } from '../logic/game';
import Tile from './Tile';
import type { TileData } from '../logic/grid';
import ScoreFloat from './ScoreFloat';

const GameContainer: React.FC = () => {
    const [gameState, setGameState] = useState<GameState>(() => initializeGame(4, false));
    const [touchStart, setTouchStart] = useState<{ x: number, y: number } | null>(null);

    // Floating score animation state
    const prevScoreRef = useRef(gameState.score);
    const [scoreFloats, setScoreFloats] = useState<{ id: number, score: number }[]>([]);
    const floatIdRef = useRef(0);

    useEffect(() => {
        if (gameState.score > prevScoreRef.current) {
            const diff = gameState.score - prevScoreRef.current;
            const id = floatIdRef.current++;
            setScoreFloats(prev => [...prev, { id, score: diff }]);
        }
        prevScoreRef.current = gameState.score;
    }, [gameState.score]);

    const handleScoreFloatComplete = useCallback((id: number) => {
        setScoreFloats(prev => prev.filter(f => f.id !== id));
    }, []);

    const handleKeyDown = useCallback(
        (e: KeyboardEvent) => {
            if (gameState.status === 'won' || gameState.status === 'over') return;

            let direction: Direction | null = null;
            switch (e.key) {
                case 'ArrowUp':
                    direction = 'up';
                    break;
                case 'ArrowDown':
                    direction = 'down';
                    break;
                case 'ArrowLeft':
                    direction = 'left';
                    break;
                case 'ArrowRight':
                    direction = 'right';
                    break;
            }
            if (direction) {
                e.preventDefault(); // Prevent page scroll
                setGameState((prev) => moveGrid(prev, direction!));
            }
        },
        [gameState.status]
    );

    useEffect(() => {
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [handleKeyDown]);

    const resetGame = () => {
        setGameState(initializeGame(4, true));
        setScoreFloats([]);
    };

    const handleUndo = () => {
        if (gameState.history.length > 0) {
            setGameState(prev => undoMove(prev));
        }
    };

    const handleContinue = () => {
        setGameState(prev => continueGame(prev));
    };

    const handleTouchStart = (e: React.TouchEvent) => {
        if (gameState.status === 'won' || gameState.status === 'over') return;
        setTouchStart({ x: e.touches[0].clientX, y: e.touches[0].clientY });
    };

    const handleTouchEnd = (e: React.TouchEvent) => {
        if (!touchStart || gameState.status === 'won' || gameState.status === 'over') return;

        const touchEnd = { x: e.changedTouches[0].clientX, y: e.changedTouches[0].clientY };
        const dx = touchEnd.x - touchStart.x;
        const dy = touchEnd.y - touchStart.y;

        const absDx = Math.abs(dx);
        const absDy = Math.abs(dy);

        if (Math.max(absDx, absDy) > 30) {
            let direction: Direction | null = null;
            if (absDx > absDy) {
                direction = dx > 0 ? 'right' : 'left';
            } else {
                direction = dy > 0 ? 'down' : 'up';
            }

            if (direction) {
                setGameState((prev) => moveGrid(prev, direction!));
            }
        }
        setTouchStart(null);
    };

    const getTiles = (): TileData[] => {
        const tiles: TileData[] = [];
        gameState.grid.forEach((row) => {
            row.forEach((cell) => {
                if (cell) tiles.push(cell);
            });
        });
        return tiles;
    };

    return (
        <div
            style={{
                padding: '16px 20px',
                maxWidth: '500px',
                width: '100%',
                margin: '0 auto',
                display: 'flex',
                flexDirection: 'column',
                height: '100vh',
                boxSizing: 'border-box'
            }}
            onTouchStart={handleTouchStart}
            onTouchEnd={handleTouchEnd}
        >
            <header style={{ width: '100%', marginBottom: '16px' }}>
                <h1 className="title" style={{ textAlign: 'center', margin: '4px 0 16px 0', lineHeight: 1 }}>2048</h1>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%', gap: '10px' }}>
                    <div style={{ display: 'flex', gap: '8px' }}>
                        <button
                            onClick={handleUndo}
                            disabled={gameState.history.length === 0}
                            style={{
                                backgroundColor: gameState.history.length > 0 ? '#8f7a66' : '#dcb08f',
                                color: '#f9f6f2',
                                border: 'none',
                                borderRadius: '6px',
                                padding: '8px 16px',
                                fontSize: '15px',
                                fontWeight: 'bold',
                                cursor: gameState.history.length > 0 ? 'pointer' : 'default',
                                transition: 'transform 0.1s, background-color 0.2s',
                                userSelect: 'none'
                            }}
                            onMouseDown={(e) => { if (gameState.history.length > 0) e.currentTarget.style.transform = 'scale(0.95)' }}
                            onMouseUp={(e) => { if (gameState.history.length > 0) e.currentTarget.style.transform = 'scale(1)' }}
                            onMouseLeave={(e) => { if (gameState.history.length > 0) e.currentTarget.style.transform = 'scale(1)' }}
                        >
                            Undo
                        </button>
                        <button
                            onClick={resetGame}
                            style={{
                                backgroundColor: '#8f7a66',
                                color: '#f9f6f2',
                                border: 'none',
                                borderRadius: '6px',
                                padding: '8px 16px',
                                fontSize: '15px',
                                fontWeight: 'bold',
                                cursor: 'pointer',
                                transition: 'transform 0.1s, background-color 0.2s',
                                userSelect: 'none'
                            }}
                            onMouseDown={(e) => e.currentTarget.style.transform = 'scale(0.95)'}
                            onMouseUp={(e) => e.currentTarget.style.transform = 'scale(1)'}
                            onMouseLeave={(e) => e.currentTarget.style.transform = 'scale(1)'}
                        >
                            New Game
                        </button>
                    </div>

                    <div style={{ display: 'flex', gap: '8px' }}>
                        <div style={{ backgroundColor: '#bbada0', color: 'white', padding: '6px 14px', borderRadius: '6px', textAlign: 'center', fontWeight: 'bold', position: 'relative', minWidth: '65px' }}>
                            <div style={{ fontSize: '11px', textTransform: 'uppercase', color: '#eee4da', letterSpacing: '0.05em' }}>Score</div>
                            <div style={{ fontSize: '20px', lineHeight: '1.2' }}>{gameState.score}</div>
                            {scoreFloats.map(f => (
                                <ScoreFloat key={`float-${f.id}`} score={f.score} onComplete={() => handleScoreFloatComplete(f.id)} />
                            ))}
                        </div>
                        <div style={{ backgroundColor: '#bbada0', color: 'white', padding: '6px 14px', borderRadius: '6px', textAlign: 'center', fontWeight: 'bold', minWidth: '65px' }}>
                            <div style={{ fontSize: '11px', textTransform: 'uppercase', color: '#eee4da', letterSpacing: '0.05em' }}>Best</div>
                            <div style={{ fontSize: '20px', lineHeight: '1.2' }}>{gameState.bestScore}</div>
                        </div>
                    </div>
                </div>
            </header>

            <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', width: '100%', minHeight: 0, paddingBottom: '16px' }}>
                <div style={{
                    position: 'relative',
                    backgroundColor: 'var(--bg-board)',
                    padding: '15px',
                    borderRadius: '6px',
                    width: '100%',
                    aspectRatio: '1/1',
                    maxHeight: '100%',
                    boxSizing: 'border-box'
                }}>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gridTemplateRows: 'repeat(4, 1fr)', gap: '15px', width: '100%', height: '100%' }}>
                    {Array.from({ length: 16 }).map((_, idx) => (
                        <div key={`empty-${idx}`} style={{ backgroundColor: 'var(--bg-cell-empty)', borderRadius: '3px', width: '100%', height: '100%' }} />
                    ))}
                </div>

                <div style={{ position: 'absolute', top: '15px', left: '15px', right: '15px', bottom: '15px' }}>
                    {getTiles().map((tile) => (
                        <Tile key={tile.id} tile={tile} />
                    ))}
                </div>

                {gameState.status === 'won' && (
                    <div style={{
                        position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
                        backgroundColor: 'rgba(237, 194, 46, 0.5)',
                        display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center',
                        borderRadius: '6px', zIndex: 100,
                        animation: 'fade-in 800ms ease 800ms both'
                    }}>
                        <h2 style={{ fontSize: '60px', fontWeight: 'bold', color: '#f9f6f2', margin: 0, textShadow: '0 2px 4px rgba(0,0,0,0.3)' }}>You Win!</h2>
                        <div style={{ display: 'flex', gap: '15px', marginTop: '20px' }}>
                            <button onClick={handleContinue} style={{ backgroundColor: '#8f7a66', color: '#f9f6f2', border: 'none', borderRadius: '6px', padding: '10px 20px', fontSize: '18px', fontWeight: 'bold', cursor: 'pointer' }}>
                                Keep going
                            </button>
                            <button onClick={resetGame} style={{ backgroundColor: '#8f7a66', color: '#f9f6f2', border: 'none', borderRadius: '6px', padding: '10px 20px', fontSize: '18px', fontWeight: 'bold', cursor: 'pointer' }}>
                                Try again
                            </button>
                        </div>
                    </div>
                )}

                {gameState.status === 'over' && (
                    <div style={{
                        position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
                        backgroundColor: 'rgba(238, 228, 218, 0.73)',
                        display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center',
                        borderRadius: '6px', zIndex: 100,
                        animation: 'fade-in 800ms ease 800ms both'
                    }}>
                        <h2 style={{ fontSize: '60px', fontWeight: 'bold', color: '#776e65', margin: 0 }}>Game Over!</h2>
                        <button onClick={resetGame} style={{ marginTop: '20px', backgroundColor: '#8f7a66', color: '#f9f6f2', border: 'none', borderRadius: '6px', padding: '10px 20px', fontSize: '18px', fontWeight: 'bold', cursor: 'pointer' }}>
                            Try again
                        </button>
                    </div>
                )}
            </div>
            </div>
        </div>
    );
};

export default GameContainer;
