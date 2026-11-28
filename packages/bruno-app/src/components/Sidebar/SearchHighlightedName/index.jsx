import React from 'react';
import { getSearchMatchSegments } from 'utils/collections/search';

// Renders a sidebar name with the parts matching the sidebar search in bold.
// Plain text only (no wrapper) when there is nothing to bold.
const SearchHighlightedName = ({ name, searchText }) => {
  const segments = getSearchMatchSegments(name, searchText);
  if (segments.length === 1 && !segments[0].isMatch) return <>{segments[0].text}</>;

  return (
    <>
      {segments.map((segment, index) =>
        segment.isMatch
          ? <strong key={index} className="font-bold" data-testid="sidebar-search-match">{segment.text}</strong>
          : <React.Fragment key={index}>{segment.text}</React.Fragment>
      )}
    </>
  );
};

export default SearchHighlightedName;
