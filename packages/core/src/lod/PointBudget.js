/**
 * Point budget manager for controlling rendering load
 */
/**
 * Manages point budget allocation across point clouds
 */
export class PointBudget {
  constructor(budget = 1000000) {
    this._budget = budget;
    this._used = 0;
  }
  /**
   * Get total point budget
   */
  get budget() {
    return this._budget;
  }
  /**
   * Set total point budget
   */
  set budget(value) {
    this._budget = Math.max(0, value);
  }
  /**
   * Get currently used points
   */
  get used() {
    return this._used;
  }
  /**
   * Get remaining budget
   */
  get remaining() {
    return Math.max(0, this._budget - this._used);
  }
  /**
   * Check if budget has capacity for given points
   */
  hasCapacity(points) {
    return this._used + points <= this._budget;
  }
  /**
   * Allocate points from budget
   */
  allocate(points) {
    if (!this.hasCapacity(points)) {
      return false;
    }
    this._used += points;
    return true;
  }
  /**
   * Reset used points
   */
  reset() {
    this._used = 0;
  }
  /**
   * Get budget usage ratio (0-1)
   */
  getUsageRatio() {
    return this._budget > 0 ? this._used / this._budget : 0;
  }
}
//# sourceMappingURL=PointBudget.js.map
