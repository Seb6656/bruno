import '@testing-library/jest-dom';
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { Provider } from 'react-redux';
import { ThemeProvider } from 'providers/Theme';
import { configureStore, createSlice } from '@reduxjs/toolkit';
import ResponseLayoutToggle, { useResponseLayoutToggle } from './index';

const mockSavePreferences = jest.fn((payload) => ({ type: 'app/savePreferences', payload }));

// Mock the savePreferences action
jest.mock('providers/ReduxStore/slices/app', () => ({
  savePreferences: (payload) => mockSavePreferences(payload)
}));

// Mock localStorage
const mockLocalStorage = {
  getItem: jest.fn(() => 'dark'),
  setItem: jest.fn(),
  removeItem: jest.fn()
};

// Mock matchMedia
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
    value: mockLocalStorage
  });
});

beforeEach(() => {
  mockSavePreferences.mockClear();
});

const initialState = {
  app: {
    preferences: {
      layout: {
        responsePaneOrientation: 'horizontal'
      }
    }
  }
};

const createTestStore = (initialState) => {
  const appSlice = createSlice({
    name: 'app',
    initialState: initialState.app,
    reducers: {
      savePreferences: (state, action) => {
        state.preferences = action.payload;
      }
    }
  });

  return configureStore({
    reducer: { app: appSlice.reducer }
  });
};

const renderWithProviders = (component, customState = initialState) => {
  const store = createTestStore(customState);
  return {
    store,
    ...render(
      <Provider store={store}>
        <ThemeProvider>
          {component}
        </ThemeProvider>
      </Provider>
    )
  };
};

describe('ResponseLayoutToggle', () => {
  describe('Initial Render', () => {
    it('should render with horizontal orientation by default', () => {
      renderWithProviders(<ResponseLayoutToggle />);
      const button = screen.getByTestId('response-layout-toggle-btn');
      expect(button).toBeInTheDocument();
      expect(button).toHaveAttribute('title', 'Stack response below request');
    });

    it('should render with vertical orientation when specified', () => {
      const customState = {
        app: {
          preferences: {
            layout: {
              responsePaneOrientation: 'vertical'
            }
          }
        }
      };
      renderWithProviders(<ResponseLayoutToggle />, customState);
      const button = screen.getByTestId('response-layout-toggle-btn');
      expect(button).toBeInTheDocument();
      expect(button).toHaveAttribute('title', 'Show response beside request');
    });
  });

  describe('Interaction', () => {
    it('should switch to vertical layout when clicked in horizontal mode', () => {
      const { store } = renderWithProviders(<ResponseLayoutToggle />);
      const button = screen.getByTestId('response-layout-toggle-btn');

      // Initial state check
      expect(button).toHaveAttribute('title', 'Stack response below request');

      fireEvent.click(button);

      // Check if action was called
      expect(mockSavePreferences).toHaveBeenCalledWith({
        layout: {
          responsePaneOrientation: 'vertical'
        }
      });

      // Manually update store to simulate state change
      store.dispatch(mockSavePreferences({
        layout: {
          responsePaneOrientation: 'vertical'
        }
      }));

      // Check if button title was updated
      expect(button).toHaveAttribute('title', 'Show response beside request');
    });

    it('should switch to horizontal layout when clicked in vertical mode', () => {
      const customState = {
        app: {
          preferences: {
            layout: {
              responsePaneOrientation: 'vertical'
            }
          }
        }
      };
      const { store } = renderWithProviders(<ResponseLayoutToggle />, customState);
      const button = screen.getByTestId('response-layout-toggle-btn');

      // Initial state check
      expect(button).toHaveAttribute('title', 'Show response beside request');

      fireEvent.click(button);

      // Check if action was called
      expect(mockSavePreferences).toHaveBeenCalledWith({
        layout: {
          responsePaneOrientation: 'horizontal'
        }
      });

      // Manually update store to simulate state change
      store.dispatch(mockSavePreferences({
        layout: {
          responsePaneOrientation: 'horizontal'
        }
      }));

      // Check if button title was updated
      expect(button).toHaveAttribute('title', 'Stack response below request');
    });
  });

  describe('useResponseLayoutToggle', () => {
    const HookProbe = ({ target }) => {
      const { setOrientation } = useResponseLayoutToggle();
      return <button data-testid="probe" onClick={() => setOrientation(target)} />;
    };

    it('setOrientation saves the new orientation', () => {
      renderWithProviders(<HookProbe target="vertical" />);
      fireEvent.click(screen.getByTestId('probe'));
      expect(mockSavePreferences).toHaveBeenCalledWith({
        layout: { responsePaneOrientation: 'vertical' }
      });
    });

    it('setOrientation does not save when the value is unchanged', () => {
      renderWithProviders(<HookProbe target="horizontal" />);
      fireEvent.click(screen.getByTestId('probe'));
      expect(mockSavePreferences).not.toHaveBeenCalled();
    });
  });
});
