import React, { useState, useMemo } from 'react';
import { Label } from './ui/label';
import { Input } from './ui/input';
import localStorageService from '../services/localStorage';

/**
 * DSR (Daily Stock Report) — shows a month-long stock register for one fuel.
 *
 * Columns per day:
 *   Date | Opening | Receipt | Total | Sales By Meter | Pump Test |
 *   Net Sales | Cumulative Sales | Sales By Dip | Variation Daily | Variation Cumm
 *
 * Calculations:
 *   Opening         = <fuel>StockData[d].startStock
 *   Receipt         = <fuel>StockData[d].purchase
 *   Total           = Opening + Receipt
 *   SalesByMeter    = sum(liters + testing) of sales[d][fuel] where !mpp
 *   PumpTest        = sum(testing) of all sales[d][fuel]
 *   NetSalesByMeter = SalesByMeter - PumpTest
 *   CumulativeSales = running sum of NetSalesByMeter
 *   SalesByDip[d]   = Total[d] - Opening[d+1]   (null if next-day opening missing)
 *   DailyVariation  = SalesByDip - NetSalesByMeter   (null if SalesByDip null)
 *   CummVariation   = running sum of DailyVariation
 */
const DSRReport = ({ isDarkMode, fuelSettings, salesData }) => {
  const fuelTypes = fuelSettings ? Object.keys(fuelSettings) : ['Diesel', 'Petrol', 'CNG', 'Premium'];
  const today = new Date();
  const defaultMonth = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}`;

  const [fuelType, setFuelType] = useState(fuelTypes[0] || '');
  const [month, setMonth] = useState(defaultMonth);

  const rows = useMemo(() => {
    if (!fuelType || !month) return [];
    const [yearStr, monthStr] = month.split('-');
    const year = parseInt(yearStr, 10);
    const mo = parseInt(monthStr, 10);
    const daysInMonth = new Date(year, mo, 0).getDate();

    const stockKey = fuelType.toLowerCase() + 'StockData';
    const allStock = localStorageService.getItem(stockKey) || {};

    const result = [];
    for (let d = 1; d <= daysInMonth; d++) {
      const dateStr = `${year}-${String(mo).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
      const stock = allStock[dateStr] || {};
      const opening = parseFloat(stock.startStock) || 0;
      const receipt = parseFloat(stock.purchase) || 0;
      const totalStock = opening + receipt;

      const daySales = salesData.filter(s => s.date === dateStr && s.fuelType === fuelType);
      const nonMpp = daySales.filter(s => !s.mpp && s.mpp !== true && s.mpp !== 'true');
      const salesByMeter = nonMpp.reduce((a, s) => a + (parseFloat(s.liters) || 0) + (parseFloat(s.testing) || 0), 0);
      const pumpTest = daySales.reduce((a, s) => a + (parseFloat(s.testing) || 0), 0);
      const netSales = salesByMeter - pumpTest;

      result.push({
        day: d,
        dateStr,
        hasStock: !!allStock[dateStr],
        opening,
        receipt,
        totalStock,
        salesByMeter,
        pumpTest,
        netSales,
      });
    }

    // Second pass: cumulative, salesByDip, variations
    let cummSales = 0;
    let cummVar = 0;
    for (let i = 0; i < result.length; i++) {
      const r = result[i];
      cummSales += r.netSales;
      r.cummSales = cummSales;

      const next = result[i + 1];
      if (next && next.hasStock) {
        r.salesByDip = r.totalStock - next.opening;
        // Variation = Net Sales (meter) − Sales by Dip.
        // Positive means meter shows more than dip (overage); negative = shortage.
        r.dailyVar = r.netSales - r.salesByDip;
        cummVar += r.dailyVar;
        r.cummVar = cummVar;
      } else {
        r.salesByDip = null;
        r.dailyVar = null;
        r.cummVar = null;
      }
    }

    return result;
  }, [fuelType, month, salesData]);

  // ----- Totals row -----
  const totals = useMemo(() => {
    return rows.reduce(
      (a, r) => ({
        receipt: a.receipt + r.receipt,
        salesByMeter: a.salesByMeter + r.salesByMeter,
        pumpTest: a.pumpTest + r.pumpTest,
        netSales: a.netSales + r.netSales,
        salesByDip: a.salesByDip + (r.salesByDip || 0),
      }),
      { receipt: 0, salesByMeter: 0, pumpTest: 0, netSales: 0, salesByDip: 0 }
    );
  }, [rows]);

  const sign = (v) => {
    if (v == null) return '-';
    if (v > 0) return '+' + v.toFixed(0);
    return v.toFixed(0);
  };
  const fmt = (v) => (v == null ? '-' : v.toFixed(0));

  const cellBase = 'px-1.5 py-1 border text-[11px] whitespace-nowrap';
  const thBase = `${cellBase} font-bold ${isDarkMode ? 'border-gray-600 bg-gray-800 text-white' : 'border-slate-300 bg-slate-100 text-slate-800'}`;
  const tdBase = `${cellBase} ${isDarkMode ? 'border-gray-600 text-gray-200' : 'border-slate-300 text-slate-800'}`;
  const tdRight = `${tdBase} text-right`;
  const tdCenter = `${tdBase} text-center`;

  const variationCls = (v) => {
    if (v == null) return tdRight;
    if (v > 0) return `${tdRight} ${isDarkMode ? 'text-green-400' : 'text-green-700'}`;
    if (v < 0) return `${tdRight} ${isDarkMode ? 'text-red-400' : 'text-red-700'}`;
    return tdRight;
  };

  return (
    <div className="space-y-4" data-testid="dsr-view">
      {/* Selectors */}
      <div className={`rounded-lg border p-3 ${isDarkMode ? 'bg-gray-800 border-gray-600' : 'bg-white border-slate-200'}`}>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <Label className={`text-xs ${isDarkMode ? 'text-gray-300' : 'text-slate-700'}`}>Fuel Type</Label>
            <select
              data-testid="dsr-fuel-select"
              value={fuelType}
              onChange={(e) => setFuelType(e.target.value)}
              className={`mt-1 w-full text-sm rounded border px-2 py-1.5 ${
                isDarkMode ? 'bg-gray-700 border-gray-500 text-white' : 'bg-white border-slate-300 text-slate-800'
              }`}
            >
              {fuelTypes.map((ft) => (
                <option key={ft} value={ft}>{ft}</option>
              ))}
            </select>
          </div>
          <div>
            <Label className={`text-xs ${isDarkMode ? 'text-gray-300' : 'text-slate-700'}`}>Month</Label>
            <Input
              data-testid="dsr-month-input"
              type="month"
              value={month}
              onChange={(e) => setMonth(e.target.value)}
              className={`mt-1 ${isDarkMode ? 'bg-gray-700 border-gray-500 text-white' : ''}`}
            />
          </div>
        </div>
      </div>

      {/* DSR Table */}
      {fuelType && (
        <div className={`rounded-lg border p-2 overflow-x-auto ${isDarkMode ? 'bg-gray-800 border-gray-600' : 'bg-white border-slate-200'}`}>
          <div className={`text-sm font-bold mb-2 px-1 ${isDarkMode ? 'text-white' : 'text-slate-800'}`}>
            {fuelType} — Daily Stock Report for {month}
          </div>

          <table className="w-full border-collapse" data-testid="dsr-table">
            <thead>
              <tr>
                <th className={thBase} rowSpan={2}>DATE</th>
                <th className={thBase} rowSpan={2}>OPENING<br/>STOCK</th>
                <th className={thBase} rowSpan={2}>RECEIPT</th>
                <th className={thBase} rowSpan={2}>TOTAL<br/>STOCK</th>
                <th className={thBase} rowSpan={2}>SALES<br/>BY METER</th>
                <th className={thBase} rowSpan={2}>PUMP<br/>TEST</th>
                <th className={thBase} rowSpan={2}>NET SALES<br/>BY METER</th>
                <th className={thBase} rowSpan={2}>CUMMULATIVE<br/>SALES</th>
                <th className={thBase} rowSpan={2}>SALES<br/>BY DIP</th>
                <th className={thBase} colSpan={2}>VARIATION</th>
              </tr>
              <tr>
                <th className={thBase}>DAILY</th>
                <th className={thBase}>CUMM</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.day}>
                  <td className={tdCenter}>{r.day}</td>
                  <td className={tdRight}>{fmt(r.opening)}</td>
                  <td className={tdRight}>{r.receipt > 0 ? fmt(r.receipt) : '-'}</td>
                  <td className={tdRight}>{fmt(r.totalStock)}</td>
                  <td className={tdRight}>{fmt(r.salesByMeter)}</td>
                  <td className={tdRight}>{r.pumpTest > 0 ? fmt(r.pumpTest) : '-'}</td>
                  <td className={tdRight}>{fmt(r.netSales)}</td>
                  <td className={tdRight}>{fmt(r.cummSales)}</td>
                  <td className={tdRight}>{fmt(r.salesByDip)}</td>
                  <td className={variationCls(r.dailyVar)}>{sign(r.dailyVar)}</td>
                  <td className={variationCls(r.cummVar)}>{sign(r.cummVar)}</td>
                </tr>
              ))}
              {/* Totals row — only Receipt and Pump Test are summed */}
              <tr>
                <td className={`${tdCenter} font-bold`}>Total</td>
                <td className={tdRight}>-</td>
                <td className={`${tdRight} font-bold`}>{fmt(totals.receipt)}</td>
                <td className={tdRight}>-</td>
                <td className={tdRight}>-</td>
                <td className={`${tdRight} font-bold`}>{fmt(totals.pumpTest)}</td>
                <td className={tdRight}>-</td>
                <td className={tdRight}>-</td>
                <td className={tdRight}>-</td>
                <td className={tdRight}>-</td>
                <td className={tdRight}>-</td>
              </tr>
            </tbody>
          </table>

          <div className={`mt-2 text-xs px-1 ${isDarkMode ? 'text-gray-400' : 'text-slate-500'}`}>
            Tip: "Sales by Dip" for a day needs the next day's opening stock. The last day of the month shows "-" unless the next day's stock is also saved.
          </div>
        </div>
      )}
    </div>
  );
};

export default DSRReport;
