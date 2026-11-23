import '@testing-library/jest-dom';
import React from 'react';
import { render, screen } from '@testing-library/react';
import { Provider } from 'react-redux';
import { configureStore, createSlice } from '@reduxjs/toolkit';
import { ThemeProvider } from 'providers/Theme';
import Placeholder from './index';

beforeAll(() => {
  Object.defineProperty(window, 'matchMedia', {
    writable: true,
    value: jest.fn().mockImplementation((query) => ({
      matches: false,
      media: query,
      addEventListener: jest.fn(),
      removeEventListener: jest.fn()
    }))
  });
});

const renderPlaceholder = (preferences = {}) => {
  const appSlice = createSlice({
    name: 'app',
    initialState: { preferences },
    reducers: {}
  });
  const store = configureStore({ reducer: { app: appSlice.reducer } });
  return render(
    <Provider store={store}>
      <ThemeProvider>
        <Placeholder />
      </ThemeProvider>
    </Provider>
  );
};

const stacked = { layout: { responsePaneOrientation: 'vertical' } };
const sideBySide = { layout: { responsePaneOrientation: 'horizontal' } };

describe('ResponsePane Placeholder', () => {
  it('side by side renders the icon and all three shortcut hints', () => {
    const { container } = renderPlaceholder(sideBySide);

    expect(container.querySelector('svg')).toBeInTheDocument();
    ['sendRequest', 'newRequest', 'editEnvironment'].forEach((action) => {
      expect(screen.getByTestId(`response-placeholder-shortcut-label-${action}`)).toBeInTheDocument();
      expect(screen.getByTestId(`response-placeholder-shortcut-value-${action}`)).toBeInTheDocument();
    });
  });

  it('stacked renders only Send Request, with no icon and no other hints', () => {
    const { container } = renderPlaceholder(stacked);

    expect(container.querySelector('svg')).not.toBeInTheDocument();
    expect(screen.getByTestId('response-placeholder-shortcut-label-sendRequest')).toHaveTextContent('Send Request');
    expect(screen.getByTestId('response-placeholder-shortcut-value-sendRequest')).not.toBeEmptyDOMElement();
    expect(screen.queryByTestId('response-placeholder-shortcut-label-newRequest')).not.toBeInTheDocument();
    expect(screen.queryByTestId('response-placeholder-shortcut-label-editEnvironment')).not.toBeInTheDocument();
    expect(screen.queryByText('New Request')).not.toBeInTheDocument();
    expect(screen.queryByText('Edit Environments')).not.toBeInTheDocument();
  });

  it.each([
    ['side by side', sideBySide],
    ['stacked', stacked]
  ])('%s shortcut text follows a custom key binding', (_name, layoutPrefs) => {
    const defaults = renderPlaceholder(layoutPrefs);
    const defaultText = screen.getByTestId('response-placeholder-shortcut-value-sendRequest').textContent;
    defaults.unmount();

    renderPlaceholder({
      ...layoutPrefs,
      keyBindings: { sendRequest: { mac: 'alt+bind+j', windows: 'alt+bind+j', linux: 'alt+bind+j' } }
    });
    const customText = screen.getByTestId('response-placeholder-shortcut-value-sendRequest').textContent;

    expect(customText).not.toBe(defaultText);
    expect(customText.toUpperCase()).toContain('J');
  });
});
