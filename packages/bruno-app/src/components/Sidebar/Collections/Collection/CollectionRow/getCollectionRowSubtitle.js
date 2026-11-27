// Second line shown under a collection name when "Large collection rows" is on.
// requestCount is only read once the collection is fully loaded.
const getCollectionRowSubtitle = (collection, requestCount) => {
  const { mountStatus, isLoading } = collection;

  if (mountStatus === 'mounting' || (mountStatus === 'mounted' && isLoading)) {
    return 'Loading…';
  }
  if (mountStatus !== 'mounted') {
    return 'Not loaded';
  }
  return requestCount === 1 ? '1 request' : `${requestCount} requests`;
};

export default getCollectionRowSubtitle;
