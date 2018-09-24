import { draw } from './../node_modules/tiny-game-engine/src/draw.mjs';
import { vectorTo } from './../node_modules/tiny-game-engine/src/el.mjs';
import { gridStep, snapToGridTileCenter } from './../node_modules/tiny-game-engine/src/grid.mjs';
import { position } from './../node_modules/tiny-game-engine/src/position.mjs';
import { negone, one, unit, vector2, xyz } from './../node_modules/tiny-game-engine/src/xyz.mjs';
import { randomBetween, towerDesigns, } from './main.mjs';
const SATURATION = 44;
const LIGHTING = 66;
const BLACK = xyzAsHsla(xyz(), 1);
const WHITE = xyzAsHsla(xyz(0, 0, 100), 1);
const topColor = xyz(randomBetween(0, 360), SATURATION, LIGHTING);
const bottomColor = topColor.add(xyz(randomBetween(30, 120)));
const radiusColor = xyzAsHsla(topColor.sub(xyz(50, 0, 50)), 0.15);
export function drawGame(game, controls, gameTime) {
    draw((ctx, cw, ch) => backgroundDrawing(ctx, cw, ch, game), position(), xyz());
    game.spawnPoints.map((e) => draw((ctx) => spawnPointDrawing(ctx, e), e.pos, e.dim));
    draw((ctx, cw, ch) => {
        game.projectileTowerEls.map((t) => pipeworksDrawing(ctx, cw, ch, t.path, gameTime));
        game.beamTowerEls.map((t) => pipeworksDrawing(ctx, cw, ch, t.path, gameTime));
    }, position(), xyz());
    game.obstacles.map((o) => draw((ctx, cw, ch) => obstacleDrawing(ctx, ch, o), o.pos, o.dim));
    game.projectileTowerEls.map((e) => draw((ctx) => e.drawing(ctx, e), e.pos, e.dim));
    game.beamTowerEls.map((e) => draw((ctx) => e.drawing(ctx, e), e.pos, e.dim));
    game.inactiveTowerEls.map((e) => draw((ctx) => e.drawing(ctx, e), e.pos, e.dim));
    game.enemies.map((e) => draw((ctx, cw, ch) => e.drawing(ctx, cw, ch, e, gameTime, game), e.pos, e.dim));
    game.bases.map((e) => draw((ctx) => baseDrawing(ctx, e, gameTime), e.pos, e.dim));
    game.bullets.map((e) => draw((ctx, cw, ch) => e.drawing(ctx, cw, ch, e, gameTime, game), e.pos, e.dim));
    game.beams.map((e) => draw((ctx) => e.drawing(ctx, e), e.start.pos, e.start.dim));
    game.effects.map((e) => draw((ctx, cw, ch) => e.drawing(ctx, cw, ch, e, gameTime, game), e.pos, e.dim));
    draw((ctx, cw, ch) => {
        const moneyDim = xyz(game.money, 2), moneyCor = xyz(-cw + moneyDim.x2, -ch + moneyDim.y2);
        rectangle(ctx, moneyCor, moneyDim, xyzAsHsla(xyz(60, SATURATION + 40, LIGHTING), 1));
        game.bases.map((b, i) => {
            const healthDim = xyz(b.health, 2), healthCor = xyz(-cw + healthDim.x2, -ch + healthDim.y2 + moneyDim.y + i * healthDim.y);
            rectangle(ctx, healthCor, healthDim, xyzAsHsla(xyz(0, SATURATION + 40, LIGHTING), 1));
        });
        rectangle(ctx, snapToGridTileCenter(game.grid, controls.cor), game.grid.tileSize, xyzAsHsla(xyz(0, 0, 0), 0.4));
        ctx.fillStyle = WHITE;
        Object.values(towerDesigns).map((towerDesign, i) => {
            const count = Math.floor(game.money / towerDesign.cost);
            const name = towerDesign.drawing.name.replace('Drawing', '');
            ctx.fillText(`${count} ${name}`, -cw + 20, -ch + 24 + i * game.grid.tileSize.y * 2);
        });
    }, position(0, 0, 100), xyz());
}
function obstacleDrawing(ctx, ch, obstacle) {
    const bgGradient = ctx.createLinearGradient(0, 0, 0, ch);
    bgGradient.addColorStop(0, xyzAsHsla(topColor.sub(xyz(0, 0, 10)), 1));
    bgGradient.addColorStop(1, xyzAsHsla(bottomColor.sub(xyz(0, 0, 10)), 1));
    rectangle(ctx, obstacle.pos.cor, obstacle.dim, bgGradient);
}
function backgroundDrawing(ctx, cw, ch, gme) {
    const bgGradient = ctx.createLinearGradient(0, 0, 0, ch);
    const gridShadowColor = 'rgba(255, 255, 255, 0.1)';
    const gridColor = 'rgba(90, 90, 90, 0.2)';
    bgGradient.addColorStop(0, xyzAsHsla(topColor, 1));
    bgGradient.addColorStop(1, xyzAsHsla(bottomColor, 1));
    ctx.fillStyle = bgGradient;
    ctx.fillRect(-cw, -ch, cw * 2, ch * 2);
    gridStep(gme.grid, (cor) => {
        line(ctx, [xyz(cor.x - 1, -ch), xyz(cor.x - 1, ch)], gridShadowColor);
        line(ctx, [xyz(-cw, cor.y - 1), xyz(cw, cor.y - 1)], gridShadowColor);
        line(ctx, [xyz(cor.x, -ch), xyz(cor.x, ch)], gridColor);
        line(ctx, [xyz(-cw, cor.y), xyz(cw, cor.y)], gridColor);
    });
}
export function pelletTowerDrawing(ctx, tower) {
    circle(ctx, tower.pos.cor, tower.radius, undefined, radiusColor);
    circle(ctx, tower.pos.cor, tower.dim.x2 - 2, xyzAsHsla((xyz(0, 0, 100)), tower.energy / 100), WHITE);
    line(ctx, [tower.pos.cor, tower.target ?
            tower.pos.cor.add(vectorTo(tower, tower.target, tower.dim.x)) :
            tower.pos.cor], 'rgba(255, 255, 155, 1)');
}
export function laserTowerDrawing(ctx, tower) {
    circle(ctx, tower.pos.cor, tower.radius, undefined, radiusColor);
    rectangle(ctx, tower.pos.cor, tower.dim.sub(unit(2)), xyzAsHsla((xyz(0, 0, 100)), tower.energy / 100), WHITE);
    line(ctx, [tower.pos.cor, tower.target ?
            tower.pos.cor.add(vectorTo(tower, tower.target, tower.dim.x)) :
            tower.pos.cor], 'rgba(155, 255, 155, 1)');
}
export function sparkTowerDrawing(ctx, tower) {
    circle(ctx, tower.pos.cor, tower.radius, undefined, radiusColor);
    rectangle(ctx, tower.pos.cor, tower.dim.sub(unit(2)), xyzAsHsla(xyz(0, 0, 90), tower.energy / 100), WHITE);
    const d = tower.dim.x2, a = xyz(Math.random() > 0.5 ? -d : d, Math.random() > 0.5 ? -d : d), b = xyz(Math.random() > 0.5 ? -d : d, Math.random() > 0.5 ? -d : d);
    line(ctx, [tower.pos.cor, tower.pos.cor.add(a)], xyzAsHsla(xyz(210, SATURATION, LIGHTING), 1));
    line(ctx, [tower.pos.cor, tower.pos.cor.add(b)], xyzAsHsla(xyz(210, SATURATION, LIGHTING), 1));
}
export function rayTowerDrawing(ctx, tower) {
    const orange = xyzAsHsla(xyz(30, SATURATION, LIGHTING), 1);
    circle(ctx, tower.pos.cor, tower.radius, undefined, radiusColor);
    circle(ctx, tower.pos.cor, tower.dim.x2 - 2, xyzAsHsla(xyz(0, 0, 100), tower.energy / 100), WHITE);
    line(ctx, [tower.pos.cor, tower.target ?
            tower.pos.cor.add(vectorTo(tower, tower.target, tower.dim.x)) :
            tower.pos.cor], orange);
}
export function wallTowerDrawing(ctx, tower) {
    rectangle(ctx, tower.pos.cor, tower.dim.sub(unit(2)), xyzAsHsla(xyz(0, 0, 90), 1), xyzAsHsla(xyz(0, 0, tower.health), 1));
}
function spawnPointDrawing(ctx, e) {
    const bgGradient = ctx.createLinearGradient(0, 0, 0, window.innerHeight / 2);
    bgGradient.addColorStop(0, xyzAsHsla(topColor.sub(xyz(0, 0, 30)), 1));
    bgGradient.addColorStop(1, xyzAsHsla(bottomColor.sub(xyz(0, 0, 30)), 1));
    if (e.spawnCount > 0) {
        circle(ctx, e.pos.cor, e.dim.x2 + Math.sqrt(e.spawnCount), xyzAsHsla(bottomColor.sub(xyz(0, 0, 30)), 0.75));
    }
    rectangle(ctx, e.pos.cor, e.dim.sub(unit(2)), bgGradient, e.spawnCount > 0 ? undefined : xyzAsHsla(topColor, 1));
}
export function blobDrawing(ctx, cw, ch, e, gameTime) {
    const c = xyzAsHsla(bottomColor.add(xyz(20, 50)), 1);
    const headOffset = 4 + ((Math.floor(gameTime / 100)) % 2);
    const headCor = e.pos.cor.add(vector2(e.pos.vel.radian, headOffset));
    circle(ctx, e.pos.cor, e.dim.x2, c);
    circle(ctx, headCor, e.dim.x2 / 4, c);
}
export function speedyDrawing(ctx, cw, ch, e, gameTime) {
    const c = bottomColor.add(xyz(20, 50));
    const tailDir = e.pos.vel.mul(negone).radian;
    circle(ctx, e.pos.cor, e.dim.x2, xyzAsHsla(c, 1));
    circle(ctx, e.pos.cor.add(vector2(tailDir, 4)), e.dim.x2 / 2, xyzAsHsla(c, 0.75));
    circle(ctx, e.pos.cor.add(vector2(tailDir, 6)), e.dim.x2 / 4, xyzAsHsla(c, 0.5));
    circle(ctx, e.pos.cor.add(vector2(tailDir, 8)), e.dim.x2 / 6, xyzAsHsla(c, 0.25));
}
export function thugDrawing(ctx, cw, ch, e) {
    const c = bottomColor.add(xyz(20, 50));
    rectangle(ctx, e.pos.cor, e.dim.sub(one), xyzAsHsla(c, 1), xyzAsHsla(c.sub(xyz(0, 0, 10)), 1));
}
export function pelletDrawing(ctx, cw, ch, e) {
    circle(ctx, e.pos.cor, e.dim.x2 / 2, 'rgba(255, 255, 155, 1)');
}
export function laserDrawing(ctx, cw, ch, e) {
    line(ctx, [e.pos.cor, e.pos.cor.add(vector2(e.pos.vel.radian, 8))], 'rgba(155, 255, 155, 1)');
}
export function rayDrawing(ctx, beam) {
    line(ctx, [beam.start.pos.cor, beam.end.pos.cor], xyzAsHsla(xyz(30, SATURATION, LIGHTING), 1));
    line(ctx, [beam.start.pos.cor.sub(one), beam.end.pos.cor.sub(one)], xyzAsHsla(xyz(20, SATURATION, LIGHTING), 0.5));
    line(ctx, [beam.start.pos.cor.add(one), beam.end.pos.cor.add(one)], xyzAsHsla(xyz(20, SATURATION, LIGHTING), 0.5));
}
export function sparkDrawing(ctx, beam) {
    const wpoints = beam.components.map((c) => c.pos.cor.add(xyz(randomBetween(-2, 2), randomBetween(-2, 2))));
    const bpoints = wpoints.map((cor) => cor.add(xyz(randomBetween(-2, 2), randomBetween(-2, 2))));
    line(ctx, wpoints, xyzAsHsla(xyz(0, 0, 100), 0.5));
    line(ctx, bpoints, xyzAsHsla(xyz(210, SATURATION, LIGHTING), 0.5));
}
function baseDrawing(ctx, base, gametime) {
    circle(ctx, base.pos.cor, base.dim.x2, xyzAsHsla(xyz(0, 0, 100), base.health), 'rgba(155, 155, 255, 1)');
    const op = (Math.floor(gametime / 10) % 100) / 100;
    circle(ctx, base.pos.cor, base.dim.x2 + 2, undefined, xyzAsHsla(xyz(0, 0, 100), op));
}
export function effectDrawing(ctx, cw, ch, e, gameTime) {
    circle(ctx, e.pos.cor, e.dim.x2, undefined, `rgba(255, 255, 155, ${e.health / 5})`);
}
function pipeworksDrawing(ctx, cw, ch, path, gameTime) {
    const shadowl = path.map((cor) => cor.sub(xyz(1)));
    const shadowr = path.map((cor) => cor.add(xyz(1)));
    const t = Math.floor(gameTime / 200), l = path.length - 1, d = t % l, a = path[l - d];
    line(ctx, shadowl, 'rgba(255, 255, 255, 0.1)');
    line(ctx, path, 'rgba(255, 255, 255, 1)');
    line(ctx, shadowr, 'rgba(255, 255, 255, 0.1)');
    if (a) {
        circle(ctx, a, 1, 'rgba(255, 255, 255, 0.8)');
    }
}
function xyzAsHsla(value, alpha) {
    return `hsla(${value.x},${value.y}%,${value.z}%,${alpha})`;
}
function circle(ctx, cor, size, fill, stroke) {
    ctx.beginPath();
    ctx.arc(cor.x, cor.y, 1 + size, 0, 2 * Math.PI);
    if (fill) {
        ctx.fillStyle = fill;
        ctx.fill();
    }
    if (stroke) {
        ctx.strokeStyle = stroke;
        ctx.stroke();
    }
}
function rectangle(ctx, cor, dim, fill, stroke) {
    ctx.beginPath();
    ctx.rect(cor.x - dim.x2, cor.y - dim.y2, dim.x, dim.y);
    if (fill) {
        ctx.fillStyle = fill;
        ctx.fill();
    }
    if (stroke) {
        ctx.strokeStyle = stroke;
        ctx.stroke();
    }
}
function line(ctx, cors, stroke) {
    const crs = [].concat(cors);
    const start = crs.splice(0, 1)[0];
    if (start) {
        ctx.beginPath();
        ctx.moveTo(start.x, start.y);
        cors.map((c) => ctx.lineTo(c.x, c.y));
        ctx.strokeStyle = stroke;
        ctx.stroke();
    }
}
