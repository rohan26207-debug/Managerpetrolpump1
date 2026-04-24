import React, { useEffect, useRef, useState } from 'react';
import { Input } from './ui/input';
import { Button } from './ui/button';
import { ScrollArea } from './ui/scroll-area';
import { X } from 'lucide-react';
import localStorageService from '../services/localStorage';

/**
 * Text input with inline autocomplete suggestions powered by local description
 * history. Used by every Income/Expense description field across the app so
 * users can re-pick a previously typed label (e.g. "Transport") instead of
 * retyping.
 *
 * Props:
 *   type:         "income" | "expense"  (which history bucket to use)
 *   value:        current input value
 *   onChange:     (next: string) => void
 *   placeholder:  placeholder text
 *   isDarkMode:   bool
 *   autoFocus:    bool
 *   className:    extra classes for the <Input>
 */
const DescriptionSuggestInput = ({
  type,
  value,
  onChange,
  placeholder,
  isDarkMode = false,
  autoFocus = false,
  className = '',
}) => {
  const [history, setHistory] = useState([]);
  const [open, setOpen] = useState(false);
  const wrapperRef = useRef(null);

  const loadHistory = () => {
    const fn = type === 'income'
      ? localStorageService.getIncomeDescHistory
      : localStorageService.getExpenseDescHistory;
    setHistory(fn.call(localStorageService) || []);
  };

  useEffect(() => {
    loadHistory();
  }, [type]);

  // Close on outside click
  useEffect(() => {
    const onMouseDown = (e) => {
      if (!wrapperRef.current) return;
      if (!wrapperRef.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener('mousedown', onMouseDown);
    return () => document.removeEventListener('mousedown', onMouseDown);
  }, []);

  // Filter by current typed value (case-insensitive)
  const q = (value || '').trim().toLowerCase();
  const filtered = q
    ? history.filter(h => h.toLowerCase().includes(q) && h.toLowerCase() !== q)
    : history;

  const handleDelete = (e, desc) => {
    e.stopPropagation();
    if (type === 'income') {
      localStorageService.deleteIncomeDescHistory(desc);
    } else {
      localStorageService.deleteExpenseDescHistory(desc);
    }
    loadHistory();
  };

  return (
    <div ref={wrapperRef} className="relative">
      <Input
        type="text"
        value={value}
        onChange={(e) => { onChange(e.target.value); setOpen(true); }}
        onFocus={() => setOpen(true)}
        placeholder={placeholder}
        autoFocus={autoFocus}
        autoComplete="off"
        data-testid={`desc-suggest-input-${type}`}
        className={`${className} ${isDarkMode ? 'bg-gray-700 border-gray-600 text-white' : ''}`}
      />

      {open && filtered.length > 0 && (
        <div
          className={`absolute left-0 right-0 top-full mt-1 z-50 rounded-md border shadow-lg ${
            isDarkMode ? 'bg-gray-700 border-gray-600' : 'bg-white border-gray-200'
          }`}
          data-testid={`desc-suggest-list-${type}`}
        >
          <div className={`text-xs font-medium p-2 border-b ${
            isDarkMode ? 'text-gray-400 border-gray-600' : 'text-gray-600 border-gray-200'
          }`}>
            Recent suggestions
          </div>
          <ScrollArea className="max-h-[200px]">
            <div className="p-1">
              {filtered.map((desc) => (
                <div
                  key={desc}
                  className={`flex items-center justify-between p-2 rounded cursor-pointer group hover:bg-gray-100 dark:hover:bg-gray-600 ${
                    isDarkMode ? 'text-white' : ''
                  }`}
                  onClick={() => {
                    onChange(desc);
                    setOpen(false);
                  }}
                  data-testid="desc-suggest-item"
                >
                  <span className="flex-1 text-sm">{desc}</span>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-6 w-6 p-0 opacity-0 group-hover:opacity-100 hover:bg-red-100 dark:hover:bg-red-900"
                    onClick={(e) => handleDelete(e, desc)}
                    aria-label={`Remove suggestion ${desc}`}
                  >
                    <X className="h-3 w-3 text-red-600 dark:text-red-400" />
                  </Button>
                </div>
              ))}
            </div>
          </ScrollArea>
        </div>
      )}
    </div>
  );
};

export default DescriptionSuggestInput;
