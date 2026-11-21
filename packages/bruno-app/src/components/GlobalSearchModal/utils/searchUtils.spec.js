import { getItemPathParts } from './searchUtils';
import { SEARCH_CONFIG } from '../constants';

const makeFinder = (parents) => (collection, uid) => parents[uid];

describe('getItemPathParts', () => {
  const collection = { name: 'Billing API' };

  it('returns collection and request for a request at the collection root', () => {
    const req = { uid: 'r', name: 'Create refund' };
    expect(getItemPathParts(req, collection, makeFinder({}))).toEqual(['Billing API', 'Create refund']);
  });

  it('returns the full ordered list for nested folders', () => {
    const f1 = { uid: 'f1', name: 'Refunds' };
    const f2 = { uid: 'f2', name: 'Partial' };
    const req = { uid: 'r', name: 'Create' };
    const finder = makeFinder({ r: f2, f2: f1 });
    expect(getItemPathParts(req, collection, finder)).toEqual(['Billing API', 'Refunds', 'Partial', 'Create']);
  });

  it('keeps names containing a slash as a single element', () => {
    const f = { uid: 'f', name: 'GET/POST' };
    const req = { uid: 'r', name: 'a/b' };
    expect(getItemPathParts(req, collection, makeFinder({ r: f }))).toEqual(['Billing API', 'GET/POST', 'a/b']);
  });

  it('terminates on a cyclic parent chain via MAX_DEPTH', () => {
    const a = { uid: 'a', name: 'A' };
    const b = { uid: 'b', name: 'B' };
    const parts = getItemPathParts(a, collection, makeFinder({ a: b, b: a }));
    expect(parts[0]).toBe('Billing API');
    expect(parts.length).toBe(SEARCH_CONFIG.MAX_DEPTH + 1);
  });
});
