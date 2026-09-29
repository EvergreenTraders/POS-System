// Flattens a /api/categories/tree response (divisions → nested categories)
// into a depth-first list: each category keeps its depth (for indentation),
// a readable path ("Video games › Consoles › Sony") and its division.
export function flattenCategoryTree(tree) {
  const out = [];
  tree.forEach(div => {
    const walk = (nodes, depth, path) => {
      nodes.forEach(n => {
        const nodePath = [...path, n.name];
        out.push({
          id: n.id,
          name: n.name,
          is_active: n.is_active,
          depth,
          path: nodePath.join(' › '),
          division_id: div.id,
          division_name: div.name,
        });
        if (n.children?.length) walk(n.children, depth + 1, nodePath);
      });
    };
    walk(div.categories || [], 0, []);
  });
  return out;
}
