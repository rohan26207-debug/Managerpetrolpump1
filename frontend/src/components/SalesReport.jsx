import React, { useMemo, useState } from 'react';
import { Card, CardContent } from './ui/card';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Button } from './ui/button';
import { Calendar, Printer, FileSpreadsheet } from 'lucide-react';
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import 'jspdf-autotable';
import { useToast } from '../hooks/use-toast';

/**
 * Sales Report (Balance → Sales tab).
 *
 * Data source: READING SALES only (creditData is intentionally excluded — the
 * user tracks credit volumes separately in Credit Manage).
 *
 * Columns:
 *   1. Date
 *   For every fuel type (3 columns each):
 *     a. Total Litre (non-MPP): liters sold + testing liters, for reading sales.
 *     b. Testing: sum of `testing` liters for non-MPP reading entries of that fuel.
 *     c. Net <fuel> Sales: Total - Testing = actual dispensed liters sold.
 *   Final MPP block (3 columns):
 *     a. MPP Total Sales (liters)
 *     b. MPP Test (liters)
 *     c. MPP Net Sales (liters)
 *
 * All numbers rendered to 2 decimal places. All values are in LITRES.
 */
const SalesReport = ({ salesData = [], fuelSettings = {}, isDarkMode }) => {
  const { toast } = useToast();
  const fuelTypes = useMemo(
    () => Object.keys(fuelSettings || {}).sort((a, b) => a.localeCompare(b)),
    [fuelSettings]
  );

  // Default From = 1st of current month, Till = today
  const today = new Date();
  const toStr = (d) => d.toISOString().split('T')[0];
  const [fromDate, setFromDate] = useState(() => toStr(new Date(today.getFullYear(), today.getMonth(), 1)));
  const [tillDate, setTillDate] = useState(() => toStr(today));

  const isMpp = (row) => row?.mpp === true || row?.mpp === 'true';

  const rows = useMemo(() => {
    // Collect unique dates in range from reading sales ONLY
    const dates = new Set();
    salesData.forEach(s => { if (s.date >= fromDate && s.date <= tillDate) dates.add(s.date); });
    const sortedDates = [...dates].sort();

    return sortedDates.map(date => {
      const perFuel = {};
      fuelTypes.forEach(f => { perFuel[f] = { total: 0, test: 0, net: 0 }; });
      let mppTotal = 0, mppTest = 0, mppNet = 0;

      // Reading sales only. `s.liters` is NET of testing. Gross = liters + testing.
      salesData
        .filter(s => s.date === date)
        .forEach(s => {
          const fuel = s.fuelType;
          const netLiters = parseFloat(s.liters) || 0;
          const testing = parseFloat(s.testing) || 0;
          if (isMpp(s)) {
            mppTotal += netLiters + testing;
            mppTest += testing;
            mppNet += netLiters;
          } else if (perFuel[fuel]) {
            perFuel[fuel].total += netLiters + testing;
            perFuel[fuel].test += testing;
            perFuel[fuel].net += netLiters;
          }
        });

      return { date, perFuel, mppTotal, mppTest, mppNet };
    });
  }, [salesData, fuelTypes, fromDate, tillDate]);

  const totals = useMemo(() => {
    const t = { perFuel: {}, mppTotal: 0, mppTest: 0, mppNet: 0 };
    fuelTypes.forEach(f => { t.perFuel[f] = { total: 0, test: 0, net: 0 }; });
    rows.forEach(r => {
      fuelTypes.forEach(f => {
        t.perFuel[f].total += r.perFuel[f].total;
        t.perFuel[f].test += r.perFuel[f].test;
        t.perFuel[f].net += r.perFuel[f].net;
      });
      t.mppTotal += r.mppTotal;
      t.mppTest += r.mppTest;
      t.mppNet += r.mppNet;
    });
    return t;
  }, [rows, fuelTypes]);

  // Shared B&W cell styles (match Bank Settlement)
  const thGroup = `px-1 py-1 border text-xs font-bold text-center ${
    isDarkMode ? 'border-gray-600 bg-gray-900 text-white' : 'border-slate-400 bg-slate-200 text-slate-900'
  }`;
  const thSub = `px-1 py-1 border text-[10px] sm:text-xs font-bold ${
    isDarkMode ? 'border-gray-600 bg-gray-800 text-white' : 'border-slate-400 bg-slate-100 text-slate-800'
  }`;
  const tdBase = `px-1 py-1 border text-[10px] sm:text-xs ${
    isDarkMode ? 'border-gray-600 text-gray-200' : 'border-slate-400 text-slate-800'
  }`;
  const rowZebra = (i) => i % 2 === 1
    ? (isDarkMode ? 'bg-gray-800' : 'bg-slate-50')
    : (isDarkMode ? 'bg-gray-700' : 'bg-white');
  const totalRowCls = isDarkMode ? 'bg-gray-900' : 'bg-slate-200';
  const totalCellCls = `px-1 py-1 border text-[10px] sm:text-xs font-bold ${
    isDarkMode ? 'border-gray-600 text-white' : 'border-slate-400 text-slate-900'
  }`;

  const fmt = (n) => (n || 0).toFixed(2);

  // ---------------- PDF ----------------
  const handlePdf = () => {
    try {
      const doc = new jsPDF({ orientation: 'landscape' });
      let y = 14;
      doc.setFontSize(16);
      doc.text('Sales Report', doc.internal.pageSize.width / 2, y, { align: 'center' });
      y += 7;
      doc.setFontSize(10);
      doc.text(
        `${new Date(fromDate).toLocaleDateString('en-IN')} to ${new Date(tillDate).toLocaleDateString('en-IN')}`,
        doc.internal.pageSize.width / 2, y, { align: 'center' }
      );
      y += 5;

      const head1 = ['Date'];
      fuelTypes.forEach(f => { head1.push(f, '', ''); });
      head1.push('MPP', '', '');
      const head2 = [''];
      fuelTypes.forEach(() => { head2.push('Total', 'Test', 'Net'); });
      head2.push('Total', 'Test', 'Net');

      const body = rows.map(r => {
        const arr = [new Date(r.date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })];
        fuelTypes.forEach(f => {
          arr.push(fmt(r.perFuel[f].total), fmt(r.perFuel[f].test), fmt(r.perFuel[f].net));
        });
        arr.push(fmt(r.mppTotal), fmt(r.mppTest), fmt(r.mppNet));
        return arr;
      });
      const totalArr = ['Total'];
      fuelTypes.forEach(f => {
        totalArr.push(fmt(totals.perFuel[f].total), fmt(totals.perFuel[f].test), fmt(totals.perFuel[f].net));
      });
      totalArr.push(fmt(totals.mppTotal), fmt(totals.mppTest), fmt(totals.mppNet));
      body.push(totalArr);

      doc.autoTable({
        startY: y,
        head: [head1, head2],
        body,
        theme: 'grid',
        headStyles: { fillColor: [240, 240, 240], textColor: [0, 0, 0] },
        styles: { fontSize: 7 },
      });

      doc.setFontSize(8);
      doc.text(`Generated: ${new Date().toLocaleString('en-IN')}`, doc.internal.pageSize.width / 2, doc.internal.pageSize.height - 8, { align: 'center' });

      const fileName = `Sales_Report_${fromDate}_to_${tillDate}.pdf`;
      if (window.MPumpCalcAndroid && typeof window.MPumpCalcAndroid.openPdfWithViewer === 'function') {
        const base64 = doc.output('dataurlstring').split(',')[1];
        window.MPumpCalcAndroid.openPdfWithViewer(base64, fileName);
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
      const header1 = ['Date'];
      fuelTypes.forEach(f => { header1.push(f, '', ''); });
      header1.push('MPP', '', '');
      const header2 = [''];
      fuelTypes.forEach(() => { header2.push('Total (L)', 'Test (L)', 'Net (L)'); });
      header2.push('Total (L)', 'Test (L)', 'Net (L)');

      const data = [
        ['Sales Report'],
        [],
        [`Date Range: ${new Date(fromDate).toLocaleDateString('en-IN')} to ${new Date(tillDate).toLocaleDateString('en-IN')}`],
        [],
        header1,
        header2,
        ...rows.map(r => {
          const arr = [new Date(r.date).toLocaleDateString('en-IN')];
          fuelTypes.forEach(f => {
            arr.push(fmt(r.perFuel[f].total), fmt(r.perFuel[f].test), fmt(r.perFuel[f].net));
          });
          arr.push(fmt(r.mppTotal), fmt(r.mppTest), fmt(r.mppNet));
          return arr;
        }),
        (() => {
          const t = ['Total'];
          fuelTypes.forEach(f => {
            t.push(fmt(totals.perFuel[f].total), fmt(totals.perFuel[f].test), fmt(totals.perFuel[f].net));
          });
          t.push(fmt(totals.mppTotal), fmt(totals.mppTest), fmt(totals.mppNet));
          return t;
        })(),
      ];

      const wb = XLSX.utils.book_new();
      const ws = XLSX.utils.aoa_to_sheet(data);
      XLSX.utils.book_append_sheet(wb, ws, 'Sales');
      const fileName = `Sales_Report_${fromDate}_to_${tillDate}.xlsx`;
      if (window.MPumpCalcAndroid && typeof window.MPumpCalcAndroid.saveFileToDownloads === 'function') {
        const base64 = XLSX.write(wb, { type: 'base64', bookType: 'xlsx' });
        window.MPumpCalcAndroid.saveFileToDownloads(
          base64, fileName,
          'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
        );
      } else {
        XLSX.writeFile(wb, fileName);
      }
    } catch (err) {
      console.error('Excel error', err);
      toast({ title: 'Excel failed', description: err.message, variant: 'destructive' });
    }
  };

  return (
    <Card className={`${isDarkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-slate-200'} shadow-lg`}>
      <CardContent className="p-2 sm:p-3 space-y-2">
        <h2 className={`text-lg sm:text-2xl font-bold ${isDarkMode ? 'text-white' : 'text-slate-800'}`}>
          Sales
        </h2>

        {/* Date Range (compact, matches Bank Settlement sizing) */}
        <div className="grid grid-cols-2 gap-2">
          <div className="space-y-1">
            <Label className={`text-xs sm:text-sm font-medium flex items-center gap-1 ${isDarkMode ? 'text-gray-300' : 'text-slate-700'}`}>
              <Calendar className="w-3 h-3" />
              From Date
            </Label>
            <Input
              type="date"
              data-testid="sales-from-date"
              value={fromDate}
              onChange={(e) => setFromDate(e.target.value)}
              className={`text-xs sm:text-sm ${isDarkMode ? 'bg-gray-700 border-gray-600 text-white' : ''}`}
            />
          </div>
          <div className="space-y-1">
            <Label className={`text-xs sm:text-sm font-medium flex items-center gap-1 ${isDarkMode ? 'text-gray-300' : 'text-slate-700'}`}>
              <Calendar className="w-3 h-3" />
              Till Date
            </Label>
            <Input
              type="date"
              data-testid="sales-till-date"
              value={tillDate}
              onChange={(e) => setTillDate(e.target.value)}
              className={`text-xs sm:text-sm ${isDarkMode ? 'bg-gray-700 border-gray-600 text-white' : ''}`}
            />
          </div>
        </div>

        {/* Single-line caption */}
        <p className={`text-xs sm:text-sm font-medium ${isDarkMode ? 'text-gray-200' : 'text-slate-800'}`}>
          Sales From {new Date(fromDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })} to {new Date(tillDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
        </p>

        {/* PDF + Excel buttons */}
        <div className="grid grid-cols-2 gap-2">
          <Button
            onClick={handlePdf}
            variant="outline"
            data-testid="sales-report-pdf-btn"
            className={`text-xs sm:text-sm ${isDarkMode ? 'border-gray-500 text-gray-200 hover:bg-gray-700' : 'border-slate-400 text-slate-800 hover:bg-slate-100'}`}
          >
            <Printer className="w-3 h-3 sm:w-4 sm:h-4 mr-1 sm:mr-2" />
            PDF
          </Button>
          <Button
            onClick={handleExcel}
            variant="outline"
            data-testid="sales-report-excel-btn"
            className={`text-xs sm:text-sm ${isDarkMode ? 'border-gray-500 text-gray-200 hover:bg-gray-700' : 'border-slate-400 text-slate-800 hover:bg-slate-100'}`}
          >
            <FileSpreadsheet className="w-3 h-3 sm:w-4 sm:h-4 mr-1 sm:mr-2" />
            Excel
          </Button>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full border-collapse" data-testid="sales-report-table">
            <thead>
              <tr>
                <th rowSpan={2} className={`${thGroup} align-middle`}>Date</th>
                {fuelTypes.map(f => (
                  <th key={`group-${f}`} colSpan={3} className={thGroup}>{f}</th>
                ))}
                <th colSpan={3} className={thGroup}>MPP</th>
              </tr>
              <tr>
                {fuelTypes.map(f => (
                  <React.Fragment key={`sub-${f}`}>
                    <th className={`${thSub} text-right`}>Total Litre</th>
                    <th className={`${thSub} text-right`}>Testing</th>
                    <th className={`${thSub} text-right`}>Net {f} Sales</th>
                  </React.Fragment>
                ))}
                <th className={`${thSub} text-right`}>MPP Total</th>
                <th className={`${thSub} text-right`}>MPP Test</th>
                <th className={`${thSub} text-right`}>MPP Net</th>
              </tr>
            </thead>
            <tbody>
              {rows.length === 0 ? (
                <tr>
                  <td
                    colSpan={1 + fuelTypes.length * 3 + 3}
                    className={`px-2 py-4 border text-center text-xs ${
                      isDarkMode ? 'border-gray-600 text-gray-400' : 'border-slate-400 text-slate-500'
                    }`}
                  >
                    No sales data in selected date range
                  </td>
                </tr>
              ) : (
                rows.map((r, i) => (
                  <tr key={r.date} className={rowZebra(i)}>
                    <td className={tdBase}>
                      {new Date(r.date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: '2-digit' })}
                    </td>
                    {fuelTypes.map(f => (
                      <React.Fragment key={`row-${r.date}-${f}`}>
                        <td className={`${tdBase} text-right font-mono`}>{fmt(r.perFuel[f].total)}</td>
                        <td className={`${tdBase} text-right font-mono`}>{fmt(r.perFuel[f].test)}</td>
                        <td className={`${tdBase} text-right font-mono`}>{fmt(r.perFuel[f].net)}</td>
                      </React.Fragment>
                    ))}
                    <td className={`${tdBase} text-right font-mono`}>{fmt(r.mppTotal)}</td>
                    <td className={`${tdBase} text-right font-mono`}>{fmt(r.mppTest)}</td>
                    <td className={`${tdBase} text-right font-mono`}>{fmt(r.mppNet)}</td>
                  </tr>
                ))
              )}
              {rows.length > 0 && (
                <tr className={totalRowCls}>
                  <td className={totalCellCls}>Total</td>
                  {fuelTypes.map(f => (
                    <React.Fragment key={`total-${f}`}>
                      <td className={`${totalCellCls} text-right font-mono`}>{fmt(totals.perFuel[f].total)}</td>
                      <td className={`${totalCellCls} text-right font-mono`}>{fmt(totals.perFuel[f].test)}</td>
                      <td className={`${totalCellCls} text-right font-mono`}>{fmt(totals.perFuel[f].net)}</td>
                    </React.Fragment>
                  ))}
                  <td className={`${totalCellCls} text-right font-mono`}>{fmt(totals.mppTotal)}</td>
                  <td className={`${totalCellCls} text-right font-mono`}>{fmt(totals.mppTest)}</td>
                  <td className={`${totalCellCls} text-right font-mono`}>{fmt(totals.mppNet)}</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <div className={`text-xs p-2 rounded border ${
          isDarkMode ? 'border-gray-600 bg-gray-700 text-gray-300' : 'border-slate-300 bg-slate-50 text-slate-700'
        }`}>
          <strong className={isDarkMode ? 'text-white' : 'text-slate-800'}>Note:</strong> Values are in litres. Data comes from Reading Sales only (credit sales are tracked separately in Credit Manage). "Total Litre" for each fuel includes testing liters; "Net" excludes testing. MPP columns show MPP-tagged sales separately.
        </div>
      </CardContent>
    </Card>
  );
};

export default SalesReport;
