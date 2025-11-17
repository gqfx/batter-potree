/**
 * 八叉树工具函数
 *
 * @module octree
 */

/**
 * 根据节点名称计算层级
 *
 * @param name - 节点名称（如 "r", "r0", "r012"）
 * @returns 层级数（从0开始）
 */
export function getNodeLevel(name: string): number {
  if (!name.startsWith('r')) return -1;
  return name.length - 1;
}

/**
 * 获取父节点名称
 *
 * @param name - 节点名称
 * @returns 父节点名称，根节点返回 null
 */
export function getParentNodeName(name: string): string | null {
  if (name === 'r' || name.length <= 1) return null;
  return name.slice(0, -1);
}

/**
 * 获取子节点名称
 *
 * @param name - 节点名称
 * @param childIndex - 子节点索引（0-7）
 * @returns 子节点名称
 */
export function getChildNodeName(name: string, childIndex: number): string {
  if (childIndex < 0 || childIndex > 7) {
    throw new Error(`Invalid child index: ${childIndex}`);
  }
  return name + childIndex.toString();
}

/**
 * 生成节点的全局唯一ID
 *
 * @param sourceId - 数据源ID
 * @param nodeName - 节点名称
 * @returns 全局唯一ID
 */
export function makeGlobalNodeId(sourceId: string, nodeName: string): string {
  return `${sourceId}::${nodeName}`;
}

/**
 * 从全局ID解析源ID和节点名称
 *
 * @param globalId - 全局唯一ID
 * @returns 源ID和节点名称
 */
export function parseGlobalNodeId(globalId: string): { sourceId: string; nodeName: string } {
  const parts = globalId.split('::');
  if (parts.length !== 2) {
    throw new Error(`Invalid global node ID: ${globalId}`);
  }
  return {
    sourceId: parts[0],
    nodeName: parts[1],
  };
}

/**
 * 检查节点名称是否有效
 *
 * @param name - 节点名称
 * @returns 是否有效
 */
export function isValidNodeName(name: string): boolean {
  if (!name || name.length === 0) return false;
  if (name[0] !== 'r') return false;

  for (let i = 1; i < name.length; i++) {
    const char = name[i];
    const index = Number.parseInt(char, 10);
    if (Number.isNaN(index) || index < 0 || index > 7) {
      return false;
    }
  }

  return true;
}
