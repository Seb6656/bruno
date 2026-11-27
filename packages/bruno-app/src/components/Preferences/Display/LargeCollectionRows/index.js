import React from 'react';
import get from 'lodash/get';
import { useSelector, useDispatch } from 'react-redux';
import { savePreferences } from 'providers/ReduxStore/slices/app';
import CheckboxSetting from 'components/Preferences/SettingsLayout/CheckboxSetting';
import StyledWrapper from './StyledWrapper';

const LargeCollectionRows = () => {
  const dispatch = useDispatch();
  const preferences = useSelector((state) => state.app.preferences);
  const enabled = get(preferences, 'display.largeCollectionRows', false);

  const handleChange = (event) => {
    dispatch(savePreferences({
      ...preferences,
      display: {
        ...get(preferences, 'display', {}),
        largeCollectionRows: event.target.checked
      }
    }));
  };

  return (
    <StyledWrapper>
      <span className="section-label">Sidebar</span>
      <div className="mt-2">
        <CheckboxSetting
          id="preferences-large-collection-rows"
          label="Large collection rows"
          description="Bigger collection names with a request count underneath."
          checked={enabled}
          onChange={handleChange}
          data-testid="preferences-large-collection-rows"
        />
      </div>
    </StyledWrapper>
  );
};

export default LargeCollectionRows;
