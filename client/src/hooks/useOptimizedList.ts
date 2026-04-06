import { useState, useCallback } from 'react'

interface UseOptimizedListOptions<T> {
  initialData?: T[]
  idField?: keyof T
}

export function useOptimizedList<T extends Record<string, any>>({
  initialData = [],
  idField = 'id' as keyof T
}: UseOptimizedListOptions<T> = {}) {
  const [items, setItems] = useState<T[]>(initialData)
  const [isLoading, setIsLoading] = useState(false)


  const addItem = useCallback((item: T) => {
    setItems(prev => [...prev, item])
  }, [])


  const updateItem = useCallback((id: string | number, updates: Partial<T>) => {
    setItems(prev => prev.map(item =>
      item[idField] === id ? { ...item, ...updates } : item
    ))
  }, [idField])


  const removeItem = useCallback((id: string | number) => {
    setItems(prev => prev.filter(item => item[idField] !== id))
  }, [idField])


  const setItemsList = useCallback((newItems: T[]) => {
    setItems(newItems)
  }, [])


  const updateItems = useCallback((updates: Array<{ id: string | number; updates: Partial<T> }>) => {
    setItems(prev => prev.map(item => {
      const update = updates.find(u => u.id === item[idField])
      return update ? { ...item, ...update.updates } : item
    }))
  }, [idField])


  const findItem = useCallback((id: string | number) => {
    return items.find(item => item[idField] === id)
  }, [items, idField])


  const hasItem = useCallback((id: string | number) => {
    return items.some(item => item[idField] === id)
  }, [items, idField])

  return {
    items,
    setItems: setItemsList,
    isLoading,
    setIsLoading,
    addItem,
    updateItem,
    removeItem,
    updateItems,
    findItem,
    hasItem,
    count: items.length
  }
}
