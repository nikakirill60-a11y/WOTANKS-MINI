// The supplied control scheme, expressed in CITY TANKS coordinates (+x forward,
// +y to the right on the map). Boom lengths are metres, not mesh/world units.
class ArcadeLook {
  static sightY = 0.12; // NDC: crosshair at 50% width, 44% height in both modes
  constructor(yaw) {
    this.yaw = yaw;
    this.pitch = 0.22;
    this.mode = 'arcade';
    this.level = 0;
    this.distance = this.targetDistance = this.wallDistance = 13;
  }
  get scoped() {
    return this.mode === 'sniper';
  }
  get zoom() {
    return this.scoped ? [2, 4, 8][this.level] : 1;
  }
  get fov() {
    return this.scoped ? 44 / this.zoom : 62;
  }
  rotate(dx, dy, sensitivity) {
    const rate = (0.0022 * bounded(sensitivity, 0.3, 2.5)) / (this.scoped ? this.zoom * 1.4 : 1);
    this.yaw = wrapAngle(this.yaw + dx * rate);
    this.pitch = bounded(this.pitch + dy * rate, -0.55, 1.2);
  }
  toggleScope() {
    this.mode = this.scoped ? 'arcade' : 'sniper';
    this.level = 0;
  }
  cycleZoom() {
    if (this.scoped) this.level = (this.level + 1) % 3;
  }
  wheel(delta) {
    const step = Math.sign(delta);
    if (!step) return;
    if (!this.scoped) {
      if (step < 0 && this.targetDistance <= 6.01) this.toggleScope();
      else this.targetDistance = bounded(this.targetDistance + step * 2.5, 6, 26);
    } else if (step > 0 && this.level === 0) {
      this.toggleScope();
      this.targetDistance = 6;
    } else this.level = bounded(this.level - step, 0, 2);
  }
  static stick(dx, dy) {
    const radius = 58,
      ratio = radius / Math.max(radius, Math.hypot(dx, dy));
    const axis = (v) => (Math.sign(v) * Math.round(20 * bounded((Math.abs(v) - 0.15) / 0.85, 0, 1))) / 20;
    return { x: dx * ratio, y: dy * ratio, dx: axis((dx * ratio) / radius), dy: axis((dy * ratio) / radius) };
  }
}
