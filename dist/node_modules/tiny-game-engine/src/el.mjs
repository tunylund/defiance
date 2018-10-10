import { intersects } from './collision.mjs';
import { position } from './position.mjs';
import { vector2, xyz } from './xyz.mjs';
function el(pos, dim = xyz(), rest) {
    const e = {};
    if (pos.hasOwnProperty('cor')) {
        e.pos = pos;
        e.dim = dim;
    }
    else {
        e.pos = position(pos.pos);
        e.dim = xyz(pos.dim);
    }
    return Object.assign(e, rest);
}
function vectorTo(e, otherEl, size = dist(e, otherEl)) {
    return vector2(otherEl.pos.cor.sub(e.pos.cor).radian, size);
}
function nearest(els, cor) {
    return els.reduce((memo, otherEl) => !memo || (cor.sub(otherEl.pos.cor).size > 0 &&
        cor.sub(otherEl.pos.cor).size < cor.sub(memo.pos.cor).size) ? otherEl : memo, null);
}
function dist(a, b) {
    return a.pos.cor.sub(b.pos.cor).size;
}
function isAt(a, cor, precision = 0.1) {
    const dim = typeof precision === 'number' ? xyz(precision, precision, precision) : precision;
    return intersects(a, el(position(cor), dim));
}
export { el, nearest, isAt, dist, vectorTo };
