import React, { useRef, useCallback } from 'react';
import { IconChevronDown, IconChevronUp } from '@tabler/icons';
import StyledWrapper from './StyledWrapper';

const CollapsedPanelIndicator = ({
  panelType, // 'request' or 'response'
  isVertical,
  isCollapsed = true,
  onActivate, // click without drag: collapses the pane when expanded, expands it when collapsed
  onDragStart,
  dragThresholdPx
}) => {
  const dragThresholdSq = dragThresholdPx * dragThresholdPx; // to use in distance check
  const label = panelType === 'request' ? 'Request' : 'Response';

  const action = isCollapsed ? 'expand' : 'collapse';
  // The chevron points toward the edge the pane sits against when collapsed, and away from it when expanded.
  const pointsDown = (panelType === 'request') === isCollapsed;
  const ChevronIcon = pointsDown ? IconChevronDown : IconChevronUp;

  const pointerDownRef = useRef(null);

  const handlePointerDown = useCallback((e) => {
    if (e.button !== 0) return;
    e.currentTarget.setPointerCapture(e.pointerId);
    e.currentTarget.style.cursor = isVertical ? 'row-resize' : 'col-resize';
    pointerDownRef.current = { x: e.clientX, y: e.clientY };
  }, [isVertical]);

  const handlePointerMove = useCallback((e) => {
    if (!pointerDownRef.current) return;
    const dx = e.clientX - pointerDownRef.current.x;
    const dy = e.clientY - pointerDownRef.current.y;
    if (dx * dx + dy * dy > dragThresholdSq) {
      pointerDownRef.current = null;
      e.currentTarget.releasePointerCapture(e.pointerId);
      onDragStart?.(e);
    }
  }, [onDragStart, dragThresholdSq]);

  const handlePointerUp = useCallback((e) => {
    if (!pointerDownRef.current) return;
    pointerDownRef.current = null;
    e.currentTarget.style.cursor = '';
    e.currentTarget.releasePointerCapture(e.pointerId);
    onActivate();
  }, [onActivate]);

  const handlePointerCancel = useCallback((e) => {
    if (!pointerDownRef.current) return;
    pointerDownRef.current = null;
    e.currentTarget.style.cursor = '';
    e.currentTarget.releasePointerCapture(e.pointerId);
  }, []);

  const handleKeyDown = useCallback((e) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      onActivate();
    }
  }, [onActivate]);

  return (
    <StyledWrapper
      className={`collapsed-panel-indicator ${isVertical ? 'vertical' : 'horizontal'} ${panelType} ${isCollapsed ? '' : 'expanded'}`}
      data-testid={`${panelType}-panel-indicator`}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerCancel={handlePointerCancel}
      role="button"
      tabIndex={0}
      onKeyDown={handleKeyDown}
      aria-expanded={!isCollapsed}
      aria-label={`${isCollapsed ? 'Expand' : 'Collapse'} ${label} pane`}
      title={`Click to ${action} ${label} pane, or drag to resize`}
    >
      <div className="indicator-content">
        <ChevronIcon size={14} strokeWidth={2} className="expand-icon" />
        <span className="panel-label">{label}</span>
      </div>
    </StyledWrapper>
  );
};

export default CollapsedPanelIndicator;
