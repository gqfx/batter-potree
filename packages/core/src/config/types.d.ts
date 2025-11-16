/**
 * 配置状态管理 - 类型定义
 *
 * @module config/types
 */
/**
 * 数据源配置
 *
 * @description 描述点云或 3DGS 数据源的配置信息
 *
 * @example
 * ```typescript
 * const sourceConfig: SourceConfig = {
 *   id: 'main-pointcloud',
 *   type: 'potree',
 *   url: '/data/meta.json',
 *   visible: true,
 *   transform: [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1],
 *   materialId: 'default-material'
 * };
 * ```
 */
export interface SourceConfig {
    /** 数据源唯一标识符 */
    readonly id: string;
    /** 数据源类型 (potree, 3dgs 或自定义类型) */
    readonly type: 'potree' | '3dgs' | string;
    /** 元数据文件 URL (Potree 2.0 meta.json 或 3DGS 元数据入口) */
    readonly url: string;
    /** 是否可见 (默认: true) */
    readonly visible?: boolean;
    /** 变换矩阵 (4x4 矩阵的 16 个元素数组) */
    readonly transform?: readonly number[];
    /** 关联的材质 ID */
    readonly materialId?: string;
}
/**
 * 材质配置
 *
 * @description 定义点云或高斯球的材质参数
 *
 * @example
 * ```typescript
 * const materialConfig: MaterialConfig = {
 *   id: 'custom-material',
 *   type: 'point',
 *   size: 1.5,
 *   colorEncoding: 'RGB'
 * };
 * ```
 */
export interface MaterialConfig {
    /** 材质唯一标识符 */
    readonly id: string;
    /** 材质类型 */
    readonly type: 'point' | 'gaussian' | string;
    /** 点或高斯球大小 */
    readonly size?: number;
    /** 颜色编码方式 */
    readonly colorEncoding?: 'RGB' | 'INTENSITY' | 'CLASSIFICATION';
}
/**
 * 渲染配置
 *
 * @description 控制渲染行为的全局参数
 *
 * @example
 * ```typescript
 * const renderingConfig: RenderingConfig = {
 *   pointBudget: 2_000_000,
 *   fov: 60,
 *   minNodeSize: 100,
 *   pointSize: 1.0
 * };
 * ```
 */
export interface RenderingConfig {
    /** 点预算 (每帧最大渲染点数) */
    readonly pointBudget: number;
    /** 视场角 (度) */
    readonly fov: number;
    /** 最小节点屏幕大小 (像素) */
    readonly minNodeSize: number;
    /** 默认点大小 */
    readonly pointSize: number;
}
/**
 * 相机配置
 *
 * @description 相机位置和朝向配置
 */
export interface CameraConfig {
    /** 相机位置 [x, y, z] */
    readonly position: readonly [number, number, number];
    /** 相机目标点 [x, y, z] */
    readonly target: readonly [number, number, number];
}
/**
 * 配置状态
 *
 * @description 整个引擎的配置状态，由 Zustand 管理
 *
 * @remarks
 * - 所有属性必须可序列化
 * - 所有更新必须遵循不可变原则
 * - 由 StateCoordinator 同步到 Runtime
 *
 * @example
 * ```typescript
 * const configState: ConfigState = {
 *   sources: {
 *     'main': { id: 'main', type: 'potree', url: '/meta.json', visible: true }
 *   },
 *   materials: {},
 *   rendering: {
 *     pointBudget: 2_000_000,
 *     fov: 60,
 *     minNodeSize: 100,
 *     pointSize: 1.0
 *   },
 *   camera: {
 *     position: [0, 0, 10],
 *     target: [0, 0, 0]
 *   }
 * };
 * ```
 */
export interface ConfigState {
    /** 数据源配置 (key: sourceId) */
    readonly sources: Readonly<Record<string, SourceConfig>>;
    /** 材质配置 (key: materialId) */
    readonly materials: Readonly<Record<string, MaterialConfig>>;
    /** 渲染配置 */
    readonly rendering: RenderingConfig;
    /** 相机配置 */
    readonly camera: CameraConfig;
}
/**
 * 配置 Store 接口
 *
 * @description 扩展 ConfigState，包含所有 actions
 *
 * @example
 * ```typescript
 * const store = createConfigStore();
 * const state = store.getState();
 *
 * // 添加数据源
 * state.addSource({
 *   id: 'test',
 *   type: 'potree',
 *   url: '/test/meta.json',
 *   visible: true
 * });
 *
 * // 更新渲染配置
 * state.setRenderingConfig({ pointBudget: 5_000_000 });
 * ```
 */
export interface ConfigStore extends ConfigState {
    /**
     * 添加数据源
     *
     * @param config - 数据源配置
     * @throws {Error} 如果 ID 已存在
     *
     * @example
     * ```typescript
     * store.getState().addSource({
     *   id: 'new-source',
     *   type: 'potree',
     *   url: '/data/meta.json',
     *   visible: true
     * });
     * ```
     */
    addSource: (config: SourceConfig) => void;
    /**
     * 删除数据源
     *
     * @param id - 数据源 ID
     *
     * @example
     * ```typescript
     * store.getState().removeSource('old-source');
     * ```
     */
    removeSource: (id: string) => void;
    /**
     * 更新数据源配置
     *
     * @param id - 数据源 ID
     * @param partial - 部分配置更新
     *
     * @example
     * ```typescript
     * store.getState().updateSource('main', { visible: false });
     * ```
     */
    updateSource: (id: string, partial: Partial<SourceConfig>) => void;
    /**
     * 更新渲染配置
     *
     * @param config - 部分渲染配置更新
     *
     * @example
     * ```typescript
     * store.getState().setRenderingConfig({
     *   pointBudget: 5_000_000,
     *   pointSize: 1.5
     * });
     * ```
     */
    setRenderingConfig: (config: Partial<RenderingConfig>) => void;
}
/**
 * 引擎初始化配置
 *
 * @description 创建 Engine 时传入的配置 (所有字段都是可选的)
 *
 * @example
 * ```typescript
 * const engineConfig: EngineConfig = {
 *   sources: {
 *     main: { id: 'main', type: 'potree', url: '/meta.json', visible: true }
 *   },
 *   rendering: {
 *     pointBudget: 5_000_000
 *   }
 * };
 *
 * const engine = new Engine(engineConfig);
 * ```
 */
export type EngineConfig = Partial<ConfigState>;
//# sourceMappingURL=types.d.ts.map