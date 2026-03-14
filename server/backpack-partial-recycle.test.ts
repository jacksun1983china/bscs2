/**
 * 背包部分回收功能测试
 * 验证：
 * 1. selectedQty 状态管理逻辑
 * 2. ids.slice(0, qty) 部分选择逻辑
 * 3. selectedValue 根据 qty 计算
 */
import { describe, it, expect } from 'vitest';

// 模拟 InventoryItem 数据结构
interface InventoryItem {
  itemId: number;
  count: number;
  ids: number[];
  recycleGold: string;
  itemValue: string | null;
}

describe('背包部分回收逻辑', () => {
  // 模拟物品数据
  const items: InventoryItem[] = [
    { itemId: 101, count: 3, ids: [1, 2, 3], recycleGold: '0.10', itemValue: '0.10' },
    { itemId: 102, count: 1, ids: [4], recycleGold: '5.00', itemValue: '5.00' },
    { itemId: 103, count: 2, ids: [5, 6], recycleGold: '1.50', itemValue: '1.50' },
  ];

  describe('ids.slice 部分选择', () => {
    it('选择全部数量时返回所有ids', () => {
      const selectedQty = new Map<number, number>([[101, 3]]);
      const item = items[0];
      const qty = selectedQty.get(item.itemId) ?? item.count;
      const slicedIds = item.ids.slice(0, qty);
      expect(slicedIds).toEqual([1, 2, 3]);
    });

    it('选择部分数量时只返回前N个ids', () => {
      const selectedQty = new Map<number, number>([[101, 1]]);
      const item = items[0];
      const qty = selectedQty.get(item.itemId) ?? item.count;
      const slicedIds = item.ids.slice(0, qty);
      expect(slicedIds).toEqual([1]);
    });

    it('选择2个时返回前2个ids', () => {
      const selectedQty = new Map<number, number>([[101, 2]]);
      const item = items[0];
      const qty = selectedQty.get(item.itemId) ?? item.count;
      const slicedIds = item.ids.slice(0, qty);
      expect(slicedIds).toEqual([1, 2]);
    });

    it('没有selectedQty记录时默认使用全部count', () => {
      const selectedQty = new Map<number, number>();
      const item = items[0];
      const qty = selectedQty.get(item.itemId) ?? item.count;
      const slicedIds = item.ids.slice(0, qty);
      expect(slicedIds).toEqual([1, 2, 3]);
    });

    it('单个物品（count=1）不需要selectedQty', () => {
      const selectedQty = new Map<number, number>();
      const item = items[1]; // count=1
      const qty = selectedQty.get(item.itemId) ?? item.count;
      const slicedIds = item.ids.slice(0, qty);
      expect(slicedIds).toEqual([4]);
    });
  });

  describe('selectedValue 计算', () => {
    it('部分选择时正确计算金额', () => {
      const selectedIds = new Set([101, 103]);
      const selectedQty = new Map<number, number>([[101, 1], [103, 2]]);

      const selectedValue = Math.round(items
        .filter(i => selectedIds.has(i.itemId))
        .reduce((s, i) => {
          const qty = selectedQty.get(i.itemId) ?? i.count;
          return s + Number(i.recycleGold ?? i.itemValue ?? 0) * qty;
        }, 0) * 100) / 100;

      // 101: 0.10 * 1 = 0.10, 103: 1.50 * 2 = 3.00 => 3.10
      expect(selectedValue).toBe(3.10);
    });

    it('全选时使用count计算', () => {
      const selectedIds = new Set([101]);
      const selectedQty = new Map<number, number>([[101, 3]]);

      const selectedValue = Math.round(items
        .filter(i => selectedIds.has(i.itemId))
        .reduce((s, i) => {
          const qty = selectedQty.get(i.itemId) ?? i.count;
          return s + Number(i.recycleGold ?? i.itemValue ?? 0) * qty;
        }, 0) * 100) / 100;

      // 101: 0.10 * 3 = 0.30
      expect(selectedValue).toBe(0.30);
    });

    it('选择1个时正确计算', () => {
      const selectedIds = new Set([101]);
      const selectedQty = new Map<number, number>([[101, 1]]);

      const selectedValue = Math.round(items
        .filter(i => selectedIds.has(i.itemId))
        .reduce((s, i) => {
          const qty = selectedQty.get(i.itemId) ?? i.count;
          return s + Number(i.recycleGold ?? i.itemValue ?? 0) * qty;
        }, 0) * 100) / 100;

      expect(selectedValue).toBe(0.10);
    });
  });

  describe('totalSelectedCount 计算', () => {
    it('部分选择时正确计算件数', () => {
      const selectedIds = new Set([101, 102, 103]);
      const selectedQty = new Map<number, number>([[101, 2], [103, 1]]);

      const totalSelectedCount = items
        .filter(i => selectedIds.has(i.itemId))
        .reduce((s, i) => s + (selectedQty.get(i.itemId) ?? i.count), 0);

      // 101: 2, 102: 1 (no qty entry, use count), 103: 1 => 4
      expect(totalSelectedCount).toBe(4);
    });

    it('全选时等于所有count之和', () => {
      const selectedIds = new Set([101, 102, 103]);
      const selectedQty = new Map<number, number>([[101, 3], [103, 2]]);

      const totalSelectedCount = items
        .filter(i => selectedIds.has(i.itemId))
        .reduce((s, i) => s + (selectedQty.get(i.itemId) ?? i.count), 0);

      // 101: 3, 102: 1, 103: 2 => 6
      expect(totalSelectedCount).toBe(6);
    });
  });

  describe('数量边界', () => {
    it('数量不能小于1', () => {
      const cur = 1;
      const newQty = Math.max(1, cur - 1);
      expect(newQty).toBe(1);
    });

    it('数量不能超过count', () => {
      const count = 3;
      const cur = 3;
      const newQty = Math.min(count, cur + 1);
      expect(newQty).toBe(3);
    });

    it('正常递减', () => {
      const cur = 2;
      const newQty = Math.max(1, cur - 1);
      expect(newQty).toBe(1);
    });

    it('正常递增', () => {
      const count = 3;
      const cur = 1;
      const newQty = Math.min(count, cur + 1);
      expect(newQty).toBe(2);
    });
  });

  describe('handleConfirmAction ids收集', () => {
    it('多个物品部分选择时正确收集ids', () => {
      const selectedIds = new Set([101, 103]);
      const selectedQty = new Map<number, number>([[101, 2], [103, 1]]);

      const allIds = items
        .filter(i => selectedIds.has(i.itemId))
        .flatMap(i => {
          const qty = selectedQty.get(i.itemId) ?? i.count;
          return i.ids.slice(0, qty);
        });

      // 101: ids[0,1] = [1,2], 103: ids[0] = [5]
      expect(allIds).toEqual([1, 2, 5]);
    });
  });
});
