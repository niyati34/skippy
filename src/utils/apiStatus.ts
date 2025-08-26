// API Status Monitor - Global status tracker for AI processing
class APIStatusMonitor {
  private listeners: Set<(status: string) => void> = new Set();
  private currentStatus = "idle";

  setStatus(status: string) {
    this.currentStatus = status;
    this.listeners.forEach((listener) => listener(status));
  }

  getStatus() {
    return this.currentStatus;
  }

  subscribe(listener: (status: string) => void) {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }
}

export const apiStatusMonitor = new APIStatusMonitor();

// Helper to show loading status in UI
export function showAPIStatus(message: string) {
  apiStatusMonitor.setStatus(message);
  console.log(`[API Status] ${message}`);
}
