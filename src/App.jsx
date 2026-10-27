import { useCallback, useEffect, useRef, useState } from 'react'
import AisleSearch from './components/AisleSearch'
import GroceryList from './components/GroceryList'
import SavedAisles from './components/SavedAisles'
import StoreFinder from './components/StoreFinder'
import TodoList from './components/TodoList'
import './App.css'

const APP_STORAGE_KEY = 'quick-cart.state.v1'

function mergeAisleDetails(currentDetails, incomingDetails) {
  const nextDetails = [...currentDetails]
  incomingDetails.forEach((incoming) => {
    const itemKey = incoming.itemName.trim().toLowerCase()
    const existingIndex = nextDetails.findIndex(
      (detail) =>
        detail.storeId === incoming.storeId &&
        detail.itemName.trim().toLowerCase() === itemKey,
    )
    if (existingIndex >= 0) {
      nextDetails[existingIndex] = {
        ...nextDetails[existingIndex],
        ...incoming,
        itemId: nextDetails[existingIndex].itemId,
      }
    } else {
      nextDetails.push(incoming)
    }
  })
  return nextDetails
}

function loadAppState() {
  try {
    const savedState = window.localStorage.getItem(APP_STORAGE_KEY)
    if (!savedState) {
      return {
        selectedStore: null,
        items: [],
        todoItems: [],
        aisleDetails: [],
        aisleViewScope: null,
      }
    }

    const parsedState = JSON.parse(savedState)
    if (!parsedState || typeof parsedState !== 'object') {
      throw new TypeError('Saved Quick Cart data is not an object.')
    }
    const selectedStore =
      parsedState.selectedStore &&
      typeof parsedState.selectedStore.id === 'string'
        ? parsedState.selectedStore
        : null
    const aisleViewScope =
      parsedState.aisleViewScope &&
      typeof parsedState.aisleViewScope.searchId === 'string' &&
      typeof parsedState.aisleViewScope.storeId === 'string' &&
      Array.isArray(parsedState.aisleViewScope.itemNames) &&
      parsedState.aisleViewScope.itemNames.every(
        (itemName) => typeof itemName === 'string',
      )
        ? parsedState.aisleViewScope
        : null
    return {
      selectedStore,
      aisleViewScope,
      items: Array.isArray(parsedState.items)
        ? parsedState.items.filter(
            (item) =>
              Number.isInteger(item.id) &&
              typeof item.name === 'string' &&
              typeof item.selected === 'boolean',
          )
        : [],
      todoItems: Array.isArray(parsedState.todoItems)
        ? parsedState.todoItems.filter(
            (item) =>
              Number.isInteger(item.id) &&
              typeof item.name === 'string' &&
              item.name.trim().length > 0,
          )
        : [],
      aisleDetails: Array.isArray(parsedState.aisleDetails)
        ? parsedState.aisleDetails.filter(
            (detail) =>
              typeof detail.storeId === 'string' &&
              Number.isInteger(detail.itemId) &&
              typeof detail.itemName === 'string' &&
              typeof detail.aisle === 'string',
          )
        .map((detail) => ({
          ...detail,
          storeName:
            detail.storeName ||
            (detail.storeId === selectedStore?.id ? selectedStore.name : ''),
          storeAddress:
            detail.storeAddress ||
            (detail.storeId === selectedStore?.id
              ? selectedStore.address
              : ''),
        }))
        : [],
    }
  } catch (error) {
    console.error('Could not read saved Quick Cart data.', error)
    return {
      selectedStore: null,
      items: [],
      todoItems: [],
      aisleDetails: [],
      aisleViewScope: null,
    }
  }
}

function App() {
  const [initialState] = useState(loadAppState)
  const [selectedStore, setSelectedStore] = useState(initialState.selectedStore)
  const [items, setItems] = useState(initialState.items)
  const [todoItems, setTodoItems] = useState(initialState.todoItems)
  const [aisleDetails, setAisleDetails] = useState(initialState.aisleDetails)
  const [aisleViewScope, setAisleViewScope] = useState(
    initialState.aisleViewScope,
  )
  const [activeTab, setActiveTab] = useState('plan')
  const nextItemId = useRef(
    [
      ...initialState.items.map((item) => item.id),
      ...initialState.aisleDetails.map((detail) => detail.itemId),
    ].reduce((nextId, itemId) => Math.max(nextId, itemId + 1), 0),
  )
  const nextTodoId = useRef(
    initialState.todoItems.reduce(
      (nextId, item) => Math.max(nextId, item.id + 1),
      0,
    ),
  )
  const nextImportedItemId = useRef(
    Math.min(
      0,
      ...initialState.aisleDetails.map((detail) => detail.itemId),
    ) - 1,
  )

  useEffect(() => {
    try {
      window.localStorage.setItem(
        APP_STORAGE_KEY,
        JSON.stringify({
          selectedStore,
          items,
          todoItems,
          aisleDetails,
          aisleViewScope,
        }),
      )
    } catch (error) {
      console.error('Could not save Quick Cart data.', error)
    }
  }, [selectedStore, items, todoItems, aisleDetails, aisleViewScope])

  function handleAddItem(name) {
    const item = { id: nextItemId.current, name, selected: false }
    nextItemId.current += 1
    setItems((currentItems) => [...currentItems, item])
  }

  function handleToggleItem(itemId) {
    setItems((currentItems) =>
      currentItems.map((item) =>
        item.id === itemId ? { ...item, selected: !item.selected } : item,
      ),
    )
  }

  function handleUpdateItem(itemId, name) {
    setItems((currentItems) =>
      currentItems.map((item) =>
        item.id === itemId ? { ...item, name } : item,
      ),
    )
  }

  function handleAddTodo(name) {
    const item = { id: nextTodoId.current, name }
    nextTodoId.current += 1
    setTodoItems((currentItems) => [...currentItems, item])
  }

  function handleUpdateTodo(itemId, name) {
    setTodoItems((currentItems) =>
      currentItems.map((item) =>
        item.id === itemId ? { ...item, name } : item,
      ),
    )
  }

  function handleDeleteTodo(itemId) {
    setTodoItems((currentItems) =>
      currentItems.filter((item) => item.id !== itemId),
    )
  }

  const handleAisleDetailsFound = useCallback((details) => {
    if (!details.length) return
    setAisleDetails((currentDetails) =>
      mergeAisleDetails(currentDetails, details),
    )
    setActiveTab('plan')
  }, [])

  const handleAisleSearchStarted = useCallback((search) => {
    setAisleViewScope({
      ...search,
    })
  }, [])

  const handleManualAisleDetails = useCallback(
    (entries) => {
      if (!selectedStore || !entries.length) return false
      const searchId = `manual-${crypto.randomUUID()}`
      const updatedAt = new Date().toISOString()
      setItems((currentItems) => {
        const importedNames = new Set(
          entries.map((entry) => entry.itemName.trim().toLowerCase()),
        )
        const itemsWithImportedSelected = currentItems.map((item) =>
          importedNames.has(item.name.trim().toLowerCase())
            ? { ...item, selected: true }
            : item,
        )
        const existingNames = new Set(
          itemsWithImportedSelected.map((item) =>
            item.name.trim().toLowerCase(),
          ),
        )
        const newItems = entries
          .map((entry) => entry.itemName.trim())
          .filter((name) => {
            const key = name.toLowerCase()
            if (existingNames.has(key)) return false
            existingNames.add(key)
            return true
          })
          .map((name) => ({
            id: nextItemId.current++,
            name,
            selected: true,
          }))
        return newItems.length
          ? [...itemsWithImportedSelected, ...newItems]
          : itemsWithImportedSelected
      })
      setAisleViewScope({
        searchId,
        storeId: selectedStore.id,
        itemNames: entries.map((entry) => entry.itemName.trim()),
      })
      setAisleDetails((currentDetails) => {
        const imported = entries.map((entry) => {
          const existing = currentDetails.find(
            (detail) =>
              detail.storeId === selectedStore.id &&
              detail.itemName.trim().toLowerCase() ===
                entry.itemName.trim().toLowerCase(),
          )
          return {
            ...entry,
            itemId: existing?.itemId ?? nextImportedItemId.current--,
            storeId: selectedStore.id,
            storeName: selectedStore.name,
            storeAddress: selectedStore.address,
            searchId,
            updatedAt,
          }
        })
        return mergeAisleDetails(currentDetails, imported)
      })
      setActiveTab('plan')
      return true
    },
    [selectedStore],
  )

  function handleDeleteItem(itemId) {
    setItems((currentItems) =>
      currentItems.filter((item) => item.id !== itemId),
    )
  }

  const handleDeleteAisleDetail = useCallback((storeId, itemId) => {
    setAisleDetails((currentDetails) =>
      currentDetails.filter(
        (detail) =>
          detail.storeId !== storeId || detail.itemId !== itemId,
      ),
    )
  }, [])

  const handleEditAisleDetail = useCallback(
    (storeId, itemId, updates) => {
      const existing = aisleDetails.find(
        (detail) =>
          detail.storeId === storeId && detail.itemId === itemId,
      )
      if (!existing) return

      setAisleDetails((currentDetails) =>
        currentDetails.map((detail) =>
          detail.storeId === storeId && detail.itemId === itemId
            ? { ...detail, ...updates, updatedAt: new Date().toISOString() }
            : detail,
        ),
      )
      setAisleViewScope((currentScope) => {
        if (
          currentScope?.storeId !== storeId ||
          currentScope.searchId !== existing.searchId
        ) {
          return currentScope
        }
        return {
          ...currentScope,
          itemNames: currentScope.itemNames.map((itemName) =>
            itemName.trim().toLowerCase() ===
            existing.itemName.trim().toLowerCase()
              ? updates.itemName
              : itemName,
          ),
        }
      })
    },
    [aisleDetails],
  )

  const selectedStoreAisleCount = selectedStore
    ? aisleDetails.filter((detail) => detail.storeId === selectedStore.id)
        .length
    : 0

  return (
    <main className="app-shell">
      <header className="site-header">
        <a className="brand" href="/" aria-label="Quick Cart home">
          <span className="brand-mark" aria-hidden="true">
            <svg viewBox="0 0 24 24" fill="none">
              <path
                d="M3.5 4.5h2l2.2 10.1a1.7 1.7 0 0 0 1.7 1.3h7.9a1.7 1.7 0 0 0 1.7-1.3l1.4-6.1H7"
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              <circle cx="10" cy="19" r="1.2" fill="currentColor" />
              <circle cx="17" cy="19" r="1.2" fill="currentColor" />
            </svg>
          </span>
          <span>Quick Cart</span>
        </a>
        <span className="header-note">A quick pit stop for your busy day.</span>
      </header>

      <div className="page-content">
        <div className="eyebrow">
          <span className="eyebrow-dot" />
          YOUR SHOPPING SIDEKICK, WITH EXTRA SPARK
        </div>
        <h1>
          <span className="headline-words">
            <span>Ready,</span> <span>set,</span>
          </span>
          <br />
          <span className="headline-shop">shop!</span>
        </h1>
        <p className="intro-copy">
          Find your store, build your list, and make your next grocery run a
          little more fun.
        </p>

        <nav
          className="app-tabs"
          role="tablist"
          aria-label="Quick Cart sections"
        >
          <button
            id="plan-tab"
            className={`app-tab${activeTab === 'plan' ? ' app-tab-active' : ''}`}
            type="button"
            role="tab"
            aria-selected={activeTab === 'plan'}
            aria-controls="plan-panel"
            onClick={() => setActiveTab('plan')}
          >
            Plan a trip
          </button>
          <button
            id="saved-aisles-tab"
            className={`app-tab${activeTab === 'saved' ? ' app-tab-active' : ''}`}
            type="button"
            role="tab"
            aria-selected={activeTab === 'saved'}
            aria-controls="saved-aisles-panel"
            onClick={() => setActiveTab('saved')}
          >
            Saved aisles
            {selectedStore && (
              <span className="app-tab-count" aria-label="Saved items for selected store">
                {selectedStoreAisleCount}
              </span>
            )}
          </button>
          <button
            id="todo-tab"
            className={`app-tab${activeTab === 'todo' ? ' app-tab-active' : ''}`}
            type="button"
            role="tab"
            aria-selected={activeTab === 'todo'}
            aria-controls="todo-panel"
            onClick={() => setActiveTab('todo')}
          >
            To-do list
            {todoItems.length > 0 && (
              <span className="app-tab-count">{todoItems.length}</span>
            )}
          </button>
        </nav>

        <div
          id="plan-panel"
          className="app-tab-panel"
          role="tabpanel"
          aria-labelledby="plan-tab"
          hidden={activeTab !== 'plan'}
        >
          <StoreFinder onStoreSelected={setSelectedStore} />

          <GroceryList
            store={selectedStore}
            items={items}
            onAddItem={handleAddItem}
            onToggleItem={handleToggleItem}
            onDeleteItem={handleDeleteItem}
            onUpdateItem={handleUpdateItem}
          />

          <AisleSearch
            store={selectedStore}
            items={items}
            aisleDetails={aisleDetails}
            onAisleDetailsFound={handleAisleDetailsFound}
            onManualAisleDetails={handleManualAisleDetails}
            onSearchStarted={handleAisleSearchStarted}
          />
        </div>
        <div
          id="saved-aisles-panel"
          className="app-tab-panel"
          role="tabpanel"
          aria-labelledby="saved-aisles-tab"
          hidden={activeTab !== 'saved'}
        >
          <SavedAisles
            allDetails={aisleDetails}
            selectedStore={selectedStore}
            onDelete={handleDeleteAisleDetail}
            onEdit={handleEditAisleDetail}
          />
        </div>
        <div
          id="todo-panel"
          className="app-tab-panel"
          role="tabpanel"
          aria-labelledby="todo-tab"
          hidden={activeTab !== 'todo'}
        >
          <TodoList
            items={todoItems}
            onAdd={handleAddTodo}
            onUpdate={handleUpdateTodo}
            onDelete={handleDeleteTodo}
          />
        </div>

        <footer className="page-footer">
          <span className="footer-sparkle" aria-hidden="true">
            ✳
          </span>
          Store locations are sourced from OpenStreetMap and may not include
          every location.
        </footer>
      </div>
    </main>
  )
}

export default App
