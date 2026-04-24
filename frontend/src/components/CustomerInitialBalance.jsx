import React, { useMemo, useState } from 'react';
import { Card, CardContent } from './ui/card';
import { Input } from './ui/input';
import { Search, Save } from 'lucide-react';
import { Button } from './ui/button';
import { useToast } from '../hooks/use-toast';
import localStorageService from '../services/localStorage';

/**
 * Customer Initial Balance editor.
 *
 * Lists every customer (alphabetical) with their `startingBalance` (the amount
 * outstanding on 1 April of the chosen financial year). Editing here updates
 * `customer.startingBalance` in localStorage, which is already consumed by
 * CustomerLedger.jsx and OutstandingPDFReport.jsx as the running balance
 * starting point.
 */
const CustomerInitialBalance = ({ isDarkMode, customers, onCustomerChanged }) => {
  const { toast } = useToast();
  const [search, setSearch] = useState('');
  const [drafts, setDrafts] = useState({}); // id -> string value being edited

  // Default FY is current FY (Apr 1 onward = current year, otherwise previous year)
  const today = new Date();
  const defaultFyStart = today.getMonth() >= 3 ? today.getFullYear() : today.getFullYear() - 1;
  const [fyStart, setFyStart] = useState(defaultFyStart);

  const filteredSorted = useMemo(() => {
    const q = search.trim().toLowerCase();
    return [...(customers || [])]
      .filter(c => !q || c.name.toLowerCase().includes(q))
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [customers, search]);

  const handleDraftChange = (id, value) => {
    setDrafts(prev => ({ ...prev, [id]: value }));
  };

  const handleSave = (customer) => {
    const raw = drafts[customer.id];
    if (raw === undefined) return;
    const trimmed = raw.trim() === '' ? '0' : raw.trim();
    const num = parseFloat(trimmed);
    if (Number.isNaN(num)) {
      toast({
        title: 'Invalid Amount',
        description: 'Please enter a valid number for the initial balance.',
        variant: 'destructive',
      });
      return;
    }
    try {
      localStorageService.updateCustomer(customer.id, num, customer.isMPP, customer.name);
      toast({
        title: 'Initial Balance Updated',
        description: `${customer.name}: ₹${num.toFixed(2)} on 1 April ${fyStart}`,
      });
      // Drop the draft so input resyncs from props
      setDrafts(prev => {
        const next = { ...prev };
        delete next[customer.id];
        return next;
      });
      if (onCustomerChanged) onCustomerChanged();
    } catch (err) {
      toast({
        title: 'Update Failed',
        description: err.message || 'Could not save initial balance.',
        variant: 'destructive',
      });
    }
  };

  // Shared B&W table styles (match other Balance-tab reports)
  const thBase = `px-2 py-1 border text-xs font-bold ${
    isDarkMode ? 'border-gray-600 bg-gray-800 text-white' : 'border-slate-400 bg-slate-100 text-slate-800'
  }`;
  const tdBase = `px-2 py-1 border text-xs align-middle ${
    isDarkMode ? 'border-gray-600 text-gray-200' : 'border-slate-400 text-slate-800'
  }`;
  const rowZebra = (i) =>
    i % 2 === 1
      ? (isDarkMode ? 'bg-gray-800' : 'bg-slate-50')
      : (isDarkMode ? 'bg-gray-700' : 'bg-white');

  return (
    <Card className={`${isDarkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-slate-200'} shadow-lg`}>
      <CardContent className="p-2 sm:p-3 space-y-3">
        <h2 className={`text-lg sm:text-2xl font-bold ${isDarkMode ? 'text-white' : 'text-slate-800'}`}>
          Customer Initial Balance
        </h2>
        <p className={`text-xs ${isDarkMode ? 'text-gray-300' : 'text-slate-600'}`}>
          Set each customer's outstanding balance as of <strong>1 April {fyStart}</strong>.
          This becomes the opening row in their ledger. Default is ₹0.00.
        </p>

        {/* Financial Year picker */}
        <div className="flex items-center gap-2">
          <label className={`text-xs ${isDarkMode ? 'text-gray-300' : 'text-slate-700'}`}>FY:</label>
          <select
            data-testid="cib-fy-select"
            value={fyStart}
            onChange={(e) => setFyStart(parseInt(e.target.value, 10))}
            className={`text-xs rounded border px-2 py-1 ${
              isDarkMode ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-slate-300'
            }`}
          >
            {Array.from({ length: 8 }).map((_, i) => {
              const yr = defaultFyStart - i;
              return (
                <option key={yr} value={yr}>
                  {yr} – {yr + 1}
                </option>
              );
            })}
          </select>
        </div>

        {/* Search */}
        <div className="relative">
          <Search className={`absolute left-2 top-1/2 -translate-y-1/2 w-4 h-4 ${
            isDarkMode ? 'text-gray-400' : 'text-slate-400'
          }`} />
          <Input
            data-testid="cib-search-input"
            placeholder="Search customer…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className={`pl-8 ${isDarkMode ? 'bg-gray-700 border-gray-600 text-white' : ''}`}
          />
        </div>

        {/* Table */}
        {filteredSorted.length === 0 ? (
          <div className={`text-center py-8 text-sm ${isDarkMode ? 'text-gray-400' : 'text-slate-500'}`}>
            {customers.length === 0
              ? 'No customers yet. Add customers from Balance → Customer Manage.'
              : 'No customers match your search.'}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full border-collapse">
              <thead>
                <tr>
                  <th className={`${thBase} text-left`} colSpan={4}>Customers (alphabetical)</th>
                </tr>
                <tr>
                  <th className={`${thBase} text-center`} style={{ width: '40px' }}>#</th>
                  <th className={`${thBase} text-left`}>Customer Name</th>
                  <th className={`${thBase} text-right`}>Amount on 1 April {fyStart} (₹)</th>
                  <th className={`${thBase} text-center`} style={{ width: '90px' }}>Action</th>
                </tr>
              </thead>
              <tbody>
                {filteredSorted.map((c, i) => {
                  const draft = drafts[c.id];
                  const current = c.startingBalance || 0;
                  const editingValue = draft !== undefined ? draft : current.toFixed(2);
                  const isDirty = draft !== undefined && parseFloat(draft || '0') !== current;
                  return (
                    <tr key={c.id} className={rowZebra(i)} data-testid={`cib-row-${c.id}`}>
                      <td className={`${tdBase} text-center font-mono`}>{i + 1}</td>
                      <td className={`${tdBase} font-medium`}>{c.name}</td>
                      <td className={`${tdBase} text-right`}>
                        <Input
                          type="number"
                          step="0.01"
                          inputMode="decimal"
                          data-testid={`cib-amount-input-${c.id}`}
                          value={editingValue}
                          onChange={(e) => handleDraftChange(c.id, e.target.value)}
                          className={`h-7 text-right font-mono text-xs ${
                            isDarkMode ? 'bg-gray-700 border-gray-600 text-white' : ''
                          }`}
                        />
                      </td>
                      <td className={`${tdBase} text-center`}>
                        <Button
                          size="sm"
                          variant={isDirty ? 'default' : 'outline'}
                          disabled={!isDirty}
                          onClick={() => handleSave(c)}
                          data-testid={`cib-save-btn-${c.id}`}
                          className={`h-7 ${isDirty ? 'bg-blue-600 hover:bg-blue-700 text-white' : (
                            isDarkMode ? 'border-gray-500 text-gray-200' : 'border-slate-400 text-slate-700'
                          )}`}
                        >
                          <Save className="w-3 h-3 mr-1" />
                          Save
                        </Button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default CustomerInitialBalance;
