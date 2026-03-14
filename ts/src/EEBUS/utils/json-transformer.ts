export function transformObject<T>(obj?: T): T[] {
  // 1. If it's not an object or is null, return it (Base case)
  if (typeof obj !== 'object' || obj === null) {
    return obj as T[];
  }

  // 2. If it's an array, process each element
  if (Array.isArray(obj)) {
    return obj.map(transformObject) as T[];;
  }

  // 3. Transform the object into an array of single-key objects
  return Object.entries(obj).map(([key, value]) => {
    return {
      [key]: transformObject(value) // Recurse here to catch nested objects
    };
  }) as T[];;
}

export const untransformObject = (input: any): any => {
  // 1. Handle non-objects or null
  if (typeof input !== 'object' || input === null) {
    return input;
  }

  // 2. Handle Arrays
  if (Array.isArray(input)) {
    // Check if this is an array of single-key objects
    const isShatteredObject = input.length > 0 && input.every(item =>
      typeof item === 'object' &&
      item !== null &&
      !Array.isArray(item) &&
      Object.keys(item).length === 1
    );

    if (isShatteredObject) {
      // Merge the array of objects into one single object
      return input.reduce((acc, current) => {
        const [key, value] = Object.entries(current).at(0)!;
        acc[key] = untransformObject(value); // Recurse into the value
        return acc;
      }, {} as any);
    }

    // Otherwise, it's a simple array (strings, etc.), just recurse into elements
    return input.map(untransformObject);
  }

  // 3. Handle Objects (in case the root or a value is a standard object)
  const restoredObj: any = {};
  for (const [key, value] of Object.entries(input)) {
    restoredObj[key] = untransformObject(value);
  }
  return restoredObj;
};