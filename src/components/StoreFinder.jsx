import { useState } from 'react'

const NOMINATIM_ENDPOINT =
  import.meta.env.VITE_NOMINATIM_ENDPOINT || '/api/nominatim/search'
const SEARCH_RADIUS_METERS = 80_467
const MAX_VISIBLE_STORES = 5
const NOMINATIM_MIN_REQUEST_INTERVAL_MS = 1_100
let lastNominatimRequestAt = 0

async function fetchNominatim(url) {
  const elapsed = Date.now() - lastNominatimRequestAt
  const waitTime = NOMINATIM_MIN_REQUEST_INTERVAL_MS - elapsed
  if (waitTime > 0) {
    await new Promise((resolve) => setTimeout(resolve, waitTime))
  }

  lastNominatimRequestAt = Date.now()
  return fetch(url, { signal: AbortSignal.timeout(15_000) })
}

function distanceBetween(lat1, lon1, lat2, lon2) {
  const radians = (degrees) => (degrees * Math.PI) / 180
  const earthRadiusMiles = 3958.8
  const latitudeDifference = radians(lat2 - lat1)
  const longitudeDifference = radians(lon2 - lon1)
  const haversine =
    Math.sin(latitudeDifference / 2) ** 2 +
    Math.cos(radians(lat1)) *
      Math.cos(radians(lat2)) *
      Math.sin(longitudeDifference / 2) ** 2

  return (
    earthRadiusMiles *
    2 *
    Math.atan2(Math.sqrt(haversine), Math.sqrt(1 - haversine))
  )
}

function getStoreCoordinates(element) {
  const latitude = Number(element.lat ?? element.center?.lat)
  const longitude = Number(element.lon ?? element.center?.lon)

  if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
    return null
  }

  return { latitude, longitude }
}

function getStoreAddress(address, displayName) {
  const street = [address.house_number, address.road]
    .filter(Boolean)
    .join(' ')
  const locality = [
    address.city || address.town || address.village,
    address.state,
  ]
    .filter(Boolean)
    .join(', ')
  const formattedAddress = [street, locality, address.postcode]
    .filter(Boolean)
    .join(', ')

  return formattedAddress || displayName || 'Address not listed in OpenStreetMap'
}

async function findNearbyStores(latitude, longitude) {
  const latitudeOffset = SEARCH_RADIUS_METERS / 111_320
  const longitudeOffset =
    SEARCH_RADIUS_METERS / (111_320 * Math.cos((latitude * Math.PI) / 180))
  const parameters = new URLSearchParams({
    q: 'Walmart',
    format: 'jsonv2',
    limit: '40',
    addressdetails: '1',
    dedupe: '1',
    bounded: '1',
    viewbox: [
      longitude - longitudeOffset,
      latitude + latitudeOffset,
      longitude + longitudeOffset,
      latitude - latitudeOffset,
    ].join(','),
  })
  const response = await fetchNominatim(
    `${NOMINATIM_ENDPOINT}?${parameters}`,
  )

  if (!response.ok) {
    if (response.status === 429) {
      throw new Error(
        'The store search service is busy. Wait a moment and try again.',
      )
    }
    throw new Error(
      'Nearby store search is temporarily unavailable. Please try again.',
    )
  }

  const locations = await response.json()
  const storesById = new Map()

  for (const location of locations) {
    if (
      !/walmart/i.test(location.name ?? '') ||
      !['supermarket', 'hypermarket', 'department_store'].includes(
        location.type,
      )
    ) {
      continue
    }
    const coordinates = getStoreCoordinates(location)
    if (!coordinates) continue

    const distance = distanceBetween(
      latitude,
      longitude,
      coordinates.latitude,
      coordinates.longitude,
    )
    if (distance * 1609.344 > SEARCH_RADIUS_METERS) continue

    const store = {
      id: `${location.osm_type}-${location.osm_id}`,
      name: location.name,
      address: getStoreAddress(location.address ?? {}, location.display_name),
      postalCode: location.address?.postcode ?? '',
      latitude: coordinates.latitude,
      longitude: coordinates.longitude,
      distance,
    }
    storesById.set(store.id, store)
  }

  return [...storesById.values()].sort(
    (first, second) => first.distance - second.distance,
  )
}

async function findZipCoordinates(zipCode) {
  const parameters = new URLSearchParams({
    postalcode: zipCode,
    country: 'United States',
    format: 'jsonv2',
    limit: '1',
  })
  const response = await fetchNominatim(`${NOMINATIM_ENDPOINT}?${parameters}`)

  if (!response.ok) {
    if (response.status === 429) {
      throw new Error(
        'The location lookup service is busy. Wait a moment and try again.',
      )
    }
    throw new Error('We could not look up that ZIP code. Please try again.')
  }

  const locations = await response.json()
  if (!locations.length) {
    throw new Error('We could not find that ZIP code. Check it and try again.')
  }

  return {
    latitude: Number(locations[0].lat),
    longitude: Number(locations[0].lon),
  }
}

function getLocationError(error) {
  if (error.code === 1) {
    return 'Location access is blocked. Allow it for this site in your browser settings and make sure Location Services are enabled for your browser in your device settings, then try again. You can also enter a ZIP code.'
  }
  if (error.code === 3) {
    return 'Your device did not provide a location in time. Check that Location Services are enabled for your browser and try again, or enter a ZIP code.'
  }
  if (error.code === 2) {
    return 'Your device could not determine your location. Check that Location Services are enabled, then try again or enter a ZIP code.'
  }
  return 'We could not get your location. Try again or enter a ZIP code.'
}

function getSearchError(error) {
  if (error instanceof Error && error.name === 'TimeoutError') {
    return 'The location search took too long. Please try again.'
  }
  if (error instanceof Error && error.name === 'TypeError') {
    return 'Could not connect to the location service. Check your connection and try again.'
  }
  return error instanceof Error
    ? error.message
    : 'Something went wrong while searching. Please try again.'
}

function StoreFinder({ onStoreSelected }) {
  const [zipCode, setZipCode] = useState('')
  const [store, setStore] = useState(null)
  const [nearbyStores, setNearbyStores] = useState([])
  const [errorMessage, setErrorMessage] = useState('')
  const [searching, setSearching] = useState(false)
  const [searchStatus, setSearchStatus] = useState('')
  const [searchComplete, setSearchComplete] = useState(false)
  const [searchLocationLabel, setSearchLocationLabel] = useState('')
  const [nearbyStorePickerOpen, setNearbyStorePickerOpen] = useState(true)

  async function searchFromCoordinates(latitude, longitude, locationLabel) {
    setSearching(true)
    setSearchStatus('Searching nearby Walmart stores…')
    setErrorMessage('')
    setStore(null)
    setNearbyStores([])
    onStoreSelected(null)
    setSearchComplete(false)
    setSearchLocationLabel(locationLabel)
    setNearbyStorePickerOpen(true)

    try {
      const stores = await findNearbyStores(latitude, longitude)
      const nearbyResults = stores.slice(0, MAX_VISIBLE_STORES)
      const nearestStore = nearbyResults[0] ?? null
      setNearbyStores(nearbyResults)
      setStore(nearestStore)
      onStoreSelected(nearestStore)
      setSearchComplete(true)
    } catch (error) {
      setErrorMessage(getSearchError(error))
    } finally {
      setSearching(false)
      setSearchStatus('')
    }
  }

  async function handleUseLocation() {
    setErrorMessage('')
    setStore(null)
    setNearbyStores([])
    onStoreSelected(null)
    setSearchComplete(false)

    if (!window.isSecureContext) {
      setErrorMessage(
        'Your browser only allows location access on HTTPS or localhost. Open this app on a secure connection, or enter a ZIP code.',
      )
      return
    }

    if (navigator.permissions?.query) {
      try {
        const permission = await navigator.permissions.query({
          name: 'geolocation',
        })
        if (permission.state === 'denied') {
          setErrorMessage(
            'Location access is blocked for this site. Allow it in your browser’s site settings and enable Location Services for your browser in device settings, then try again. You can also enter a ZIP code.',
          )
          return
        }
      } catch (error) {
        console.warn('Could not check browser location permission.', error)
      }
    }

    if (!navigator.geolocation) {
      setErrorMessage(
        'Location is not supported by this browser. Enter a ZIP code instead.',
      )
      return
    }

    setSearching(true)
    setSearchStatus('Waiting for your device to share your location…')
    navigator.geolocation.getCurrentPosition(
      ({ coords }) => {
        void searchFromCoordinates(
          coords.latitude,
          coords.longitude,
          'your current location',
        )
      },
      (error) => {
        setSearching(false)
        setSearchStatus('')
        setErrorMessage(getLocationError(error))
      },
      { enableHighAccuracy: false, timeout: 45_000, maximumAge: 120_000 },
    )
  }

  async function handleZipSubmit(event) {
    event.preventDefault()
    const normalizedZipCode = zipCode.trim()

    if (!/^\d{5}$/.test(normalizedZipCode)) {
      setErrorMessage('Enter a valid 5-digit US ZIP code.')
      setStore(null)
      setNearbyStores([])
      onStoreSelected(null)
      setSearchComplete(false)
      return
    }

    setSearching(true)
    setSearchStatus('Looking up your ZIP code…')
    setErrorMessage('')
    setStore(null)
    setNearbyStores([])
    onStoreSelected(null)
    setSearchComplete(false)

    try {
      const coordinates = await findZipCoordinates(normalizedZipCode)
      await searchFromCoordinates(
        coordinates.latitude,
        coordinates.longitude,
        `ZIP ${normalizedZipCode}`,
      )
    } catch (error) {
      setSearching(false)
      setSearchStatus('')
      setErrorMessage(getSearchError(error))
    }
  }

  function handleSelectStore(selectedStore) {
    setStore(selectedStore)
    onStoreSelected(selectedStore)
    setNearbyStorePickerOpen(false)
  }

  const directionsUrl = store
    ? `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(
        `${store.latitude},${store.longitude}`,
      )}&travelmode=driving`
    : ''
  const walmartLocationZip = store?.postalCode
  const walmartStoreFinderUrl = 'https://www.walmart.com/store-finder'

  return (
    <section className="store-finder" aria-labelledby="store-finder-title">
      <div className="finder-heading">
        <span className="finder-icon" aria-hidden="true">
          <svg viewBox="0 0 24 24" fill="none">
            <path
              d="M20 10c0 5-8 11-8 11S4 15 4 10a8 8 0 1 1 16 0Z"
              stroke="currentColor"
              strokeWidth="1.7"
              strokeLinejoin="round"
            />
            <circle cx="12" cy="10" r="2.5" stroke="currentColor" strokeWidth="1.7" />
          </svg>
        </span>
        <div>
          <p className="card-kicker">FIRST THINGS FIRST</p>
          <h2 id="store-finder-title">Find your Walmart</h2>
        </div>
      </div>

      <p className="finder-description">
        We’ll find the closest store to your location or ZIP. The store may be
        in a neighboring ZIP code.
      </p>

      <button
        className="location-button"
        type="button"
        onClick={handleUseLocation}
        disabled={searching}
      >
        <svg viewBox="0 0 20 20" fill="none" aria-hidden="true">
          <path
            d="M10 2.5v2m0 11v2m7.5-7.5h-2m-11 0h-2m13.3-5.3-1.4 1.4M5.6 14.4l-1.4 1.4m11.6 0-1.4-1.4M5.6 5.6 4.2 4.2"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
          />
          <circle cx="10" cy="10" r="4" stroke="currentColor" strokeWidth="1.5" />
        </svg>
        {searching &&
        searchStatus === 'Waiting for your device to share your location…'
          ? 'Getting your location…'
          : searching
            ? 'Finding nearby stores…'
            : 'Use my current location'}
      </button>

      <div className="form-divider">
        <span />
        <span>OR ENTER ZIP CODE</span>
        <span />
      </div>

      <form className="zip-form" onSubmit={handleZipSubmit}>
        <label className="sr-only" htmlFor="zip-code">
          US ZIP code
        </label>
        <input
          id="zip-code"
          inputMode="numeric"
          autoComplete="postal-code"
          maxLength={5}
          pattern="\d{5}"
          placeholder="Enter 5-digit ZIP code"
          value={zipCode}
          onChange={(event) => setZipCode(event.target.value.replace(/\D/g, ''))}
          disabled={searching}
        />
        <button type="submit" disabled={searching}>
          Find store
        </button>
      </form>

      {errorMessage && (
        <p className="finder-message finder-error" role="alert">
          <span aria-hidden="true">!</span>
          {errorMessage}
        </p>
      )}

      {searching && (
        <p className="finder-message finder-loading" role="status">
          {searchStatus}
        </p>
      )}

      {searchComplete && !store && (
        <p className="finder-message finder-empty" role="status">
          No Walmart locations were found within 50 miles of that location.
          Try another ZIP code.
        </p>
      )}

      {store && (
        <div className="store-results" aria-live="polite">
          <div className="store-result">
            <div className="store-result-topline">
              <span className="store-status-dot" />
              SELECTED STORE
              <span className="store-distance">
                {store.distance.toFixed(1)} mi away
              </span>
            </div>
            <h3>{store.name}</h3>
            <p>{store.address}</p>
            <p className="store-postal-code">
              Store ZIP code: <strong>{store.postalCode || 'Not available'}</strong>
            </p>
            <a
              className="store-walmart-link"
              href={walmartStoreFinderUrl}
              target="_blank"
              rel="noreferrer"
            >
              Open Walmart store finder
              <svg viewBox="0 0 16 16" fill="none" aria-hidden="true">
                <path
                  d="M4 12 12 4M5 4h7v7"
                  stroke="currentColor"
                  strokeWidth="1.4"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </a>
            {walmartLocationZip && (
              <p className="store-walmart-zip">
                Enter this store ZIP on Walmart:{' '}
                <strong>{walmartLocationZip}</strong>.
              </p>
            )}
            {!walmartLocationZip && store.postalCodeError && (
              <p className="store-walmart-zip">{store.postalCodeError}</p>
            )}
            <a
              className="directions-link"
              href={directionsUrl}
              target="_blank"
              rel="noreferrer"
            >
              Get directions
              <svg viewBox="0 0 20 20" fill="none" aria-hidden="true">
                <path
                  d="M5 15 15 5M6 5h9v9"
                  stroke="currentColor"
                  strokeWidth="1.7"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </a>
          </div>

          {nearbyStores.length > 1 && nearbyStorePickerOpen && (
            <div className="nearby-store-picker">
              <div className="nearby-store-picker-heading">
                <strong>
                  Stores near {searchLocationLabel || 'you'}
                </strong>
                <span>Choose the one you’ll shop at</span>
              </div>
              <ul className="nearby-store-options">
                {nearbyStores.map((nearbyStore, index) => (
                  <li key={nearbyStore.id}>
                    <button
                      className={`nearby-store-option${
                        nearbyStore.id === store.id
                          ? ' nearby-store-option-selected'
                          : ''
                      }`}
                      type="button"
                      aria-pressed={nearbyStore.id === store.id}
                      onClick={() => handleSelectStore(nearbyStore)}
                    >
                      <span className="nearby-store-option-radio" aria-hidden="true">
                        {nearbyStore.id === store.id && (
                          <span className="nearby-store-option-radio-dot" />
                        )}
                      </span>
                      <span className="nearby-store-option-info">
                        <strong>
                          {index === 0 && <span className="nearest-tag">Nearest</span>}
                          {nearbyStore.name}
                        </strong>
                        <span>{nearbyStore.address}</span>
                        <span>
                          ZIP {nearbyStore.postalCode || 'not listed'}
                        </span>
                      </span>
                      <span className="nearby-store-option-distance">
                        {nearbyStore.distance.toFixed(1)} mi
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          )}
          {nearbyStores.length > 1 && !nearbyStorePickerOpen && (
            <button
              className="store-change-button"
              type="button"
              onClick={() => setNearbyStorePickerOpen(true)}
            >
              Change selected store
            </button>
          )}
        </div>
      )}
    </section>
  )
}

export default StoreFinder
