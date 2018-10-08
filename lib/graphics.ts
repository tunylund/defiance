import Controls from './../node_modules/tiny-game-engine/src/controls'
import { draw, drawImage, drawing, drawingLayer } from './../node_modules/tiny-game-engine/src/draw'
import { El, vectorTo } from './../node_modules/tiny-game-engine/src/el'
import { gridStep, gridTileCenterAt, snapToGridTileCenter } from './../node_modules/tiny-game-engine/src/grid'
import { position } from './../node_modules/tiny-game-engine/src/position'
import { half, negone, one, unit, vector2, xyz, XYZ } from './../node_modules/tiny-game-engine/src/xyz'
import {
  BaseEl,
  BeamEl,
  BeamTowerEl,
  DefenceEl,
  Game,
  InactiveTowerEl,
  ProjectileTowerEl,
  randomBetween,
  range,
  SpawnPointEl,
  towerDesigns,
  TowerEl,
} from './main'

const SATURATION = 44
const LIGHTING = 66
const BLACK = xyz()
const WHITE = (a = 1) => xyzAsHsla(xyz(0, 0, 100), a)

const topColor = xyz(randomBetween(0, 360), SATURATION, LIGHTING)
const bottomColor = topColor.add(xyz(randomBetween(30, 120)))
const radiusColor = xyzAsHsla(topColor.sub(xyz(50, 0, 50)), 0.15)
const bloodLayer = drawingLayer(window)

export function drawGame(game: Game, controls: Controls, gameTime: number) {
  draw((ctx, cw, ch) => {
    game.blood.map((b) => circle(ctx, b, 0.5, xyzAsHsla(xyz(0, SATURATION, LIGHTING - 20), 0.5)))
    game.blood = []
  }, position(), bloodLayer)

  draw((ctx, cw, ch) => backgroundDrawing(ctx, cw, ch, game))
  drawImage(bloodLayer.canvas)

  draw((ctx, cw, ch) => {
    game.spawnPoints.map((e) => spawnPointDrawing(ctx, e))
    game.projectileTowerEls.map((t) => pipeworksDrawing(ctx, cw, ch, t, gameTime))
    game.beamTowerEls.map((t) => pipeworksDrawing(ctx, cw, ch, t, gameTime))
    game.projectileTowerEls.map((e) => e.drawing(ctx, e))
    game.beamTowerEls.map((e) => e.drawing(ctx, e))
    game.inactiveTowerEls.map((e) => e.drawing(ctx, e))
    game.enemies.map((e) => e.drawing(ctx, cw, ch, e, gameTime, game))
    game.bases.map((e) => baseDrawing(ctx, e, gameTime))
    game.bullets.map((e) => e.drawing(ctx, cw, ch, e, gameTime, game))
    game.beams.map((e) => e.drawing(ctx, e))
    game.effects.map((e) => e.drawing(ctx, cw, ch, e, gameTime, game))

    game.obstacles.map((o) => rectangle(ctx, o.pos.cor, o.dim.add(unit(2)), xyzAsHsla(xyz(), 0.5)))
    game.obstacles.map((o) => obstacleDrawing(ctx, ch, o))
  })

  draw((ctx, cw, ch) => {
    const moneyDim = xyz(game.money, 2),
          moneyCor = xyz(-cw + moneyDim.x2, -ch + moneyDim.y2)
    rectangle(ctx, moneyCor, moneyDim, xyzAsHsla(xyz(60, SATURATION + 40, LIGHTING), 1))

    game.bases.map((b, i) => {
      const healthDim = xyz(b.health, 2),
            healthCor = xyz(-cw + healthDim.x2, -ch + healthDim.y2 + moneyDim.y + i * healthDim.y)
      rectangle(ctx, healthCor, healthDim, xyzAsHsla(xyz(0, SATURATION + 40, LIGHTING), 1))
    })

    rectangle(ctx, snapToGridTileCenter(game.grid, controls.cor), game.grid.tileSize, xyzAsHsla(xyz(0, 0, 0), 0.4))

    ctx.fillStyle = WHITE()
    Object.values(towerDesigns).map((towerDesign, i) => {
      const key = towerDesign.key
      const count = Math.floor(game.money / towerDesign.cost)
      const name = towerDesign.drawing.name.replace('Drawing', '')
      ctx.fillText(`${key}: ${count} ${name}`, -cw + 20, -ch + 24 + i * game.grid.tileSize.y * 2)
    })
  }, position(0, 0, 100))
}

function obstacleDrawing(ctx: CanvasRenderingContext2D, ch: number, obstacle: DefenceEl) {
  const bgGradient = ctx.createLinearGradient(0, 0, 0, ch)
  bgGradient.addColorStop(0, xyzAsHsla(topColor.sub(xyz(0, 0, 10)), 1))
  bgGradient.addColorStop(1, xyzAsHsla(bottomColor.sub(xyz(0, 0, 10)), 1))
  rectangle(ctx, obstacle.pos.cor, obstacle.dim, bgGradient)
}

function backgroundDrawing(ctx: CanvasRenderingContext2D, cw: number, ch: number, gme: Game) {
  const bgGradient = ctx.createLinearGradient(0, 0, 0, ch)
  const gridShadowColor = 'rgba(255, 255, 255, 0.1)'
  const gridColor = 'rgba(90, 90, 90, 0.2)'
  bgGradient.addColorStop(0, xyzAsHsla(topColor, 1))
  bgGradient.addColorStop(1, xyzAsHsla(bottomColor, 1))
  ctx.fillStyle = bgGradient
  ctx.fillRect(-cw, -ch, cw * 2, ch * 2)
  gridStep(gme.grid, (cor) => {
    line(ctx, [xyz(cor.x - 1, -ch), xyz(cor.x - 1, ch)], gridShadowColor)
    line(ctx, [xyz(-cw, cor.y - 1), xyz(cw, cor.y - 1)], gridShadowColor)
    line(ctx, [xyz(cor.x, -ch), xyz(cor.x, ch)], gridColor)
    line(ctx, [xyz(-cw, cor.y), xyz(cw, cor.y)], gridColor)
  })
}

export function pelletTowerDrawing(ctx: CanvasRenderingContext2D, tower: ProjectileTowerEl) {
  circle(ctx, tower.pos.cor, tower.radius, undefined, radiusColor)
  circle(ctx, tower.pos.cor, tower.dim.x2 - 2, WHITE(tower.energy / tower.maxEnergy), WHITE())
  line(ctx, [tower.pos.cor, tower.target ?
    tower.pos.cor.add(vectorTo(tower, tower.target, tower.dim.x)) :
    tower.pos.cor], 'rgba(255, 255, 155, 1)')
}

export function laserTowerDrawing(ctx: CanvasRenderingContext2D, tower: ProjectileTowerEl) {
  circle(ctx, tower.pos.cor, tower.radius, undefined, radiusColor)
  rectangle(ctx, tower.pos.cor, tower.dim.sub(unit(2)), WHITE(tower.energy / tower.maxEnergy), WHITE())
  line(ctx, [tower.pos.cor, tower.target ?
    tower.pos.cor.add(vectorTo(tower, tower.target, tower.dim.x)) :
    tower.pos.cor], 'rgba(155, 255, 155, 1)')
}

export function sparkTowerDrawing(ctx: CanvasRenderingContext2D, tower: BeamTowerEl) {
  circle(ctx, tower.pos.cor, tower.radius, undefined, radiusColor)
  rectangle(ctx, tower.pos.cor, tower.dim.sub(unit(2)), WHITE(tower.energy / tower.maxEnergy), WHITE())
  if (tower.energy > 0) {
    const d = tower.dim.x2,
        a = xyz(Math.random() > 0.5 ? -d : d, Math.random() > 0.5 ? -d : d),
        b = xyz(Math.random() > 0.5 ? -d : d, Math.random() > 0.5 ? -d : d)
    line(ctx, [tower.pos.cor, tower.pos.cor.add(a)], xyzAsHsla(xyz(210, SATURATION, LIGHTING), 1))
    line(ctx, [tower.pos.cor, tower.pos.cor.add(b)], xyzAsHsla(xyz(210, SATURATION, LIGHTING), 1))
  } else {
    circle(ctx, tower.pos.cor, 1, xyzAsHsla(xyz(210, SATURATION, LIGHTING), 1))
  }
}

export function rayTowerDrawing(ctx: CanvasRenderingContext2D, tower: BeamTowerEl) {
  const orange = xyzAsHsla(xyz(30, SATURATION, LIGHTING), 1)
  circle(ctx, tower.pos.cor, tower.radius, undefined, radiusColor)
  circle(ctx, tower.pos.cor, tower.dim.x2 - 2, WHITE(tower.energy / tower.maxEnergy), WHITE())
  line(ctx, [tower.pos.cor, tower.target ?
    tower.pos.cor.add(vectorTo(tower, tower.target, tower.dim.x)) :
    tower.pos.cor], orange)
}

export function wallTowerDrawing(ctx: CanvasRenderingContext2D, tower: InactiveTowerEl) {
  rectangle(ctx, tower.pos.cor, tower.dim.sub(unit(2)),
    xyzAsHsla(xyz(0, 0, 90), 1),
    xyzAsHsla(xyz(0, 0, tower.health), 1))
}

function spawnPointDrawing(ctx: CanvasRenderingContext2D, e: SpawnPointEl) {
  const bgGradient = ctx.createLinearGradient(0, 0, 0, window.innerHeight / 2)
  bgGradient.addColorStop(0, xyzAsHsla(topColor.sub(xyz(0, 0, 30)), 1))
  bgGradient.addColorStop(1, xyzAsHsla(bottomColor.sub(xyz(0, 0, 30)), 1))
  if (e.spawnCount > 0) {
    circle(ctx, e.pos.cor, e.dim.x2 + Math.sqrt(e.spawnCount), xyzAsHsla(bottomColor.sub(xyz(0, 0, 30)), 0.75))
  } else if (e.energy > 0) {
    range(5, 1).map(() => line(ctx, [
      e.pos.cor,
      e.pos.cor.add(vector2(Math.random() * Math.PI * 2, e.energy / 100)),
    ], WHITE(0.5 + Math.random())))
  }
  rectangle(ctx, e.pos.cor, e.dim.sub(unit(2)), bgGradient, e.spawnCount > 0 ? undefined : xyzAsHsla(topColor, 1))
}

export function blobDrawing(ctx: CanvasRenderingContext2D, cw: number, ch: number, e: El, gameTime: number) {
  const c = xyzAsHsla(bottomColor.add(xyz(20, 50)), 1)
  const headOffset = 4 + ((Math.floor(gameTime / 100)) % 2)
  const headCor = e.pos.cor.add(vector2(e.pos.vel.radian, headOffset))
  circle(ctx, e.pos.cor, e.dim.x2, c)
  circle(ctx, headCor, e.dim.x2 / 4, c)
}

export function speedyDrawing(ctx: CanvasRenderingContext2D, cw: number, ch: number, e: El, gameTime: number) {
  const c = bottomColor.add(xyz(20, 50))
  const tailDir = e.pos.vel.mul(negone).radian
  circle(ctx, e.pos.cor, e.dim.x2, xyzAsHsla(c, 1))
  circle(ctx, e.pos.cor.add(vector2(tailDir, 4)), e.dim.x2 / 2, xyzAsHsla(c, 0.75))
  circle(ctx, e.pos.cor.add(vector2(tailDir, 6)), e.dim.x2 / 4, xyzAsHsla(c, 0.5))
  circle(ctx, e.pos.cor.add(vector2(tailDir, 8)), e.dim.x2 / 6, xyzAsHsla(c, 0.25))
}

export function thugDrawing(ctx: CanvasRenderingContext2D, cw: number, ch: number, e: El) {
  const c = bottomColor.add(xyz(20, 50))
  rectangle(ctx, e.pos.cor, e.dim.sub(one), xyzAsHsla(c, 1), xyzAsHsla(c.sub(xyz(0, 0, 10)), 1))
}

export function pelletDrawing(ctx: CanvasRenderingContext2D, cw: number, ch: number, e: El) {
  circle(ctx, e.pos.cor, e.dim.x2 / 2, 'rgba(255, 255, 155, 1)')
}

export function laserDrawing(ctx: CanvasRenderingContext2D, cw: number, ch: number, e: El) {
  line(ctx, [e.pos.cor, e.pos.cor.add(vector2(e.pos.vel.radian, 8))], 'rgba(155, 255, 155, 1)')
}

export function rayDrawing(ctx: CanvasRenderingContext2D, beam: BeamEl) {
  line(ctx, [beam.start.pos.cor, beam.end.pos.cor], xyzAsHsla(xyz(10, SATURATION + 30, LIGHTING), 1))
  line(ctx, [beam.start.pos.cor.sub(one), beam.end.pos.cor.sub(one)], xyzAsHsla(xyz(0, SATURATION + 30, LIGHTING), 0.5))
}

export function sparkDrawing(ctx: CanvasRenderingContext2D, beam: BeamEl) {
  const wpoints = beam.components.map((c: El) => c.pos.cor.add(xyz(randomBetween(-2, 2), randomBetween(-2, 2))))
  const bpoints = wpoints.map((cor: XYZ) => cor.add(xyz(randomBetween(-2, 2), randomBetween(-2, 2))))
  line(ctx, wpoints, xyzAsHsla(xyz(0, 0, 100), 0.5))
  line(ctx, bpoints, xyzAsHsla(xyz(210, SATURATION, LIGHTING), 0.5))
}

function baseDrawing(ctx: CanvasRenderingContext2D, base: BaseEl, gametime: number) {
  circle(ctx, base.pos.cor, base.dim.x2, WHITE(base.energy / 100), xyzAsHsla(xyz(240, SATURATION, LIGHTING), 1))
  const op = (Math.floor(gametime / 10) % 100) / 100
  circle(ctx, base.pos.cor, base.dim.x2 + 2, undefined, xyzAsHsla(xyz(0, 0, 100), op))
}

export function effectDrawing(ctx: CanvasRenderingContext2D, cw: number, ch: number, e: DefenceEl, gameTime: number) {
  circle(ctx, e.pos.cor, e.dim.x2, undefined, xyzAsHsla(xyz(0, 0, 100), e.health))
}

export function particleDrawing(ctx: CanvasRenderingContext2D, cw: number, ch: number, e: DefenceEl, gameTime: number) {
  rectangle(ctx, e.pos.cor, e.dim, xyzAsHsla(xyz(0, SATURATION, LIGHTING - 20), 1))
}

export function shrapnelDrawing(ctx: CanvasRenderingContext2D, cw: number, ch: number, e: DefenceEl, gameTime: number) {
  rectangle(ctx, e.pos.cor, e.dim.mul(half), WHITE(0.8))
}

function pipeworksDrawing(ctx: CanvasRenderingContext2D, cw: number, ch: number, tower: TowerEl, gameTime: number) {
  const shadowl = tower.path.map((cor) => cor.sub(xyz(1)))
  const shadowr = tower.path.map((cor) => cor.add(xyz(1)))
  const t = Math.floor(gameTime / 200), l = tower.path.length - 1, d = t % l,
        a = tower.path[l - d]
  line(ctx, shadowl, WHITE(0.1))
  line(ctx, tower.path, WHITE(1))
  line(ctx, shadowr, WHITE(0.1))
  if (tower.base.energy > 0 && a) { circle(ctx, a, 1, WHITE(0.8)) }
}

function xyzAsHsla(value: XYZ, alpha: number) {
  return `hsla(${value.x},${value.y}%,${value.z}%,${alpha})`
}

function circle(ctx: CanvasRenderingContext2D, cor: XYZ, size: number, fill?: string|CanvasGradient, stroke?: string) {
  ctx.beginPath()
  ctx.arc(cor.x, cor.y, 1 + size, 0, 2 * Math.PI)
  if (fill) {
    ctx.fillStyle = fill
    ctx.fill()
  }
  if (stroke) {
    ctx.strokeStyle = stroke
    ctx.stroke()
  }
}

function rectangle(ctx: CanvasRenderingContext2D, cor: XYZ, dim: XYZ, fill?: string|CanvasGradient, stroke?: string) {
  ctx.beginPath()
  ctx.rect(cor.x - dim.x2, cor.y - dim.y2, dim.x, dim.y)
  if (fill) {
    ctx.fillStyle = fill
    ctx.fill()
  }
  if (stroke) {
    ctx.strokeStyle = stroke
    ctx.stroke()
  }
}

function line(ctx: CanvasRenderingContext2D, cors: XYZ[], stroke: string) {
  const crs = ([] as XYZ[]).concat(cors)
  const start = crs.splice(0, 1)[0]
  if (start) {
    ctx.beginPath()
    ctx.moveTo(start.x, start.y)
    cors.map((c) => ctx.lineTo(c.x, c.y))
    ctx.strokeStyle = stroke
    ctx.stroke()
  }
}
