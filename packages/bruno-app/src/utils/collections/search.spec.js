import { doesNameMatchSearchText, getSearchMatchSegments, getSidebarSearchMatch } from './search';

const createRequest = (name, props = {}) => ({
  uid: name,
  name,
  type: 'http-request',
  request: {},
  ...props
});

const createFolder = (name, items = [], props = {}) => ({
  uid: name,
  name,
  type: 'folder',
  items,
  ...props
});

describe('doesNameMatchSearchText', () => {
  it('matches case-insensitively as one exact phrase', () => {
    expect(doesNameMatchSearchText('Create refund', 'CREATE REF')).toBe(true);
    expect(doesNameMatchSearchText('Refund - create', 'create refund')).toBe(false);
  });

  it('trims the query and treats an empty one as a match', () => {
    expect(doesNameMatchSearchText('Create refund', '  refund  ')).toBe(true);
    expect(doesNameMatchSearchText('Create refund', '   ')).toBe(true);
    expect(doesNameMatchSearchText(undefined, 'x')).toBe(false);
  });
});

describe('getSidebarSearchMatch', () => {
  it('shows a request only when its own name matches', () => {
    expect(getSidebarSearchMatch(createRequest('GetUser'), 'user')).toEqual({ isVisible: true, showAll: true });
    expect(getSidebarSearchMatch(createRequest('GetUser'), 'xyz')).toEqual({ isVisible: false, showAll: false });
  });

  it('shows a folder whose own name matches, even when empty, with showAll set', () => {
    expect(getSidebarSearchMatch(createFolder('Refunds'), 'refund')).toEqual({ isVisible: true, showAll: true });
  });

  it('shows a folder or collection that contains a matching request, without showAll', () => {
    const folder = createFolder('root', [
      createFolder('sub', [createRequest('login')]),
      createRequest('health')
    ]);

    expect(getSidebarSearchMatch(folder, 'login')).toEqual({ isVisible: true, showAll: false });
    expect(getSidebarSearchMatch({ name: 'C', items: folder.items }, 'login')).toEqual({ isVisible: true, showAll: false });
    expect(getSidebarSearchMatch(folder, 'zzz')).toEqual({ isVisible: false, showAll: false });
  });

  it('counts a nested folder whose name matches, even when it is empty', () => {
    const folder = createFolder('root', [createFolder('Refunds')]);
    expect(getSidebarSearchMatch(folder, 'refund')).toEqual({ isVisible: true, showAll: false });
  });

  it('ignores transient items and apps when looking inside', () => {
    const folder = createFolder('root', [
      createRequest('login', { isTransient: true }),
      createFolder('login-dir', [], { isTransient: true }),
      { uid: 'a', name: 'login-app', type: 'app' }
    ]);

    expect(getSidebarSearchMatch(folder, 'login').isVisible).toBe(false);
  });

  it('short-circuits to show everything when an ancestor matched', () => {
    expect(getSidebarSearchMatch(createRequest('anything'), 'zzz', true)).toEqual({ isVisible: true, showAll: true });
    expect(getSidebarSearchMatch(createFolder('empty'), 'zzz', true)).toEqual({ isVisible: true, showAll: true });
  });
});

describe('getSearchMatchSegments', () => {
  const plain = (text) => [{ text, isMatch: false }];

  it('returns one plain segment for no or whitespace-only query', () => {
    expect(getSearchMatchSegments('Refunds')).toEqual(plain('Refunds'));
    expect(getSearchMatchSegments('Refunds', '')).toEqual(plain('Refunds'));
    expect(getSearchMatchSegments('Refunds', '   ')).toEqual(plain('Refunds'));
  });

  it('returns one plain segment when nothing matches', () => {
    expect(getSearchMatchSegments('Refunds', 'xyz')).toEqual(plain('Refunds'));
  });

  it('handles null and undefined names', () => {
    expect(getSearchMatchSegments(null, 'a')).toEqual(plain(''));
    expect(getSearchMatchSegments(undefined, 'a')).toEqual(plain(''));
  });

  it('splits around a single match', () => {
    expect(getSearchMatchSegments('Create refund now', 'refund')).toEqual([
      { text: 'Create ', isMatch: false },
      { text: 'refund', isMatch: true },
      { text: ' now', isMatch: false }
    ]);
  });

  it('marks every occurrence, non-overlapping', () => {
    expect(getSearchMatchSegments('ab ab ab', 'ab')).toEqual([
      { text: 'ab', isMatch: true },
      { text: ' ', isMatch: false },
      { text: 'ab', isMatch: true },
      { text: ' ', isMatch: false },
      { text: 'ab', isMatch: true }
    ]);
    expect(getSearchMatchSegments('aaaa', 'aa')).toEqual([
      { text: 'aa', isMatch: true },
      { text: 'aa', isMatch: true }
    ]);
  });

  it('handles a match at the start and at the end', () => {
    expect(getSearchMatchSegments('Refunds', 'refund')).toEqual([
      { text: 'Refund', isMatch: true },
      { text: 's', isMatch: false }
    ]);
    expect(getSearchMatchSegments('Make refund', 'refund')).toEqual([
      { text: 'Make ', isMatch: false },
      { text: 'refund', isMatch: true }
    ]);
  });

  it('matches case-insensitively and keeps the original casing', () => {
    expect(getSearchMatchSegments('LeDgEr API', 'LEDGER')).toEqual([
      { text: 'LeDgEr', isMatch: true },
      { text: ' API', isMatch: false }
    ]);
  });

  it('treats regex characters literally', () => {
    expect(getSearchMatchSegments('Orders (v1)', '(v1)')).toEqual([
      { text: 'Orders ', isMatch: false },
      { text: '(v1)', isMatch: true }
    ]);
    expect(getSearchMatchSegments('axb', 'a.b')).toEqual(plain('axb'));
    expect(getSearchMatchSegments('a.b', 'a.b')).toEqual([{ text: 'a.b', isMatch: true }]);
  });

  it('returns a plain segment when the query is longer than the name', () => {
    expect(getSearchMatchSegments('abc', 'abcdef')).toEqual(plain('abc'));
  });

  it('trims surrounding whitespace in the query', () => {
    expect(getSearchMatchSegments('Create refund', '  refund  ')).toEqual([
      { text: 'Create ', isMatch: false },
      { text: 'refund', isMatch: true }
    ]);
  });

  it('returns a plain segment when lowercasing changes the name length', () => {
    expect(getSearchMatchSegments('İstanbul', 'stan')).toEqual(plain('İstanbul'));
  });

  it('agrees with doesNameMatchSearchText', () => {
    ['refund', ' REFUND ', 'x', '(v1)'].forEach((q) => {
      ['Refunds', 'Orders (v1)', 'abc'].forEach((n) => {
        const hasMatch = getSearchMatchSegments(n, q).some((seg) => seg.isMatch);
        expect(hasMatch).toBe(doesNameMatchSearchText(n, q));
      });
    });
  });
});
