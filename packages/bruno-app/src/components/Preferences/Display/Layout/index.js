import React from 'react';
import { IconLayoutColumns, IconLayoutRows } from '@tabler/icons';
import SegmentedControl from 'ui/SegmentedControl';
import { useResponseLayoutToggle } from 'components/ResponsePane/ResponseLayoutToggle';
import StyledWrapper from './StyledWrapper';

// Stored values are named opposite to how they read: horizontal = side by side, vertical = stacked.
const LAYOUT_OPTIONS = [
  {
    'value': 'horizontal',
    'label': 'Side by side',
    'icon': <IconLayoutColumns size={15} strokeWidth={1.5} />,
    'data-testid': 'layout-orientation-horizontal'
  },
  {
    'value': 'vertical',
    'label': 'Stacked',
    'icon': <IconLayoutRows size={15} strokeWidth={1.5} />,
    'data-testid': 'layout-orientation-vertical'
  }
];

const Layout = () => {
  const { orientation, setOrientation } = useResponseLayoutToggle();

  return (
    <StyledWrapper>
      <label id="preferences-layout-orientation-label" className="block">Request / response layout</label>
      <div className="mt-2">
        <SegmentedControl
          ariaLabelledBy="preferences-layout-orientation-label"
          name="layout-orientation"
          value={orientation}
          onChange={setOrientation}
          items={LAYOUT_OPTIONS}
          data-testid="preferences-layout-orientation"
        />
      </div>
    </StyledWrapper>
  );
};

export default Layout;
