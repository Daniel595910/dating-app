/**
 * Array Utilities
 * Comprehensive array manipulation functions
 */

/**
 * Chunk array into smaller arrays
 */
export function chunk < T > (array: T[], size: number): T[][] {
  if (size <= 0) throw new Error('Chunk size must be greater than 0');
  
  const chunks: T[][] = [];
  for (let i = 0; i < array.length; i += size) {
    chunks.push(array.slice(i, i + size));
  }
  return chunks;
}

/**
 * Remove duplicates from array
 */
export function unique < T > (array: T[]): T[] {
  return [...new Set(array)];
}

/**
 * Remove duplicates by key
 */
export function uniqueBy < T > (array: T[], key: keyof T): T[] {
  const seen = new Set();
  return array.filter(item => {
    const value = item[key];
    if (seen.has(value)) return false;
    seen.add(value);
    return true;
  });
}

/**
 * Shuffle array (Fisher-Yates algorithm)
 */
export function shuffle < T > (array: T[]): T[] {
  const result = [...array];
  
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [result[i], result[j]] = [result[j] !, result[i] !];
  }
  
  return result;
}

/**
 * Sort array by key
 */
export function sortBy < T > (array: T[], key: keyof T, ascending: boolean = true): T[] {
  return [...array].sort((a, b) => {
    const aVal = a[key];
    const bVal = b[key];
    
    if (aVal < bVal) return ascending ? -1 : 1;
    if (aVal > bVal) return ascending ? 1 : -1;
    return 0;
  });
}

/**
 * Sort array by multiple keys
 */
export function sortByMultiple < T > (array: T[], keys: Array < { key: keyof T;ascending ? : boolean } > ): T[] {
  return [...array].sort((a, b) => {
    for (const { key, ascending = true } of keys) {
      const aVal = a[key];
      const bVal = b[key];
      
      if (aVal < bVal) return ascending ? -1 : 1;
      if (aVal > bVal) return ascending ? 1 : -1;
    }
    return 0;
  });
}

/**
 * Group array by key
 */
export function groupBy < T > (array: T[], key: keyof T): Record < string, T[] > {
  return array.reduce((groups, item) => {
    const groupKey = String(item[key]);
    if (!groups[groupKey]) {
      groups[groupKey] = [];
    }
    groups[groupKey] !.push(item);
    return groups;
  }, {} as Record < string, T[] > );
}

/**
 * Flatten nested arrays
 */
export function flatten < T > (array: Array < T | T[] > ): T[] {
  return array.reduce < T[] > ((flat, item) => {
    return flat.concat(Array.isArray(item) ? flatten(item) : item);
  }, []);
}

/**
 * Get first N elements
 */
export function first < T > (array: T[], n: number = 1): T[] {
  return array.slice(0, n);
}

/**
 * Get last N elements
 */
export function last < T > (array: T[], n: number = 1): T[] {
  return array.slice(-n);
}

/**
 * Remove element by value
 */
export function remove < T > (array: T[], value: T): T[] {
  return array.filter(item => item !== value);
}

/**
 * Remove elements by predicate
 */
export function removeBy < T > (array: T[], predicate: (item: T) => boolean): T[] {
  return array.filter(item => !predicate(item));
}

/**
 * Replace element at index
 */
export function replaceAt < T > (array: T[], index: number, value: T): T[] {
  if (index < 0 || index >= array.length) return array;
  
  const result = [...array];
  result[index] = value;
  return result;
}

/**
 * Insert element at index
 */
export function insertAt < T > (array: T[], index: number, value: T): T[] {
  const result = [...array];
  result.splice(index, 0, value);
  return result;
}

/**
 * Move element from one index to another
 */
export function move < T > (array: T[], from: number, to: number): T[] {
  if (from < 0 || from >= array.length || to < 0 || to >= array.length) {
    return array;
  }
  
  const result = [...array];
  const [item] = result.splice(from, 1);
  result.splice(to, 0, item!);
  return result;
}

/**
 * Swap two elements
 */
export function swap < T > (array: T[], index1: number, index2: number): T[] {
  if (
    index1 < 0 || index1 >= array.length ||
    index2 < 0 || index2 >= array.length
  ) {
    return array;
  }
  
  const result = [...array];
  [result[index1], result[index2]] = [result[index2] !, result[index1] !];
  return result;
}

/**
 * Find all indices of a value
 */
export function findAllIndices < T > (array: T[], value: T): number[] {
  const indices: number[] = [];
  array.forEach((item, index) => {
    if (item === value) {
      indices.push(index);
    }
  });
  return indices;
}

/**
 * Get random element from array
 */
export function randomElement < T > (array: T[]): T | undefined {
  if (array.length === 0) return undefined;
  return array[Math.floor(Math.random() * array.length)];
}

/**
 * Get multiple random elements from array
 */
export function randomElements < T > (array: T[], count: number): T[] {
  if (count >= array.length) return shuffle(array);
  return shuffle(array).slice(0, count);
}

/**
 * Check if arrays are equal
 */
export function areEqual < T > (array1: T[], array2: T[]): boolean {
  if (array1.length !== array2.length) return false;
  
  for (let i = 0; i < array1.length; i++) {
    if (array1[i] !== array2[i]) return false;
  }
  
  return true;
}

/**
 * Get intersection of two arrays
 */
export function intersection < T > (array1: T[], array2: T[]): T[] {
  return array1.filter(item => array2.includes(item));
}

/**
 * Get difference of two arrays
 */
export function difference < T > (array1: T[], array2: T[]): T[] {
  return array1.filter(item => !array2.includes(item));
}

/**
 * Get union of two arrays
 */
export function union < T > (array1: T[], array2: T[]): T[] {
  return unique([...array1, ...array2]);
}

/**
 * Create range array
 */
export function range(start: number, end: number, step: number = 1): number[] {
  const result: number[] = [];
  
  if (step > 0) {
    for (let i = start; i < end; i += step) {
      result.push(i);
    }
  } else if (step < 0) {
    for (let i = start; i > end; i += step) {
      result.push(i);
    }
  }
  
  return result;
}

/**
 * Partition array by predicate
 */
export function partition < T > (array: T[], predicate: (item: T) => boolean): [T[], T[]] {
  const pass: T[] = [];
  const fail: T[] = [];
  
  array.forEach(item => {
    if (predicate(item)) {
      pass.push(item);
    } else {
      fail.push(item);
    }
  });
  
  return [pass, fail];
}

/**
 * Get min and max from array
 */
export function minMax(array: number[]): { min: number;max: number } {
  if (array.length === 0) {
    return { min: 0, max: 0 };
  }
  
  return {
    min: Math.min(...array),
    max: Math.max(...array),
  };
}