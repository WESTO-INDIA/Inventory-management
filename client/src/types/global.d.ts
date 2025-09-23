declare global {
  interface Window {
    debounceTimer: ReturnType<typeof setTimeout>
  }
}

export interface ManufacturingRecord {
  _id: string
  updatedAt?: string
  // Add other properties as needed
}

export {}