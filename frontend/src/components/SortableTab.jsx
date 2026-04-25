import React, { useEffect, useRef } from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

/**
 * Sortable wrapper for a Balance sub-tab trigger or block tile.
 *
 * `wiggle` decides whether the visual shake + drag listeners are active.
 * When `wiggle` is false the wrapper is a passthrough — children behave
 * normally (so a plain tap selects the tab).
 *
 * `onLongPress` is invoked after the user has held a finger / pointer on the
 * element for 5 seconds without significant movement — that's the trigger
 * that puts the parent into "edit mode" (caller flips `wiggle` to true).
 */
export const SortableTab = ({ id, wiggle, onLongPress, children }) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id, disabled: !wiggle });

  const longPressRef = useRef({ timer: null, startX: 0, startY: 0, fired: false });

  const clearTimer = () => {
    if (longPressRef.current.timer) {
      clearTimeout(longPressRef.current.timer);
      longPressRef.current.timer = null;
    }
  };

  // Don't run the long-press timer once we're already in wiggle mode
  useEffect(() => {
    if (wiggle) clearTimer();
  }, [wiggle]);

  const handlePointerDown = (e) => {
    if (wiggle) return; // already in edit mode
    longPressRef.current.fired = false;
    longPressRef.current.startX = e.clientX || (e.touches && e.touches[0]?.clientX) || 0;
    longPressRef.current.startY = e.clientY || (e.touches && e.touches[0]?.clientY) || 0;
    clearTimer();
    longPressRef.current.timer = setTimeout(() => {
      longPressRef.current.fired = true;
      onLongPress && onLongPress(id);
    }, 3000);
  };

  const handlePointerMove = (e) => {
    if (!longPressRef.current.timer) return;
    const x = e.clientX || (e.touches && e.touches[0]?.clientX) || 0;
    const y = e.clientY || (e.touches && e.touches[0]?.clientY) || 0;
    if (Math.abs(x - longPressRef.current.startX) > 8 || Math.abs(y - longPressRef.current.startY) > 8) {
      clearTimer();
    }
  };

  const handlePointerUp = () => clearTimer();
  const handlePointerCancel = () => clearTimer();

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    touchAction: wiggle ? 'none' : 'auto',
  };

  // In wiggle mode let dnd-kit own the pointer events; long-press logic is off.
  if (wiggle) {
    return (
      <div
        ref={setNodeRef}
        style={style}
        className={`mpump-wiggle ${isDragging ? 'is-dragging' : ''}`}
        {...attributes}
        {...listeners}
      >
        {children}
      </div>
    );
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerCancel={handlePointerCancel}
      onPointerLeave={handlePointerCancel}
      onContextMenu={(e) => e.preventDefault()}
    >
      {children}
    </div>
  );
};

// Default order — must match the data-testid values used in ZAPTRStyleCalculator's
// Balance section. Anything not listed here is appended at the end.
export const DEFAULT_BALANCE_TAB_ORDER = [
  'reports',
  'bank-settlement',
  'outstanding-settings',
  'report',
  'dsr',
  'credit-manage',
  'receipt-manage',
  'customer-manage',
  'backup',
  'cust-initial',
  'sales-report',
];

const STORAGE_KEY = 'mpump_balance_tab_order';

export const loadBalanceTabOrder = () => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [...DEFAULT_BALANCE_TAB_ORDER];
    const arr = JSON.parse(raw);
    if (!Array.isArray(arr)) return [...DEFAULT_BALANCE_TAB_ORDER];
    // Dedupe + ensure every default id is present (so newly added tabs survive an upgrade)
    const seen = new Set();
    const merged = [];
    arr.forEach(id => {
      if (typeof id === 'string' && !seen.has(id) && DEFAULT_BALANCE_TAB_ORDER.includes(id)) {
        seen.add(id);
        merged.push(id);
      }
    });
    DEFAULT_BALANCE_TAB_ORDER.forEach(id => {
      if (!seen.has(id)) merged.push(id);
    });
    return merged;
  } catch {
    return [...DEFAULT_BALANCE_TAB_ORDER];
  }
};

export const saveBalanceTabOrder = (order) => {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(order));
  } catch (e) {
    console.warn('Failed to save tab order', e);
  }
};
