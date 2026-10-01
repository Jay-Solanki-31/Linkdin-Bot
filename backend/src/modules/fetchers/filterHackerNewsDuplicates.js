export function filterHackerNewsDuplicates(items, existingItems) {
  const existingByUrl = new Map(
    existingItems.map((item) => [item.url, item])
  );
  const seenUrls = new Set();
  const seenItemIds = new Set();
  let duplicatesSkipped = 0;

  const filteredItems = items.filter((item) => {
    const existingItem = existingByUrl.get(item.url);
    if (
      seenUrls.has(item.url) ||
      seenItemIds.has(item.sourceItemId) ||
      (existingItem && existingItem.sourceItemId !== item.sourceItemId)
    ) {
      duplicatesSkipped += 1;
      return false;
    }

    seenUrls.add(item.url);
    seenItemIds.add(item.sourceItemId);
    return true;
  });

  return { items: filteredItems, duplicatesSkipped };
}