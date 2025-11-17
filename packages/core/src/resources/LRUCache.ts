/**
 * LRU 缓存实现
 *
 * 基于双向链表的 LRU (Least Recently Used) 缓存
 *
 * @module resources
 * @example
 * ```ts
 * const cache = new LRUCache<string, number>(3);
 * cache.set('a', 1);
 * cache.set('b', 2);
 * cache.get('a'); // 1, 'a' 被移到最前
 * cache.set('c', 3);
 * cache.set('d', 4); // 'b' 被淘汰
 * ```
 */

/**
 * LRU 节点
 */
class LRUNode<K, V> {
  constructor(
    public key: K,
    public value: V,
    public prev: LRUNode<K, V> | null = null,
    public next: LRUNode<K, V> | null = null,
  ) {}
}

/**
 * LRU 缓存
 *
 * 特性：
 * - O(1) 访问和更新
 * - 自动淘汰最久未使用的元素
 * - 支持容量限制
 */
export class LRUCache<K, V> {
  private readonly capacity: number;
  private readonly cache = new Map<K, LRUNode<K, V>>();
  private head: LRUNode<K, V> | null = null; // 最近使用
  private tail: LRUNode<K, V> | null = null; // 最久未使用

  /**
   * 创建 LRU 缓存
   *
   * @param capacity - 最大容量
   */
  constructor(capacity: number) {
    if (capacity <= 0) {
      throw new Error('Capacity must be positive');
    }
    this.capacity = capacity;
  }

  /**
   * 获取值
   *
   * @param key - 键
   * @returns 值或 undefined
   */
  get(key: K): V | undefined {
    const node = this.cache.get(key);
    if (!node) return undefined;

    // 移到头部（最近使用）
    this.moveToHead(node);
    return node.value;
  }

  /**
   * 设置值
   *
   * @param key - 键
   * @param value - 值
   * @returns 被淘汰的条目（如果有）
   */
  set(key: K, value: V): { key: K; value: V } | null {
    let evicted: { key: K; value: V } | null = null;
    const existing = this.cache.get(key);

    if (existing) {
      // 更新现有值
      existing.value = value;
      this.moveToHead(existing);
    } else {
      // 添加新节点
      const newNode = new LRUNode(key, value);
      this.cache.set(key, newNode);

      if (!this.head) {
        this.head = newNode;
        this.tail = newNode;
      } else {
        newNode.next = this.head;
        this.head.prev = newNode;
        this.head = newNode;
      }

      // 检查容量
      if (this.cache.size > this.capacity) {
        evicted = this.removeTail();
      }
    }

    return evicted;
  }

  /**
   * 删除键
   *
   * @param key - 键
   * @returns 是否删除成功
   */
  delete(key: K): boolean {
    const node = this.cache.get(key);
    if (!node) return false;

    this.removeNode(node);
    this.cache.delete(key);
    return true;
  }

  /**
   * 检查是否包含键
   *
   * @param key - 键
   * @returns 是否存在
   */
  has(key: K): boolean {
    return this.cache.has(key);
  }

  /**
   * 清空缓存
   */
  clear(): void {
    this.cache.clear();
    this.head = null;
    this.tail = null;
  }

  /**
   * 获取缓存大小
   */
  get size(): number {
    return this.cache.size;
  }

  /**
   * 获取所有键（从最近到最久）
   */
  keys(): K[] {
    const keys: K[] = [];
    let current = this.head;
    while (current) {
      keys.push(current.key);
      current = current.next;
    }
    return keys;
  }

  /**
   * 获取最久未使用的键
   */
  getLRUKey(): K | undefined {
    return this.tail?.key;
  }

  /**
   * 移动节点到头部
   */
  private moveToHead(node: LRUNode<K, V>): void {
    if (node === this.head) return;

    this.removeNode(node);

    node.next = this.head;
    node.prev = null;

    if (this.head) {
      this.head.prev = node;
    }

    this.head = node;

    if (!this.tail) {
      this.tail = node;
    }
  }

  /**
   * 从链表中移除节点
   */
  private removeNode(node: LRUNode<K, V>): void {
    if (node.prev) {
      node.prev.next = node.next;
    } else {
      this.head = node.next;
    }

    if (node.next) {
      node.next.prev = node.prev;
    } else {
      this.tail = node.prev;
    }
  }

  /**
   * 移除尾部节点
   */
  private removeTail(): { key: K; value: V } | null {
    if (!this.tail) return null;

    const evicted = { key: this.tail.key, value: this.tail.value };
    this.cache.delete(this.tail.key);
    this.removeNode(this.tail);

    return evicted;
  }
}
