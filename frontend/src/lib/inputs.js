import { currentMonth } from './format';

// Stored inputs may carry a start month that is now in the past; the API rejects that, so drop it.
export function refreshInputs(inputs) {
  const { startMonth, ...rest } = inputs;
  return startMonth && startMonth >= currentMonth() ? { ...rest, startMonth } : rest;
}
