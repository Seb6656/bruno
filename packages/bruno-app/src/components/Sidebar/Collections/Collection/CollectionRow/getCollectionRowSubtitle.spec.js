import getCollectionRowSubtitle from './getCollectionRowSubtitle';

describe('getCollectionRowSubtitle', () => {
  it('says Not loaded when unmounted', () => {
    expect(getCollectionRowSubtitle({ mountStatus: 'unmounted' }, 0)).toBe('Not loaded');
  });

  it('says Loading… while mounting', () => {
    expect(getCollectionRowSubtitle({ mountStatus: 'mounting' }, 0)).toBe('Loading…');
  });

  it('says Loading… while mounted but still loading', () => {
    expect(getCollectionRowSubtitle({ mountStatus: 'mounted', isLoading: true }, 5)).toBe('Loading…');
  });

  it('pluralises the request count', () => {
    expect(getCollectionRowSubtitle({ mountStatus: 'mounted', isLoading: false }, 0)).toBe('0 requests');
    expect(getCollectionRowSubtitle({ mountStatus: 'mounted', isLoading: false }, 1)).toBe('1 request');
    expect(getCollectionRowSubtitle({ mountStatus: 'mounted', isLoading: false }, 14)).toBe('14 requests');
  });
});
