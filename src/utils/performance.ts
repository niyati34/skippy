// Simple performance monitoring utilities

export class PerformanceTimer {
  private startTime: number = 0;
  private label: string = "";

  constructor(label: string = "Operation") {
    this.label = label;
    this.start();
  }

  start() {
    this.startTime = performance.now();
    console.log(`🚀 [PERF] ${this.label} started`);
  }

  checkpoint(checkpoint: string) {
    const elapsed = performance.now() - this.startTime;
    console.log(
      `⏱️  [PERF] ${this.label} - ${checkpoint}: ${elapsed.toFixed(0)}ms`
    );
  }

  end() {
    const elapsed = performance.now() - this.startTime;
    console.log(`✅ [PERF] ${this.label} completed in ${elapsed.toFixed(0)}ms`);
    return elapsed;
  }
}

export function timeAsync<T>(label: string, fn: () => Promise<T>): Promise<T> {
  const timer = new PerformanceTimer(label);
  return fn().finally(() => timer.end());
}

export function logSlowOperations(threshold: number = 2000) {
  const originalFetch = window.fetch;
  window.fetch = async (...args) => {
    const start = performance.now();
    const result = await originalFetch(...args);
    const duration = performance.now() - start;
    if (duration > threshold) {
      console.warn(`🐌 [SLOW] Fetch took ${duration.toFixed(0)}ms:`, args[0]);
    }
    return result;
  };
}
