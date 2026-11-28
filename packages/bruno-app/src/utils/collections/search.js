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

/**
 * Splits `name` into segments for bolding the parts that `doesNameMatchSearchText` matched on.
 * Same normalisation (trim + lowercase); every non-overlapping occurrence is a match segment and
 * the original casing of `name` is kept. No match or an empty query yields one plain segment.
 *
 * @returns {{ text: string, isMatch: boolean }[]}
 */
export const getSearchMatchSegments = (name, searchText = '') => {
  const text = name == null ? '' : String(name);
  const query = normalizeSearchText(searchText);
  if (!query) return [{ text, isMatch: false }];

  const lowerText = text.toLowerCase();
  // toLowerCase can change length for some characters, so indices would not map onto `text`.
  // Show the name plain rather than bold the wrong part.
  if (lowerText.length !== text.length) {
    return [{ text, isMatch: false }];
  }

  const segments = [];
  let cursor = 0;
  let index = lowerText.indexOf(query, cursor);
  while (index !== -1) {
    if (index > cursor) segments.push({ text: text.slice(cursor, index), isMatch: false });
    segments.push({ text: text.slice(index, index + query.length), isMatch: true });
    cursor = index + query.length;
    index = lowerText.indexOf(query, cursor);
  }
  if (cursor < text.length) segments.push({ text: text.slice(cursor), isMatch: false });
  return segments.length ? segments : [{ text, isMatch: false }];
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
