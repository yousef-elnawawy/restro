/**
 * Offline IndexedDB Manager for Restro POS
 * Provides offline caching for products, categories, modifiers, tables, registers,
 * and a persistent queue for orders created while offline.
 */

export interface OfflineOrder {
  id: string // Client UUID or timestamp key, e.g. "OFF-1729000000000"
  orderNumber: string
  payload: any
  paymentInfo?: {
    cash_register_id: number
    amount: number
    payment_method?: string
    notes?: string
    complete_order?: boolean
  }
  status: "pending" | "syncing" | "failed" | "synced"
  createdAt: string
  syncedAt?: string
  lastError?: string
}

const DB_NAME = "restro_pos_offline_v1"
const DB_VERSION = 1

function openDatabase(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof window === "undefined" || !window.indexedDB) {
      return reject(new Error("IndexedDB is not supported in this environment"))
    }

    const request = window.indexedDB.open(DB_NAME, DB_VERSION)

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result

      // Store 1: Catalogs cache (products, categories, tables, registers, settings)
      if (!db.objectStoreNames.contains("catalogs")) {
        db.createObjectStore("catalogs", { keyPath: "key" })
      }

      // Store 2: Offline orders queue
      if (!db.objectStoreNames.contains("offline_orders")) {
        const orderStore = db.createObjectStore("offline_orders", { keyPath: "id" })
        orderStore.createIndex("status", "status", { unique: false })
        orderStore.createIndex("createdAt", "createdAt", { unique: false })
      }
    }

    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(request.error)
  })
}

// ----------------------------------------------------
// Catalog Caching (Products, Categories, Tables, etc.)
// ----------------------------------------------------

export async function setCachedCatalog<T>(key: string, data: T): Promise<void> {
  try {
    const db = await openDatabase()
    return new Promise((resolve, reject) => {
      const tx = db.transaction("catalogs", "readwrite")
      const store = tx.objectStore("catalogs")
      const request = store.put({ key, data, updatedAt: new Date().toISOString() })
      request.onsuccess = () => resolve()
      request.onerror = () => reject(request.error)
    })
  } catch (err) {
    console.warn(`[OfflineDB] Failed to cache catalog '${key}':`, err)
  }
}

export async function getCachedCatalog<T>(key: string): Promise<T | null> {
  try {
    const db = await openDatabase()
    return new Promise((resolve, reject) => {
      const tx = db.transaction("catalogs", "readonly")
      const store = tx.objectStore("catalogs")
      const request = store.get(key)
      request.onsuccess = () => {
        resolve(request.result ? (request.result.data as T) : null)
      }
      request.onerror = () => reject(request.error)
    })
  } catch (err) {
    console.warn(`[OfflineDB] Failed to get cached catalog '${key}':`, err)
    return null
  }
}

// ----------------------------------------------------
// Offline Orders Queue
// ----------------------------------------------------

export async function saveOfflineOrder(order: OfflineOrder): Promise<void> {
  const db = await openDatabase()
  return new Promise((resolve, reject) => {
    const tx = db.transaction("offline_orders", "readwrite")
    const store = tx.objectStore("offline_orders")
    const request = store.put(order)
    request.onsuccess = () => resolve()
    request.onerror = () => reject(request.error)
  })
}

export async function getOfflineOrders(): Promise<OfflineOrder[]> {
  try {
    const db = await openDatabase()
    return new Promise((resolve, reject) => {
      const tx = db.transaction("offline_orders", "readonly")
      const store = tx.objectStore("offline_orders")
      const request = store.getAll()
      request.onsuccess = () => {
        const list = (request.result || []) as OfflineOrder[]
        // Sort newest first
        list.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
        resolve(list)
      }
      request.onerror = () => reject(request.error)
    })
  } catch (err) {
    console.warn("[OfflineDB] Failed to fetch offline orders:", err)
    return []
  }
}

export async function getPendingOfflineOrders(): Promise<OfflineOrder[]> {
  const all = await getOfflineOrders()
  return all.filter((o) => o.status === "pending" || o.status === "failed")
}

export async function updateOfflineOrderStatus(
  id: string,
  status: OfflineOrder["status"],
  errorMsg?: string
): Promise<void> {
  const db = await openDatabase()
  return new Promise((resolve, reject) => {
    const tx = db.transaction("offline_orders", "readwrite")
    const store = tx.objectStore("offline_orders")
    const getReq = store.get(id)

    getReq.onsuccess = () => {
      const order = getReq.result as OfflineOrder | undefined
      if (order) {
        order.status = status
        if (status === "synced") {
          order.syncedAt = new Date().toISOString()
          order.lastError = undefined
        }
        if (errorMsg) {
          order.lastError = errorMsg
        }
        store.put(order)
        resolve()
      } else {
        resolve()
      }
    }
    getReq.onerror = () => reject(getReq.error)
  })
}

export async function deleteOfflineOrder(id: string): Promise<void> {
  const db = await openDatabase()
  return new Promise((resolve, reject) => {
    const tx = db.transaction("offline_orders", "readwrite")
    const store = tx.objectStore("offline_orders")
    const request = store.delete(id)
    request.onsuccess = () => resolve()
    request.onerror = () => reject(request.error)
  })
}

export async function clearSyncedOfflineOrders(): Promise<void> {
  const orders = await getOfflineOrders()
  const syncedIds = orders.filter((o) => o.status === "synced").map((o) => o.id)
  const db = await openDatabase()
  return new Promise((resolve, reject) => {
    const tx = db.transaction("offline_orders", "readwrite")
    const store = tx.objectStore("offline_orders")
    syncedIds.forEach((id) => store.delete(id))
    tx.oncomplete = () => resolve()
    tx.onerror = () => reject(tx.error)
  })
}
