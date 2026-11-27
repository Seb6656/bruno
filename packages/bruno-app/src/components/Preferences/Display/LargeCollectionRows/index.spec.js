import '@testing-library/jest-dom';
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { Provider } from 'react-redux';
import { ThemeProvider } from 'providers/Theme';
import { configureStore, createSlice } from '@reduxjs/toolkit';
import LargeCollectionRows from './index';

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

const renderSetting = (preferences) => {
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
        <LargeCollectionRows />
      </ThemeProvider>
    </Provider>
  );
};

describe('Preferences Display LargeCollectionRows', () => {
  it('is unchecked by default', () => {
    renderSetting({});
    expect(screen.getByTestId('preferences-large-collection-rows')).not.toBeChecked();
    expect(screen.getByText('Bigger collection names with a request count underneath.')).toBeInTheDocument();
  });

  it('is checked when the preference is true', () => {
    renderSetting({ display: { largeCollectionRows: true } });
    expect(screen.getByRole('checkbox', { name: 'Large collection rows' })).toBeChecked();
  });

  it('saves true and keeps other display keys', () => {
    renderSetting({ font: { codeFont: 'Fira' }, display: { zoomPercentage: 120 } });
    fireEvent.click(screen.getByRole('checkbox', { name: 'Large collection rows' }));
    expect(mockSavePreferences).toHaveBeenCalledWith({
      font: { codeFont: 'Fira' },
      display: { zoomPercentage: 120, largeCollectionRows: true }
    });
  });

  it('saves false when turned off', () => {
    renderSetting({ display: { largeCollectionRows: true } });
    fireEvent.click(screen.getByRole('checkbox', { name: 'Large collection rows' }));
    expect(mockSavePreferences).toHaveBeenCalledWith({ display: { largeCollectionRows: false } });
  });
});
