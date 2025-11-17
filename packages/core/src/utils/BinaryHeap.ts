/**
 * 二叉堆（最小堆）实现
 *
 * 用于优先级队列，支持自定义权重函数。
 * 时间复杂度：
 * - push: O(log n)
 * - pop: O(log n)
 * - peek: O(1)
 *
 * @module utils
 * @example
 * ```ts
 * // 简单数字堆
 * const heap = new BinaryHeap<number>((x) => x);
 * heap.push(5);
 * heap.push(3);
 * heap.push(7);
 * console.log(heap.pop()); // 3
 *
 * // 对象堆（使用自定义权重函数）
 * interface Node { priority: number }
 * const heap = new BinaryHeap<Node>((node) => node.priority);
 * heap.push({ priority: 5 });
 * heap.push({ priority: 3 });
 * console.log(heap.pop()?.priority); // 3
 * ```
 */

/**
 * 权重计算函数类型
 *
 * @template T - 元素类型
 * @param element - 堆中的元素
 * @returns 元素的权重（越小优先级越高）
 */
export type ScoreFunction<T> = (element: T) => number;

/**
 * 二叉堆（最小堆）
 *
 * @template T - 堆中元素的类型
 */
export class BinaryHeap<T> {
  private readonly content: T[] = [];
  private readonly scoreFunction: ScoreFunction<T>;

  /**
   * 创建二叉堆
   *
   * @param scoreFunction - 权重计算函数，返回值越小优先级越高
   * @example
   * ```ts
   * // 创建数字堆（小的先出）
   * const heap = new BinaryHeap<number>((x) => x);
   *
   * // 创建对象堆（按距离排序）
   * const heap = new BinaryHeap<Node>((node) => node.distance);
   *
   * // 创建反向堆（大的先出）
   * const heap = new BinaryHeap<number>((x) => -x);
   * ```
   */
  constructor(scoreFunction: ScoreFunction<T>) {
    this.scoreFunction = scoreFunction;
  }

  /**
   * 获取堆的大小
   *
   * @returns 堆中元素数量
   */
  size(): number {
    return this.content.length;
  }

  /**
   * 检查堆是否为空
   *
   * @returns 如果堆为空返回 true
   */
  isEmpty(): boolean {
    return this.content.length === 0;
  }

  /**
   * 向堆中添加元素
   *
   * @param element - 要添加的元素
   * @example
   * ```ts
   * heap.push(5);
   * heap.push(3);
   * heap.push(7);
   * ```
   */
  push(element: T): void {
    // 将元素添加到数组末尾
    this.content.push(element);
    // 向上冒泡以维护堆性质
    this.bubbleUp(this.content.length - 1);
  }

  /**
   * 查看堆顶元素（不移除）
   *
   * @returns 堆顶元素，如果堆为空返回 undefined
   * @example
   * ```ts
   * heap.push(5);
   * heap.push(3);
   * console.log(heap.peek()); // 3
   * console.log(heap.peek()); // 3（未移除）
   * ```
   */
  peek(): T | undefined {
    return this.content[0];
  }

  /**
   * 移除并返回堆顶元素
   *
   * @returns 堆顶元素，如果堆为空返回 undefined
   * @example
   * ```ts
   * heap.push(5);
   * heap.push(3);
   * heap.push(7);
   * console.log(heap.pop()); // 3
   * console.log(heap.pop()); // 5
   * console.log(heap.pop()); // 7
   * console.log(heap.pop()); // undefined
   * ```
   */
  pop(): T | undefined {
    const result = this.content[0];
    const end = this.content.pop();

    if (this.content.length > 0 && end !== undefined) {
      this.content[0] = end;
      // 向下冒泡以维护堆性质
      this.sinkDown(0);
    }

    return result;
  }

  /**
   * 移除指定元素
   *
   * @param element - 要移除的元素
   * @returns 如果找到并移除返回 true，否则返回 false
   * @example
   * ```ts
   * const node = { id: 1, priority: 5 };
   * heap.push(node);
   * heap.remove(node); // true
   * heap.remove(node); // false（已移除）
   * ```
   */
  remove(element: T): boolean {
    const length = this.content.length;

    // 查找元素
    for (let i = 0; i < length; i++) {
      if (this.content[i] === element) {
        // 用最后一个元素替换
        const end = this.content.pop();

        if (i === length - 1) {
          // 移除的就是最后一个元素，无需调整
          return true;
        }

        if (end !== undefined) {
          this.content[i] = end;
          // 尝试向上和向下冒泡
          this.bubbleUp(i);
          this.sinkDown(i);
        }

        return true;
      }
    }

    return false;
  }

  /**
   * 清空堆
   *
   * @example
   * ```ts
   * heap.push(1);
   * heap.push(2);
   * heap.clear();
   * console.log(heap.size()); // 0
   * ```
   */
  clear(): void {
    this.content.length = 0;
  }

  /**
   * 向上冒泡元素以维护堆性质
   *
   * @param index - 元素索引
   */
  private bubbleUp(index: number): void {
    const element = this.content[index]!;
    const score = this.scoreFunction(element);

    while (index > 0) {
      // 计算父节点索引
      const parentIndex = Math.floor((index - 1) / 2);
      const parent = this.content[parentIndex]!;

      // 如果元素的权重大于等于父节点，停止冒泡
      if (score >= this.scoreFunction(parent)) {
        break;
      }

      // 交换元素和父节点
      this.content[parentIndex] = element;
      this.content[index] = parent;
      index = parentIndex;
    }
  }

  /**
   * 向下沉降元素以维护堆性质
   *
   * @param index - 元素索引
   */
  private sinkDown(index: number): void {
    const length = this.content.length;
    const element = this.content[index]!;
    const elementScore = this.scoreFunction(element);

    while (true) {
      const child2Index = (index + 1) * 2;
      const child1Index = child2Index - 1;
      let swapIndex = -1;
      let swapScore = elementScore;

      // 检查左子节点
      if (child1Index < length) {
        const child1 = this.content[child1Index]!;
        const child1Score = this.scoreFunction(child1);

        if (child1Score < swapScore) {
          swapIndex = child1Index;
          swapScore = child1Score;
        }
      }

      // 检查右子节点
      if (child2Index < length) {
        const child2 = this.content[child2Index]!;
        const child2Score = this.scoreFunction(child2);

        if (child2Score < swapScore) {
          swapIndex = child2Index;
        }
      }

      // 如果没有需要交换的子节点，停止沉降
      if (swapIndex === -1) {
        break;
      }

      // 交换元素和子节点
      this.content[index] = this.content[swapIndex]!;
      this.content[swapIndex] = element;
      index = swapIndex;
    }
  }
}
