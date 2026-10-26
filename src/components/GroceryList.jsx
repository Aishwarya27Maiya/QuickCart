import { useState } from 'react'

function GroceryList({
  store,
  items,
  onAddItem,
  onToggleItem,
  onDeleteItem,
  onUpdateItem,
}) {
  const [itemName, setItemName] = useState('')
  const [editingItemId, setEditingItemId] = useState(null)
  const [editingName, setEditingName] = useState('')
  const selectedCount = items.filter((item) => item.selected).length

  function handleSubmit(event) {
    event.preventDefault()
    const name = itemName.trim()
    if (!name) return

    onAddItem(name)
    setItemName('')
  }

  function handleEditStart(item) {
    setEditingItemId(item.id)
    setEditingName(item.name)
  }

  function handleEditCancel() {
    setEditingItemId(null)
    setEditingName('')
  }

  function handleEditSubmit(event, itemId) {
    event.preventDefault()
    const name = editingName.trim()
    if (!name) return

    onUpdateItem(itemId, name)
    handleEditCancel()
  }

  return (
    <section
      className={`grocery-list${store ? '' : ' grocery-list-locked'}`}
      aria-labelledby="grocery-list-title"
      aria-describedby={!store ? 'grocery-list-lock-note' : undefined}
    >
      <div className="grocery-heading">
        <span className="grocery-icon" aria-hidden="true">
          <svg viewBox="0 0 24 24" fill="none">
            <path
              d="M5 7.5h14M5 12h14M5 16.5h8"
              stroke="currentColor"
              strokeWidth="1.7"
              strokeLinecap="round"
            />
            <path
              d="M3.5 5.5h17v13h-17z"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinejoin="round"
            />
          </svg>
        </span>
        <div className="grocery-title-group">
          <p className="card-kicker">YOUR SHOPPING LIST</p>
          <h2 id="grocery-list-title">My grocery list</h2>
        </div>
        <span className="item-count">
          {items.length} {items.length === 1 ? 'item' : 'items'}
        </span>
      </div>

      <p className="grocery-description">
        Add what you need, then choose the items to look up in your store.
      </p>

      {store ? (
        <>
          <form className="grocery-form" onSubmit={handleSubmit}>
            <label className="sr-only" htmlFor="grocery-item">
              Grocery item
            </label>
            <input
              id="grocery-item"
              type="text"
              autoComplete="off"
              maxLength={80}
              placeholder="Enter a grocery item…"
              value={itemName}
              onChange={(event) => setItemName(event.target.value)}
            />
            <button type="submit" disabled={!itemName.trim()}>
              <span aria-hidden="true">+</span>
              Add item
            </button>
          </form>

          <div className="grocery-list-caption">
            <span>SELECT ITEM</span>
            <span>EDIT OR REMOVE</span>
          </div>

          {items.length ? (
            <ul className="grocery-items">
              {items.map((item) => (
                <li
                  className={`grocery-item${item.selected ? ' grocery-item-selected' : ''}`}
                  key={item.id}
                >
                  <div className="grocery-item-main">
                    <label className="include-checkbox">
                      <input
                        type="checkbox"
                        checked={item.selected}
                        onChange={() => onToggleItem(item.id)}
                        aria-label={`Include ${item.name} in aisle search`}
                      />
                      <span className="checkbox-visual" aria-hidden="true" />
                    </label>
                    {editingItemId === item.id ? (
                      <form
                        className="grocery-edit-form"
                        onSubmit={(event) => handleEditSubmit(event, item.id)}
                      >
                        <label className="sr-only" htmlFor={`edit-item-${item.id}`}>
                          Edit {item.name}
                        </label>
                        <input
                          id={`edit-item-${item.id}`}
                          type="text"
                          maxLength={80}
                          value={editingName}
                          onChange={(event) => setEditingName(event.target.value)}
                          autoFocus
                        />
                        <button
                          className="edit-save"
                          type="submit"
                          disabled={!editingName.trim()}
                        >
                          Save
                        </button>
                        <button
                          className="edit-cancel"
                          type="button"
                          onClick={handleEditCancel}
                        >
                          Cancel
                        </button>
                      </form>
                    ) : (
                      <span className="grocery-item-name">{item.name}</span>
                    )}
                  </div>
                  {editingItemId !== item.id && (
                    <div className="grocery-item-actions grocery-item-buttons">
                        <button
                          className="edit-item"
                          type="button"
                          onClick={() => handleEditStart(item)}
                          aria-label={`Edit ${item.name}`}
                        >
                          Edit
                        </button>
                        <button
                          className="delete-item"
                          type="button"
                          onClick={() => onDeleteItem(item.id)}
                          aria-label={`Delete ${item.name}`}
                        >
                          <svg viewBox="0 0 20 20" fill="none" aria-hidden="true">
                            <path
                              d="M4.5 6h11m-9.5 0 .6 9.2c.05.8.7 1.4 1.5 1.4h3.8c.8 0 1.45-.6 1.5-1.4L14 6m-6.5 0V4.7c0-.4.3-.7.7-.7h3.6c.4 0 .7.3.7.7V6m-4 2.5v5m2.9-5v5"
                              stroke="currentColor"
                              strokeWidth="1.35"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                            />
                          </svg>
                          <span>Delete</span>
                        </button>
                    </div>
                  )}
                </li>
              ))}
            </ul>
          ) : (
            <p className="grocery-empty">
              Your list is ready when you are. Add your first item above.
            </p>
          )}

          <div className="grocery-selection-note" aria-live="polite">
            <span className="selection-dot" />
            {selectedCount
              ? `${selectedCount} ${
                  selectedCount === 1 ? 'item' : 'items'
                } selected for aisle search`
              : 'Select the items you want to find in the aisles'}
          </div>
        </>
      ) : (
        <div className="grocery-lock-note" id="grocery-list-lock-note">
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
          Find your nearest Walmart above to start your list.
        </div>
      )}
    </section>
  )
}

export default GroceryList
