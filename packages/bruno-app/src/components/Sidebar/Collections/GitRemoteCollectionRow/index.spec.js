import '@testing-library/jest-dom';
import React from 'react';
import { render, screen } from '@testing-library/react';
import { Provider } from 'react-redux';
import { ThemeProvider } from 'styled-components';
import { configureStore, createSlice } from '@reduxjs/toolkit';
import themes from 'themes/index';
import GitRemoteCollectionRow from './index';

jest.mock('components/Sidebar/SidebarAccordionContext', () => ({
  useSidebarAccordion: () => ({ dropdownContainerRef: { current: null } })
}));
jest.mock('components/Sidebar/CloneGitRespository', () => () => null);
jest.mock('components/WorkspaceHome/WorkspaceOverview/CollectionsList/RemoveGitRemote', () => () => null);
jest.mock('ui/MenuDropdown', () => ({ children }) => <div>{children}</div>);

const entry = { name: 'Remote API', path: '/tmp/remote', remote: 'git@example.com:a/b.git' };

const renderRow = (preferences, props = {}) => {
  const appSlice = createSlice({ name: 'app', initialState: { preferences }, reducers: {} });
  const store = configureStore({ reducer: { app: appSlice.reducer } });
  return render(
    <Provider store={store}>
      <ThemeProvider theme={themes.light}>
        <GitRemoteCollectionRow entry={entry} {...props} />
      </ThemeProvider>
    </Provider>
  );
};

describe('GitRemoteCollectionRow large rows', () => {
  it('is unchanged when the preference is off', () => {
    const { container } = renderRow({});
    expect(screen.queryByTestId('sidebar-git-collection-row-subtitle')).not.toBeInTheDocument();
    expect(screen.getByTestId('sidebar-git-collection-row')).not.toHaveClass('large');
    expect(container.querySelector('.large-collection-divider')).toBeNull();
  });

  it('shows the Not cloned subtitle and large class when on', () => {
    renderRow({ display: { largeCollectionRows: true } }, { isFirst: true });
    expect(screen.getByTestId('sidebar-git-collection-row-subtitle')).toHaveTextContent('Not cloned');
    expect(screen.getByTestId('sidebar-git-collection-row')).toHaveClass('large');
  });

  it('adds the divider only when on and not first', () => {
    const first = renderRow({ display: { largeCollectionRows: true } }, { isFirst: true });
    expect(first.container.querySelector('.large-collection-divider')).toBeNull();
    first.unmount();
    const second = renderRow({ display: { largeCollectionRows: true } }, { isFirst: false });
    expect(second.container.querySelector('.large-collection-divider')).not.toBeNull();
  });
});
