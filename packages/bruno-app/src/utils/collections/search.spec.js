import { doesNameMatchSearchText, getSidebarSearchMatch } from './search';

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
