import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { ThemeProvider } from 'styled-components';
import themes from 'themes/index';
import CollapsedPanelIndicator from './index';

const DRAG_THRESHOLD = 10;

const renderBar = (props = {}) => {
  const onActivate = jest.fn();
  const onDragStart = jest.fn();
  render(
    <ThemeProvider theme={themes.light}>
      <CollapsedPanelIndicator
        panelType="response"
        isVertical
        onActivate={onActivate}
        onDragStart={onDragStart}
        dragThresholdPx={DRAG_THRESHOLD}
        {...props}
      />
    </ThemeProvider>
  );
  return { bar: screen.getByRole('button'), onActivate, onDragStart };
};

const pointer = (type, bar, { x = 0, y = 0 } = {}) =>
  fireEvent(bar, new MouseEvent(type, { bubbles: true, button: 0, clientX: x, clientY: y }));

describe('CollapsedPanelIndicator', () => {
  beforeAll(() => {
    Element.prototype.setPointerCapture = jest.fn();
    Element.prototype.releasePointerCapture = jest.fn();
  });

  describe('click versus drag', () => {
    it('activates on a click without movement', () => {
      const { bar, onActivate, onDragStart } = renderBar({ isCollapsed: false });
      pointer('pointerdown', bar, { x: 50, y: 50 });
      pointer('pointerup', bar, { x: 50, y: 50 });
      expect(onActivate).toHaveBeenCalledTimes(1);
      expect(onDragStart).not.toHaveBeenCalled();
    });

    it('activates when the pointer moves less than the threshold', () => {
      const { bar, onActivate, onDragStart } = renderBar();
      pointer('pointerdown', bar, { x: 50, y: 50 });
      pointer('pointermove', bar, { x: 50, y: 50 + DRAG_THRESHOLD - 1 });
      pointer('pointerup', bar, { x: 50, y: 50 + DRAG_THRESHOLD - 1 });
      expect(onActivate).toHaveBeenCalledTimes(1);
      expect(onDragStart).not.toHaveBeenCalled();
    });

    it('starts a drag, and does not activate, once movement passes the threshold', () => {
      const { bar, onActivate, onDragStart } = renderBar({ isCollapsed: false });
      pointer('pointerdown', bar, { x: 50, y: 50 });
      pointer('pointermove', bar, { x: 50, y: 50 + DRAG_THRESHOLD + 1 });
      pointer('pointerup', bar, { x: 50, y: 50 + DRAG_THRESHOLD + 1 });
      expect(onDragStart).toHaveBeenCalledTimes(1);
      expect(onActivate).not.toHaveBeenCalled();
    });

    it('does not activate when the pointer gesture is cancelled', () => {
      const { bar, onActivate } = renderBar();
      pointer('pointerdown', bar);
      pointer('pointercancel', bar);
      pointer('pointerup', bar);
      expect(onActivate).not.toHaveBeenCalled();
    });
  });

  describe('keyboard', () => {
    it.each(['Enter', ' '])('activates on the "%s" key', (key) => {
      const { bar, onActivate } = renderBar();
      fireEvent.keyDown(bar, { key });
      expect(onActivate).toHaveBeenCalledTimes(1);
    });

    it('ignores other keys', () => {
      const { bar, onActivate } = renderBar();
      fireEvent.keyDown(bar, { key: 'a' });
      expect(onActivate).not.toHaveBeenCalled();
    });
  });

  describe('state', () => {
    it('describes a collapsed pane as expandable', () => {
      const { bar } = renderBar({ isCollapsed: true });
      expect(bar).toHaveAttribute('aria-expanded', 'false');
      expect(bar).toHaveAttribute('aria-label', 'Expand Response pane');
      expect(bar).toHaveAttribute('title', 'Click to expand Response pane, or drag to resize');
      expect(bar).not.toHaveClass('expanded');
    });

    it('describes an expanded pane as collapsible', () => {
      const { bar } = renderBar({ isCollapsed: false });
      expect(bar).toHaveAttribute('aria-expanded', 'true');
      expect(bar).toHaveAttribute('aria-label', 'Collapse Response pane');
      expect(bar).toHaveAttribute('title', 'Click to collapse Response pane, or drag to resize');
      expect(bar).toHaveClass('expanded');
    });

    it('treats the bar as collapsed by default', () => {
      const { bar } = renderBar();
      expect(bar).toHaveAttribute('aria-expanded', 'false');
    });

    it('labels the bar with its panel and exposes a per-panel testid', () => {
      const { bar } = renderBar({ panelType: 'request' });
      expect(bar).toHaveAttribute('aria-label', 'Expand Request pane');
      expect(screen.getByTestId('request-panel-indicator')).toBe(bar);
    });
  });
});
