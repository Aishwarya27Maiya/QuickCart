import { useEffect, useRef, useState } from 'react'

const USERSCRIPT_CHANNEL = 'cartpath-browser-v3'
const AISLE_PATTERN = /^[A-Z]{1,3}-?\d{1,3}[A-Z]?$/

function createRequestId() {
  if (!globalThis.crypto?.randomUUID) {
    throw new Error('This browser does not support secure aisle-search requests.')
  }
  return globalThis.crypto.randomUUID()
}

function AisleSearch({
  store,
  items,
  aisleDetails,
  onAisleDetailsFound,
  onManualAisleDetails,
  onSearchStarted,
}) {
  const [collectedIds, setCollectedIds] = useState(() => new Set())
  const [helperReady, setHelperReady] = useState(false)
  const [helperMessage, setHelperMessage] = useState('')
  const activeRequestId = useRef(null)
  const activeItems = useRef([])
  const manualQueueAcceptAfter = useRef(null)
  const activeStoreId = useRef(null)
  const currentStoreId = useRef(store?.id)
  const currentItems = useRef(items)
  const selectedItems = items.filter((item) => item.selected)
  const results = selectedItems.length ? selectedItems : null

  useEffect(() => {
    currentStoreId.current = store?.id
    currentItems.current = items
  }, [items, store?.id])

  useEffect(() => {
    manualQueueAcceptAfter.current ??= Date.now()
    const pingId = createRequestId()
    let attempts = 0
    let retryTimer

    function handleUserscriptMessage(event) {
      if (
        event.origin !== window.location.origin ||
        event.data?.channel !== USERSCRIPT_CHANNEL
      ) {
        return
      }

      if (event.data.type === 'manual_entries') {
        const entries = Array.isArray(event.data.entries)
          ? event.data.entries
          : []
        const freshEntries = entries.filter(
          (entry) =>
            Number.isFinite(entry?.createdAt) &&
            entry.createdAt >= manualQueueAcceptAfter.current,
        )
        if (!store?.id && freshEntries.length) {
          setHelperMessage(
            'Aisle notes are waiting. Choose a Walmart store, then they will save automatically.',
          )
          return
        }
        if (entries.length && !freshEntries.length) {
          setHelperMessage(
            'Ignored old queued aisle notes from before this Quick Cart session. Add them again with the updated Tampermonkey helper.',
          )
        }

        const seenIds = new Set()
        const validEntries = freshEntries
          .filter((entry) => {
            if (
              typeof entry?.id !== 'string' ||
              seenIds.has(entry.id) ||
              typeof entry.item !== 'string' ||
              !entry.item.trim() ||
              entry.item.length > 120 ||
              typeof entry.aisle !== 'string' ||
              !AISLE_PATTERN.test(entry.aisle.replace(/\s/g, '').toUpperCase())
            ) {
              return false
            }
            seenIds.add(entry.id)
            return true
          })
          .map((entry) => ({
            itemName: entry.item.trim(),
            aisle: entry.aisle.replace(/\s/g, '').toUpperCase(),
            section:
              typeof entry.section === 'string' && entry.section.length <= 60
                ? entry.section.trim()
                : '',
            shelf:
              typeof entry.shelf === 'string' && entry.shelf.length <= 40
                ? entry.shelf.trim()
                : '',
          }))

        let saved = false
        if (validEntries.length) {
          saved = onManualAisleDetails(validEntries)
        }
        if (saved) {
          setHelperMessage(
            `Saved ${validEntries.length} aisle ${
              validEntries.length === 1 ? 'note' : 'notes'
            } from Tampermonkey. Check the Saved aisles tab.`,
          )
        } else if (freshEntries.length) {
          setHelperMessage(
            'No valid aisle details found in the Tampermonkey list. Check that each item has an aisle.',
          )
        }
        window.postMessage(
          {
            channel: USERSCRIPT_CHANNEL,
            type: 'manual_ack',
            recordIds: entries
              .map((entry) => entry?.id)
              .filter((id) => typeof id === 'string'),
          },
          window.location.origin,
        )
        return
      }

      if (event.data.type === 'ready' && event.data.requestId === pingId) {
        setHelperReady(true)
        setHelperMessage('')
        window.clearInterval(retryTimer)
        return
      }

      const report = event.data.report
      if (
        event.data.type !== 'report' ||
        !report ||
        report.requestId !== activeRequestId.current
      ) {
        return
      }

      setHelperMessage(report.message || 'Walmart aisle search updated.')

      if (report.status === 'done') {
        const foundResults = Array.isArray(report.results)
          ? report.results.filter((result) => result.reason === 'found')
          : []
        const requestedIds = new Set(activeItems.current.map((item) => item.id))
        const currentItemsById = new Map(
          currentItems.current.map((item) => [item.id, item]),
        )
        let validDetails = []
        if (activeStoreId.current === currentStoreId.current) {
          validDetails = (Array.isArray(report.results) ? report.results : [])
            .filter((result) => {
              const currentItem = currentItemsById.get(result.item_id)
              const requestedItem = activeItems.current.find(
                (item) => item.id === result.item_id,
              )
              return (
                requestedIds.has(result.item_id) &&
                currentItem?.selected &&
                currentItem?.name === requestedItem?.name &&
                result.reason === 'found' &&
                typeof result.aisle === 'string' &&
                AISLE_PATTERN.test(
                  result.aisle.replace(/\s/g, '').toUpperCase(),
                )
              )
            })
            .map((result) => {
              const requestedItem = activeItems.current.find(
                (item) => item.id === result.item_id,
              )
              return {
                storeId: activeStoreId.current,
                storeName: store?.name || '',
                storeAddress: store?.address || '',
                itemId: result.item_id,
                itemName: requestedItem.name,
                searchId: report.requestId,
                aisle: result.aisle.replace(/\s/g, '').toUpperCase(),
                section:
                  typeof result.section === 'string' &&
                  result.section.length <= 60
                    ? result.section
                    : '',
                shelf:
                  typeof result.shelf === 'string' && result.shelf.length <= 40
                    ? result.shelf
                    : '',
                productUrl:
                  typeof result.product_url === 'string' &&
                  result.product_url.startsWith('https://www.walmart.com/ip/')
                    ? result.product_url
                    : '',
                updatedAt: new Date().toISOString(),
              }
            })
        }

        onAisleDetailsFound(validDetails)
        let completionMessage =
          'Search finished. Walmart did not display a readable aisle for these items.'
        if (activeStoreId.current !== currentStoreId.current) {
          completionMessage =
            'The selected store changed during this search. Results were not saved.'
        } else if (foundResults.length > validDetails.length) {
          completionMessage =
            'The list changed during this search. Matching aisle details were saved; changed or removed items were skipped.'
        } else if (validDetails.length) {
          completionMessage = `Saved aisle details for ${validDetails.length} ${
            validDetails.length === 1 ? 'item' : 'items'
          }.`
        }
        setHelperMessage(completionMessage)
        window.postMessage(
          {
            channel: USERSCRIPT_CHANNEL,
            type: 'ack',
            requestId: report.requestId,
          },
          window.location.origin,
        )
        activeRequestId.current = null
        activeStoreId.current = null
      } else if (report.status === 'error') {
        window.postMessage(
          {
            channel: USERSCRIPT_CHANNEL,
            type: 'ack',
            requestId: report.requestId,
          },
          window.location.origin,
        )
        activeRequestId.current = null
        activeStoreId.current = null
      }
    }

    window.addEventListener('message', handleUserscriptMessage)

    function pingForHelper() {
      attempts += 1
      window.postMessage(
        { channel: USERSCRIPT_CHANNEL, type: 'ping', requestId: pingId },
        window.location.origin,
      )
      if (attempts >= 10) {
        window.clearInterval(retryTimer)
        setHelperMessage(
          'Aisle helper not detected. Install or enable the Quick Cart Tampermonkey script, then refresh.',
        )
      }
    }

    pingForHelper()
    retryTimer = window.setInterval(pingForHelper, 1_000)
    window.postMessage(
      { channel: USERSCRIPT_CHANNEL, type: 'manual_pull' },
      window.location.origin,
    )

    return () => {
      window.clearInterval(retryTimer)
      window.removeEventListener('message', handleUserscriptMessage)
      if (activeRequestId.current) {
        window.postMessage(
          {
            channel: USERSCRIPT_CHANNEL,
            type: 'cancel',
            requestId: activeRequestId.current,
          },
          window.location.origin,
        )
        activeRequestId.current = null
        activeStoreId.current = null
      }
    }
  }, [
    onAisleDetailsFound,
    onManualAisleDetails,
    store?.address,
    store?.id,
    store?.name,
  ])

  function handleSearch(item) {
    if (!store || !item) return
    try {
      const walmartSearchUrl = `https://www.walmart.com/search?q=${encodeURIComponent(
        `"${item.name.replaceAll('"', '')}"`,
      )}`
      if (!helperReady) {
        const walmartTab = window.open(walmartSearchUrl, '_blank')
        if (!walmartTab) {
          setHelperMessage(
            'Your browser blocked the Walmart tab. Allow pop-ups for Quick Cart and try again.',
          )
          return
        }
        walmartTab.opener = null
        setHelperMessage(
          'Opened Walmart search. The aisle helper is not connected, so aisle details will not return automatically.',
        )
        return
      }

      const requestId = createRequestId()
      const searchItems = [{ id: item.id, name: item.name }]
      onSearchStarted({
        searchId: requestId,
        storeId: store.id,
        itemNames: searchItems.map((item) => item.name),
      })

      activeRequestId.current = requestId
      activeItems.current = searchItems
      activeStoreId.current = store.id
      setHelperMessage(
        'Walmart opened in a new tab. Sign in, confirm the selected store, and start the search there.',
      )
      window.postMessage(
        {
          channel: USERSCRIPT_CHANNEL,
          type: 'start',
          job: {
            requestId,
            store: {
              id: store.id,
              name: store.name,
              address: store.address,
            },
            items: searchItems,
          },
        },
        window.location.origin,
      )
    } catch (error) {
      setHelperMessage(
        error instanceof Error
          ? error.message
          : 'Could not start the Walmart aisle search.',
      )
    }
  }

  function handleToggleCollected(itemId) {
    setCollectedIds((currentIds) => {
      const nextIds = new Set(currentIds)
      if (nextIds.has(itemId)) {
        nextIds.delete(itemId)
      } else {
        nextIds.add(itemId)
      }
      return nextIds
    })
  }

  return (
    <section
      className="aisle-search"
      aria-labelledby="aisle-search-title"
      aria-describedby={!store ? 'aisle-search-lock-note' : undefined}
    >
      <div className="aisle-heading">
        <span className="aisle-icon" aria-hidden="true">
          <svg viewBox="0 0 24 24" fill="none">
            <path
              d="M4.5 20V8.5l3-4 3 4V20m0-8h9V20m-9 0h9m-9-5h9"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            <path
              d="M6.5 11h2m-2 3h2m-2 3h2m11-5h-2m2 3h-2"
              stroke="currentColor"
              strokeWidth="1.4"
              strokeLinecap="round"
            />
          </svg>
        </span>
        <div>
          <p className="card-kicker">IN-STORE GUIDE</p>
          <h2 id="aisle-search-title">Your shopping guide</h2>
        </div>
      </div>

      <p className="aisle-description">
        Find where your selected items are located and check them off as you
        shop.
      </p>

      {store ? (
        <>
          <div className="aisle-store">
            <span className="aisle-store-label">SELECTED STORE</span>
            <strong>{store.name}</strong>
            <span>{store.address}</span>
          </div>

          <div className="aisle-search-action">
            <p>
              {selectedItems.length
                ? 'Select an item’s search icon to look up its aisle.'
                : 'Choose items from your grocery list to search'}
            </p>
          </div>
          <div className="aisle-helper-status" role="status">
            <span
              className={`helper-status-dot${helperReady ? ' helper-connected' : ''}`}
            />
            {!selectedItems.length
              ? 'Choose items from your grocery list to search.'
              : helperMessage ||
                (helperReady
                  ? 'Aisle helper connected. Search items individually when ready.'
                  : 'Checking for the Quick Cart browser helper…')}
          </div>

          {results && (
            <div className="aisle-results">
              {results.length ? (
                <ul className="aisle-results-list">
                  {results.map((item) => {
                    const collected = collectedIds.has(item.id)
                    const savedAisle = aisleDetails.find(
                      (detail) =>
                        detail.storeId === store.id &&
                        detail.itemName.trim().toLowerCase() ===
                          item.name.trim().toLowerCase(),
                    )

                    return (
                      <li
                        className={`aisle-result-card${collected ? ' item-collected' : ''}`}
                        key={item.id}
                      >
                        <div className="aisle-result-item">
                          <span className="aisle-item-name">{item.name}</span>
                          <div className="aisle-result-controls">
                            <button
                              className="product-search-link"
                              type="button"
                              onClick={() => handleSearch(item)}
                              aria-label={`Search Walmart for aisle of ${item.name}`}
                              title={`Search Walmart for ${item.name}`}
                            >
                              <svg
                                viewBox="0 0 20 20"
                                fill="none"
                                aria-hidden="true"
                              >
                                <path
                                  d="m13.5 13.5 4 4m-2.2-9a6.8 6.8 0 1 1-13.6 0 6.8 6.8 0 0 1 13.6 0Z"
                                  stroke="currentColor"
                                  strokeWidth="1.7"
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                />
                              </svg>
                            </button>
                            {savedAisle && (
                              <span className="saved-aisle-chip">
                                Aisle {savedAisle.aisle}
                              </span>
                            )}
                            <label className="collected-checkbox">
                              <input
                                type="checkbox"
                                checked={collected}
                                onChange={() => handleToggleCollected(item.id)}
                                aria-label={`Mark ${item.name} as collected`}
                              />
                              <span
                                className="checkbox-visual"
                                aria-hidden="true"
                              />
                            </label>
                          </div>
                        </div>
                      </li>
                    )
                  })}
                </ul>
              ) : (
                <p className="aisle-empty-results">
                  No items remain in this search. Select items in your grocery
                  list and search again.
                </p>
              )}
            </div>
          )}
        </>
      ) : (
        <div className="grocery-lock-note" id="aisle-search-lock-note">
          <span className="lock-symbol" aria-hidden="true">
            <svg viewBox="0 0 20 20" fill="none">
              <rect
                x="4.5"
                y="8.5"
                width="11"
                height="8"
                rx="1.5"
                stroke="currentColor"
                strokeWidth="1.4"
              />
              <path
                d="M7 8.5V6a3 3 0 0 1 6 0v2.5"
                stroke="currentColor"
                strokeWidth="1.4"
                strokeLinecap="round"
              />
            </svg>
          </span>
          Find a Walmart above to begin your aisle search.
        </div>
      )}
    </section>
  )
}

export default AisleSearch
