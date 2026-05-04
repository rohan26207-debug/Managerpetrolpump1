import React, { useState, useMemo } from 'react';
import { Card, CardContent } from './ui/card';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Button } from './ui/button';
import { Checkbox } from './ui/checkbox';
import { Calendar, FileText, FileSpreadsheet } from 'lucide-react';
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import 'jspdf-autotable';

/**
 * Bank Settlement
 * - Columns: # | Date | Cash in Hand | <dynamic settlement-type columns>
 * - Settlement-type columns are derived from actual data (description on settlements,
 *   settlementType/mode/paymentType on customer receipts). Columns whose name contains
 *   "cash" are placed first (priority), the rest alphabetical.
 * - Two filter checkboxes (default both checked):
 *      • Operating Daywise → include daily settlement entries
 *      • Customer Receipt  → include customer receipt entries
 *   Cash in Hand reacts to the same toggles.
 */
const BankSettlement = ({
  isDarkMode,
  settlementData = [],
  payments = [],
  creditData = [],
  salesData = [],
  incomeData = [],
  expenseData = [],
  selectedDate
}) => {
  const [fromDate, setFromDate] = useState(selectedDate);
  const [toDate, setToDate] = useState(selectedDate);
  const [includeDaywise, setIncludeDaywise] = useState(true);
  const [includeReceipts, setIncludeReceipts] = useState(true);

  // Build the date array for the selected range
  const dateArray = useMemo(() => {
    const arr = [];
    const startDate = new Date(fromDate);
    const endDate = new Date(toDate);
    if (Number.isNaN(startDate.getTime()) || Number.isNaN(endDate.getTime())) return arr;
    for (let d = new Date(startDate); d <= endDate; d.setDate(d.getDate() + 1)) {
      arr.push(new Date(d).toISOString().split('T')[0]);
    }
    return arr;
  }, [fromDate, toDate]);

  // Helpers to read settlement-type label from each record type
  const settlementLabel = (s) => (s.description || '').trim();
  const receiptLabel = (p) => (p.settlementType || p.mode || p.paymentType || '').trim();

  // Discover all unique settlement-type column keys present in the chosen window
  const EXCLUDED_KEYWORDS = ['neft', 'rtgs', 'cheque'];
  const isExcluded = (key) => EXCLUDED_KEYWORDS.some((kw) => key.includes(kw));

  const dynamicTypes = useMemo(() => {
    const map = new Map(); // key (lowercase) -> displayLabel (first-seen original casing)
    const dateSet = new Set(dateArray);

    if (includeDaywise) {
      settlementData.forEach((s) => {
        if (!dateSet.has(s.date)) return;
        const lbl = settlementLabel(s);
        if (!lbl) return;
        const key = lbl.toLowerCase();
        if (isExcluded(key)) return;
        if (!map.has(key)) map.set(key, lbl);
      });
    }
    if (includeReceipts) {
      payments.forEach((p) => {
        if (!dateSet.has(p.date)) return;
        const lbl = receiptLabel(p);
        if (!lbl) return;
        const key = lbl.toLowerCase();
        if (isExcluded(key)) return;
        if (!map.has(key)) map.set(key, lbl);
      });
    }

    // Convert to array and order: keys containing "cash" first (priority), rest alphabetical
    const all = Array.from(map.entries()).map(([key, label]) => ({ key, label }));
    const cashCols = all
      .filter((c) => c.key.includes('cash'))
      .sort((a, b) => a.label.localeCompare(b.label));
    const restCols = all
      .filter((c) => !c.key.includes('cash'))
      .sort((a, b) => a.label.localeCompare(b.label));
    return [...cashCols, ...restCols];
  }, [dateArray, settlementData, payments, includeDaywise, includeReceipts]);

  // Per-day rows: cashInHand + amounts for each dynamic column
  const rows = useMemo(() => {
    return dateArray.map((date, index) => {
      const daySettlements = settlementData.filter((s) => s.date === date);
      const dayPayments = payments.filter((p) => p.date === date);

      // Per-column sums
      const colSums = {};
      dynamicTypes.forEach(({ key }) => { colSums[key] = 0; });

      if (includeDaywise) {
        daySettlements.forEach((s) => {
          const lbl = settlementLabel(s);
          if (!lbl) return;
          const k = lbl.toLowerCase();
          if (k in colSums) colSums[k] += (s.amount || 0);
        });
      }
      if (includeReceipts) {
        dayPayments.forEach((p) => {
          const lbl = receiptLabel(p);
          if (!lbl) return;
          const k = lbl.toLowerCase();
          if (k in colSums) colSums[k] += (p.amount || 0);
        });
      }

      // Cash in Hand — mirrors the Summary formula on the Operating Date:
      //   CiH = totalFuelAmount − creditTotalAmount + otherIncome − totalExpenses
      //         − totalSettlement + cashReceipts
      // Income & expenses must include entries embedded inside credit records
      // (credit.incomeEntries / credit.expenseEntries); otherwise the figure
      // won't match the Summary on days with such records.
      const todayFuelAmount = salesData
        .filter((s) => s.date === date && (s.type === 'cash' || !s.type))
        .reduce((sum, s) => sum + (s.amount || 0), 0);

      const dayCredits = creditData.filter((c) => c.date === date);
      const todayCredit = dayCredits.reduce((sum, c) => sum + (c.amount || 0), 0);

      const directIncome = incomeData
        .filter((i) => i.date === date)
        .reduce((sum, i) => sum + (i.amount || 0), 0);
      const creditEmbeddedIncome = dayCredits.reduce((sum, c) => {
        if (c.incomeEntries && c.incomeEntries.length > 0) {
          return sum + c.incomeEntries.reduce((s2, e) => s2 + (e.amount || 0), 0);
        }
        return sum;
      }, 0);
      const todayIncome = directIncome + creditEmbeddedIncome;

      const directExpense = expenseData
        .filter((e) => e.date === date)
        .reduce((sum, e) => sum + (e.amount || 0), 0);
      const creditEmbeddedExpense = dayCredits.reduce((sum, c) => {
        if (c.expenseEntries && c.expenseEntries.length > 0) {
          return sum + c.expenseEntries.reduce((s2, e) => s2 + (e.amount || 0), 0);
        }
        return sum;
      }, 0);
      const todayExpense = directExpense + creditEmbeddedExpense;

      const todaySettlementTotal = daySettlements.reduce((sum, s) => sum + (s.amount || 0), 0);
      const todayCashReceipts = dayPayments
        .filter((p) => (p.paymentType || p.mode || p.settlementType || '').toLowerCase() === 'cash')
        .reduce((sum, p) => sum + (p.amount || 0), 0);

      const operatingCash =
        todayFuelAmount - todayCredit + todayIncome - todayExpense - todaySettlementTotal;

      let cashInHand = 0;
      if (includeDaywise && includeReceipts) cashInHand = operatingCash + todayCashReceipts;
      else if (includeDaywise) cashInHand = operatingCash;
      else if (includeReceipts) cashInHand = todayCashReceipts;

      return { srNo: index + 1, date, cashInHand, colSums };
    });
  }, [dateArray, dynamicTypes, settlementData, payments, salesData, creditData, incomeData, expenseData, includeDaywise, includeReceipts]);

  // Totals
  const totals = useMemo(() => {
    const out = { cashInHand: 0, cols: {} };
    dynamicTypes.forEach(({ key }) => { out.cols[key] = 0; });
    rows.forEach((r) => {
      out.cashInHand += r.cashInHand;
      dynamicTypes.forEach(({ key }) => { out.cols[key] += r.colSums[key] || 0; });
    });
    return out;
  }, [rows, dynamicTypes]);

  const fmt = (n) => (n && Math.abs(n) > 0.005 ? n.toFixed(2) : '-');

  // ---------------- Excel ----------------
  const handleExcelExport = () => {
    try {
      const headerRow = ['Sr. No', 'Date', 'Cash in Hand (₹)', ...dynamicTypes.map((c) => `${c.label} (₹)`)];
      const totalRow = [
        'Total', '',
        totals.cashInHand.toFixed(2),
        ...dynamicTypes.map((c) => totals.cols[c.key].toFixed(2))
      ];
      const excelData = [
        ['Bank Settlement Report'],
        [],
        [`Date Range: ${new Date(fromDate).toLocaleDateString('en-IN')} to ${new Date(toDate).toLocaleDateString('en-IN')}`],
        [`Filter: ${[includeDaywise && 'Operating Daywise', includeReceipts && 'Customer Receipt'].filter(Boolean).join(' + ') || '(none)'}`],
        [],
        headerRow,
        ...rows.map((r) => [
          r.srNo,
          new Date(r.date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }),
          fmt(r.cashInHand),
          ...dynamicTypes.map((c) => fmt(r.colSums[c.key]))
        ]),
        totalRow,
        [],
        [`Generated on: ${new Date().toLocaleString('en-IN')}`]
      ];

      const wb = XLSX.utils.book_new();
      const ws = XLSX.utils.aoa_to_sheet(excelData);
      ws['!cols'] = [
        { wch: 8 }, { wch: 14 }, { wch: 14 },
        ...dynamicTypes.map(() => ({ wch: 14 }))
      ];
      XLSX.utils.book_append_sheet(wb, ws, 'Bank Settlement');
      const filename = `Bank_Settlement_${fromDate}_to_${toDate}.xlsx`;

      // Native download in Android WebView, browser download otherwise
      if (window.MPumpCalcAndroid && typeof window.MPumpCalcAndroid.saveFileToDownloads === 'function') {
        const base64 = XLSX.write(wb, { type: 'base64', bookType: 'xlsx' });
        window.MPumpCalcAndroid.saveFileToDownloads(
          base64,
          filename,
          'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
        );
      } else {
        XLSX.writeFile(wb, filename);
      }
    } catch (error) {
      console.error('Excel export error:', error);
      alert('Error exporting to Excel: ' + error.message);
    }
  };

  // ---------------- Print / PDF ----------------
  const handlePrint = () => {
    try {
      // Always generate via jsPDF. In Android WebView, hand to native bridge so
      // the file is saved to Downloads and the viewer opens. On web, trigger a
      // direct browser download — same UX as the operating-date PDF button.
      const doc = generatePdfDoc();
      const fileName = `Bank_Settlement_${fromDate}_to_${toDate}.pdf`;

      if (window.MPumpCalcAndroid && typeof window.MPumpCalcAndroid.openPdfWithViewer === 'function') {
        const base64 = doc.output('dataurlstring').split(',')[1];
        window.MPumpCalcAndroid.openPdfWithViewer(base64, fileName);
      } else {
        doc.save(fileName);
      }
    } catch (error) {
      console.error('Print error:', error);
      alert('Error generating report: ' + error.message);
    }
  };

  // Build the jsPDF document (shared between Android & web flows)
  const generatePdfDoc = () => {
    const doc = new jsPDF({ orientation: 'landscape' });
    let yPos = 14;
    doc.setFontSize(16);
    doc.text('Bank Settlement Report', doc.internal.pageSize.width / 2, yPos, { align: 'center' });
    yPos += 7;
    doc.setFontSize(10);
    const dateStr = `${new Date(fromDate).toLocaleDateString('en-IN')} to ${new Date(toDate).toLocaleDateString('en-IN')}`;
    doc.text(dateStr, doc.internal.pageSize.width / 2, yPos, { align: 'center' });
    yPos += 5;
    const filterStr = `Filter: ${[includeDaywise && 'Operating Daywise', includeReceipts && 'Customer Receipt'].filter(Boolean).join(' + ') || '(none)'}`;
    doc.text(filterStr, doc.internal.pageSize.width / 2, yPos, { align: 'center' });
    yPos += 6;

    const head = [['#', 'Date', 'Cash in Hand', ...dynamicTypes.map(c => c.label)]];
    const body = rows.map(r => [
      r.srNo,
      new Date(r.date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' }),
      fmt(r.cashInHand),
      ...dynamicTypes.map(c => fmt(r.colSums[c.key]))
    ]);
    body.push(['Total', '', totals.cashInHand.toFixed(2), ...dynamicTypes.map(c => totals.cols[c.key].toFixed(2))]);

    doc.autoTable({
      startY: yPos,
      head, body,
      theme: 'grid',
      headStyles: { fillColor: [240, 240, 240], textColor: [0, 0, 0] },
      styles: { fontSize: 8 },
    });

    const footerY = doc.internal.pageSize.height - 8;
    doc.setFontSize(8);
    doc.text(`Generated on: ${new Date().toLocaleString('en-IN')}`, doc.internal.pageSize.width / 2, footerY, { align: 'center' });
    return doc;
  };

  // ---------------- UI ----------------
  const thBase = `px-2 py-1 border text-xs font-bold ${
    isDarkMode ? 'border-gray-600 bg-gray-800 text-white' : 'border-slate-400 bg-slate-100 text-slate-800'
  }`;
  const tdBase = `px-2 py-1 border text-xs ${
    isDarkMode ? 'border-gray-600 text-gray-200' : 'border-slate-400 text-slate-800'
  }`;
  const totalCellBase = `px-2 py-1 border text-xs font-bold text-right font-mono ${
    isDarkMode ? 'border-gray-600 text-white' : 'border-slate-400 text-slate-900'
  }`;

  const totalCols = 3 + dynamicTypes.length; // #, Date, Cash in Hand, ...types

  return (
    <Card className={`${isDarkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-slate-200'} shadow-lg`}>
      <CardContent className="p-2 sm:p-3 space-y-3">
        {/* Header */}
        <h2 className={`text-lg sm:text-2xl font-bold mb-2 ${
          isDarkMode ? 'text-white' : 'text-slate-800'
        }`}>
          Bank Settlement
        </h2>

        {/* Filter checkboxes */}
        <div className={`flex flex-wrap items-center gap-4 p-2 rounded border ${
          isDarkMode ? 'border-gray-600 bg-gray-700' : 'border-slate-300 bg-slate-50'
        }`}>
          <label className="flex items-center gap-2 cursor-pointer" data-testid="bs-filter-daywise-label">
            <Checkbox
              data-testid="bs-filter-daywise"
              checked={includeDaywise}
              onCheckedChange={(v) => setIncludeDaywise(Boolean(v))}
            />
            <span className={`text-xs sm:text-sm ${isDarkMode ? 'text-gray-200' : 'text-slate-800'}`}>
              Operating Daywise
            </span>
          </label>
          <label className="flex items-center gap-2 cursor-pointer" data-testid="bs-filter-receipts-label">
            <Checkbox
              data-testid="bs-filter-receipts"
              checked={includeReceipts}
              onCheckedChange={(v) => setIncludeReceipts(Boolean(v))}
            />
            <span className={`text-xs sm:text-sm ${isDarkMode ? 'text-gray-200' : 'text-slate-800'}`}>
              Customer Receipt
            </span>
          </label>
        </div>

        {/* Date Range Selector */}
        <div className="space-y-2">
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
                data-testid="bs-from-date"
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
                data-testid="bs-to-date"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <Button
              onClick={handlePrint}
              variant="outline"
              data-testid="bs-print-btn"
              className={`text-xs sm:text-sm ${
                isDarkMode
                  ? 'border-gray-500 text-gray-200 hover:bg-gray-700'
                  : 'border-slate-400 text-slate-800 hover:bg-slate-100'
              }`}
            >
              <FileText className="w-3 h-3 sm:w-4 sm:h-4 mr-1 sm:mr-2" />
              PDF
            </Button>
            <Button
              onClick={handleExcelExport}
              variant="outline"
              data-testid="bs-excel-btn"
              className={`text-xs sm:text-sm ${
                isDarkMode
                  ? 'border-gray-500 text-gray-200 hover:bg-gray-700'
                  : 'border-slate-400 text-slate-800 hover:bg-slate-100'
              }`}
            >
              <FileSpreadsheet className="w-3 h-3 sm:w-4 sm:h-4 mr-1 sm:mr-2" />
              Excel
            </Button>
          </div>
        </div>

        {/* Daily Breakdown Table */}
        <div className="overflow-x-auto">
          <table className="w-full border-collapse">
            <thead>
              <tr>
                <th className={`${thBase} text-left`} colSpan={totalCols}>
                  Daily Breakdown
                </th>
              </tr>
              <tr>
                <th className={`${thBase} text-center`}>#</th>
                <th className={`${thBase} text-left`}>Date</th>
                <th className={`${thBase} text-right`}>Cash in Hand</th>
                {dynamicTypes.map((c) => (
                  <th key={c.key} className={`${thBase} text-right`}>{c.label}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.length === 0 ? (
                <tr>
                  <td colSpan={totalCols} className={`px-2 py-4 border text-center text-xs ${
                    isDarkMode ? 'border-gray-600 text-gray-400' : 'border-slate-400 text-slate-500'
                  }`}>
                    No data available for selected date range
                  </td>
                </tr>
              ) : (
                rows.map((row, i) => (
                  <tr
                    key={row.date}
                    className={i % 2 === 1
                      ? (isDarkMode ? 'bg-gray-800' : 'bg-slate-50')
                      : (isDarkMode ? 'bg-gray-700' : 'bg-white')}
                  >
                    <td className={`${tdBase} text-center`}>{row.srNo}</td>
                    <td className={tdBase}>
                      {new Date(row.date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                    </td>
                    <td className={`${tdBase} text-right font-mono`}>{fmt(row.cashInHand)}</td>
                    {dynamicTypes.map((c) => (
                      <td key={c.key} className={`${tdBase} text-right font-mono`}>
                        {fmt(row.colSums[c.key])}
                      </td>
                    ))}
                  </tr>
                ))
              )}
              {rows.length > 0 && (
                <tr className={isDarkMode ? 'bg-gray-900' : 'bg-slate-200'}>
                  <td colSpan="2" className={`px-2 py-1 border text-xs font-bold ${
                    isDarkMode ? 'border-gray-600 text-white' : 'border-slate-400 text-slate-900'
                  }`}>Total</td>
                  <td className={totalCellBase}>{totals.cashInHand.toFixed(2)}</td>
                  {dynamicTypes.map((c) => (
                    <td key={c.key} className={totalCellBase}>{totals.cols[c.key].toFixed(2)}</td>
                  ))}
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Info Note */}
        <div className={`text-xs p-2 rounded border ${
          isDarkMode ? 'border-gray-600 bg-gray-700 text-gray-300' : 'border-slate-300 bg-slate-50 text-slate-700'
        }`}>
          <strong className={isDarkMode ? 'text-white' : 'text-slate-800'}>Note:</strong>{' '}
          Columns are built from the actual settlement-type names you enter. Use the checkboxes
          above to include daily settlements, customer receipts, or both.
        </div>
      </CardContent>
    </Card>
  );
};

export default BankSettlement;
