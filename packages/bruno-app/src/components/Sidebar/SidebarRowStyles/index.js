import { css } from 'styled-components';

// TUNING KNOBS: font size and weight of the collection name when "Large collection rows" is on.
// Change these values to try other sizes (14px / 15px / 16px) or weights (400 regular, 500 medium,
// 600 semibold); both the collection row and the git-remote ghost row follow them.
export const LARGE_COLLECTION_NAME_FONT_SIZE = '15px';
export const LARGE_COLLECTION_NAME_FONT_WEIGHT = 500;
export const LARGE_COLLECTION_SUBTITLE_FONT_SIZE = '11px';
// Vertical padding of a large row; the height follows from the two text lines.
export const LARGE_COLLECTION_ROW_PADDING_Y = '0.375rem';

// Look of a large collection row. Apply inside the row selector; it must come after
// sidebarRowStyles (which sets the fixed height) so height:auto wins.
export const largeCollectionRowStyles = ({ nameClass, subtitleClass }) => css`
  height: auto;
  padding-top: ${LARGE_COLLECTION_ROW_PADDING_Y};
  padding-bottom: ${LARGE_COLLECTION_ROW_PADDING_Y};

  ${nameClass} {
    font-size: ${LARGE_COLLECTION_NAME_FONT_SIZE};
    font-weight: ${LARGE_COLLECTION_NAME_FONT_WEIGHT};
    line-height: 1.25;
  }

  ${subtitleClass} {
    font-size: ${LARGE_COLLECTION_SUBTITLE_FONT_SIZE};
    line-height: 1.25;
    color: ${(props) => props.theme.sidebar.muted};
    white-space: nowrap;
    text-overflow: ellipsis;
    overflow: hidden;
  }
`;

// Thin divider above a collection row; apply on the row's outer wrapper.
export const largeCollectionDividerStyles = css`
  border-top: 1px solid ${(props) => props.theme.sidebar.collection.item.indentBorder};
`;

const sidebarRowStyles = ({ selectedClass, keyboardFocusedClass, actionsClass }) => css`
  height: 1.6rem;
  cursor: pointer;
  user-select: none;
  border-left: 4px solid transparent;

  .${actionsClass} {
    visibility: hidden;
  }

  &:hover,
  &:focus-within,
  &.${keyboardFocusedClass} {
    background: ${(props) => props.theme.sidebar.collection.item.hoverBg};
    .${actionsClass} {
      visibility: visible;
      background-color: transparent !important;
    }
  }

  .${actionsClass}[aria-expanded='true'] {
    visibility: visible;
  }

  &.${selectedClass} {
    background: ${(props) => props.theme.sidebar.collection.item.bg};
    &:hover {
      background: ${(props) => props.theme.sidebar.collection.item.bg} !important;
    }
  }

  &.${keyboardFocusedClass} {
    border-top: 1px solid ${(props) => props.theme.sidebar.collection.item.focusBorder};
    border-bottom: 1px solid ${(props) => props.theme.sidebar.collection.item.focusBorder};
    outline: none;
  }
`;

export default sidebarRowStyles;
