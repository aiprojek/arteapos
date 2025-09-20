import { useState, useEffect } from 'react';

type Migrator<T> = (data: any) => T;

export const useLocalStorage = <T,>(
  key: string, 
  initialValue: T,
  migrator?: Migrator<T>
): [T, (value: T | ((val: T) => T)) => void] => {
  const [storedValue, setStoredValue] = useState<T>(() => {
    try {
      const item = window.localStorage.getItem(key);
      if (!item) return initialValue;

      let parsedItem = JSON.parse(item);
      
      if (migrator) {
        parsedItem = migrator(parsedItem);
      }
      
      return parsedItem;

    } catch (error) {
      console.error(error);
      return initialValue;
    }
  });

  const setValue = (value: T | ((val: T) => T)) => {
    try {
      const valueToStore = value instanceof Function ? value(storedValue) : value;
      setStoredValue(valueToStore);
      window.localStorage.setItem(key, JSON.stringify(valueToStore));
    } catch (error) {
      console.error(error);
    }
  };
  
  useEffect(() => {
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === key) {
        try {
          if (!e.newValue) {
            setStoredValue(initialValue);
            return;
          }
          let parsedValue = JSON.parse(e.newValue);
           if (migrator) {
            parsedValue = migrator(parsedValue);
          }
          setStoredValue(parsedValue);
        } catch (error) {
            console.error("Error parsing localStorage change", error);
        }
      }
    };
    
    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);


  return [storedValue, setValue];
};
