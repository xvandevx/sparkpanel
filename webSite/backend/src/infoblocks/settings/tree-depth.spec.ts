import { depthError, depthOf, heightOf, isTreeDepth } from './tree-depth';

// 1 ─ 2 ─ 3
//  └─ 4
// 5
const parents = new Map<number, number | null>([
  [1, null],
  [2, 1],
  [3, 2],
  [4, 1],
  [5, null],
]);

describe('дерево или плоский список', () => {
  it('один уровень — плоский, больше или без ограничения — дерево', () => {
    expect(isTreeDepth(1)).toBe(false);
    expect(isTreeDepth(2)).toBe(true);
    expect(isTreeDepth(null)).toBe(true);
  });
});

describe('глубина дерева', () => {
  it('уровень: у корня 1, дальше по родителям', () => {
    expect(depthOf(parents, 1)).toBe(1);
    expect(depthOf(parents, 3)).toBe(3);
  });

  it('высота ветки: у записи без детей 1', () => {
    expect(heightOf(parents, 1)).toBe(3);
    expect(heightOf(parents, 4)).toBe(1);
  });

  it('новая запись под родителем на последнем уровне не встаёт', () => {
    expect(depthError(parents, null, 2, 2)).not.toBeNull();
    expect(depthError(parents, null, 1, 2)).toBeNull();
    expect(depthError(parents, null, null, 1)).toBeNull();
  });

  it('перенос считает всю ветку записи', () => {
    // Ветка 1 высотой 3 под корень 5 — это 4 уровня
    expect(depthError(parents, 1, 5, 3)).not.toBeNull();
    expect(depthError(parents, 4, 5, 2)).toBeNull();
  });

  it('без предела проходит всё', () => {
    expect(depthError(parents, 1, 5, null)).toBeNull();
  });
});
