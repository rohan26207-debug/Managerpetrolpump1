import React, { useState, useMemo } from 'react';
import { Card, CardContent } from './ui/card';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Button } from './ui/button';
import { Calendar, Plus, Trash2, FileText, FileSpreadsheet } from 'lucide-react';
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import 'jspdf-autotable';
import localStorageService from '../services/localStorage';
import { useToast } from '../hooks/use-toast';

/**
 * Cash Owner Tally
 * Tracks the daily balance of physical cash held by the pump owner.
 *
 *   IN  : daily settlement entries whose name starts with CASH (built-in or
 *         user-named "Cash Drawer" etc.) — these are the cash settled to owner.
 *   OUT : manual entries the user adds here (description + amount), e.g.
 *         "Bank deposit", "Diesel bill", etc.
 *
 * Displayed as a one-row-per-event ledger inside the chosen date range, with a
 * grand total = (IN − OUT). No opening / cumulative balance is shown.
 */
const CashOwnerTally = ({ isDarkMode, settlementData = [], selectedDate }) => {
  const { toast } = useToast();
  const [fromDate, setFromDate] = useState(selectedDate);
  const [toDate, setToDate] = useState(selectedDate);

  const [manualEntries, setManualEntries] = useState(() => localStorageService.getCashOwnerEntries());
  const refreshManual = () => setManualEntries(localStorageService.getCashOwnerEntries());

  // Add-entry form
  const [newDate, setNewDate] = useState(selectedDate);
  const [newDescription, setNewDescription] = useState('');
  const [newAmount, setNewAmount] = useState('');

  const isCashSettlement = (s) => {
    const lbl = (s.description || '').trim().toLowerCase();
    return lbl.startsWith('cash');
  };

  const handleAdd = () => {
    if (!newDate || !newDescription.trim() || !newAmount || parseFloat(newAmount) <= 0) {
      toast({ title: 'Missing data', description: 'Date, description and a positive amount are required', variant: 'destructive' });
      return;
    }
    localStorageService.addCashOwnerEntry({ date: newDate, description: newDescription.trim(), amount: parseFloat(newAmount) });
    refreshManual();
    setNewDescription('');
    setNewAmount('');
    toast({ title: 'Entry added' });
  };

  const handleDelete = (id) => {
    localStorageService.deleteCashOwnerEntry(id);
    refreshManual();
    toast({ title: 'Entry deleted' });
  };

  const rows = useMemo(() => {
    const out = [];
    settlementData.forEach((s) => {
      if (!s.date || s.date < fromDate || s.date > toDate) return;
      if (!isCashSettlement(s)) return;
      out.push({
        id: `s-${s.id}`,
        date: s.date,
        description: 'Cash settled (owner)',
        inAmt: s.amount || 0,
        outAmt: 0,
        kind: 'in',
      });
    });
    manualEntries.forEach((e) => {
      if (!e.date || e.date < fromDate || e.date > toDate) return;
      out.push({
        id: e.id,
        date: e.date,
        description: e.description || '—',
        inAmt: 0,
        outAmt: e.amount || 0,
        kind: 'manual',
      });
    });
    out.sort((a, b) => {
      if (a.date !== b.date) return a.date.localeCompare(b.date);
      // IN rows first per day, then OUT rows
      return a.kind === 'in' ? -1 : 1;
    });
    return out;
  }, [settlementData, manualEntries, fromDate, toDate]);

  const totalIn = rows.reduce((s, r) => s + r.inAmt, 0);
  const totalOut = rows.reduce((s, r) => s + r.outAmt, 0);
  const net = totalIn - totalOut;

  const fmt = (n) => (n && Math.abs(n) > 0.005 ? n.toFixed(2) : '-');

  // ---------------- PDF ----------------
  const handlePdf = () => {
    try {
      const doc = new jsPDF({ orientation: 'portrait' });
      let y = 14;
      doc.setFontSize(16);
      doc.text('Cash Owner Tally', doc.internal.pageSize.width / 2, y, { align: 'center' });
      y += 7;
      doc.setFontSize(10);
      doc.text(
        `${new Date(fromDate).toLocaleDateString('en-IN')} to ${new Date(toDate).toLocaleDateString('en-IN')}`,
        doc.internal.pageSize.width / 2, y, { align: 'center' }
      );
      y += 5;

      const head = [['#', 'Date', 'Description', 'In (₹)', 'Out (₹)']];
      const body = rows.map((r, i) => [
        i + 1,
        new Date(r.date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' }),
        r.description,
        fmt(r.inAmt),
        fmt(r.outAmt),
      ]);
      body.push(['', 'Total', '', totalIn.toFixed(2), totalOut.toFixed(2)]);
      body.push(['', '', 'Net Cash', net.toFixed(2), '']);

      doc.autoTable({
        startY: y,
        head, body,
        theme: 'grid',
        headStyles: { fillColor: [240, 240, 240], textColor: [0, 0, 0] },
        styles: { fontSize: 9 },
      });

      doc.setFontSize(8);
      doc.text(`Generated: ${new Date().toLocaleString('en-IN')}`, doc.internal.pageSize.width / 2, doc.internal.pageSize.height - 8, { align: 'center' });

      const fileName = `Cash_Tally_${fromDate}_to_${toDate}.pdf`;
      if (window.MPumpCalcAndroid && window.MPumpCalcAndroid.openPdfWithViewer) {
        window.MPumpCalcAndroid.openPdfWithViewer(doc.output('dataurlstring').split(',')[1], fileName);
      } else {
        doc.save(fileName);
      }
    } catch (err) {
      console.error('PDF error', err);
      toast({ title: 'PDF failed', description: err.message, variant: 'destructive' });
    }
  };

  // ---------------- Excel ----------------
  const handleExcel = () => {
    try {
      const data = [
        ['Cash Owner Tally'],
        [],
        [`Date Range: ${new Date(fromDate).toLocaleDateString('en-IN')} to ${new Date(toDate).toLocaleDateString('en-IN')}`],
        [],
        ['#', 'Date', 'Description', 'In (₹)', 'Out (₹)'],
        ...rows.map((r, i) => [
          i + 1,
          new Date(r.date).toLocaleDateString('en-IN'),
          r.description,
          fmt(r.inAmt),
          fmt(r.outAmt),
        ]),
        ['', 'Total', '', totalIn.toFixed(2), totalOut.toFixed(2)],
        ['', '', 'Net Cash', net.toFixed(2), ''],
      ];
      const wb = XLSX.utils.book_new();
      const ws = XLSX.utils.aoa_to_sheet(data);
      ws['!cols'] = [{ wch: 6 }, { wch: 14 }, { wch: 32 }, { wch: 12 }, { wch: 12 }];
      XLSX.utils.book_append_sheet(wb, ws, 'Cash Tally');
      const fileName = `Cash_Tally_${fromDate}_to_${toDate}.xlsx`;
      if (window.MPumpCalcAndroid && typeof window.MPumpCalcAndroid.saveFileToDownloads === 'function') {
        const base64 = XLSX.write(wb, { type: 'base64', bookType: 'xlsx' });
        window.MPumpCalcAndroid.saveFileToDownloads(base64, fileName, 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      } else {
        XLSX.writeFile(wb, fileName);
      }
    } catch (err) {
      console.error('Excel error', err);
      toast({ title: 'Excel failed', description: err.message, variant: 'destructive' });
    }
  };

  // ---------------- styles ----------------
  const thBase = `px-2 py-1 border text-xs font-bold ${isDarkMode ? 'border-gray-600 bg-gray-800 text-white' : 'border-slate-400 bg-slate-100 text-slate-800'}`;
  const tdBase = `px-2 py-1 border text-xs ${isDarkMode ? 'border-gray-600 text-gray-200' : 'border-slate-400 text-slate-800'}`;
  const totalCell = `px-2 py-1 border text-xs font-bold text-right font-mono ${isDarkMode ? 'border-gray-600 text-white' : 'border-slate-400 bg-slate-200 text-slate-900'}`;
  const rowZebra = (i) => i % 2 === 1 ? (isDarkMode ? 'bg-gray-800' : 'bg-slate-50') : (isDarkMode ? 'bg-gray-700' : 'bg-white');

  return (
    <Card className={`${isDarkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-slate-200'} shadow-lg`}>
      <CardContent className="p-2 sm:p-3 space-y-3">
        <h2 className={`text-lg sm:text-2xl font-bold ${isDarkMode ? 'text-white' : 'text-slate-800'}`}>
          Cash Owner Tally
        </h2>

        {/* Date range */}
        <div className="grid grid-cols-2 gap-2">
          <div>
            <Label className={`text-xs flex items-center gap-1 ${isDarkMode ? 'text-gray-300' : 'text-slate-700'}`}>
              <Calendar className="w-3 h-3" /> From Date
            </Label>
            <Input type="date" value={fromDate} onChange={(e) => setFromDate(e.target.value)} className={`text-xs ${isDarkMode ? 'bg-gray-700 border-gray-600 text-white' : ''}`} data-testid="cash-tally-from" />
          </div>
          <div>
            <Label className={`text-xs flex items-center gap-1 ${isDarkMode ? 'text-gray-300' : 'text-slate-700'}`}>
              <Calendar className="w-3 h-3" /> To Date
            </Label>
            <Input type="date" value={toDate} onChange={(e) => setToDate(e.target.value)} className={`text-xs ${isDarkMode ? 'bg-gray-700 border-gray-600 text-white' : ''}`} data-testid="cash-tally-to" />
          </div>
        </div>

        {/* Add manual minus entry */}
        <div className={`p-2 rounded border ${isDarkMode ? 'border-gray-600 bg-gray-700' : 'border-slate-300 bg-slate-50'}`}>
          <div className={`text-xs font-semibold mb-2 ${isDarkMode ? 'text-gray-200' : 'text-slate-700'}`}>
            Add Cash Out (Withdraw / Expense)
          </div>
          <div className="grid grid-cols-12 gap-2">
            <div className="col-span-4">
              <Input type="date" value={newDate} onChange={(e) => setNewDate(e.target.value)} className={`text-xs ${isDarkMode ? 'bg-gray-800 border-gray-600 text-white' : ''}`} data-testid="cash-tally-new-date" />
            </div>
            <div className="col-span-5">
              <Input
                type="text"
                placeholder="Description (e.g. Bank deposit, Diesel bill)"
                value={newDescription}
                onChange={(e) => setNewDescription(e.target.value)}
                className={`text-xs ${isDarkMode ? 'bg-gray-800 border-gray-600 text-white' : ''}`}
                data-testid="cash-tally-new-desc"
              />
            </div>
            <div className="col-span-3">
              <Input
                type="number"
                inputMode="decimal"
                placeholder="Amount"
                value={newAmount}
                onChange={(e) => setNewAmount(e.target.value)}
                className={`text-xs ${isDarkMode ? 'bg-gray-800 border-gray-600 text-white' : ''}`}
                data-testid="cash-tally-new-amt"
              />
            </div>
          </div>
          <Button
            onClick={handleAdd}
            className="mt-2 w-full bg-slate-700 hover:bg-slate-800 text-white text-xs"
            data-testid="cash-tally-add-btn"
          >
            <Plus className="w-3 h-3 mr-1" /> Add Entry
          </Button>
        </div>

        {/* Buttons */}
        <div className="grid grid-cols-2 gap-2">
          <Button onClick={handlePdf} variant="outline" className={`text-xs ${isDarkMode ? 'border-gray-500 text-gray-200 hover:bg-gray-700' : 'border-slate-400 text-slate-800 hover:bg-slate-100'}`} data-testid="cash-tally-pdf-btn">
            <FileText className="w-3 h-3 mr-1" /> PDF
          </Button>
          <Button onClick={handleExcel} variant="outline" className={`text-xs ${isDarkMode ? 'border-gray-500 text-gray-200 hover:bg-gray-700' : 'border-slate-400 text-slate-800 hover:bg-slate-100'}`} data-testid="cash-tally-excel-btn">
            <FileSpreadsheet className="w-3 h-3 mr-1" /> Excel
          </Button>
        </div>

        {/* Ledger table */}
        <div className="overflow-x-auto">
          <table className="w-full border-collapse">
            <thead>
              <tr>
                <th className={`${thBase} text-center`} style={{ width: '40px' }}>#</th>
                <th className={`${thBase} text-left`} style={{ width: '90px' }}>Date</th>
                <th className={`${thBase} text-left`}>Description</th>
                <th className={`${thBase} text-right`} style={{ width: '90px' }}>In (₹)</th>
                <th className={`${thBase} text-right`} style={{ width: '90px' }}>Out (₹)</th>
                <th className={`${thBase} text-center`} style={{ width: '40px' }}></th>
              </tr>
            </thead>
            <tbody>
              {rows.length === 0 ? (
                <tr>
                  <td colSpan={6} className={`${tdBase} text-center py-3`}>
                    No entries in this date range.
                  </td>
                </tr>
              ) : (
                <>
                  {rows.map((r, i) => (
                    <tr key={r.id} className={rowZebra(i)}>
                      <td className={`${tdBase} text-center font-mono`}>{i + 1}</td>
                      <td className={tdBase}>
                        {new Date(r.date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: '2-digit' })}
                      </td>
                      <td className={tdBase}>{r.description}</td>
                      <td className={`${tdBase} text-right font-mono`}>{fmt(r.inAmt)}</td>
                      <td className={`${tdBase} text-right font-mono`}>{fmt(r.outAmt)}</td>
                      <td className={`${tdBase} text-center`}>
                        {r.kind === 'manual' ? (
                          <button
                            type="button"
                            onClick={() => handleDelete(r.id)}
                            data-testid={`cash-tally-del-${r.id}`}
                            className={`p-1 rounded ${isDarkMode ? 'hover:bg-gray-600 text-gray-300' : 'hover:bg-gray-50 text-gray-600'}`}
                            title="Delete entry"
                          >
                            <Trash2 className="w-3 h-3" />
                          </button>
                        ) : null}
                      </td>
                    </tr>
                  ))}
                  <tr>
                    <td colSpan={3} className={`${totalCell} text-right`}>Total</td>
                    <td className={totalCell}>{totalIn.toFixed(2)}</td>
                    <td className={totalCell}>{totalOut.toFixed(2)}</td>
                    <td className={totalCell}></td>
                  </tr>
                  <tr>
                    <td colSpan={3} className={`${totalCell} text-right`}>Net Cash</td>
                    <td className={totalCell} colSpan={2}>{net.toFixed(2)}</td>
                    <td className={totalCell}></td>
                  </tr>
                </>
              )}
            </tbody>
          </table>
        </div>

        <div className={`text-xs p-2 rounded border ${isDarkMode ? 'border-gray-600 bg-gray-700 text-gray-300' : 'border-slate-300 bg-slate-50 text-slate-700'}`}>
          <strong className={isDarkMode ? 'text-white' : 'text-slate-800'}>Note:</strong>{' '}
          <em>In</em> rows come automatically from daily settlements where the type starts with "Cash".
          Use the form above to log each <em>Out</em> (bank deposit, expense, etc.).
        </div>
      </CardContent>
    </Card>
  );
};

export default CashOwnerTally;
