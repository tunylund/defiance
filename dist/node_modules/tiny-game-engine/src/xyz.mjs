class XYZ {
    constructor(x = 0, y = 0, z = 0) {
        if (x instanceof XYZ) {
            this.x = x.x;
            this.y = x.y;
            this.z = x.z;
        }
        else {
            this.x = x;
            this.y = y;
            this.z = z;
        }
        this.x2 = this.x / 2;
        this.y2 = this.y / 2;
        this.z2 = this.z / 2;
        this.radian = (Math.atan2(this.y, this.x) + Math.PI * 2) % (Math.PI * 2);
        this.angle = (this.radian * 180 / Math.PI + 360) % 360;
    }
    get signature() {
        return xyz(this.x === 0 ? 1 : Math.abs(this.x) / this.x, this.y === 0 ? 1 : Math.abs(this.y) / this.y, this.z === 0 ? 1 : Math.abs(this.z) / this.z);
    }
    get unit() {
        return this.signature.mul(xyz(this.x === 0 ? 0 : 1, this.y === 0 ? 0 : 1, this.z === 0 ? 0 : 1));
    }
    get size() { return Math.sqrt(this.x * this.x + this.y * this.y + this.z * this.z); }
    cross(v) {
        return xyz(this.y * v.z - this.z * v.y, this.x * v.z - this.z * v.x, this.x * v.y - this.y * v.x);
    }
    dot(v) { return this.mul(v).sum(); }
    add(v) { return xyz(this.x + v.x, this.y + v.y, this.z + v.z); }
    sub(v) { return xyz(this.x - v.x, this.y - v.y, this.z - v.z); }
    mul(v) { return xyz(this.x * v.x, this.y * v.y, this.z * v.z); }
    div(v) { return xyz(this.x / v.x, this.y / v.y, this.z / v.z); }
    sum() { return Math.abs(this.x) + Math.abs(this.y) + Math.abs(this.z); }
    equal(v) { return this.x === v.x && this.y === v.y && this.z === v.z; }
}
/**
 * @param {number} [x]
 * @param {number} [y]
 * @param {number} [z]
 */
function xyz(x = 0, y = 0, z = 0) { return new XYZ(x, y, z); }
function vector2(radian, size = 1) {
    return xyz(Math.round(size * Math.cos(radian) * 10000) / 10000, Math.round(size * Math.sin(radian) * 10000) / 10000);
}
function unit(v) { return new XYZ(v, v, v); }
const negone = xyz(-1, -1, -1);
const zero = xyz(0, 0, 0);
const half = xyz(0.5, 0.5, 0.5);
const one = xyz(1, 1, 1);
const two = xyz(2, 2, 2);
export { xyz, XYZ, vector2, unit, negone, zero, half, one, two };
