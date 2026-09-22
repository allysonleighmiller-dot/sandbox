import { openDB, type DBSchema, type IDBPDatabase } from 'idb'

export interface Outfit {
  id: string
  image: Blob
  tags: string[]
  category: string
  notes: string
  favorite: boolean
  createdAt: number
}

export interface ShoppingItem {
  id: string
  text: string
  linkedOutfitId: string | null
  bought: boolean
  createdAt: number
}

interface OutfitDB extends DBSchema {
  outfits: {
    key: string
    value: Outfit
    indexes: { 'by-createdAt': number }
  }
  shoppingItems: {
    key: string
    value: ShoppingItem
    indexes: { 'by-createdAt': number }
  }
}

const DB_NAME = 'outfit-book'
const DB_VERSION = 1

let dbPromise: Promise<IDBPDatabase<OutfitDB>> | null = null

function getDB() {
  if (!dbPromise) {
    dbPromise = openDB<OutfitDB>(DB_NAME, DB_VERSION, {
      upgrade(db) {
        const outfits = db.createObjectStore('outfits', { keyPath: 'id' })
        outfits.createIndex('by-createdAt', 'createdAt')

        const shoppingItems = db.createObjectStore('shoppingItems', { keyPath: 'id' })
        shoppingItems.createIndex('by-createdAt', 'createdAt')
      },
    })
  }
  return dbPromise
}

function makeId() {
  return crypto.randomUUID()
}

export async function addOutfit(input: {
  image: Blob
  tags: string[]
  category: string
  notes: string
}): Promise<Outfit> {
  const db = await getDB()
  const outfit: Outfit = {
    id: makeId(),
    image: input.image,
    tags: input.tags,
    category: input.category,
    notes: input.notes,
    favorite: false,
    createdAt: Date.now(),
  }
  await db.put('outfits', outfit)
  return outfit
}

export async function getAllOutfits(): Promise<Outfit[]> {
  const db = await getDB()
  const all = await db.getAllFromIndex('outfits', 'by-createdAt')
  return all.reverse()
}

export async function getOutfit(id: string): Promise<Outfit | undefined> {
  const db = await getDB()
  return db.get('outfits', id)
}

export async function updateOutfit(outfit: Outfit): Promise<void> {
  const db = await getDB()
  await db.put('outfits', outfit)
}

export async function deleteOutfit(id: string): Promise<void> {
  const db = await getDB()
  await db.delete('outfits', id)
  const tx = db.transaction('shoppingItems', 'readwrite')
  let cursor = await tx.store.openCursor()
  while (cursor) {
    if (cursor.value.linkedOutfitId === id) {
      await cursor.delete()
    }
    cursor = await cursor.continue()
  }
  await tx.done
}

export async function addShoppingItem(input: {
  text: string
  linkedOutfitId?: string | null
}): Promise<ShoppingItem> {
  const db = await getDB()
  const item: ShoppingItem = {
    id: makeId(),
    text: input.text,
    linkedOutfitId: input.linkedOutfitId ?? null,
    bought: false,
    createdAt: Date.now(),
  }
  await db.put('shoppingItems', item)
  return item
}

export async function getAllShoppingItems(): Promise<ShoppingItem[]> {
  const db = await getDB()
  const all = await db.getAllFromIndex('shoppingItems', 'by-createdAt')
  return all.reverse()
}

export async function updateShoppingItem(item: ShoppingItem): Promise<void> {
  const db = await getDB()
  await db.put('shoppingItems', item)
}

export async function deleteShoppingItem(id: string): Promise<void> {
  const db = await getDB()
  await db.delete('shoppingItems', id)
}
