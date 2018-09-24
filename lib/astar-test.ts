import { buildGrid } from './../node_modules/tiny-game-engine/src/grid'
import { unit } from './../node_modules/tiny-game-engine/src/xyz'
import { findPath, findPathCached } from './astar'

const SIZE = 1000
const c = console
const out = c.log

function time(name: string, fn: () => void) {
  const start = Date.now()
  fn()
  out(name, Date.now() - start, 'milliseconds')
}

const grid = buildGrid(unit(1), unit(SIZE))
function test() {
  time('first pass', () => findPath([0, 0], [SIZE - 1, SIZE - 1], grid.matrix, true))
  time('second pass', () => findPath([0, 0], [SIZE - 1, SIZE - 1], grid.matrix, true))
  time('third pass', () => findPath([0, 0], [SIZE - 1, SIZE - 1], grid.matrix, true))
  time('fourth pass', () => findPath([100, 100], [SIZE - 1, SIZE - 1], grid.matrix, true))
  time('fifth pass', () => findPath([200, 200], [SIZE - 1, SIZE - 1], grid.matrix, true))
  time('sixth pass', () => findPath([300, 300], [SIZE - 1, SIZE - 1], grid.matrix, true))
  time('cached first pass', () => findPathCached([0, 0], [SIZE - 1, SIZE - 1], grid.matrix, true))
  time('cached second pass', () => findPathCached([0, 0], [SIZE - 1, SIZE - 1], grid.matrix, true))
  time('cached third pass', () => findPathCached([0, 0], [SIZE - 1, SIZE - 1], grid.matrix, true))
  time('cached fourth pass', () => findPathCached([100, 100], [SIZE - 1, SIZE - 1], grid.matrix, true))
  time('cached fifth pass', () => findPathCached([200, 200], [SIZE - 1, SIZE - 1], grid.matrix, true))
  time('cached sixth pass', () => findPathCached([300, 300], [SIZE - 1, SIZE - 1], grid.matrix, true))
}
test()
// setTimeout(test, 3000)
