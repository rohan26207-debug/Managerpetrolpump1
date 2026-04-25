import React, { useState, useMemo } from 'react';
import { Card, CardContent } from './ui/card';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Calendar } from 'lucide-react';

/**
 * Customer Receipt Unseen
 * Shows customer-wise + day-wise breakdown of customer receipts (payments) for a
 * chosen settlement type, excluding NEFT/RTGS/Cheque (those are settled separately
 * to the bank and not part of the unseen pool).
 *
 * "Unseen" because daywise card/paytm totals already include direct sales receipts;
 * customer receipts are layered on top and not separately bank-settled — this view
 * segregates them.
 */
const EXCLUDED_KEYWORDS = ['neft', 'rtgs', 'cheque'];

const labelOf = (p) => (p.settlementType || p.mode || p.paymentType || '').trim();

const CustomerReceiptUnseen = ({ isDarkMode, payments = [], selectedDate }) => {
  const [fromDate, setFromDate] = useState(selectedDate);
  const [toDate, setToDate] = useState(selectedDate);
  const [typeKey, setTypeKey] = useState('__all__');

  // Available settlement types (from current payment data, excluding NEFT/RTGS/Cheque)
  const availableTypes = useMemo(() => {
    const map = new Map(); // lowercase key -> first-seen original label
    payments.forEach((p) => {
      const lbl = labelOf(p);
      if (!lbl) return;
      const key = lbl.toLowerCase();
      if (EXCLUDED_KEYWORDS.some((kw) => key.includes(kw))) return;
      if (!map.has(key)) map.set(key, lbl);
    });
    return Array.from(map.entries())
      .map(([key, label]) => ({ key, label }))
      .sort((a, b) => a.label.localeCompare(b.label));
  }, [payments]);

  // Filtered payments by date range and settlement type
  const filtered = useMemo(() => {
    return payments.filter((p) => {
      if (!p.date || p.date < fromDate || p.date > toDate) return false;
      const lbl = labelOf(p);
      if (!lbl) return false;
      const key = lbl.toLowerCase();
      if (EXCLUDED_KEYWORDS.some((kw) => key.includes(kw))) return false;
      if (typeKey !== '__all__' && key !== typeKey) return false;
      return true;
    });
  }, [payments, fromDate, toDate, typeKey]);

  // Customer-wise totals
  const customerTotals = useMemo(() => {
    const map = new Map(); // customerId -> { name, total }
    filtered.forEach((p) => {
      const id = p.customerId || p.customerName || 'unknown';
      const cur = map.get(id) || { name: p.customerName || 'Unknown', total: 0 };
      cur.total += p.amount || 0;
      map.set(id, cur);
    });
    return Array.from(map.values()).sort((a, b) => b.total - a.total);
  }, [filtered]);

  // Daywise totals
  const daywiseTotals = useMemo(() => {
    const map = new Map(); // date -> total
    filtered.forEach((p) => {
      map.set(p.date, (map.get(p.date) || 0) + (p.amount || 0));
    });
    return Array.from(map.entries())
      .map(([date, total]) => ({ date, total }))
      .sort((a, b) => a.date.localeCompare(b.date));
  }, [filtered]);

  const grandTotal = filtered.reduce((sum, p) => sum + (p.amount || 0), 0);

  // Shared B&W styles
  const thBase = `px-2 py-1 border text-xs font-bold ${
    isDarkMode ? 'border-gray-600 bg-gray-800 text-white' : 'border-slate-400 bg-slate-100 text-slate-800'
  }`;
  const tdBase = `px-2 py-1 border text-xs ${
    isDarkMode ? 'border-gray-600 text-gray-200' : 'border-slate-400 text-slate-800'
  }`;
  const totalCellBase = `px-2 py-1 border text-xs font-bold text-right font-mono ${
    isDarkMode ? 'border-gray-600 text-white' : 'border-slate-400 bg-slate-200 text-slate-900'
  }`;
  const rowZebra = (i) =>
    i % 2 === 1
      ? (isDarkMode ? 'bg-gray-800' : 'bg-slate-50')
      : (isDarkMode ? 'bg-gray-700' : 'bg-white');

  const fmt = (n) => (n && Math.abs(n) > 0.005 ? n.toFixed(2) : '-');

  return (
    <Card className={`${isDarkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-slate-200'} shadow-lg`}>
      <CardContent className="p-2 sm:p-3 space-y-3">
        <h2 className={`text-lg sm:text-2xl font-bold ${isDarkMode ? 'text-white' : 'text-slate-800'}`}>
          Customer Receipt Unseen
        </h2>
        <p className={`text-xs ${isDarkMode ? 'text-gray-300' : 'text-slate-600'}`}>
          Segregates customer receipts that share a settlement type with daily sales
          (e.g. Card/Paytm/PhonePe). Excludes NEFT, RTGS &amp; Cheque (separately bank-settled).
        </p>

        {/* Filters */}
        <div className="space-y-2">
          <div>
            <Label className={`text-xs sm:text-sm font-medium ${isDarkMode ? 'text-gray-300' : 'text-slate-700'}`}>
              Settlement Type
            </Label>
            <select
              data-testid="cru-type-select"
              value={typeKey}
              onChange={(e) => setTypeKey(e.target.value)}
              className={`w-full text-xs sm:text-sm rounded border px-2 py-2 mt-1 ${
                isDarkMode ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-slate-300'
              }`}
            >
              <option value="__all__">All (excl. NEFT / RTGS / Cheque)</option>
              {availableTypes.map((t) => (
                <option key={t.key} value={t.key}>{t.label}</option>
              ))}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div className="space-y-1">
              <Label className={`text-xs sm:text-sm font-medium flex items-center gap-1 ${isDarkMode ? 'text-gray-300' : 'text-slate-700'}`}>
                <Calendar className="w-3 h-3" />
                From Date
              </Label>
              <Input
                type="date"
                value={fromDate}
                onChange={(e) => setFromDate(e.target.value)}
                className={`text-xs sm:text-sm ${isDarkMode ? 'bg-gray-700 border-gray-600 text-white' : ''}`}
                data-testid="cru-from-date"
              />
            </div>
            <div className="space-y-1">
              <Label className={`text-xs sm:text-sm font-medium flex items-center gap-1 ${isDarkMode ? 'text-gray-300' : 'text-slate-700'}`}>
                <Calendar className="w-3 h-3" />
                To Date
              </Label>
              <Input
                type="date"
                value={toDate}
                onChange={(e) => setToDate(e.target.value)}
                className={`text-xs sm:text-sm ${isDarkMode ? 'bg-gray-700 border-gray-600 text-white' : ''}`}
                data-testid="cru-to-date"
              />
            </div>
          </div>
        </div>

        {/* Grand Total banner */}
        <div className={`p-2 rounded border text-center ${
          isDarkMode ? 'border-gray-600 bg-gray-700 text-white' : 'border-slate-400 bg-slate-100 text-slate-900'
        }`}>
          <span className="text-xs sm:text-sm font-medium">Total:</span>{' '}
          <span className="text-base sm:text-lg font-bold font-mono" data-testid="cru-grand-total">
            ₹{grandTotal.toFixed(2)}
          </span>
        </div>

        {/* Customer-wise table */}
        <div className="overflow-x-auto">
          <table className="w-full border-collapse">
            <thead>
              <tr><th className={`${thBase} text-left`} colSpan={3}>Customer-wise</th></tr>
              <tr>
                <th className={`${thBase} text-center`} style={{ width: '40px' }}>#</th>
                <th className={`${thBase} text-left`}>Customer</th>
                <th className={`${thBase} text-right`} style={{ width: '120px' }}>Amount (₹)</th>
              </tr>
            </thead>
            <tbody>
              {customerTotals.length === 0 ? (
                <tr>
                  <td colSpan={3} className={`${tdBase} text-center py-3`}>
                    No customer receipts in selected range.
                  </td>
                </tr>
              ) : (
                <>
                  {customerTotals.map((c, i) => (
                    <tr key={c.name + i} className={rowZebra(i)}>
                      <td className={`${tdBase} text-center font-mono`}>{i + 1}</td>
                      <td className={`${tdBase} font-medium`}>{c.name}</td>
                      <td className={`${tdBase} text-right font-mono`}>{fmt(c.total)}</td>
                    </tr>
                  ))}
                  <tr>
                    <td colSpan={2} className={`${totalCellBase} text-right`}>Total</td>
                    <td className={totalCellBase}>{grandTotal.toFixed(2)}</td>
                  </tr>
                </>
              )}
            </tbody>
          </table>
        </div>

        {/* Daywise table */}
        <div className="overflow-x-auto">
          <table className="w-full border-collapse">
            <thead>
              <tr><th className={`${thBase} text-left`} colSpan={3}>Day-wise</th></tr>
              <tr>
                <th className={`${thBase} text-center`} style={{ width: '40px' }}>#</th>
                <th className={`${thBase} text-left`}>Date</th>
                <th className={`${thBase} text-right`} style={{ width: '120px' }}>Amount (₹)</th>
              </tr>
            </thead>
            <tbody>
              {daywiseTotals.length === 0 ? (
                <tr>
                  <td colSpan={3} className={`${tdBase} text-center py-3`}>
                    No data in selected range.
                  </td>
                </tr>
              ) : (
                <>
                  {daywiseTotals.map((d, i) => (
                    <tr key={d.date} className={rowZebra(i)}>
                      <td className={`${tdBase} text-center font-mono`}>{i + 1}</td>
                      <td className={tdBase}>
                        {new Date(d.date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                      </td>
                      <td className={`${tdBase} text-right font-mono`}>{fmt(d.total)}</td>
                    </tr>
                  ))}
                  <tr>
                    <td colSpan={2} className={`${totalCellBase} text-right`}>Total</td>
                    <td className={totalCellBase}>{grandTotal.toFixed(2)}</td>
                  </tr>
                </>
              )}
            </tbody>
          </table>
        </div>

        {/* All Receipts detail */}
        <div className="overflow-x-auto">
          <table className="w-full border-collapse">
            <thead>
              <tr><th className={`${thBase} text-left`} colSpan={5}>All Receipts</th></tr>
              <tr>
                <th className={`${thBase} text-center`} style={{ width: '40px' }}>#</th>
                <th className={`${thBase} text-left`}>Date</th>
                <th className={`${thBase} text-left`}>Customer</th>
                <th className={`${thBase} text-left`}>Type</th>
                <th className={`${thBase} text-right`} style={{ width: '120px' }}>Amount (₹)</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={5} className={`${tdBase} text-center py-3`}>
                    No receipts match the filters.
                  </td>
                </tr>
              ) : (
                filtered
                  .slice()
                  .sort((a, b) => a.date.localeCompare(b.date))
                  .map((p, i) => (
                    <tr key={p.id || i} className={rowZebra(i)}>
                      <td className={`${tdBase} text-center font-mono`}>{i + 1}</td>
                      <td className={tdBase}>
                        {new Date(p.date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                      </td>
                      <td className={tdBase}>{p.customerName || 'Unknown'}</td>
                      <td className={tdBase}>{labelOf(p)}</td>
                      <td className={`${tdBase} text-right font-mono`}>{fmt(p.amount)}</td>
                    </tr>
                  ))
              )}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );
};

export default CustomerReceiptUnseen;
