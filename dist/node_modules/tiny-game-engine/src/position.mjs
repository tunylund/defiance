import { xyz, XYZ } from './xyz.mjs';
const GRAVITY = -981;
function position(x = 0, y = 0, z = 0, vx = 0, vy = 0, vz = 0, ax = 0, ay = 0, az = 0) {
    const p = {};
    if (x instanceof XYZ) {
        p.cor = x || xyz();
        p.vel = y || xyz();
        p.acc = z || xyz();
    }
    else if (typeof x === 'number') {
        p.cor = xyz(x, y, z);
        p.vel = xyz(vx, vy, vz);
        p.acc = xyz(ax, ay, az);
    }
    else {
        p.cor = xyz(x.cor);
        p.vel = xyz(x.vel);
        p.acc = xyz(x.acc);
    }
    return p;
}
function move(pos, step) {
    const vel = pos.vel.add(pos.acc.mul(xyz(step, step, step)));
    const cor = pos.cor.add(vel.mul(xyz(step, step, step)));
    return position(cor, vel, pos.acc);
}
function stop(pos) {
    return position(pos.cor, xyz(), xyz());
}
function gravity(pos) {
    return position(pos.cor, pos.vel, pos.acc.add(xyz(0, 0, GRAVITY)));
}
const dimension = xyz;
export { position, dimension, move, gravity, stop };
