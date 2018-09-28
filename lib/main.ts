import { segmentIntersects } from './../node_modules/tiny-game-engine/src/collision'
import { intersects } from './../node_modules/tiny-game-engine/src/collision'
import Controls from './../node_modules/tiny-game-engine/src/controls'
import { dist, el, El, isAt, nearest, vectorTo } from './../node_modules/tiny-game-engine/src/el'
import {
  assignOnGrid,
  buildGrid,
  Grid,
  gridMatrixCorAt,
  gridTileCenterAt,
  snapToGridTileCenter,
  valueAtGrid,
} from './../node_modules/tiny-game-engine/src/grid'
import loop from './../node_modules/tiny-game-engine/src/loop'
import { move, position, Position } from './../node_modules/tiny-game-engine/src/position'
import { timeBasedTurn } from './../node_modules/tiny-game-engine/src/turn'
import { half, negone, unit, xyz, XYZ } from './../node_modules/tiny-game-engine/src/xyz'
import { clearCache, findPathCached } from './astar'
import {
  blobDrawing,
  drawGame,
  effectDrawing,
  laserDrawing,
  laserTowerDrawing,
  particleDrawing,
  pelletDrawing,
  pelletTowerDrawing,
  rayDrawing,
  rayTowerDrawing,
  shrapnelDrawing,
  sparkDrawing,
  sparkTowerDrawing,
  speedyDrawing,
  thugDrawing,
  wallTowerDrawing,
} from './graphics'

export interface DefenceEl extends El {
  health: number,
}

interface DrawableDefenceEl extends DefenceEl {
  drawing: Drawing
}

interface EnemyEl extends DrawableDefenceEl {
  speed: number
  price: number,
  path: XYZ[]
}

interface BulletEl extends DrawableDefenceEl {
  power: number,
}

interface EffectEl extends DrawableDefenceEl {
  speed: number,
}

export interface BeamEl {
  id: number,
  components: El[],
  drawing: BeamDrawing,
  range: number,
  start: DefenceEl,
  end: DefenceEl,
  powerSource: BeamTowerEl
}

export interface BaseEl extends DefenceEl, PowerSource {
  id: number
}

export interface SpawnPointEl extends DefenceEl, PowerSource {
  id: number,
  spawnCount: number,
  enemyDesigns: EnemyEl[],
  enemyRate: number,
}

export interface PowerSource {
  pos: Position,
  energyDispenseAmount: number,
  energy: number,
  energyIncreaseRate: number
}

export interface TowerEl extends DefenceEl {
  id: number,
  base: PowerSource,
  cost: number,
  radius: number,
  energy: number,
  maxEnergy: number,
  path: XYZ[],
  key: string,
}

export interface ProjectileTowerEl extends TowerEl {
  target: EnemyEl|null,
  powerConsumption: number,
  fireRate: number,
  bulletSpeed: number,
  drawing: (ctx: CanvasRenderingContext2D, tower: ProjectileTowerEl) => void,
  projectileBuilder: (tower: ProjectileTowerEl, targets: EnemyEl[]) => BulletEl[]
}

export interface BeamTowerEl extends TowerEl {
  target: EnemyEl|null,
  powerConsumptionOnHit: number,
  powerConsumptionOnIdle: number,
  drawing: (ctx: CanvasRenderingContext2D, tower: BeamTowerEl) => void,
  beamBuilder: (tower: BeamTowerEl, targets: EnemyEl[], towers: TowerEl[], beams: BeamEl[]) => BeamEl[]
}

export interface InactiveTowerEl extends DefenceEl {
  id: number,
  cost: number,
  key: string,
  drawing: (ctx: CanvasRenderingContext2D, tower: InactiveTowerEl) => void,
}

function isProjectileTowerEl(v: any): v is ProjectileTowerEl {
  return v.hasOwnProperty('projectileBuilder')
}
function isBeamTowerEl(v: any): v is BeamTowerEl {
  return v.hasOwnProperty('beamBuilder')
}
function isInactiveTowerEl(v: any): v is InactiveTowerEl {
  return !v.hasOwnProperty('base')
}

type BeamDrawing = (ctx: CanvasRenderingContext2D, beam: BeamEl) => void

type Drawing = (
  ctx: CanvasRenderingContext2D,
  cw: number,
  ch: number,
  e: DefenceEl,
  gameTime: number,
  game: Game) => void

export interface Game {
  spawnPoints: SpawnPointEl[],
  obstacles: DefenceEl[],
  bullets: BulletEl[],
  beams: BeamEl[],
  bases: BaseEl[],
  projectileTowerEls: ProjectileTowerEl[],
  beamTowerEls: BeamTowerEl[],
  inactiveTowerEls: InactiveTowerEl[],
  enemies: EnemyEl[],
  effects: EffectEl[],
  blood: XYZ[],
  drawables: DefenceEl[],
  money: number,
  level: number,
  grid: Grid
}

const id = (function* idIterator(n = 0) { while (n < Infinity) { yield n++ } })()

const TILE_SIZE = xyz(8, 8, 8)

export const towerDesigns: Array<ProjectileTowerEl | BeamTowerEl | InactiveTowerEl> = [{
    id: -1, pos: position(), dim: TILE_SIZE, base: {} as BaseEl, path: [], target: null,
    projectileBuilder: buildPellets, drawing: pelletTowerDrawing, key: 'Q',
    health: 10, cost: 20, radius: 100, fireRate: 500, energy: 40,
    maxEnergy: 40, powerConsumption: 20, bulletSpeed: 400,
  }, {
    id: -1, pos: position(), dim: TILE_SIZE, base: {} as BaseEl, path: [], target: null,
    projectileBuilder: buildLasers, drawing: laserTowerDrawing, key: 'W',
    health: 10, cost: 30, radius: 80, fireRate: 125, energy: 40,
    maxEnergy: 40, powerConsumption: 10, bulletSpeed: 800,
  }, {
    id: -1, pos: position(), dim: TILE_SIZE, base: {} as BaseEl, path: [], target: null,
    beamBuilder: buildRays, drawing: rayTowerDrawing, key: 'E',
    health: 10, cost: 50, radius: 160, energy: 20, maxEnergy: 20,
    powerConsumptionOnHit: 10, powerConsumptionOnIdle: 1,
  }, {
    id: -1, pos: position(), dim: TILE_SIZE, base: {} as BaseEl, path: [], target: null,
    beamBuilder: buildSparks, drawing: sparkTowerDrawing, key: 'S',
    health: 10, cost: 40, radius: 80, energy: 20, maxEnergy: 20,
    powerConsumptionOnHit: 20, powerConsumptionOnIdle: 4,
  }, {
    id: -1, pos: position(), dim: TILE_SIZE, key: 'A',
    drawing: wallTowerDrawing,
    health: 100, cost: 1,
  }]

const enemyDesigns = [{
  pos: position(), dim: unit(8), drawing: thugDrawing, path: [],
  health: 40, speed: 30, price: 6,
}, {
  pos: position(), dim: unit(6), drawing: blobDrawing, path: [],
  health: 30, speed: 40, price: 2,
}, {
  pos: position(), dim: unit(4), drawing: speedyDrawing, path: [],
  health: 20, speed: 80, price: 4,
}]

const game: Game = {
  spawnPoints: [],
  obstacles: [],
  bullets: [],
  beams: [],
  effects: [],
  blood: [],
  bases: [{
    id: id.next().value,
    pos: position(),
    dim: TILE_SIZE,
    health: 100,
    energyDispenseAmount: 10,
    energy: 100,
    energyIncreaseRate: 2000,
  }],
  projectileTowerEls: [],
  beamTowerEls: [],
  inactiveTowerEls: [],
  enemies: [],
  drawables: [],
  money: 75,
  level: 0,
  grid: buildGrid(TILE_SIZE.mul(xyz(1, 1, 0)), xyz(window.innerWidth, window.innerHeight), true),
}

const controls = new Controls(window, true)

controls.onKeyDown((key: string, isRepeat: boolean) => {
  if (isRepeat) { return }
  if (valueAtGrid(game.grid, controls.cor) === 1) { return }

  towerDesigns
    .filter((t) => `Key${t.key}` === key)
    .filter((t) => t.cost <= game.money).map((towerChoice) => {
      const powerSources = game.bases.concat(game.spawnPoints.filter((s) => s.spawnCount === 0))
      const base = nearest(powerSources, controls.cor)
      if (!base || !canAccessAllBases(game.bases, game.enemies, game.spawnPoints,
        assignOnGrid(game.grid, controls.cor, 1))) { return }

      const cor = snapToGridTileCenter(game.grid, controls.cor)
      if (isProjectileTowerEl(towerChoice)) {
        game.projectileTowerEls.push(buildTower(cor, towerChoice, base, game.grid))
      }
      if (isBeamTowerEl(towerChoice)) {
        game.beamTowerEls.push(buildTower(cor, towerChoice, base, game.grid))
      }
      if (isInactiveTowerEl(towerChoice)) {
        game.inactiveTowerEls.push(buildInactiveTower(cor, towerChoice))
      }
      game.money -= towerChoice.cost
      game.grid = assignObstacleMatrix(
        ([] as El[])
          .concat(game.obstacles)
          .concat(game.projectileTowerEls)
          .concat(game.beamTowerEls)
          .concat(game.inactiveTowerEls)
          .concat(game.spawnPoints),
        game.grid)
      game.enemies.map((e) => e.path = [])
    })
})

const stopGameLoop = loop((step: number, gameTime: number) => {
  if (game.obstacles.length === 0) {
    game.obstacles = buildBlockObstacles(game.bases, game.grid) // buildMazeObstacles(game.bases, game.grid)
    game.grid = assignObstacleMatrix(
      ([] as El[])
        .concat(game.obstacles)
        .concat(game.projectileTowerEls)
        .concat(game.beamTowerEls)
        .concat(game.inactiveTowerEls)
        .concat(game.spawnPoints),
      game.grid)
  }

  if (timeBasedTurn('spawn-swarm', Math.max(3000, 10000 - (5 * game.level * game.level + game.level)))) {
    game.level += 1
    game.spawnPoints.push(buildSpawnPoint(game.grid, game.level, game.bases, game.enemies, game.spawnPoints))
  }

  game.spawnPoints.map((s) => {
    if (timeBasedTurn(`energyincrease-${s.id}`, s.energyIncreaseRate)) { s.energy += 100 }
    if (s.spawnCount > 0 && timeBasedTurn(`spawn-swarm-enemy-${s.id}`, s.enemyRate)) {
      game.enemies = game.enemies.concat(buildEnemies(random(s.enemyDesigns), s.pos.cor))
      s.spawnCount -= 1
      if (s.spawnCount === 0) {
        game.enemies.map((e) => e.path = [])
      }
    }
  })

  game.enemies.map((e) => {
    const target = nearest(game.bases, e.pos.cor)
    if (target && e.path.length === 0) {
      e.path = pathTo(e.pos.cor, target, game.grid)
    }
    if (e.path.length > 0) {
      const a = isAt(e, e.path[0], TILE_SIZE)
      e.path = a ? e.path.splice(1) : e.path
      e.pos.vel = vectorTo(e, el(position(e.path[0]), TILE_SIZE), e.speed)
    } else {
      e.pos.vel = xyz()
    }
  })

  game.projectileTowerEls.map((t) => {
    t.target = nearestVisibleEnemy(game.enemies, game.obstacles, t)
    if (t.energy > 0 && timeBasedTurn(`shoot-${t.id}`, t.fireRate)) {
      const bullets = t.projectileBuilder(t, game.enemies)
      game.bullets = game.bullets.concat(bullets)
      t.energy -= bullets.reduce((sum, b) => sum + b.power, 0)
    }
  })

  game.beamTowerEls.map((t) => {
    t.target = nearestVisibleEnemy(game.enemies, game.obstacles, t)
    if (t.energy > 0) {
      const beams = t.beamBuilder(t, game.enemies, game.beamTowerEls, game.beams)
      game.beams = game.beams.concat(beams)
      t.energy -= beams.reduce((sum, b) => sum + t.powerConsumptionOnIdle, 0)
    }
  })

  game.projectileTowerEls.map((e) => refuel(e, gameTime))
  game.beamTowerEls.map((e) => refuel(e, gameTime))

  game.bases.map((b) => {
    if (timeBasedTurn(`energyincrease-${b.id}`, b.energyIncreaseRate)) { b.energy += 100 }
    game.enemies.map((e) => {
      if (intersects(e, b)) {
        e.health = 0
        b.health -= 1
        game.effects = game.effects.concat(buildExplosion(e.pos.cor))
      }
    })
  })

  game.bullets.map((b) => {
    game.enemies.map((e) => {
      if (intersects(b, e)) {
        b.health -= 1
        e.health -= b.power
        if (e.health <= 0) { game.money += e.price }
        game.effects = game.effects.concat(buildBulletCollision(b, e))
      }
    })
    game.obstacles.map((o) => {
      if (intersects(b, o)) {
        b.health -= 1
        o.health -= b.power
        if (o.health <= 0) { game.effects = game.effects.concat(buildExplosion(o.pos.cor)) }
        game.effects = game.effects.concat(buildBulletObstacleCollision(b, o))
      }
    })
  })

  game.beams.map((b) => {
    b.components = range(dist(b.start, b.end), TILE_SIZE.size)
        .map((c) => vectorTo(b.start, b.end, c))
        .map((c) => el(position(b.start.pos.cor.add(c)), TILE_SIZE))
    game.enemies.map((e) => {
      const intersectingBeamComponents = b.components.filter((bt) => intersects(bt, e))
      if (intersectingBeamComponents.length > 0) {
        if (timeBasedTurn(`beam-hit-${b.id}`, 250)) {
          b.powerSource.energy -= b.powerSource.powerConsumptionOnHit
          e.health -= b.powerSource.powerConsumptionOnHit
          if (e.health <= 0) { game.money += e.price }
          game.effects = game.effects.concat(buildExplosion(e.pos.cor))
        }
      }
    })
  })

  game.bullets.map((e) => e.pos = move(e.pos, step))
  game.enemies.map((e) => e.pos = move(e.pos, step))
  game.effects.map((e) => {
    e.health -= step
    e.pos = move(e.pos, step)
    e.dim = move(position(e.dim, xyz(e.speed, e.speed)), step).cor
    if (e.drawing === particleDrawing && e.health <= 0) {
      game.blood.push(e.pos.cor)
    }
  })

  drawGame(game, controls, gameTime)

  game.bases = game.bases.filter(isNotRemovable)
  game.bullets = game.bullets.filter(isNotRemovable)
  game.beams = game.beams.filter((beam) => {
    return beam.powerSource.energy > 0 &&
      dist(beam.start, beam.end) < beam.range &&
      beam.start.health > 0 &&
      beam.end.health > 0
  })
  game.enemies = game.enemies.filter(isNotRemovable)
  game.projectileTowerEls = game.projectileTowerEls.filter(isNotRemovable)
  game.beamTowerEls = game.beamTowerEls.filter(isNotRemovable)
  game.effects = game.effects.filter(isNotRemovable)
  if (game.obstacles.find((o) => o.health <= 0)) {
    clearCache()
    game.obstacles = game.obstacles.filter(isNotRemovable)
  }

  if (game.bases.length === 0) {
    stopGameLoop()
  }
})

function nearestVisibleEnemy(enemies: EnemyEl[], obstacles: DefenceEl[], tower: ProjectileTowerEl|BeamTowerEl) {
  return nearest(game.enemies
    .filter((e) => dist(tower, e) <= tower.radius)
    .filter((e) => !(game.obstacles
      .map((o) => segments(o)).reduce(flatten, [])
      .reduce((i, segment) => {
        return i || segmentIntersects(tower.pos.cor, e.pos.cor, segment[0], segment[1])
      }, false))), tower.pos.cor)
}

function refuel(e: TowerEl, gameTime: number) {
  if (e.base && e.base.energy > 0 && e.energy < e.maxEnergy) {
    const t = Math.floor(gameTime / 200)
    if (t % (e.path.length - 1) === 0) {
      e.energy = Math.min(e.maxEnergy, e.energy + e.base.energyDispenseAmount)
      e.base.energy = Math.max(0, e.base.energy - e.base.energyDispenseAmount)
    }
  }
}

function assignObstacleMatrix(obstacles: El[], grid: Grid) {
  grid = grid || buildGrid(TILE_SIZE.mul(xyz(1, 1, 0)), xyz(window.innerWidth, window.innerHeight), true)
  return obstacles.reduce((g, o) => assignOnGrid(g, o.pos.cor, 1, o.dim), grid)
}

function pathTo(cor: XYZ, target: El, grid: Grid, allowDiagonal = false): XYZ[] {
  const from = gridMatrixCorAt(grid, cor),
        to = gridMatrixCorAt(grid, target.pos.cor)
  return findPathCached([from.x, from.y], [to.x, to.y], assignOnGrid(grid, target.pos.cor, 0).matrix, allowDiagonal)
    .map((c) => gridTileCenterAt(grid, xyz(c[0], c[1])))
}

function isNotRemovable(e: DefenceEl) {
  return !(isRemovable(e))
}

function isRemovable(e: DefenceEl) {
  return isOutSideViewPort(e) || e.health <= 0
}

function isOutSideViewPort(e: El) {
  const w2 = window.innerWidth / 2, h2 = window.innerHeight / 2
  return e.pos.cor.x < -w2 || e.pos.cor.x > w2  ||
         e.pos.cor.y < -h2 || e.pos.cor.y > h2
}

function buildExplosion(cor: XYZ): EffectEl[] {
  return [{
    pos: position(cor),
    dim: xyz(10, 10),
    health: 0.75,
    speed: 30,
    drawing: effectDrawing,
  }]
}

function buildBulletCollision(b: BulletEl, e: DefenceEl): EffectEl[] {
  return range(10, 1).map((i) => ({
    pos: position(b.pos.cor, b.pos.vel
      .mul(half).mul(half)
      .add(xyz(random([-50, 50]), random([-50, 50]))
        .mul(xyz(Math.random(), Math.random()))),
      b.pos.vel.mul(negone).mul(half)),
    dim: xyz(2, 2),
    health: 0.5,
    speed: 0,
    drawing: particleDrawing,
  }))
}

function buildBulletObstacleCollision(b: BulletEl, o: DefenceEl): EffectEl[] {
  return buildBulletCollision(b, o).map((e) => ({...e,
    pos: position(e.pos.cor, e.pos.vel.mul(negone), e.pos.acc.mul(negone)),
    drawing: shrapnelDrawing,
  }))
}

function buildSpawnPoint(grid: Grid, level: number,
                         bases: BaseEl[], enemies: EnemyEl[], spawnPoints: SpawnPointEl[]): SpawnPointEl {
  let cor = snapToGridTileCenter(grid, randomCorCloseToEdge())
  while (valueAtGrid(grid, cor) === 1 || !canAccessAllBases(bases, enemies, spawnPoints, grid)) {
    cor = snapToGridTileCenter(grid, randomCorCloseToEdge())
  }
  return {
    id: id.next().value, pos: position(cor),
    dim: TILE_SIZE, health: 1000, enemyRate: Math.max(400, 3000 - Math.pow(level * 10, 2)),
    spawnCount: 8 + level * 2,
    enemyDesigns: enemyDesigns.slice(0, level),
    energyDispenseAmount: 10, energy: 1000 + 50 * level, energyIncreaseRate: 9999999,
  }
}

function canAccessAllBases(bases: DefenceEl[], enemies: EnemyEl[], spawnPoints: SpawnPointEl[], grid: Grid) {
  const cors = spawnPoints.filter((s) => s.spawnCount > 0).map((s) => gridMatrixCorAt(grid, s.pos.cor))
    .concat(enemies.map((e) => gridMatrixCorAt(grid, e.pos.cor)))
    .concat([xyz(), grid.dim.sub(xyz(1, 1))])
  return bases
    .map((base) => gridMatrixCorAt(grid, base.pos.cor))
    .filter((cor) => cors
      .map((c) => findPathCached([c.x, c.y], [cor.x, cor.y], grid.matrix, false).length > 0)
      .reduce((result, val) => result && val, true))
    .length === bases.length
}

function randomCorOffCenter(distFromCenter: number, bases: BaseEl[], grid: Grid) {
  return snapToGridTileCenter(grid, random([
    xyz(random([-distFromCenter, distFromCenter]), randomBetween(-distFromCenter, distFromCenter)),
    xyz(randomBetween(-distFromCenter, distFromCenter), random([-distFromCenter, distFromCenter])),
  ]).mul(grid.tileSize))
}

function randomAccessibleCorOffCenter(distFromCenter: number, bases: BaseEl[],
                                      enemies: EnemyEl[], spawnPoints: SpawnPointEl[], grid: Grid) {
  let cor = randomCorOffCenter(distFromCenter, bases, grid)
  while (valueAtGrid(grid, cor) === 1 || !canAccessAllBases(bases, enemies, spawnPoints, assignOnGrid(grid, cor, 1))) {
    cor = randomCorOffCenter(distFromCenter, bases, grid)
  }
  return cor
}

function* levelGenerator(distFromCenter: number, maxDist: number, fillage: number, bases: BaseEl[], grid: Grid) {
  for (let obsCount = 0; distFromCenter < maxDist; obsCount++) {
    if (obsCount >= (distFromCenter * 8) * fillage || obsCount >= (distFromCenter * 8) - 5) {
      obsCount = 0
      distFromCenter += 4
    }
    const cor = randomAccessibleCorOffCenter(distFromCenter, bases, [], [], grid)
    grid = assignOnGrid(grid, cor, 1)
    yield cor
  }
}

function buildMazeObstacles(bases: BaseEl[], grid: Grid): DefenceEl[] {
  const result = [] as XYZ[]
  const levelGen = levelGenerator(2, Math.min(grid.dim2.x, grid.dim2.y), 1, bases, grid)
  for (let level = levelGen.next(); !level.done; level = levelGen.next()) {
    result.push(level.value)
  }

  return result.map((cor) => ({ pos: position(cor), dim: TILE_SIZE, health: 1000 }))
}

function randomXYZIn(dim: XYZ) {
  return xyz(randomBetween(0, dim.x), randomBetween(0, dim.y), randomBetween(0, dim.z))
}

function* blockObstacleGenerator(bases: BaseEl[], grid: Grid) {
  const rand = () => snapToGridTileCenter(grid, randomXYZIn(grid.dim).sub(grid.dim2).mul(grid.tileSize))
  while (true) {
    let cor = rand()
    const dim = TILE_SIZE.mul(unit(random([5, 7, 9, 11])))
    while (!cor || valueAtGrid(grid, cor) === 1 || !canAccessAllBases(bases, [], [], assignOnGrid(grid, cor, 1, dim))) {
      cor = rand()
    }
    clearCache()
    yield { pos: position(cor), dim, health: 1000 }
  }
}

function buildBlockObstacles(bases: BaseEl[], grid: Grid): DefenceEl[] {
  const fillage = 0.5, result = [] as DefenceEl[],
        gridSize = grid.dim.mul(grid.tileSize), maxArea = gridSize.x * gridSize.y
  const blockObstacleGen = blockObstacleGenerator(bases, grid)
  while (result.reduce((area, o) => area + o.dim.x * o.dim.y, 0) < maxArea * fillage) {
    let no = blockObstacleGen.next()
    while (result.reduce((r, o) => r || intersects(o, no.value), false)) { no = blockObstacleGen.next() }
    result.push(no.value)
  }
  return result
}

function buildPellets(tower: ProjectileTowerEl, enemies: DefenceEl[]): BulletEl[] {
  return tower.target ? [{
    pos: position(tower.pos.cor, vectorTo(tower, tower.target, tower.bulletSpeed)),
    dim: unit(2), health: 1, drawing: pelletDrawing, power: tower.powerConsumption,
  }] : []
}

function buildLasers(tower: ProjectileTowerEl, enemies: DefenceEl[]): BulletEl[] {
  return tower.target ? [{
    pos: position(tower.pos.cor, vectorTo(tower, tower.target, tower.bulletSpeed)),
    dim: unit(2), health: 1, drawing: laserDrawing, power: tower.powerConsumption,
  }] : []
}

function buildSparks(tower: BeamTowerEl, enemies: EnemyEl[], towers: TowerEl[], beams: BeamEl[]): BeamEl[] {
  return tower.energy > 0 ? towers
    .filter((t) => (t as BeamTowerEl).beamBuilder === buildSparks && t !== tower)
    .filter((t) => dist(tower, t) <= tower.radius)
    .filter((t) => beams.filter((b) => [b.start, b.end].includes(t) && [b.start, b.end].includes(tower)).length === 0)
    .map((t) => ({
      id: id.next().value, start: tower, end: t, powerSource: tower,
      range: tower.radius, drawing: sparkDrawing, components: [],
    })) : []
}

function buildRays(tower: BeamTowerEl, enemies: EnemyEl[], towers: TowerEl[], beams: BeamEl[]): BeamEl[] {
  return tower.target && beams.filter((b) => b.start === tower).length === 0 ? [{
    id: id.next().value, start: tower, end: tower.target, powerSource: tower,
    range: tower.radius, drawing: rayDrawing, components: [],
  }] : []
}

function buildEnemies(enemyDesign: EnemyEl, cor: XYZ): EnemyEl[] {
  return [{ ...enemyDesign, pos: position(cor) }]
}

function buildTower<T>(cor: XYZ, towerDesign: T, base: PowerSource, grid: Grid): T {
  return Object.assign({}, towerDesign, {
    id: id.next().value, pos: position(cor), base,
    path: [cor].concat(pathTo(cor, el(base.pos, TILE_SIZE), grid, true)),
  })
}

function buildInactiveTower(cor: XYZ, towerDesign: InactiveTowerEl): InactiveTowerEl {
  return { ...towerDesign, id: id.next().value, pos: position(cor) }
}

function random<T>(arr: T[]): T {
  return arr[randomBetween(0, arr.length)]
}

export function randomBetween(min: number, max: number) {
  return Math.floor(Math.random() * (max - min)) + min
}

function randomCorCloseToEdge() {
  const padding = 8 * 8,
        w = window.innerWidth / 2 - padding,
        h = window.innerHeight / 2 - padding
  return xyz(randomBetween(-w, w), randomBetween(-h, h))
}

export function range(max: number, step: number): number[] {
  const result = []
  for (let i = 0; i < max; i += step) { result.push(i) }
  return result
}

function segments(o: DefenceEl) {
  const tl = o.pos.cor.add(o.dim.mul(half).mul(negone))
  const tr = o.pos.cor.add(o.dim.mul(half).mul(xyz(1, -1)))
  const br = o.pos.cor.add(o.dim.mul(half))
  const bl = o.pos.cor.add(o.dim.mul(half).mul(xyz(-1, 1)))
  return [[tl, tr], [tr, br], [br, bl], [bl, tl]]
}

function flatten<T>(memo: T[], row: T[]) {
  return memo.concat(row)
}
