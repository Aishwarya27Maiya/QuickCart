import { useMemo, useState } from 'react'

const AISLE_PATTERN = /^(?:[A-Z]{1,3}-?)?\d{1,3}[A-Z]?$/i

function SavedAisles({
  allDetails,
  selectedStore,
  onDelete,
  onEdit,
}) {
  const [editingKey, setEditingKey] = useState(null)
  const [editDraft, setEditDraft] = useState(null)
  const [editMessage, setEditMessage] = useState('')
  const allStoreCount = useMemo(
    () => new Set(allDetails.map((detail) => detail.storeId)).size,
    [allDetails],
  )
  const selectedStoreDetails = useMemo(
    () =>
      selectedStore
        ? allDetails.filter((detail) => detail.storeId === selectedStore.id)
        : [],
    [allDetails, selectedStore],
  )
  const groups = useMemo(() => {
    const grouped = new Map()
    allDetails.forEach((detail) => {
      if (!grouped.has(detail.storeId)) {
        grouped.set(detail.storeId, {
          storeId: detail.storeId,
          storeName:
            detail.storeName ||
            (detail.storeId === selectedStore?.id
              ? selectedStore.name
              : 'Walmart store'),
          storeAddress:
            detail.storeAddress ||
            (detail.storeId === selectedStore?.id
              ? selectedStore.address
              : ''),
          details: [],
        })
      }
      grouped.get(detail.storeId).details.push(detail)
    })
    return [...grouped.values()]
  }, [allDetails, selectedStore])

  function startEditing(detail) {
    setEditingKey(`${detail.storeId}:${detail.itemId}`)
    setEditDraft({
      itemName: detail.itemName,
      aisle: detail.aisle,
      section: detail.section || '',
      shelf: detail.shelf || '',
    })
    setEditMessage('')
  }

  function handleEditSubmit(event, detail) {
    event.preventDefault()
    const itemName = editDraft.itemName.trim()
    const aisle = editDraft.aisle.replace(/\s/g, '').toUpperCase()
    const section = editDraft.section.trim()
    const shelf = editDraft.shelf.trim()

    if (
      !itemName ||
      itemName.length > 120 ||
      !AISLE_PATTERN.test(aisle) ||
      section.length > 60 ||
      shelf.length > 40
    ) {
      setEditMessage(
        'Enter an item name (up to 120 characters) and a valid aisle. Section and shelf must be 60 and 40 characters or fewer.',
      )
      return
    }

    onEdit(detail.storeId, detail.itemId, {
      itemName,
      aisle,
      section,
      shelf,
    })
    setEditingKey(null)
    setEditDraft(null)
    setEditMessage('')
  }

  return (
    <section className="saved-aisles-card" aria-labelledby="saved-aisles-title">
      <div className="saved-aisles-heading">
        <div>
          <p className="card-kicker">YOUR STORE NOTES</p>
          <h2 id="saved-aisles-title">Saved aisle details</h2>
        </div>
        <span className="saved-aisles-total">
          {selectedStoreDetails.length}{' '}
          {selectedStoreDetails.length === 1 ? 'saved item' : 'saved items'}
        </span>
      </div>
      <p className="saved-aisles-description">
        Aisle notes are saved separately for each Walmart. The same item can
        have different aisle details at different stores.
      </p>
      {selectedStore && (
        <div className="saved-aisles-current-store">
          <span className="saved-store-pin" aria-hidden="true">
            W
          </span>
          <div>
            <strong>{selectedStore.name}</strong>
            <span>{selectedStore.address}</span>
          </div>
        </div>
      )}

      <div className="saved-aisle-views" aria-label="Saved aisle view">
        <strong>All stores</strong>
        <span>
          {selectedStore
            ? `${selectedStoreDetails.length} saved ${
                selectedStoreDetails.length === 1 ? 'item' : 'items'
              } for this store`
            : `${allStoreCount} ${
                allStoreCount === 1 ? 'store' : 'stores'
              }`}
        </span>
      </div>

      {groups.length ? (
        <div className="saved-aisle-groups">
          {groups.map((group) => (
            <section
              className="saved-aisle-group"
              key={group.storeId}
              aria-label={`Saved aisles for ${group.storeName}`}
            >
              <div className="saved-aisle-store-heading">
                <span className="saved-store-pin" aria-hidden="true">
                  W
                </span>
                <div>
                  <h3>{group.storeName}</h3>
                  {group.storeAddress && <p>{group.storeAddress}</p>}
                </div>
                <span className="saved-store-count">
                  {group.details.length}
                </span>
              </div>
              <ul className="saved-aisle-list">
                {group.details.map((detail) => (
                  <li
                    className="saved-aisle-row"
                    key={`${detail.storeId}:${detail.itemId}`}
                  >
                    {editingKey === `${detail.storeId}:${detail.itemId}` ? (
                      <form
                        className="saved-aisle-edit-form"
                        onSubmit={(event) => handleEditSubmit(event, detail)}
                      >
                        <label>
                          Item
                          <input
                            autoFocus
                            maxLength={120}
                            value={editDraft.itemName}
                            onChange={(event) =>
                              setEditDraft((draft) => ({
                                ...draft,
                                itemName: event.target.value,
                              }))
                            }
                          />
                        </label>
                        <label>
                          Aisle
                          <input
                            maxLength={8}
                            value={editDraft.aisle}
                            onChange={(event) =>
                              setEditDraft((draft) => ({
                                ...draft,
                                aisle: event.target.value,
                              }))
                            }
                          />
                        </label>
                        <label>
                          Section
                          <input
                            maxLength={60}
                            value={editDraft.section}
                            onChange={(event) =>
                              setEditDraft((draft) => ({
                                ...draft,
                                section: event.target.value,
                              }))
                            }
                          />
                        </label>
                        <label>
                          Shelf
                          <input
                            maxLength={40}
                            value={editDraft.shelf}
                            onChange={(event) =>
                              setEditDraft((draft) => ({
                                ...draft,
                                shelf: event.target.value,
                              }))
                            }
                          />
                        </label>
                        {editMessage && (
                          <p className="saved-aisle-edit-message" role="alert">
                            {editMessage}
                          </p>
                        )}
                        <div className="saved-aisle-edit-actions">
                          <button type="submit">Save</button>
                          <button
                            type="button"
                            onClick={() => {
                              setEditingKey(null)
                              setEditDraft(null)
                              setEditMessage('')
                            }}
                          >
                            Cancel
                          </button>
                        </div>
                      </form>
                    ) : (
                      <div className="saved-aisle-item">
                        <strong>{detail.itemName}</strong>
                        <span className="saved-aisle-chip">
                          Aisle {detail.aisle}
                        </span>
                        {detail.section && <span>{detail.section}</span>}
                        {detail.shelf && <span>Shelf {detail.shelf}</span>}
                        {detail.updatedAt && (
                          <time
                            className="saved-aisle-date"
                            dateTime={detail.updatedAt}
                          >
                            Saved{' '}
                            {new Date(detail.updatedAt).toLocaleDateString()}
                          </time>
                        )}
                      </div>
                    )}
                    <div className="saved-aisle-actions">
                      {editingKey !== `${detail.storeId}:${detail.itemId}` &&
                        detail.productUrl && (
                        <a
                          href={detail.productUrl}
                          target="_blank"
                          rel="noreferrer"
                        >
                          Product
                        </a>
                      )}
                      {editingKey !== `${detail.storeId}:${detail.itemId}` && (
                        <>
                          <button
                            type="button"
                            onClick={() => startEditing(detail)}
                            aria-label={`Edit saved aisle for ${detail.itemName}`}
                          >
                            Edit
                          </button>
                          <button
                            type="button"
                            onClick={() =>
                              onDelete(detail.storeId, detail.itemId)
                            }
                            aria-label={`Remove saved aisle for ${detail.itemName}`}
                          >
                            Remove
                          </button>
                        </>
                      )}
                    </div>
                  </li>
                ))}
              </ul>
            </section>
          ))}
        </div>
      ) : (
        <div className="saved-aisles-empty">
          <span aria-hidden="true">✳</span>
          <strong>No saved aisle details yet</strong>
          <p>
            Select grocery items to search a store. Saved aisle details appear
            here, grouped separately for each Walmart.
          </p>
        </div>
      )}
    </section>
  )
}

export default SavedAisles
