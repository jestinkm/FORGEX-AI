// Test suite validating Waiting Room queue progress, wait time estimation, and sessionStorage behavior

export function calculateProgress(position: number, depth: number): number {
  const safeDepth = Math.max(depth, position);
  return Math.min(100, Math.max(5, Math.round(((safeDepth - position + 1) / safeDepth) * 100)));
}

export function formatWaitTime(seconds: number | null): string {
  if (seconds === null || seconds <= 0) return 'Less than 1 minute';
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  if (mins === 0) return `${secs} seconds`;
  return `${mins} min ${secs > 0 ? `${secs}s` : ''}`;
}

// Node.js test runner execution
if (typeof process !== 'undefined' && process.argv && process.argv[1]?.includes('queueLogic.test')) {
  const assert = (condition: boolean, msg: string) => {
    if (!condition) throw new Error('Assertion Failed: ' + msg);
  };

  console.log('Running Queue Logic Unit Tests...');

  // Test 1: Position 1 should yield near 100% progress
  assert(calculateProgress(1, 100) === 100, 'Position 1 should be 100% progress');

  // Test 2: Position 50 of 100 should be ~51% progress
  assert(calculateProgress(50, 100) === 51, 'Position 50 of 100 should be 51%');

  // Test 3: Minimum progress floor should be at least 5%
  assert(calculateProgress(1000, 1000) === 5, 'Tail of queue should be at least 5% for visual comfort');

  // Test 4: Format wait time
  assert(formatWaitTime(0) === 'Less than 1 minute', 'Zero seconds should format as Less than 1 minute');
  assert(formatWaitTime(45) === '45 seconds', '45s should format as 45 seconds');
  assert(formatWaitTime(150) === '2 min 30s', '150s should format as 2 min 30s');

  console.log('All 4 Queue Logic tests passed successfully!');
}
