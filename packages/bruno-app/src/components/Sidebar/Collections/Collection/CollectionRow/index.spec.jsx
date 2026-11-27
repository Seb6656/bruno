import '@testing-library/jest-dom';
import React from 'react';
import { render, screen } from '@testing-library/react';
import { Provider } from 'react-redux';
import { ThemeProvider } from 'styled-components';
import { configureStore } from '@reduxjs/toolkit';
import themes from 'themes/index';
import CollectionRow from './index';

jest.mock('react-dnd', () => ({
  useDrag: () => [{ isDragging: false }, jest.fn(), jest.fn()],
  useDrop: () => [{ isOver: false }, jest.fn()]
}));
jest.mock('react-dnd-html5-backend', () => ({ getEmptyImage: () => null }));
jest.mock('components/Sidebar/SidebarAccordionContext', () => ({
  useSidebarAccordion: () => ({ dropdownContainerRef: { current: null } })
}));
jest.mock('hooks/useSidebarSelectionClick', () => () => jest.fn());
jest.mock('utils/beta-features', () => ({
  BETA_FEATURES: { MOCK_SERVER: 'mock-server' },
  useBetaFeature: () => false
}));
jest.mock('../GenerateDocumentation', () => () => null);
jest.mock('ui/MenuDropdown', () => ({ children }) => <div>{children}</div>);

const request = (uid) => ({ uid, type: 'http-request', request: {} });
const folder = (uid, items) => ({ uid, type: 'folder', items });

const makeCollection = (overrides = {}) => ({
  uid: 'c1',
  name: 'My API',
  pathname: '/tmp/my-api',
  mountStatus: 'mounted',
  isLoading: false,
  collapsed: true,
  items: [request('r1'), folder('f1', [request('r2'), request('r3')])],
  ...overrides
});

const renderRow = ({ preferences = {}, collection = makeCollection(), isFirst = false } = {}) => {
  const store = configureStore({
    reducer: {
      app: (state = { preferences, clipboard: { hasCopiedItems: false } }) => state,
      collections: (state = { selectedSidebarUids: [], collectionSortOrder: 'default', collections: [] }) => state,
      workspaces: (state = { workspaces: [], activeWorkspaceUid: null }) => state,
      tabs: (state = { tabs: [], activeTabUid: null }) => state
    },
    middleware: (getDefault) => getDefault({ serializableCheck: false, immutableCheck: false })
  });
  return render(
    <Provider store={store}>
      <ThemeProvider theme={themes.light}>
        <CollectionRow collection={collection} searchText="" isFirst={isFirst} />
      </ThemeProvider>
    </Provider>
  );
};

describe('CollectionRow large rows', () => {
  it('renders no subtitle, large class or divider when the preference is off', () => {
    const { container } = renderRow();
    expect(screen.queryByTestId('sidebar-collection-row-subtitle')).not.toBeInTheDocument();
    expect(screen.getByTestId('sidebar-collection-row')).not.toHaveClass('large');
    expect(container.querySelector('.large-collection-divider')).toBeNull();
  });

  it('counts requests only, not folders, when on', () => {
    renderRow({ preferences: { display: { largeCollectionRows: true } } });
    expect(screen.getByTestId('sidebar-collection-row')).toHaveClass('large');
    expect(screen.getByTestId('sidebar-collection-row-subtitle')).toHaveTextContent('3 requests');
  });

  it('shows Not loaded for an unmounted collection', () => {
    renderRow({
      preferences: { display: { largeCollectionRows: true } },
      collection: makeCollection({ mountStatus: 'unmounted', items: [] })
    });
    expect(screen.getByTestId('sidebar-collection-row-subtitle')).toHaveTextContent('Not loaded');
  });

  it('shows Loading… while mounted but still loading', () => {
    renderRow({
      preferences: { display: { largeCollectionRows: true } },
      collection: makeCollection({ isLoading: true })
    });
    expect(screen.getByTestId('sidebar-collection-row-subtitle')).toHaveTextContent('Loading…');
  });

  it('draws the divider only when on and not the first row', () => {
    const prefs = { display: { largeCollectionRows: true } };
    const first = renderRow({ preferences: prefs, isFirst: true });
    expect(first.container.querySelector('.large-collection-divider')).toBeNull();
    first.unmount();
    const second = renderRow({ preferences: prefs, isFirst: false });
    expect(second.container.querySelector('.large-collection-divider')).not.toBeNull();
  });
});
