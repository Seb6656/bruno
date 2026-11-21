import { isItemAFolder, isItemARequest } from './index';

const normalizeSearchText = (searchText = '') => searchText.trim().toLowerCase();

/**
 * Case-insensitive "contains" match of the whole query against a single name.
 * An empty (or whitespace-only) query matches everything.
 */
export const doesNameMatchSearchText = (name, searchText = '') => {
  const query = normalizeSearchText(searchText);
  return !query || Boolean(name?.toLowerCase().includes(query));
};

// True when any non-transient request or folder below `items` has a matching name.
const hasMatchingDescendant = (items = [], query) => {
  return items.some((child) => {
    if (!child || child.isTransient) return false;
    if (!isItemARequest(child) && !isItemAFolder(child)) return false;
    return doesNameMatchSearchText(child.name, query) || hasMatchingDescendant(child.items, query);
  });
};

/**
 * Decides whether a sidebar node (collection, folder or request) is shown for a search.
 *
 * `showAll` is true when the node's own name matches or an ancestor already matched;
 * callers pass it down as `ancestorMatched` so the whole subtree (apps included) is shown.
 * A folder or collection is also visible when anything inside it is visible.
 *
 * @param {Object} item collection, folder or request
 * @param {string} searchText
 * @param {boolean} [ancestorMatched] a folder or collection above `item` matched by name
 * @returns {{ isVisible: boolean, showAll: boolean }}
 */
export const getSidebarSearchMatch = (item, searchText = '', ancestorMatched = false) => {
  const showAll = ancestorMatched || doesNameMatchSearchText(item?.name, searchText);
  const isVisible = showAll || hasMatchingDescendant(item?.items, searchText);
  return { isVisible, showAll };
};
