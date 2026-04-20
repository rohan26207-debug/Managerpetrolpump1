import React, { useState } from 'react';
import { Card, CardContent } from './ui/card';
import { Button } from './ui/button';
import { Label } from './ui/label';
import { FileText, Printer, FileSpreadsheet } from 'lucide-react';
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import 'jspdf-autotable';

const OutstandingPDFReport = ({ customers, creditData, payments, isDarkMode, selectedDate }) => {
  const [tillDate, setTillDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [pdfSettings, setPdfSettings] = useState({
    showZeroBalance: false,
    showNegativeBalance: true,
    sortBy: 'amount', // 'amount' or 'name'
    includeHeader: true,
    includeDate: true,
    includeTotal: true
  });

  // Calculate outstanding for all customers (up to tillDate)
  const outstandingData = customers.map(customer => {
    const totalCredit = creditData
      .filter(c => c.customerName === customer.name && c.date <= tillDate)
      .reduce((sum, c) => sum + (c.amount || 0), 0);

    const totalReceived = payments
      .filter(p => (p.customerId === customer.id || p.customerName === customer.name) && p.date <= tillDate)
      .reduce((sum, p) => sum + (p.amount || 0), 0);

    const startingBalance = customer.startingBalance || 0;
    const outstanding = startingBalance + totalCredit - totalReceived;

    return {
      name: customer.name,
      startingBalance,
      totalCredit,
      totalReceived,
      outstanding
    };
  });

  // Filter based on settings
  const filteredData = outstandingData.filter(d => {
    if (!pdfSettings.showZeroBalance && d.outstanding === 0) return false;
    if (!pdfSettings.showNegativeBalance && d.outstanding < 0) return false;
    return true;
  });

  // Sort based on settings
  const sortedData = [...filteredData].sort((a, b) => {
    if (pdfSettings.sortBy === 'amount') {
      return b.outstanding - a.outstanding; // Descending
    } else {
      return a.name.localeCompare(b.name); // Alphabetical
    }
  });

  // Calculate totals
  const totals = sortedData.reduce((acc, d) => ({
    totalCredit: acc.totalCredit + d.totalCredit,
    totalReceived: acc.totalReceived + d.totalReceived,
    outstanding: acc.outstanding + d.outstanding
  }), { totalCredit: 0, totalReceived: 0, outstanding: 0 });

  // Excel Export functionality
  const handleExcelExport = () => {
    try {
      // Prepare data for Excel
      const excelData = [
        // Title row
        ['Outstanding Report'],
        [],
        [`As of: ${new Date(selectedDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}`],
        [],
        // Table headers
        ['Sr. No', 'Customer Name', 'Total Credit (₹)', 'Total Received (₹)', 'Outstanding (₹)'],
        // Table data
        ...sortedData.map((customer, index) => [
          index + 1,
          customer.name,
          customer.totalCredit.toFixed(2),
          customer.totalReceived.toFixed(2),
          customer.outstanding.toFixed(2)
        ]),
        // Total row
        ['Total', '', totals.totalCredit.toFixed(2), totals.totalReceived.toFixed(2), totals.outstanding.toFixed(2)],
        [],
        // Footer
        [`Generated on: ${new Date().toLocaleString('en-IN')}`]
      ];

      // Create workbook and worksheet
      const wb = XLSX.utils.book_new();
      const ws = XLSX.utils.aoa_to_sheet(excelData);

      // Set column widths
      ws['!cols'] = [
        { wch: 10 },  // Sr. No
        { wch: 25 },  // Customer Name
        { wch: 18 },  // Total Credit
        { wch: 18 },  // Total Received
        { wch: 18 }   // Outstanding
      ];

      // Add worksheet to workbook
      XLSX.utils.book_append_sheet(wb, ws, 'Outstanding');

      // Generate filename with date
      const filename = `Outstanding_Report_${new Date(selectedDate).toISOString().split('T')[0]}.xlsx`;

      // Export file
      XLSX.writeFile(wb, filename);
      
      console.log('Excel file exported successfully');
    } catch (error) {
      console.error('Excel export error:', error);
      alert('Error exporting to Excel: ' + error.message);
    }
  };

  const handlePrint = () => {
    try {
      // Check if running in Android WebView
      const isAndroid = typeof window.MPumpCalcAndroid !== 'undefined';
      
      if (isAndroid) {
        // Generate PDF using jsPDF for Android
        generatePDFForAndroid();
        return;
      }
      
      // For web browser - use print dialog
      generateHTMLForWeb();
    } catch (error) {
      console.error('Print error:', error);
      alert('Error generating report: ' + error.message);
    }
  };

  const generatePDFForAndroid = () => {
    try {
      const doc = new jsPDF();
      let yPos = 20;

      // Title
      doc.setFontSize(18);
      doc.text('Outstanding Report', 105, yPos, { align: 'center' });
      yPos += 10;

      // Date (Till Date)
      doc.setFontSize(12);
      const dateStr = new Date(tillDate).toLocaleDateString('en-IN', { 
        day: '2-digit', month: 'long', year: 'numeric' 
      });
      doc.text(`Till Date: ${dateStr}`, 105, yPos, { align: 'center' });
      yPos += 15;

      if (sortedData.length === 0) {
        doc.setFontSize(12);
        doc.text('No data to display based on current filters', 105, yPos, { align: 'center' });
      } else {
        // Always show all 4 columns: Customer Name, Credit, Receipt, Outstanding
        const headers = ['Customer Name', 'Credit', 'Receipt', 'Outstanding'];

        // Build table data with all columns
        const tableData = sortedData.map((customer) => {
          return [
            customer.name,
            customer.totalCredit.toFixed(2),
            customer.totalReceived.toFixed(2),
            customer.outstanding.toFixed(2)
          ];
        });

        // Add total row with all columns
        const totalCredit = sortedData.reduce((sum, c) => sum + c.totalCredit, 0);
        const totalReceived = sortedData.reduce((sum, c) => sum + c.totalReceived, 0);
        const totalOutstanding = sortedData.reduce((sum, c) => sum + c.outstanding, 0);
        
        const totalRow = [
          'Total',
          totalCredit.toFixed(2),
          totalReceived.toFixed(2),
          totalOutstanding.toFixed(2)
        ];
        
        tableData.push(totalRow);
        
        tableData.push(totalRow);

        doc.autoTable({
          startY: yPos,
          head: [headers],
          body: tableData,
          theme: 'grid',
          headStyles: { fillColor: [240, 240, 240], textColor: [0, 0, 0] },
          styles: { fontSize: 11 },
          footStyles: { fillColor: [240, 240, 240], fontStyle: 'bold' }
        });
      }

      // Footer
      yPos = doc.internal.pageSize.height - 15;
      doc.setFontSize(9);
      doc.text(`Generated on: ${new Date().toLocaleString('en-IN')}`, 105, yPos, { align: 'center' });

      // Convert to base64 and send to Android
      const pdfBase64 = doc.output('dataurlstring').split(',')[1];
      const fileName = `Outstanding_Report_${selectedDate}.pdf`;
      
      if (window.MPumpCalcAndroid && window.MPumpCalcAndroid.openPdfWithViewer) {
        window.MPumpCalcAndroid.openPdfWithViewer(pdfBase64, fileName);
      } else {
        console.error('Android interface not available');
        alert('PDF generation is only available in the Android app');
      }
    } catch (error) {
      console.error('Error generating PDF for Android:', error);
      alert('Error generating PDF: ' + error.message);
    }
  };

  const generateHTMLForWeb = () => {
    // HTML generation for web browsers - shows all 4 columns
    const htmlContent = `
<!DOCTYPE html>
<html>
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1.0">
<title>Outstanding Report</title>
<style>
*{font-family:Helvetica,Arial,sans-serif;font-weight:normal}
body{margin:10px;line-height:1.2;color:#000;font-size:12px}
h1{font-size:18px;margin:0;text-align:center;text-transform:uppercase}
p{font-size:12px;margin:2px 0;text-align:center}
table{width:100%;border-collapse:collapse;font-size:10px;margin:3px 0}
th{border:1px solid #000;padding:2px;text-align:center;;font-size:10px}
td{border:1px solid #000;padding:2px;font-size:10px}
.r{text-align:right}
.t{}
.print-btn{background:#000;color:white;border:none;padding:10px 20px;font-size:16px;cursor:pointer;margin:10px auto;display:block}
.no-print{display:block}
@media print{body{margin:5mm}.no-print{display:none}@page{margin:5mm}}
</style>
</head>
<body>
<h1>Outstanding Report</h1>
<p>As of: ${new Date(tillDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'long', year: 'numeric' })}</p>

${sortedData.length > 0 ? `
<table>
<tr>
  <th>Customer Name</th>
  <th>Credit</th>
  <th>Receipt</th>
  <th>Outstanding</th>
</tr>
${sortedData.map(customer => `
<tr>
  <td>${customer.name}</td>
  <td class="r">${customer.totalCredit.toFixed(2)}</td>
  <td class="r">${customer.totalReceived.toFixed(2)}</td>
  <td class="r">${customer.outstanding.toFixed(2)}</td>
</tr>
`).join('')}
<tr class="t">
  <td>Total</td>
  <td class="r">${sortedData.reduce((sum, c) => sum + c.totalCredit, 0).toFixed(2)}</td>
  <td class="r">${sortedData.reduce((sum, c) => sum + c.totalReceived, 0).toFixed(2)}</td>
  <td class="r">${sortedData.reduce((sum, c) => sum + c.outstanding, 0).toFixed(2)}</td>
</tr>
</table>
` : '<p>No data to display</p>'}

<div style="margin-top:10px;text-align:center;font-size:10px;border-top:1px solid #000;padding-top:5px">
Generated on: ${new Date().toLocaleString()}
</div>

<div class="no-print" style="text-align:center;margin:20px 0">
<button class="print-btn" onclick="window.print()">Print / Save as PDF</button>
</div>

<script>
window.onload = function() {
  setTimeout(function() {
    window.print();
  }, 500);
};
</script>
</body>
</html>`;

    const printWindow = window.open('', '_blank', 'width=800,height=600');
    if (printWindow) {
      printWindow.document.write(htmlContent);
      printWindow.document.close();
    }
  };

  return (
    <div className="space-y-4">
      {/* Outstanding Report Settings */}
      <Card className={`${isDarkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-slate-200'}`}>
        <CardContent className="p-4">
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <FileText className={`w-5 h-5 ${isDarkMode ? 'text-blue-400' : 'text-blue-600'}`} />
              <h3 className={`text-lg font-semibold ${isDarkMode ? 'text-white' : 'text-slate-800'}`}>
                Outstanding Report Settings
              </h3>
            </div>

            {/* Settings */}
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="showZeroBalance"
                  checked={pdfSettings.showZeroBalance}
                  onChange={(e) => setPdfSettings({...pdfSettings, showZeroBalance: e.target.checked})}
                  className="w-4 h-4"
                />
                <Label htmlFor="showZeroBalance" className={isDarkMode ? 'text-gray-300' : 'text-slate-700'}>
                  Show Zero Balance Customers
                </Label>
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="showNegativeBalance"
                  checked={pdfSettings.showNegativeBalance}
                  onChange={(e) => setPdfSettings({...pdfSettings, showNegativeBalance: e.target.checked})}
                  className="w-4 h-4"
                />
                <Label htmlFor="showNegativeBalance" className={isDarkMode ? 'text-gray-300' : 'text-slate-700'}>
                  Show Negative Balance (Overpaid)
                </Label>
              </div>
            </div>

            {/* Till Date */}
            <div>
              <Label className={`text-sm font-medium ${isDarkMode ? 'text-gray-300' : 'text-slate-700'}`}>
                Till Date
              </Label>
              <input
                type="date"
                value={tillDate}
                onChange={(e) => setTillDate(e.target.value)}
                className={`w-full mt-1 rounded-md border px-3 py-2 ${
                  isDarkMode ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-slate-300'
                }`}
              />
            </div>

            {/* Sort By */}
            <div>
              <Label className={`text-sm font-medium ${isDarkMode ? 'text-gray-300' : 'text-slate-700'}`}>
                Sort By
              </Label>
              <select
                value={pdfSettings.sortBy}
                onChange={(e) => setPdfSettings({...pdfSettings, sortBy: e.target.value})}
                className={`w-full mt-1 rounded-md border px-3 py-2 ${
                  isDarkMode ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-slate-300'
                }`}
              >
                <option value="amount">Outstanding Amount (Highest First)</option>
                <option value="name">Customer Name (A-Z)</option>
              </select>
            </div>

            {/* Action Buttons */}
            <div className="grid grid-cols-2 gap-2 pt-2">
              <Button
                onClick={handlePrint}
                className="bg-green-600 hover:bg-green-700 text-white"
              >
                <Printer className="w-4 h-4 mr-2" />
                Print Outs
              </Button>
              <Button
                onClick={handleExcelExport}
                className="bg-blue-600 hover:bg-blue-700 text-white"
              >
                <FileSpreadsheet className="w-4 h-4 mr-2" />
                Excel
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Report Preview */}
      <Card className={`${isDarkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-slate-200'}`}>
        <CardContent className="p-4">
          <div id="outstanding-pdf-content" className="print-content">
            {pdfSettings.includeHeader && (
              <h1 className={`text-2xl font-bold text-center mb-2 ${isDarkMode ? 'text-white' : 'text-slate-800'}`}>
                Outstanding Report
              </h1>
            )}
            {pdfSettings.includeDate && (
              <p className={`text-center mb-6 ${isDarkMode ? 'text-gray-400' : 'text-slate-600'}`}>
                As of: {new Date(tillDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })}
              </p>
            )}

            {sortedData.length === 0 ? (
              <div className={`text-center py-8 ${isDarkMode ? 'text-gray-400' : 'text-slate-500'}`}>
                <FileText className="w-12 h-12 mx-auto mb-2 opacity-50" />
                <p>No data to display based on current filters</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full border-collapse">
                  <thead>
                    <tr className={`border-b-2 ${isDarkMode ? 'border-gray-600' : 'border-slate-300'}`}>
                      <th className={`text-left p-3 ${isDarkMode ? 'text-gray-300' : 'text-slate-700'}`}>
                        Customer Name
                      </th>
                      <th className={`text-right p-3 ${isDarkMode ? 'text-gray-300' : 'text-slate-700'}`}>
                        Credit
                      </th>
                      <th className={`text-right p-3 ${isDarkMode ? 'text-gray-300' : 'text-slate-700'}`}>
                        Receipt
                      </th>
                      <th className={`text-right p-3 ${isDarkMode ? 'text-gray-300' : 'text-slate-700'}`}>
                        Outstanding Amount
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {sortedData.map((row, index) => (
                      <tr
                        key={row.customerId || `out-${index}`}
                        className={`border-b ${isDarkMode ? 'border-gray-700' : 'border-slate-200'}`}
                      >
                        <td className={`p-3 ${isDarkMode ? 'text-white' : 'text-slate-800'}`}>
                          {row.name}
                        </td>
                        <td className={`p-3 text-right ${isDarkMode ? 'text-blue-400' : 'text-blue-600'}`}>
                          ₹{row.totalCredit.toFixed(2)}
                        </td>
                        <td className={`p-3 text-right ${isDarkMode ? 'text-green-400' : 'text-green-600'}`}>
                          ₹{row.totalReceived.toFixed(2)}
                        </td>
                        <td className={`p-3 text-right font-bold ${
                          row.outstanding > 0
                            ? isDarkMode ? 'text-orange-400' : 'text-orange-600'
                            : isDarkMode ? 'text-green-400' : 'text-green-600'
                        }`}>
                          ₹{row.outstanding.toFixed(2)}
                        </td>
                      </tr>
                    ))}
                    {/* Total Row */}
                    {pdfSettings.includeTotal && (
                      <tr className={`font-bold border-t-2 ${
                        isDarkMode ? 'bg-gray-700 border-gray-600' : 'bg-slate-50 border-slate-300'
                      }`}>
                        <td className={`p-3 ${isDarkMode ? 'text-white' : 'text-slate-800'}`}>
                          TOTAL ({sortedData.length} customers)
                        </td>
                        <td className={`p-3 text-right ${isDarkMode ? 'text-blue-400' : 'text-blue-600'}`}>
                          ₹{totals.totalCredit.toFixed(2)}
                        </td>
                        <td className={`p-3 text-right ${isDarkMode ? 'text-green-400' : 'text-green-600'}`}>
                          ₹{totals.totalReceived.toFixed(2)}
                        </td>
                        <td className={`p-3 text-right ${
                          totals.outstanding > 0
                            ? isDarkMode ? 'text-orange-400' : 'text-orange-600'
                            : isDarkMode ? 'text-green-400' : 'text-green-600'
                        }`}>
                          ₹{totals.outstanding.toFixed(2)}
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default OutstandingPDFReport;
