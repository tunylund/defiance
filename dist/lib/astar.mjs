/**
 * All the glory to Eric Kuhn <digit.sensitivee@gmail.com>
 * for the original implementation.
 *
 * This is a shorter version with no external dependencies.
 * @license      {@link https://opensource.org/licenses/MIT|MIT License}
 */
const caches = new Map();
export function findPathCached(start, end, matrix, diagonalAllowed) {
    const cache = caches.get(matrix) || new Map();
    if (!caches.has(matrix)) {
        caches.set(matrix, cache);
    }
    const endNodeCache = cache.get(end.toString()) || [];
    const ix = endNodeCache.findIndex((p) => p.toString() === start.toString());
    if (ix > -1) {
        endNodeCache.slice(ix, endNodeCache.length - 1);
    }
    const result = findPath(start, end, matrix, diagonalAllowed);
    cache.set(end.toString(), result);
    return result;
}
export function clearCache() {
    caches.clear();
}
export function findPath(start, end, matrix, diagonalAllowed) {
    const grid = buildGrid(matrix);
    const openList = [];
    const closedList = new Set(grid
        .map((row) => row.filter((n) => !n.isWalkable))
        .reduce(flatten, []));
    const costNotDiagonal = 10;
    const costDiagonal = 14;
    if (start[0] < 0 || start[1] < 0) {
        return [];
    }
    if (end[0] < 0 || end[1] < 0) {
        return [];
    }
    if (start[0] > grid[0].length || start[1] > grid.length) {
        return [];
    }
    if (end[0] > grid[0].length || end[1] > grid.length) {
        return [];
    }
    if (!grid[end[1]][end[0]].isWalkable) {
        return [];
    }
    const startGridNode = grid[start[1]][start[0]];
    const endGridNode = grid[end[1]][end[0]];
    startGridNode.g = 0;
    startGridNode.h = 0;
    startGridNode.f = 0;
    openList.push(startGridNode);
    while (openList.length > 0) {
        const current = openList.shift();
        closedList.add(current);
        if (current === endGridNode) {
            return backtrace(endGridNode);
        }
        const neighbors = getSurrounding(grid, current.x, current.y, diagonalAllowed);
        for (const neighbor of neighbors) {
            if (closedList.has(neighbor)) {
                continue;
            }
            const cost = (neighbor.x === current.x || neighbor.y === current.y) ? costNotDiagonal : costDiagonal;
            const nextGValue = current.g + cost;
            if (!openList.includes(neighbor) || nextGValue < neighbor.g) {
                neighbor.g = nextGValue;
                neighbor.h = (Math.abs(neighbor.x - endGridNode.x) + Math.abs(neighbor.y - endGridNode.y)) * costNotDiagonal;
                neighbor.f = neighbor.g + neighbor.h;
                neighbor.parent = current;
                addToSortedList(openList, neighbor);
            }
        }
    }
    return [];
}
function getSurrounding(grid, x, y, diagonalMovementAllowed) {
    const adjacent = [
        (grid[y - 1] || [])[x], (grid[y + 1] || [])[x],
        (grid[y] || [])[x - 1], (grid[y] || [])[x + 1],
    ];
    const diagonal = [
        (grid[y - 1] || [])[x - 1], (grid[y - 1] || [])[x + 1],
        (grid[y + 1] || [])[x - 1], (grid[y + 1] || [])[x + 1],
    ];
    return new Set(adjacent.concat(diagonalMovementAllowed ? diagonal : []).filter((v) => typeof v !== 'undefined'));
}
function buildGrid(matrix) {
    return matrix
        .map((row, y) => row.map((col, x) => buildGridNode(x, y, !col)));
}
function buildGridNode(x, y, walkable) {
    return {
        x,
        y,
        h: 0,
        g: 0,
        f: 0,
        parent: undefined,
        isWalkable: walkable,
    };
}
function backtrace(gridNode) {
    const path = [];
    let currentGridNode = gridNode;
    while (currentGridNode.parent) {
        path.push([currentGridNode.x, currentGridNode.y]);
        currentGridNode = currentGridNode.parent;
    }
    path.push([currentGridNode.x, currentGridNode.y]);
    return path.reverse();
}
function flatten(memo, row) {
    return memo.concat(row);
}
function addToSortedList(items, item) {
    if (items.length > 0 && items[0].f > item.f) {
        items.unshift(item);
    }
    else {
        items.push(item);
        if (items.length >= 2 && items[items.length - 2].f > items[items.length - 1].f) {
            items.sort((a, b) => a.f < b.f ? -1 : a.f > b.f ? 1 : 0);
        }
    }
}
