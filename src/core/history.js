// Undo and redo. Stores small snapshots of the settings, never pixels, so
// going back is just "restore these numbers and draw again".

function sameSettings(a, b) {
  const keys = new Set([...Object.keys(a), ...Object.keys(b)]);
  for (const key of keys) {
    if (a[key] !== b[key]) return false;
  }
  return true;
}

/**
 * Create a history that starts with the given settings.
 * Keeps at most `limit` snapshots and drops the oldest when full.
 */
export function createHistory(initial, limit = 100) {
  let stack = [{ ...initial }];
  let index = 0;

  return {
    /** The settings at the current point in history. */
    current() {
      return { ...stack[index] };
    },

    /**
     * Record new settings. Returns false when they match the current ones
     * (nothing to record). Recording after an undo drops the redo steps.
     */
    push(settings) {
      if (sameSettings(stack[index], settings)) return false;
      stack = stack.slice(0, index + 1);
      stack.push({ ...settings });
      if (stack.length > limit) stack.shift();
      index = stack.length - 1;
      return true;
    },

    /** True when the given settings match the current point in history. */
    isCurrent(settings) {
      return sameSettings(stack[index], settings);
    },

    undo() {
      if (index > 0) index -= 1;
      return { ...stack[index] };
    },

    redo() {
      if (index < stack.length - 1) index += 1;
      return { ...stack[index] };
    },

    canUndo() {
      return index > 0;
    },

    canRedo() {
      return index < stack.length - 1;
    },
  };
}
