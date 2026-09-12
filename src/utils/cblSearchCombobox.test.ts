import {
  filterComboOptions,
  moveComboActiveIndex,
} from './cblSearchCombobox';

const options = [
  { id: '1', label: '张三', detail: 'MDY-001 · 09123456789', value: 'MDY-001' },
  { id: '2', label: '李四', detail: 'YGN-002', value: 'YGN-002' },
  { id: '3', label: 'PKG-88', detail: 'YGN → MDY', value: 'PKG-88' },
];

describe('cblSearchCombobox', () => {
  it('moves highlight with wrap-around', () => {
    expect(moveComboActiveIndex(-1, 1, 3)).toBe(0);
    expect(moveComboActiveIndex(-1, -1, 3)).toBe(2);
    expect(moveComboActiveIndex(2, 1, 3)).toBe(0);
    expect(moveComboActiveIndex(0, -1, 3)).toBe(2);
    expect(moveComboActiveIndex(0, 1, 0)).toBe(-1);
  });

  it('filters options locally and keeps an empty list when nothing matches', () => {
    expect(filterComboOptions(options, 'mdy001').map((row) => row.id)).toEqual(['1']);
    expect(filterComboOptions(options, 'pkg88').map((row) => row.value)).toEqual(['PKG-88']);
    expect(filterComboOptions(options, 'zzzz')).toEqual([]);
    expect(filterComboOptions(options, '').map((row) => row.id)).toEqual(['1', '2', '3']);
  });
});
