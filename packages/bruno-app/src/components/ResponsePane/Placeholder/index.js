import React, { useMemo } from 'react';
import { IconSend } from '@tabler/icons';
import { useSelector } from 'react-redux';
import StyledWrapper from './StyledWrapper';
import { getKeyBindingDisplayTextByOS, getKeyBindingDisplayOS } from 'providers/Hotkeys/keyMappings';

const KEY_BINDING_ACTIONS = [
  { label: 'Send Request', action: 'sendRequest' },
  { label: 'New Request', action: 'newRequest' },
  { label: 'Edit Environments', action: 'editEnvironment' }
];

const Placeholder = () => {
  const os = getKeyBindingDisplayOS();
  const preferences = useSelector((state) => state.app.preferences);
  const isVerticalLayout = preferences?.layout?.responsePaneOrientation === 'vertical';
  const keyBindingActions = useMemo(() => {
    return KEY_BINDING_ACTIONS.map(({ label, action }) => ({
      label,
      action,
      shortcut: getKeyBindingDisplayTextByOS(action, preferences?.keyBindings, os)
    }));
  }, [preferences?.keyBindings, os]);

  // Stacked: the response pane is short and wide, so show only the Send Request hint on one line.
  if (isVerticalLayout) {
    const sendRequest = keyBindingActions.find(({ action }) => action === 'sendRequest');
    return (
      <StyledWrapper className="vertical-layout" data-testid="response-pane-shortcut-placeholder">
        <div className="flex items-center gap-3">
          <div data-testid="response-placeholder-shortcut-label-sendRequest">{sendRequest.label}</div>
          <div data-testid="response-placeholder-shortcut-value-sendRequest">{sendRequest.shortcut}</div>
        </div>
      </StyledWrapper>
    );
  }

  return (
    <StyledWrapper data-testid="response-pane-shortcut-placeholder">
      <div className="send-icon flex justify-center" style={{ fontSize: 200 }}>
        <IconSend size={150} strokeWidth={1} />
      </div>
      <div className="flex mt-4">
        <div className="flex flex-1 flex-col items-end px-1">
          {keyBindingActions.map(({ label, action }) => (
            <div key={label} className="px-1 py-2" data-testid={`response-placeholder-shortcut-label-${action}`}>
              {label}
            </div>
          ))}
        </div>
        <div className="flex flex-1 flex-col px-1">
          {keyBindingActions.map(({ label, action, shortcut }) => (
            <div key={label} className="px-1 py-2" data-testid={`response-placeholder-shortcut-value-${action}`}>
              {shortcut}
            </div>
          ))}
        </div>
      </div>
    </StyledWrapper>
  );
};

export default Placeholder;
