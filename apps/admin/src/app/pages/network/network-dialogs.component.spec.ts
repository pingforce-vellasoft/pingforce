import { TreeNode } from '../../core/services/network.service';
import { parentOptions } from './network-dialogs.component';

function tn(
  id: string,
  children: TreeNode[] = [],
  name: string | null = null,
): TreeNode {
  return {
    id,
    connectionCode: id.toUpperCase(),
    nodeType: 'CUSTOMER',
    status: 'ACTIVE',
    customerId: name ? `cust-${id}` : null,
    customer: name
      ? { id: `cust-${id}`, customerCode: `C-${id}`, displayName: name }
      : null,
    latitude: null,
    longitude: null,
    assignedEmployeeId: null,
    depth: 0,
    children,
  };
}

describe('parentOptions (move dialog)', () => {
  const tree = [tn('a', [tn('b', [tn('c')]), tn('d', [], 'Asha')]), tn('e')];

  it('lists every node, indented by depth, with customer names', () => {
    expect(parentOptions(tree, 'zzz')).toEqual([
      { id: 'a', label: 'A' },
      { id: 'b', label: '  B' },
      { id: 'c', label: '    C' },
      { id: 'd', label: '  D — Asha' },
      { id: 'e', label: 'E' },
    ]);
  });

  it('never offers the moved node or anything under it (no cycles)', () => {
    const ids = parentOptions(tree, 'b').map((o) => o.id);
    expect(ids).toEqual(['a', 'd', 'e']);
  });
});
