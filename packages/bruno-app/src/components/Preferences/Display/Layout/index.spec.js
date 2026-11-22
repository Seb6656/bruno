import '@testing-library/jest-dom';
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { Provider } from 'react-redux';
import { ThemeProvider } from 'providers/Theme';
import { configureStore, createSlice } from '@reduxjs/toolkit';
import Layout from './index';

const mockSavePreferences = jest.fn((payload) => ({ type: 'app/savePreferences', payload }));

jest.mock('providers/ReduxStore/slices/app', () => ({
  savePreferences: (payload) => mockSavePreferences(payload)
}));

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
  Object.defineProperty(window, 'localStorage', {
    value: { getItem: jest.fn(() => 'dark'), setItem: jest.fn(), removeItem: jest.fn() }
  });
});

beforeEach(() => {
  mockSavePreferences.mockClear();
});

const renderLayout = (preferences) => {
  const appSlice = createSlice({
    name: 'app',
    initialState: { preferences },
    reducers: {
      savePreferences: (state, action) => {
        state.preferences = action.payload;
      }
    }
  });
  const store = configureStore({ reducer: { app: appSlice.reducer } });
  return render(
    <Provider store={store}>
      <ThemeProvider>
        <Layout />
      </ThemeProvider>
    </Provider>
  );
};

describe('Preferences Display Layout', () => {
  it('renders both options with side by side checked for horizontal', () => {
    renderLayout({ layout: { responsePaneOrientation: 'horizontal' } });
    expect(screen.getByRole('radiogroup', { name: 'Request / response layout' })).toBeInTheDocument();
    expect(screen.getByRole('radio', { name: 'Side by side' })).toBeChecked();
    expect(screen.getByRole('radio', { name: 'Stacked' })).not.toBeChecked();
  });

  it('checks stacked for vertical', () => {
    renderLayout({ layout: { responsePaneOrientation: 'vertical' } });
    expect(screen.getByRole('radio', { name: 'Stacked' })).toBeChecked();
    expect(screen.getByRole('radio', { name: 'Side by side' })).not.toBeChecked();
  });

  it('defaults to side by side when no layout preference is set', () => {
    renderLayout({});
    expect(screen.getByRole('radio', { name: 'Side by side' })).toBeChecked();
  });

  it('saves the other orientation and keeps other preference keys', () => {
    renderLayout({ font: { codeFont: 'Fira' }, layout: { responsePaneOrientation: 'horizontal', other: 1 } });
    fireEvent.click(screen.getByRole('radio', { name: 'Stacked' }));
    expect(mockSavePreferences).toHaveBeenCalledWith({
      font: { codeFont: 'Fira' },
      layout: { responsePaneOrientation: 'vertical', other: 1 }
    });
  });

  it('does not save when the current option is chosen', () => {
    renderLayout({ layout: { responsePaneOrientation: 'vertical' } });
    fireEvent.click(screen.getByRole('radio', { name: 'Stacked' }));
    expect(mockSavePreferences).not.toHaveBeenCalled();
  });
});
