import { moveItem } from './stage-manager-dialog.component';

describe('moveItem (stage reorder)', () => {
  it('swaps with the neighbour in the given direction', () => {
    expect(moveItem(['a', 'b', 'c'], 1, -1)).toEqual(['b', 'a', 'c']);
    expect(moveItem(['a', 'b', 'c'], 1, 1)).toEqual(['a', 'c', 'b']);
  });

  it('leaves the list unchanged at either end and never mutates it', () => {
    const list = ['a', 'b'];
    expect(moveItem(list, 0, -1)).toEqual(['a', 'b']);
    expect(moveItem(list, 1, 1)).toEqual(['a', 'b']);
    expect(list).toEqual(['a', 'b']);
  });
});
