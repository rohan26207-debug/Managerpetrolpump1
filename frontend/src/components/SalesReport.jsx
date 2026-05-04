import React, { useMemo, useState } from 'react';
import { Card, CardContent } from './ui/card';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Calendar } from 'lucide-react';

/**
 * Sales Report (Balance → Sales tab).
 *
 * Columns:
 *   1. Date
 *   For every fuel type (3 columns each):
 *     a. Total Litre (non-MPP): liters sold + testing liters, for reading sales
 *        AND credit liters of that fuel (all rows that are NOT MPP-tagged).
 *     b. Testing: sum of `testing` liters for non-MPP reading entries of that fuel.
 *     c. Net <fuel> Sales: Total - Testing = actual dispensed liters sold.
 *   Final MPP block (3 columns):
 *     a. MPP Total Sales (liters)
 *     b. MPP Test (liters)
 *     c. MPP Net Sales (liters)
 *
 * All numbers rendered to 2 decimal places. All values are in LITRES.
 */
const SalesReport = ({ salesData = [], creditData = [], fuelSettings = {}, isDarkMode }) => {
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
    // Collect unique dates in range
    const dates = new Set();
    salesData.forEach(s => { if (s.date >= fromDate && s.date <= tillDate) dates.add(s.date); });
    creditData.forEach(c => { if (c.date >= fromDate && c.date <= tillDate) dates.add(c.date); });
    const sortedDates = [...dates].sort();

    return sortedDates.map(date => {
      const perFuel = {};
      fuelTypes.forEach(f => { perFuel[f] = { total: 0, test: 0, net: 0 }; });
      let mppTotal = 0, mppTest = 0, mppNet = 0;

      // Reading sales: `s.liters` is GROSS (end - start), includes testing.
      //   total = gross litres dispensed
      //   test  = testing litres
      //   net   = gross - testing (actually sold to customers)
      salesData
        .filter(s => s.date === date)
        .forEach(s => {
          const fuel = s.fuelType;
          const grossLiters = parseFloat(s.liters) || 0;
          const testing = parseFloat(s.testing) || 0;
          const netLiters = grossLiters - testing;
          if (isMpp(s)) {
            mppTotal += grossLiters;
            mppTest += testing;
            mppNet += netLiters;
          } else if (perFuel[fuel]) {
            perFuel[fuel].total += grossLiters;
            perFuel[fuel].test += testing;
            perFuel[fuel].net += netLiters;
          }
        });

      // Credit sales — fuel entries per credit record. Credits don't have a
      // testing value (they're recorded as straight liters sold), so they
      // contribute only to `total` and `net`, not `test`.
      creditData
        .filter(c => c.date === date)
        .forEach(c => {
          const creditIsMpp = isMpp(c);
          (c.fuelEntries || []).forEach(e => {
            const fuel = e.fuelType;
            const liters = parseFloat(e.liters) || 0;
            if (creditIsMpp) {
              mppTotal += liters;
              mppNet += liters;
            } else if (perFuel[fuel]) {
              perFuel[fuel].total += liters;
              perFuel[fuel].net += liters;
            }
          });
        });

      return { date, perFuel, mppTotal, mppTest, mppNet };
    });
  }, [salesData, creditData, fuelTypes, fromDate, tillDate]);

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
          <strong className={isDarkMode ? 'text-white' : 'text-slate-800'}>Note:</strong> Values are in litres. "Total Litre" for each fuel includes testing liters; "Net" excludes testing. MPP columns show MPP-tagged sales separately.
        </div>
      </CardContent>
    </Card>
  );
};

export default SalesReport;
