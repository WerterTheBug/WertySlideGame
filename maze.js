/* =====================
   MAZE GENERATOR
   Generates playable mazes
   ===================== */
class MazeGenerator {
    constructor(cols, rows) {
        this.cols = cols % 2 !== 0 ? cols : cols + 1;
        this.rows = rows % 2 !== 0 ? rows : rows + 1;
        this.grid = Array(this.rows).fill().map(() => Array(this.cols).fill(1));
        this._generateRandomPositions();
    }

    _generateRandomPositions() {
        const oddRows = Math.floor((this.rows - 2) / 2);
        const oddCols = Math.floor((this.cols - 2) / 2);
        const startRow = 1 + Math.floor(Math.random() * oddRows) * 2;
        const startCol = 1 + Math.floor(Math.random() * oddCols) * 2;
        let endRow, endCol;
        do {
            endRow = 1 + Math.floor(Math.random() * oddRows) * 2;
            endCol = 1 + Math.floor(Math.random() * oddCols) * 2;
        } while (endRow === startRow && endCol === startCol);
        this.start = [startRow, startCol];
        this.end = [endRow, endCol];
    }

    generate() {
        let attempts = 0;
        while (true) {
            this._generateRandomPositions();
            this.grid = Array(this.rows).fill().map(() => Array(this.cols).fill(1));
            this._generateRecursive(this.start[0], this.start[1]);
            this._braidMaze();
            this.grid[this.start[0]][this.start[1]] = 0;
            this.grid[this.end[0]][this.end[1]] = 0;
            if (this._isSolvableBySliding()) break;
            attempts++;
            if (attempts > 50) break;
        }
    }

    _isSolvableBySliding() {
        const queue = [[...this.start]];
        const visited = new Set([this.start.join(',')]);
       
        while (queue.length > 0) {
            const [r, c] = queue.shift();
            if (r === this.end[0] && c === this.end[1]) return true;
           
            for (const [dr, dc] of [[0, 1], [0, -1], [1, 0], [-1, 0]]) {
                let [nr, nc] = [r, c];
                while (true) {
                    const [next_r, next_c] = [nr + dr, nc + dc];
                    if (next_r >= 0 && next_r < this.rows && next_c >= 0 && next_c < this.cols) {
                        if (this.grid[next_r][next_c] === 1) break;
                        [nr, nc] = [next_r, next_c];
                        if (nr === this.end[0] && nc === this.end[1]) break;
                    } else break;
                }
                const key = `${nr},${nc}`;
                if (!visited.has(key)) {
                    visited.add(key);
                    queue.push([nr, nc]);
                }
            }
        }
        return false;
    }

    _generateRecursive(r, c) {
        this.grid[r][c] = 0;
        const directions = [[0, 2], [0, -2], [2, 0], [-2, 0]];
        this._shuffle(directions);
       
        for (const [dr, dc] of directions) {
            const [nr, nc] = [r + dr, c + dc];
            if (nr > 0 && nr < this.rows && nc > 0 && nc < this.cols && this.grid[nr][nc] === 1) {
                this.grid[r + Math.floor(dr / 2)][c + Math.floor(dc / 2)] = 0;
                this._generateRecursive(nr, nc);
            }
        }
    }

    _braidMaze() {
        for (let r = 1; r < this.rows - 1; r += 2) {
            for (let c = 1; c < this.cols - 1; c += 2) {
                if (this.grid[r][c] === 0) {
                    const pathNeighbors = [[0, 1], [0, -1], [1, 0], [-1, 0]]
                        .filter(([dr, dc]) => this.grid[r + dr][c + dc] === 0).length;
                   
                    if (pathNeighbors === 1) {
                        const candidates = [];
                        for (const [dr, dc] of [[0, 2], [0, -2], [2, 0], [-2, 0]]) {
                            const [nr, nc] = [r + dr, c + dc];
                            const [wall_r, wall_c] = [r + Math.floor(dr / 2), c + Math.floor(dc / 2)];
                            if (nr > 0 && nr < this.rows && nc > 0 && nc < this.cols) {
                                if (this.grid[nr][nc] === 0 && this.grid[wall_r][wall_c] === 1) {
                                    candidates.push([wall_r, wall_c]);
                                }
                            }
                        }
                        if (candidates.length > 0) {
                            const [wr, wc] = candidates[Math.floor(Math.random() * candidates.length)];
                            this.grid[wr][wc] = 0;
                        }
                    }
                }
            }
        }
    }

    _shuffle(array) {
        for (let i = array.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [array[i], array[j]] = [array[j], array[i]];
        }
    }
}
