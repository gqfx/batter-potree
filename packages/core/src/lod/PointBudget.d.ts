/**
 * Point budget manager for controlling rendering load
 */
/**
 * Manages point budget allocation across point clouds
 */
export declare class PointBudget {
    private _budget;
    private _used;
    constructor(budget?: number);
    /**
     * Get total point budget
     */
    get budget(): number;
    /**
     * Set total point budget
     */
    set budget(value: number);
    /**
     * Get currently used points
     */
    get used(): number;
    /**
     * Get remaining budget
     */
    get remaining(): number;
    /**
     * Check if budget has capacity for given points
     */
    hasCapacity(points: number): boolean;
    /**
     * Allocate points from budget
     */
    allocate(points: number): boolean;
    /**
     * Reset used points
     */
    reset(): void;
    /**
     * Get budget usage ratio (0-1)
     */
    getUsageRatio(): number;
}
//# sourceMappingURL=PointBudget.d.ts.map