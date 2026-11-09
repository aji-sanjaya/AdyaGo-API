import { jsPDF } from 'jspdf';
import jsPDFDefault from 'jspdf';
import autoTable, { autoTable as autoTableNamed } from 'jspdf-autotable';
import QRCode, { toDataURL } from 'qrcode';
import { LOGO_ADW_BASE64 } from '../assets/logoData.js';

// Resolve jsPDF constructor across different ESM/CJS bundlers
const getJsPDF = () => {
  if (typeof jsPDF === 'function') return jsPDF;
  if (typeof jsPDFDefault === 'function') return jsPDFDefault;
  if (jsPDFDefault && typeof jsPDFDefault.jsPDF === 'function') return jsPDFDefault.jsPDF;
  if (typeof window !== 'undefined' && window.jspdf && typeof window.jspdf.jsPDF === 'function') {
    return window.jspdf.jsPDF;
  }
  return jsPDF;
};

// Resolve autoTable plugin call
const callAutoTable = (doc, options) => {
  if (typeof doc.autoTable === 'function') {
    doc.autoTable(options);
    return;
  }
  const fn = typeof autoTable === 'function'
    ? autoTable
    : (typeof autoTableNamed === 'function' ? autoTableNamed : autoTable?.default);
  if (typeof fn === 'function') {
    fn(doc, options);
    return;
  }
  throw new Error('autoTable plugin is not available');
};

export const formatDateDoc = (dateStr) => {
  if (!dateStr) return '-';
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return String(dateStr);
    const day = String(d.getDate()).padStart(2, '0');
    const months = [
      'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
      'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec',
    ];
    return `${day} ${months[d.getMonth()]} ${d.getFullYear()}`;
  } catch {
    return String(dateStr);
  }
};

export const formatCurrencyIDR = (val) => {
  if (val === null || val === undefined || isNaN(val)) return 'Rp 0';
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    maximumFractionDigits: 0,
  }).format(val);
};

export const generateOrderPdf = async (order, lines = [], options = {}) => {
  const JsPDFClass = getJsPDF();
  const doc = new JsPDFClass({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 14;
  const contentWidth = pageWidth - margin * 2;

  let currentY = margin;

  // 1. Company Header
  const orgName = order?.org_name || options?.orgName || 'PT. ADYAWINSA DINAMIKA';
  const clientName = options?.clientName || 'ADYAWINSA GROUP';

  // Company Logo on right side
  try {
    if (LOGO_ADW_BASE64) {
      doc.addImage(LOGO_ADW_BASE64, 'PNG', pageWidth - margin - 35, currentY, 35, 14);
    }
  } catch (e) {
    // ignore logo load failure
  }

  // Company Name
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(13);
  doc.setTextColor(30, 41, 59);
  doc.text(orgName.toUpperCase(), margin, currentY + 5);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(100, 116, 139);
  doc.text(clientName, margin, currentY + 10);
  doc.text('Kawasan Industri GIIC / Jl. Pegangsaan Dua, Jakarta & Cikarang, Indonesia', margin, currentY + 14);

  currentY += 22;

  // Document Title
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(14);
  doc.setTextColor(15, 23, 42);
  doc.text('PURCHASE ORDER', pageWidth / 2, currentY, { align: 'center' });

  currentY += 6;

  // 2. Info Box (Order To vs Order Details)
  const infoBoxY = currentY;
  const infoBoxHeight = 44;
  const colWidth = (contentWidth - 6) / 2;

  // Background box
  doc.setDrawColor(203, 213, 225);
  doc.setLineWidth(0.3);
  doc.rect(margin, infoBoxY, contentWidth, infoBoxHeight, 'S');
  doc.line(margin + colWidth + 3, infoBoxY, margin + colWidth + 3, infoBoxY + infoBoxHeight);

  // Left Column: Order to (Vendor)
  const leftX = margin + 4;
  let leftY = infoBoxY + 5;
  doc.setFontSize(8);

  const drawInfoRow = (x, y, label, value, isBold = false) => {
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(100, 116, 139);
    doc.text(label, x, y);
    doc.text(':', x + 26, y);
    doc.setFont('helvetica', isBold ? 'bold' : 'normal');
    doc.setTextColor(15, 23, 42);
    doc.text(String(value || '-'), x + 29, y);
  };

  drawInfoRow(leftX, leftY, 'Order To', order?.vendor_name || options?.vendorName, true);
  drawInfoRow(leftX, leftY + 6, 'Contact Person', order?.vendor_contact || '-');
  drawInfoRow(leftX, leftY + 12, 'Payment Term', order?.payment_term_name || '-');
  drawInfoRow(leftX, leftY + 18, 'Price List', order?.pricelist_name || '-');
  drawInfoRow(leftX, leftY + 24, 'Cost Center', order?.costcenter_name || '-');
  drawInfoRow(leftX, leftY + 30, 'Project', order?.project_name || '-');

  // Right Column: PO Meta
  const rightX = margin + colWidth + 7;
  let rightY = infoBoxY + 5;

  drawInfoRow(rightX, rightY, 'PO Number', order?.documentno || 'DRAFT', true);
  drawInfoRow(rightX, rightY + 6, 'Date Ordered', formatDateDoc(order?.dateordered));
  drawInfoRow(rightX, rightY + 12, 'Date Promised', formatDateDoc(order?.datepromised));
  drawInfoRow(rightX, rightY + 18, 'Warehouse', order?.warehouse_name || '-');
  drawInfoRow(rightX, rightY + 24, 'Document Type', order?.doctype_name || 'Purchase Order');
  drawInfoRow(rightX, rightY + 30, 'Status', order?.docstatus_label || order?.docstatus || 'Draft', true);

  currentY = infoBoxY + infoBoxHeight + 6;

  // 3. Lines Table
  const tableData = (lines || []).map((line, idx) => {
    const itemCode = line.product_value || line.product_code || '';
    const itemName = line.product_name || line.charge_name || 'Item';
    const desc = line.description ? `\nNote: ${line.description}` : '';
    const withholding = line.adw_iswithholding === 'Y' ? `\n(PPh23 ${line.adw_withholdingrate || 2}%)` : '';

    return [
      idx + 1,
      `${itemCode ? `[${itemCode}] ` : ''}${itemName}${desc}${withholding}`,
      formatDateDoc(line.datepromised || order?.datepromised),
      line.qtyentered || line.qtyordered || 0,
      line.uom_symbol || line.uom_name || '',
      formatCurrencyIDR(line.priceactual || line.priceentered || 0),
      `${line.discount ? `${line.discount}%` : '-'}`,
      formatCurrencyIDR(line.linenetamt || 0),
    ];
  });

  callAutoTable(doc, {
    startY: currentY,
    margin: { left: margin, right: margin },
    head: [
      ['No', 'Description', 'Delivery Date', 'Qty', 'UoM', 'Unit Price', 'Disc', 'Total Amount'],
    ],
    body: tableData.length > 0 ? tableData : [['-', 'No items added yet', '-', '-', '-', '-', '-', '-']],
    theme: 'grid',
    headStyles: {
      fillColor: [30, 41, 59],
      textColor: [255, 255, 255],
      fontStyle: 'bold',
      fontSize: 8,
      halign: 'center',
      cellPadding: 2.5,
    },
    bodyStyles: {
      fontSize: 8,
      textColor: [30, 41, 59],
      cellPadding: 2.5,
    },
    columnStyles: {
      0: { cellWidth: 10, halign: 'center' },
      1: { cellWidth: 'auto' },
      2: { cellWidth: 22, halign: 'center' },
      3: { cellWidth: 14, halign: 'right' },
      4: { cellWidth: 14, halign: 'center' },
      5: { cellWidth: 26, halign: 'right' },
      6: { cellWidth: 14, halign: 'center' },
      7: { cellWidth: 28, halign: 'right' },
    },
    styles: {
      overflow: 'linebreak',
      lineColor: [226, 232, 240],
      lineWidth: 0.2,
    },
  });

  currentY = doc.lastAutoTable.finalY + 4;

  // 4. Financial Summary & Notes
  // Ensure we don't overflow the page
  if (currentY > pageHeight - 75) {
    doc.addPage();
    currentY = margin;
  }

  const summaryWidth = 75;
  const summaryX = pageWidth - margin - summaryWidth;
  const notesWidth = contentWidth - summaryWidth - 6;

  // Notes Box (Left)
  if (order?.description) {
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    doc.setTextColor(71, 85, 105);
    doc.text('Notes / Instructions:', margin, currentY + 3);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
    doc.setTextColor(100, 116, 139);
    const splitNotes = doc.splitTextToSize(order.description, notesWidth);
    doc.text(splitNotes, margin, currentY + 8);
  }

  // Summary Table (Right)
  const subtotal = Number(order?.totallines || 0);
  const taxAmt = Number(order?.taxamt || 0);
  const withholdingAmt = Number(order?.adw_withholdingamount || 0);
  const grandTotal = Number(order?.grandtotal || 0);

  const summaryRows = [
    ['Subtotal', formatCurrencyIDR(subtotal)],
    ['Tax (PPN)', formatCurrencyIDR(taxAmt)],
  ];
  if (withholdingAmt > 0) {
    summaryRows.push(['PPh23 Withholding', `-${formatCurrencyIDR(withholdingAmt)}`]);
  }
  summaryRows.push(['Grand Total', formatCurrencyIDR(grandTotal)]);

  callAutoTable(doc, {
    startY: currentY,
    margin: { left: summaryX, right: margin },
    body: summaryRows,
    theme: 'plain',
    bodyStyles: {
      fontSize: 8,
      cellPadding: 1.8,
    },
    columnStyles: {
      0: { fontStyle: 'bold', halign: 'left', textColor: [71, 85, 105] },
      1: { halign: 'right', fontStyle: 'bold', textColor: [15, 23, 42] },
    },
    didParseCell: (data) => {
      if (data.row.index === summaryRows.length - 1) {
        data.cell.styles.fillColor = [241, 245, 249];
        data.cell.styles.fontSize = 9;
        data.cell.styles.textColor = [2, 132, 199];
      }
    },
  });

  currentY = Math.max(doc.lastAutoTable.finalY + 8, currentY + 30);

  // 5. Signature Section
  if (currentY > pageHeight - 45) {
    doc.addPage();
    currentY = margin + 5;
  }

  const sigBoxWidth = contentWidth / 4;
  const sigY = currentY;

  const signatures = [
    { title: 'Prepared By', name: order?.created_by_name || 'Staff' },
    { title: 'Checked By', name: order?.checked_by_name || '-' },
    { title: 'Approved By', name: order?.approved_by_name || '-' },
    { title: 'Confirmed By Supplier', name: order?.vendor_contact || order?.vendor_name || 'Vendor' },
  ];

  signatures.forEach((sig, idx) => {
    const x = margin + idx * sigBoxWidth;
    const centerX = x + sigBoxWidth / 2;

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
    doc.setTextColor(100, 116, 139);
    doc.text(sig.title, centerX, sigY, { align: 'center' });

    // Underline line for signature
    doc.setDrawColor(203, 213, 225);
    doc.setLineWidth(0.3);
    doc.line(x + 5, sigY + 18, x + sigBoxWidth - 5, sigY + 18);

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    doc.setTextColor(30, 41, 59);
    doc.text(sig.name, centerX, sigY + 22, { align: 'center' });
  });

  // Page Numbers in Footer
  const totalPages = doc.internal.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7);
    doc.setTextColor(148, 163, 184);
    doc.text(
      `Printed on ${new Date().toLocaleString('en-GB')} • Page ${i} of ${totalPages}`,
      pageWidth / 2,
      pageHeight - 8,
      { align: 'center' }
    );
  }

  const blob = doc.output('blob');
  const blobUrl = URL.createObjectURL(blob);

  return { doc, blob, blobUrl };
};

