import { useState } from 'react'

function TodoList({ items, onAdd, onUpdate, onDelete }) {
  const [itemName, setItemName] = useState('')
  const [editingItemId, setEditingItemId] = useState(null)
  const [editingName, setEditingName] = useState('')

  function handleAdd(event) {
    event.preventDefault()
    const name = itemName.trim()
    if (!name) return

    onAdd(name)
    setItemName('')
  }

  function startEditing(item) {
    setEditingItemId(item.id)
    setEditingName(item.name)
  }

  function cancelEditing() {
    setEditingItemId(null)
    setEditingName('')
  }

  function handleEdit(event, itemId) {
    event.preventDefault()
    const name = editingName.trim()
    if (!name) return

    onUpdate(itemId, name)
    cancelEditing()
  }

  return (
    <section className="todo-list-card" aria-labelledby="todo-list-title">
      <div className="todo-list-heading">
        <div>
          <p className="card-kicker">YOUR PERSONAL CHECKLIST</p>
          <h2 id="todo-list-title">To-do list</h2>
        </div>
        <span className="item-count">
          {items.length} {items.length === 1 ? 'item' : 'items'}
        </span>
      </div>
      <p className="grocery-description">
        Keep reminders and tasks here, separate from your store shopping list.
      </p>

      <form className="grocery-form todo-list-form" onSubmit={handleAdd}>
        <label className="sr-only" htmlFor="todo-item">
          To-do item
        </label>
        <input
          id="todo-item"
          type="text"
          autoComplete="off"
          maxLength={80}
          placeholder="Add a to-do item…"
          value={itemName}
          onChange={(event) => setItemName(event.target.value)}
        />
        <button type="submit" disabled={!itemName.trim()}>
          <span aria-hidden="true">+</span>
          Add item
        </button>
      </form>

      {items.length ? (
        <ul className="todo-items">
          {items.map((item) => (
            <li className="todo-item" key={item.id}>
              {editingItemId === item.id ? (
                <form
                  className="todo-edit-form"
                  onSubmit={(event) => handleEdit(event, item.id)}
                >
                  <label className="sr-only" htmlFor={`edit-todo-${item.id}`}>
                    Edit {item.name}
                  </label>
                  <input
                    id={`edit-todo-${item.id}`}
                    type="text"
                    maxLength={80}
                    autoFocus
                    value={editingName}
                    onChange={(event) => setEditingName(event.target.value)}
                  />
                  <button type="submit" disabled={!editingName.trim()}>
                    Save
                  </button>
                  <button type="button" onClick={cancelEditing}>
                    Cancel
                  </button>
                </form>
              ) : (
                <>
                  <span className="todo-item-name">{item.name}</span>
                  <div className="todo-item-actions">
                    <button
                      type="button"
                      onClick={() => startEditing(item)}
                      aria-label={`Edit ${item.name}`}
                    >
                      Edit
                    </button>
                    <button
                      type="button"
                      onClick={() => onDelete(item.id)}
                      aria-label={`Delete ${item.name}`}
                    >
                      Delete
                    </button>
                  </div>
                </>
              )}
            </li>
          ))}
        </ul>
      ) : (
        <p className="todo-list-empty">
          Nothing on your to-do list yet. Add an item above to get started.
        </p>
      )}
    </section>
  )
}

export default TodoList
