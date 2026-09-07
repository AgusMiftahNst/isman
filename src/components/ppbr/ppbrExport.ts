import ExcelJS from 'exceljs';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

export const exportToExcel = async (
  filename: string,
  title: string,
  subtitle: string,
  columns: { header: string; key: string; width?: number }[],
  data: any[]
) => {
  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet('Sheet 1');

  // Title Header
  worksheet.mergeCells('A1', `${String.fromCharCode(64 + Math.max(columns.length, 4))}1`);
  const titleCell = worksheet.getCell('A1');
  titleCell.value = title.toUpperCase();
  titleCell.font = { name: 'Arial', size: 14, bold: true, color: { argb: 'FFFFFFFF' } };
  titleCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1E3A8A' } };
  titleCell.alignment = { horizontal: 'center', vertical: 'middle' };
  worksheet.getRow(1).height = 28;

  // Subtitle
  worksheet.mergeCells('A2', `${String.fromCharCode(64 + Math.max(columns.length, 4))}2`);
  const subCell = worksheet.getCell('A2');
  subCell.value = subtitle;
  subCell.font = { name: 'Arial', size: 10, italic: true, color: { argb: 'FF334155' } };
  subCell.alignment = { horizontal: 'center', vertical: 'middle' };
  worksheet.getRow(2).height = 20;

  worksheet.addRow([]); // empty row 3

  // Table Column Headers
  const headerRow = worksheet.addRow(columns.map(c => c.header));
  headerRow.height = 26;
  headerRow.eachCell(cell => {
    cell.font = { name: 'Arial', size: 10, bold: true, color: { argb: 'FFFFFFFF' } };
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF0F766E' } };
    cell.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
    cell.border = {
      top: { style: 'thin' },
      left: { style: 'thin' },
      bottom: { style: 'medium' },
      right: { style: 'thin' }
    };
  });

  // Table Data Rows
  data.forEach((item, index) => {
    const rowValues = columns.map(c => {
      const val = item[c.key];
      if (typeof val === 'number') return val;
      return val ?? '-';
    });
    const row = worksheet.addRow(rowValues);
    row.height = 22;
    const isEven = index % 2 === 0;
    row.eachCell(cell => {
      cell.font = { name: 'Arial', size: 9 };
      cell.alignment = { vertical: 'middle', wrapText: true };
      cell.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: isEven ? 'FFFFFFFF' : 'FFF8FAFC' }
      };
      cell.border = {
        top: { style: 'thin', color: { argb: 'FFE2E8F0' } },
        left: { style: 'thin', color: { argb: 'FFE2E8F0' } },
        bottom: { style: 'thin', color: { argb: 'FFE2E8F0' } },
        right: { style: 'thin', color: { argb: 'FFE2E8F0' } }
      };
    });
  });

  // Set widths
  columns.forEach((col, idx) => {
    worksheet.getColumn(idx + 1).width = col.width || 20;
  });

  const buffer = await workbook.xlsx.writeBuffer();
  const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${filename}.xlsx`;
  a.click();
  window.URL.revokeObjectURL(url);
};

export function exportToPdf(
  filename: string,
  title: string,
  arg3: string | string[],
  arg4?: string[] | any[][],
  arg5?: any[][] | 'portrait' | 'landscape',
  arg6?: 'portrait' | 'landscape'
) {
  let subtitle = '';
  let headers: string[] = [];
  let rows: any[][] = [];
  let orientation: 'portrait' | 'landscape' = 'landscape';

  if (typeof arg3 === 'string') {
    subtitle = arg3;
    headers = (arg4 as string[]) || [];
    rows = (arg5 as any[][]) || [];
    orientation = (arg6 as 'portrait' | 'landscape') || 'landscape';
  } else {
    subtitle = 'Kertas Kerja Pengawasan Berbasis Risiko (PPBR)';
    headers = arg3 || [];
    rows = (arg4 as any[][]) || [];
    orientation = (arg5 as 'portrait' | 'landscape') || 'landscape';
  }

  const doc = new jsPDF({ orientation, unit: 'mm', format: 'a4' });

  // Top header banner
  doc.setFillColor(30, 58, 138); // Navy
  doc.rect(0, 0, doc.internal.pageSize.getWidth(), 22, 'F');

  doc.setTextColor(255, 255, 255);
  doc.setFontSize(13);
  doc.setFont('helvetica', 'bold');
  doc.text(title.toUpperCase(), doc.internal.pageSize.getWidth() / 2, 11, { align: 'center' });

  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.text(subtitle, doc.internal.pageSize.getWidth() / 2, 17, { align: 'center' });

  autoTable(doc, {
    head: [headers],
    body: rows,
    startY: 26,
    styles: {
      fontSize: 7.5,
      cellPadding: 2,
      textColor: [30, 41, 59],
      lineColor: [226, 232, 240],
      lineWidth: 0.2,
      overflow: 'linebreak'
    },
    headStyles: {
      fillColor: [15, 118, 110], // Teal
      textColor: [255, 255, 255],
      fontStyle: 'bold',
      halign: 'center',
      valign: 'middle'
    },
    alternateRowStyles: {
      fillColor: [248, 250, 252]
    },
    margin: { top: 26, left: 10, right: 10, bottom: 12 },
    didDrawPage: (data) => {
      const str = `Halaman ${doc.getNumberOfPages()} - Inspektorat Daerah (PPBR)`;
      doc.setFontSize(8);
      doc.setTextColor(100);
      doc.text(str, data.settings.margin.left, doc.internal.pageSize.getHeight() - 6);
    }
  });

  doc.save(`${filename}.pdf`);
}
