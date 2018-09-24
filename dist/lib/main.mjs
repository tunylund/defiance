import { intersects } from './../node_modules/tiny-game-engine/src/collision.mjs';
import Controls from './../node_modules/tiny-game-engine/src/controls.mjs';
import { dist, el, isAt, nearest, vectorTo } from './../node_modules/tiny-game-engine/src/el.mjs';
import { assignOnGrid, buildGrid, gridMatrixCorAt, gridTileCenterAt, snapToGridTileCenter, valueAtGrid, } from './../node_modules/tiny-game-engine/src/grid.mjs';
import loop from './../node_modules/tiny-game-engine/src/loop.mjs';
import { move, position } from './../node_modules/tiny-game-engine/src/position.mjs';
import { timeBasedTurn } from './../node_modules/tiny-game-engine/src/turn.mjs';
import { unit, xyz } from './../node_modules/tiny-game-engine/src/xyz.mjs';
import { findPathCached } from './astar.mjs';
import { blobDrawing, drawGame, effectDrawing, laserDrawing, laserTowerDrawing, pelletDrawing, pelletTowerDrawing, rayDrawing, rayTowerDrawing, sparkDrawing, sparkTowerDrawing, speedyDrawing, thugDrawing, wallTowerDrawing, } from './graphics.mjs';
function isProjectileTowerEl(v) {
    return v.hasOwnProperty('projectileBuilder');
}
function isBeamTowerEl(v) {
    return v.hasOwnProperty('beamBuilder');
}
function isInactiveTowerEl(v) {
    return !v.hasOwnProperty('base');
}
const id = (function* idIterator(n = 0) { while (n < Infinity) {
    yield n++;
} })();
const TILE_SIZE = xyz(8, 8, 8);
export const towerDesigns = {
    KeyQ: {
        id: -1, pos: position(), dim: TILE_SIZE, base: {}, path: [], target: null,
        projectileBuilder: buildPellets, drawing: pelletTowerDrawing,
        health: 10, cost: 20, radius: 100, fireRate: 500, energy: 100, maxEnergy: 100, power: 4, bulletSpeed: 400,
    },
    KeyW: {
        id: -1, pos: position(), dim: TILE_SIZE, base: {}, path: [], target: null,
        projectileBuilder: buildLasers, drawing: laserTowerDrawing,
        health: 10, cost: 30, radius: 80, fireRate: 125, energy: 100, maxEnergy: 100, power: 2, bulletSpeed: 800,
    },
    KeyE: {
        id: -1, pos: position(), dim: TILE_SIZE, base: {}, path: [], target: null,
        beamBuilder: buildRays, drawing: rayTowerDrawing,
        health: 10, cost: 50, radius: 160, energy: 100, maxEnergy: 100,
        powerConsumptionOnHit: 20, powerConsumptionOnIdle: 1,
    },
    KeyS: {
        id: -1, pos: position(), dim: TILE_SIZE, base: {}, path: [], target: null,
        beamBuilder: buildSparks, drawing: sparkTowerDrawing,
        health: 10, cost: 40, radius: 80, energy: 100, maxEnergy: 100,
        powerConsumptionOnHit: 20, powerConsumptionOnIdle: 2,
    },
    KeyA: {
        id: -1, pos: position(), dim: TILE_SIZE,
        drawing: wallTowerDrawing,
        health: 100, cost: 1,
    },
};
const enemyDesigns = [{
        pos: position(), dim: unit(8), drawing: thugDrawing, path: [],
        health: 20, speed: 30, price: 6,
    }, {
        pos: position(), dim: unit(6), drawing: blobDrawing, path: [],
        health: 12, speed: 40, price: 2,
    }, {
        pos: position(), dim: unit(4), drawing: speedyDrawing, path: [],
        health: 8, speed: 80, price: 4,
    }];
const game = {
    spawnPoints: [],
    obstacles: [],
    bullets: [],
    beams: [],
    effects: [],
    bases: [{
            id: id.next().value,
            pos: position(),
            dim: TILE_SIZE,
            health: 100,
            energyDispenseAmount: 10,
            energy: 100,
            energyIncreaseRate: 1000,
        }],
    projectileTowerEls: [],
    beamTowerEls: [],
    inactiveTowerEls: [],
    enemies: [],
    drawables: [],
    money: 75,
    level: 0,
    grid: buildGrid(TILE_SIZE.mul(xyz(1, 1, 0)), xyz(window.innerWidth, window.innerHeight), true),
};
const controls = new Controls(window, true);
controls.onKeyDown((key, isRepeat) => {
    const towerChoice = towerDesigns[key];
    if (isRepeat || !towerChoice || towerChoice.cost > game.money) {
        return;
    }
    if (valueAtGrid(game.grid, controls.cor) === 1) {
        return;
    }
    const powerSources = game.bases.concat(game.spawnPoints.filter((s) => s.spawnCount === 0));
    const base = nearest(powerSources, controls.cor);
    if (!base || !canAccessAllBases(game.bases, assignOnGrid(game.grid, controls.cor, 1))) {
        return;
    }
    const cor = snapToGridTileCenter(game.grid, controls.cor);
    if (isProjectileTowerEl(towerChoice)) {
        game.projectileTowerEls.push(buildTower(cor, towerChoice, base, game.grid));
    }
    if (isBeamTowerEl(towerChoice)) {
        game.beamTowerEls.push(buildTower(cor, towerChoice, base, game.grid));
    }
    if (isInactiveTowerEl(towerChoice)) {
        game.inactiveTowerEls.push(buildInactiveTower(cor, towerChoice));
    }
    game.money -= towerChoice.cost;
    game.grid = assignObstacleMatrix([]
        .concat(game.obstacles)
        .concat(game.projectileTowerEls)
        .concat(game.beamTowerEls)
        .concat(game.inactiveTowerEls)
        .concat(game.spawnPoints), game.grid);
    game.enemies.map((e) => e.path = []);
});
const stopGameLoop = loop((step, gameTime) => {
    if (game.obstacles.length === 0) {
        game.obstacles = buildBlockObstacles(game.bases, game.grid); // buildMazeObstacles(game.bases, game.grid)
        game.grid = assignObstacleMatrix([]
            .concat(game.obstacles)
            .concat(game.projectileTowerEls)
            .concat(game.beamTowerEls)
            .concat(game.inactiveTowerEls)
            .concat(game.spawnPoints), game.grid);
    }
    game.spawnPoints.map((s) => {
        if (timeBasedTurn(`energyincrease-${s.id}`, s.energyIncreaseRate)) {
            s.energy += 100;
        }
        if (s.spawnCount > 0 && timeBasedTurn(`spawn-swarm-enemy-${s.id}`, s.enemyRate)) {
            game.enemies = game.enemies.concat(buildEnemies(random(s.enemyDesigns), s.pos.cor));
            s.spawnCount -= 1;
            if (s.spawnCount === 0) {
                game.enemies.map((e) => e.path = []);
            }
        }
    });
    if (timeBasedTurn('spawn-swarm', 5000)) {
        game.level += 1;
        game.spawnPoints.push(buildSpawnPoint(game.grid, game.level));
    }
    game.enemies.map((e) => {
        const target = nearest(game.bases, e.pos.cor);
        if (target && e.path.length === 0) {
            e.path = pathTo(e.pos.cor, target, game.grid);
        }
        if (e.path.length > 0) {
            const a = isAt(e, e.path[0], TILE_SIZE);
            e.path = a ? e.path.splice(1) : e.path;
            e.pos.vel = vectorTo(e, el(position(e.path[0]), TILE_SIZE), e.speed);
        }
        else {
            e.pos.vel = xyz();
        }
    });
    game.projectileTowerEls.map((e) => {
        e.target = nearest(game.enemies, e.pos.cor);
        if (e.energy > 0 && timeBasedTurn(`shoot-${e.id}`, e.fireRate)) {
            const bullets = e.projectileBuilder(e, game.enemies);
            game.bullets = game.bullets.concat(bullets);
            e.energy -= bullets.reduce((sum, b) => sum + b.power, 0);
        }
    });
    game.beamTowerEls.map((e) => {
        e.target = nearest(game.enemies, e.pos.cor);
        if (e.energy > 0) {
            const beams = e.beamBuilder(e, game.enemies, game.beamTowerEls, game.beams);
            game.beams = game.beams.concat(beams);
            e.energy -= beams.reduce((sum, b) => sum + e.powerConsumptionOnIdle, 0);
        }
    });
    game.projectileTowerEls.map((e) => refuel(e, gameTime));
    game.beamTowerEls.map((e) => refuel(e, gameTime));
    game.bases.map((b) => {
        if (timeBasedTurn(`energyincrease-${b.id}`, b.energyIncreaseRate)) {
            b.energy += 100;
        }
        game.enemies.map((e) => {
            if (intersects(e, b)) {
                e.health = 0;
                b.health -= 1;
                game.effects = game.effects.concat(buildExplosion(e.pos.cor));
            }
        });
    });
    game.bullets.map((b) => {
        game.enemies.map((e) => {
            if (intersects(b, e)) {
                b.health -= 1;
                e.health -= b.power;
                if (e.health <= 0) {
                    game.money += e.price;
                }
                game.effects = game.effects.concat(buildExplosion(b.pos.cor));
            }
        });
    });
    game.beams.map((b) => {
        b.components = range(dist(b.start, b.end), TILE_SIZE.size)
            .map((c) => vectorTo(b.start, b.end, c))
            .map((c) => el(position(b.start.pos.cor.add(c)), TILE_SIZE));
        game.enemies.map((e) => {
            const intersectingBeamComponents = b.components.filter((bt) => intersects(bt, e));
            if (intersectingBeamComponents.length > 0) {
                if (timeBasedTurn(`beam-hit-${b.id}`, 250)) {
                    b.powerSource.energy -= b.powerSource.powerConsumptionOnHit;
                    e.health -= b.powerSource.powerConsumptionOnHit;
                    if (e.health <= 0) {
                        game.money += e.price;
                    }
                    game.effects = game.effects.concat(buildExplosion(e.pos.cor));
                }
            }
        });
    });
    game.bullets.map((e) => e.pos = move(e.pos, step));
    game.enemies.map((e) => e.pos = move(e.pos, step));
    game.effects.map((e) => {
        e.health -= step;
        e.dim = move(position(e.dim, xyz(e.speed, e.speed)), step).cor;
    });
    drawGame(game, controls, gameTime);
    game.bases = game.bases.filter(isNotRemovable);
    game.bullets = game.bullets.filter(isNotRemovable);
    game.beams = game.beams.filter((beam) => {
        return beam.powerSource.energy > 0 &&
            dist(beam.start, beam.end) < beam.range &&
            beam.start.health > 0 &&
            beam.end.health > 0;
    });
    game.enemies = game.enemies.filter(isNotRemovable);
    game.projectileTowerEls = game.projectileTowerEls.filter(isNotRemovable);
    game.beamTowerEls = game.beamTowerEls.filter(isNotRemovable);
    game.effects = game.effects.filter(isNotRemovable);
    if (game.bases.length === 0) {
        stopGameLoop();
    }
});
function refuel(e, gameTime) {
    if (e.base) {
        const t = Math.floor(gameTime / 200);
        if (t % (e.path.length - 1) === 0) {
            e.energy = Math.min(e.maxEnergy, e.energy + e.base.energyDispenseAmount);
        }
    }
}
function assignObstacleMatrix(obstacles, grid) {
    grid = grid || buildGrid(TILE_SIZE.mul(xyz(1, 1, 0)), xyz(window.innerWidth, window.innerHeight), true);
    return obstacles.reduce((g, o) => assignOnGrid(g, o.pos.cor, 1, o.dim), grid);
}
function pathTo(cor, target, grid, allowDiagonal = false) {
    const from = gridMatrixCorAt(grid, cor), to = gridMatrixCorAt(grid, target.pos.cor);
    return findPathCached([from.x, from.y], [to.x, to.y], assignOnGrid(grid, target.pos.cor, 0).matrix, allowDiagonal)
        .map((c) => gridTileCenterAt(grid, xyz(c[0], c[1])));
}
function isNotRemovable(e) {
    return !(isRemovable(e));
}
function isRemovable(e) {
    return isOutSideViewPort(e) || e.health <= 0;
}
function isOutSideViewPort(e) {
    const w2 = window.innerWidth / 2, h2 = window.innerHeight / 2;
    return e.pos.cor.x < -w2 || e.pos.cor.x > w2 ||
        e.pos.cor.y < -h2 || e.pos.cor.y > h2;
}
function buildExplosion(cor) {
    return [{ pos: position(cor), dim: xyz(10, 10), health: 2, speed: 20, drawing: effectDrawing }];
}
function buildSpawnPoint(grid, level) {
    let cor = snapToGridTileCenter(grid, randomCorCloseToEdge());
    while (valueAtGrid(grid, cor) === 1) {
        cor = snapToGridTileCenter(grid, randomCorCloseToEdge());
    }
    return {
        id: id.next().value, pos: position(cor),
        dim: TILE_SIZE, health: 1000, enemyRate: Math.max(400, 3000 - Math.pow(level * 10, 2)),
        spawnCount: 8 + level * 2,
        enemyDesigns: enemyDesigns.slice(0, level),
        energyDispenseAmount: 10, energy: 100, energyIncreaseRate: 3000,
    };
}
function canAccessAllBases(bases, grid) {
    return bases
        .map((base) => gridMatrixCorAt(grid, base.pos.cor))
        .filter((cor) => findPathCached([0, 0], [cor.x, cor.y], grid.matrix, false).length > 0)
        .length === bases.length;
}
function randomCorOffCenter(distFromCenter, bases, grid) {
    return snapToGridTileCenter(grid, random([
        xyz(random([-distFromCenter, distFromCenter]), randomBetween(-distFromCenter, distFromCenter)),
        xyz(randomBetween(-distFromCenter, distFromCenter), random([-distFromCenter, distFromCenter])),
    ]).mul(grid.tileSize));
}
function randomAccessibleCorOffCenter(distFromCenter, bases, grid) {
    let cor = randomCorOffCenter(distFromCenter, bases, grid);
    while (valueAtGrid(grid, cor) === 1 || !canAccessAllBases(bases, assignOnGrid(grid, cor, 1))) {
        cor = randomCorOffCenter(distFromCenter, bases, grid);
    }
    return cor;
}
function* levelGenerator(distFromCenter, maxDist, fillage, bases, grid) {
    for (let obsCount = 0; distFromCenter < maxDist; obsCount++) {
        if (obsCount >= (distFromCenter * 8) * fillage || obsCount >= (distFromCenter * 8) - 5) {
            obsCount = 0;
            distFromCenter += 4;
        }
        const cor = randomAccessibleCorOffCenter(distFromCenter, bases, grid);
        grid = assignOnGrid(grid, cor, 1);
        yield cor;
    }
}
function buildMazeObstacles(bases, grid) {
    const result = [];
    const levelGen = levelGenerator(2, Math.min(grid.dim2.x, grid.dim2.y), 1, bases, grid);
    for (let level = levelGen.next(); !level.done; level = levelGen.next()) {
        result.push(level.value);
    }
    return result.map((cor) => ({ pos: position(cor), dim: TILE_SIZE, health: 1000 }));
}
function randomXYZIn(dim) {
    return xyz(randomBetween(0, dim.x), randomBetween(0, dim.y), randomBetween(0, dim.z));
}
function* blockObstacleGenerator(bases, grid) {
    const rand = () => snapToGridTileCenter(grid, randomXYZIn(grid.dim).sub(grid.dim2).mul(grid.tileSize));
    while (true) {
        let cor = rand();
        const dim = TILE_SIZE.mul(unit(random([5, 7, 9, 11])));
        while (!cor || valueAtGrid(grid, cor) === 1 || !canAccessAllBases(bases, assignOnGrid(grid, cor, 1, dim))) {
            cor = rand();
        }
        yield { pos: position(cor), dim, health: 1000 };
    }
}
function buildBlockObstacles(bases, grid) {
    const fillage = 0.5, result = [], gridSize = grid.dim.mul(grid.tileSize), maxArea = gridSize.x * gridSize.y;
    const blockObstacleGen = blockObstacleGenerator(bases, grid);
    while (result.reduce((area, o) => area + o.dim.x * o.dim.y, 0) < maxArea * fillage) {
        let no = blockObstacleGen.next();
        while (result.reduce((r, o) => r || intersects(o, no.value), false)) {
            no = blockObstacleGen.next();
        }
        result.push(no.value);
    }
    return result;
}
function buildPellets(tower, enemies) {
    return tower.target && dist(tower, tower.target) <= tower.radius ? [{
            pos: position(tower.pos.cor, vectorTo(tower, tower.target, tower.bulletSpeed)),
            dim: unit(2), health: 1, drawing: pelletDrawing, power: tower.power,
        }] : [];
}
function buildLasers(tower, enemies) {
    return tower.target && dist(tower, tower.target) <= tower.radius ? [{
            pos: position(tower.pos.cor, vectorTo(tower, tower.target, tower.bulletSpeed)),
            dim: unit(2), health: 1, drawing: laserDrawing, power: tower.power,
        }] : [];
}
function buildSparks(tower, enemies, towers, beams) {
    return towers
        .filter((t) => t.beamBuilder === buildSparks && t !== tower)
        .filter((t) => dist(tower, t) <= tower.radius)
        .filter((t) => beams.filter((b) => [b.start, b.end].includes(t) && [b.start, b.end].includes(tower)).length === 0)
        .map((t) => ({
        id: id.next().value, start: tower, end: t, powerSource: tower,
        range: tower.radius, drawing: sparkDrawing, components: [],
    }));
}
function buildRays(tower, enemies, towers, beams) {
    const enemy = nearest(enemies, tower.pos.cor);
    return enemy && dist(tower, enemy) <= tower.radius && beams.filter((b) => b.start === tower).length === 0 ? [{
            id: id.next().value, start: tower, end: enemy, powerSource: tower,
            range: tower.radius, drawing: rayDrawing, components: [],
        }] : [];
}
function buildEnemies(enemyDesign, cor) {
    return [Object.assign({}, enemyDesign, { pos: position(cor) })];
}
function buildTower(cor, towerDesign, base, grid) {
    return Object.assign({}, towerDesign, {
        id: id.next().value, pos: position(cor), base,
        path: [cor].concat(pathTo(cor, el(base.pos, TILE_SIZE), grid, true)),
    });
}
function buildInactiveTower(cor, towerDesign) {
    return Object.assign({}, towerDesign, { id: id.next().value, pos: position(cor) });
}
function random(arr) {
    return arr[randomBetween(0, arr.length)];
}
export function randomBetween(min, max) {
    return Math.floor(Math.random() * (max - min)) + min;
}
function randomCorCloseToEdge() {
    const padding = 8 * 8, w = window.innerWidth / 2 - padding, h = window.innerHeight / 2 - padding;
    return xyz(randomBetween(-w, w), randomBetween(-h, h));
}
function range(max, step) {
    const result = [];
    for (let i = 0; i < max; i += step) {
        result.push(i);
    }
    return result;
}
