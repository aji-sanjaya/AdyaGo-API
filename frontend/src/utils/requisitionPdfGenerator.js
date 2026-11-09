import { jsPDF } from 'jspdf';
import jsPDFDefault from 'jspdf';
import autoTable, { autoTable as autoTableNamed } from 'jspdf-autotable';
import QRCode, { toDataURL } from 'qrcode';
import { LOGO_ADW_BASE64 } from '../assets/logoData.js';
import { idempiereConfig } from '../config/idempiere.js';

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

/**
 * Format date for document header (e.g. 07 Nov 2026)
 */
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
    const month = months[d.getMonth()];
    const year = d.getFullYear();
    return `${day} ${month} ${year}`;
  } catch {
    return String(dateStr);
  }
};

/**
 * Format timestamp for QR & approval signatures (e.g. 07 Nov 2026 15:33)
 */
export const formatDateTime = (dateStr) => {
  if (!dateStr) return '';
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return String(dateStr);
    const day = String(d.getDate()).padStart(2, '0');
    const months = [
      'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
      'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec',
    ];
    const month = months[d.getMonth()];
    const year = d.getFullYear();
    const hours = String(d.getHours()).padStart(2, '0');
    const mins = String(d.getMinutes()).padStart(2, '0');
    return `${day} ${month} ${year} ${hours}:${mins}`;
  } catch {
    return String(dateStr);
  }
};

/**
 * Format printout datetime for footer (e.g. 09-Nov-2026 00:41:25)
 */
export const formatPrintDateTime = (date = new Date()) => {
  try {
    const d = new Date(date);
    if (isNaN(d.getTime())) return '';
    const day = String(d.getDate()).padStart(2, '0');
    const months = [
      'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
      'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec',
    ];
    const month = months[d.getMonth()];
    const year = d.getFullYear();
    const hours = String(d.getHours()).padStart(2, '0');
    const mins = String(d.getMinutes()).padStart(2, '0');
    const secs = String(d.getSeconds()).padStart(2, '0');
    return `${day}-${month}-${year} ${hours}:${mins}:${secs}`;
  } catch {
    return '';
  }
};

/**
 * Format required date for table line (e.g. 07/11/2026)
 */
export const formatDateRequired = (dateStr) => {
  if (!dateStr) return '';
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return String(dateStr);
    const day = String(d.getDate()).padStart(2, '0');
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const year = d.getFullYear();
    return `${day}/${month}/${year}`;
  } catch {
    return String(dateStr);
  }
};

/**
 * Generate QR code data URL asynchronously
 */
const generateQRCodeDataUrl = async (text) => {
  if (!text) return null;
  try {
    const fn = typeof toDataURL === 'function' ? toDataURL : (QRCode?.toDataURL || QRCode?.default?.toDataURL);
    if (!fn) return null;
    return await fn(text, {
      width: 120,
      margin: 1,
      errorCorrectionLevel: 'M',
      color: {
        dark: '#000000',
        light: '#ffffff',
      },
    });
  } catch (err) {
    console.warn('Failed to generate QR code:', err);
    return null;
  }
};

/**
 * Generate Purchase Requisition PDF document matching the corporate template
 * @param {Object} requisition - Requisition header data
 * @param {Array} lines - Requisition line items
 * @param {Object} options - Additional metadata (e.g. orgAddress)
 * @returns {Promise<{ blob: Blob, blobUrl: string, doc: jsPDF }>}
 */
export const generateRequisitionPdf = async (requisition = {}, lines = [], options = {}) => {
  const JsPDF = getJsPDF();
  const doc = new JsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  const marginLeft = 12;
  const marginRight = 198;
  const contentWidth = marginRight - marginLeft; // 186mm
  const startTopY = 12;

  const clientName = requisition.client_name || options.clientName || idempiereConfig.tenant.name;
  const addressLines = options.addressLines || [
    'Jl. Angsana Raya Blok L6 No. 1, Delta Silicon I',
    'Lippo Cikarang, Cikarang Selatan',
    'Kabupaten Bekasi, 17530',
  ];

  // Resolve dynamic logo from AD_ClientInfo or fallback
  const clientLogo = requisition.logo_base64 || options.logo_base64 || options.logoBase64 || LOGO_ADW_BASE64;
  
  // Calculate natural dimensions preserving aspect ratio (avoid stretched/squished appearance)
  let logoWidth = 34;
  let logoHeight = 16.8;
  if (clientLogo) {
    try {
      const props = doc.getImageProperties(clientLogo);
      if (props && props.width && props.height) {
        const ratio = props.height / props.width;
        // Standard width ~34mm, calculate height proportionally
        logoWidth = 34;
        logoHeight = logoWidth * ratio;
        // If calculated height exceeds 17.5mm, scale down to fit comfortably in top header
        if (logoHeight > 17.5) {
          logoHeight = 17.5;
          logoWidth = logoHeight / ratio;
        }
      }
    } catch (e) {
      // Default natural ratio ~0.49
      logoWidth = 34;
      logoHeight = 16.8;
    }
  }

  const costCenterVal = requisition.cost_center_value || options.costCenterValue || 'PROD';
  const titleText = `Purchase Requisition ${costCenterVal}`;

  // Box positions
  const boxY = 34;
  const boxHeight = 36;
  const col1W = 76; // Info column
  const col2W = 36; // Prepared by
  const col3W = 36; // Checked By
  const col4W = 38; // Approved by

  const x1 = marginLeft;
  const x2 = x1 + col1W; // 88
  const x3 = x2 + col2W; // 124
  const x4 = x3 + col3W; // 160
  const x5 = marginRight; // 198

  const docNo = requisition.documentno || options.documentno || '-';
  const dateDocFormatted = formatDateDoc(requisition.datedoc || options.datedoc);
  const statusLabel = requisition.status_label || requisition.docstatus || 'Draft';

  // Pre-generate QR Codes asynchronously
  const preparedByName = requisition.createdby || options.createdby || 'User';
  const rawCreatedAt = requisition.created_at || requisition.created || requisition.datedoc || new Date().toISOString();
  const preparedDateStr = formatDateTime(rawCreatedAt);
  const preparedQrText = `Prepared by ${preparedByName} on ${rawCreatedAt}`;
  const preparedQrUrl = await generateQRCodeDataUrl(preparedQrText);

  const isCheckedApproved = requisition.checked_isapproved === 'AP' && requisition.checked_date;
  const isCheckedRejected = requisition.checked_isapproved === 'RE';
  const checkedName = requisition.checked_by_name || 'Checked User';
  const checkedDateStr = formatDateTime(requisition.checked_date);
  let checkedQrUrl = null;
  if (isCheckedApproved) {
    const checkedQrText = `Checked by ${checkedName} on ${requisition.checked_date}`;
    checkedQrUrl = await generateQRCodeDataUrl(checkedQrText);
  }

  const isAppApproved = requisition.approved_isapproved === 'AP' && requisition.approved_date;
  const isAppRejected = requisition.approved_isapproved === 'RE';
  const approvedName = requisition.approved_by_name || 'Approved User';
  const approvedDateStr = formatDateTime(requisition.approved_date);
  let approvedQrUrl = null;
  if (isAppApproved) {
    const approvedQrText = `Approved by ${approvedName} on ${requisition.approved_date}`;
    approvedQrUrl = await generateQRCodeDataUrl(approvedQrText);
  }

  // -------------------------------------------------------------
  // FUNCTION TO DRAW THE FULL HEADER ON EVERY PAGE
  // -------------------------------------------------------------
  const drawPageHeader = (pageNumber, totalPages) => {
    // 1. Company Name & Address (Top Left)
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(12);
    doc.setTextColor(0, 0, 0);
    doc.text(clientName, marginLeft, startTopY + 4);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8.5);
    doc.setTextColor(20, 20, 20);
    let curAddressY = startTopY + 8.5;
    addressLines.forEach((line) => {
      if (line) {
        doc.text(line, marginLeft, curAddressY);
        curAddressY += 4;
      }
    });

    // 2. Logo & Title (Top Right)
    if (clientLogo) {
      try {
        const logoX = marginRight - logoWidth;
        const logoY = startTopY - 2;
        const imgFormat = clientLogo.startsWith('data:image/jpeg') || clientLogo.startsWith('data:image/jpg') ? 'JPEG' : 'PNG';
        doc.addImage(clientLogo, imgFormat, logoX, logoY, logoWidth, logoHeight);
      } catch (err) {
        console.warn('Failed to embed client logo:', err);
      }
    }

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(13);
    doc.setTextColor(0, 0, 0);
    doc.text(titleText, marginRight, startTopY + 19, { align: 'right' });

    // 3. Document Info & Signatures Box
    doc.setDrawColor(0, 0, 0);
    doc.setLineWidth(0.3);
    doc.rect(x1, boxY, contentWidth, boxHeight);

    // Vertical dividers
    doc.line(x2, boxY, x2, boxY + boxHeight);
    doc.line(x3, boxY, x3, boxY + boxHeight);
    doc.line(x4, boxY, x4, boxY + boxHeight);

    // Column 1: Document Meta
    doc.setFontSize(9);
    const metaY = boxY + 6.5;
    const rowSpacing = 6;

    // Row 1: Document
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(0, 0, 0);
    doc.text('Document', x1 + 3, metaY);
    doc.text(':', x1 + 22, metaY);
    doc.setFont('helvetica', 'bold');
    doc.text(String(docNo), x1 + 25, metaY);

    // Row 2: Date
    doc.setFont('helvetica', 'normal');
    doc.text('Date', x1 + 3, metaY + rowSpacing);
    doc.text(':', x1 + 22, metaY + rowSpacing);
    doc.setFont('helvetica', 'bold');
    doc.text(dateDocFormatted, x1 + 25, metaY + rowSpacing);

    // Row 3: Status
    doc.setFont('helvetica', 'normal');
    doc.text('Status', x1 + 3, metaY + rowSpacing * 2);
    doc.text(':', x1 + 22, metaY + rowSpacing * 2);
    doc.setFont('helvetica', 'bold');
    doc.text(statusLabel, x1 + 25, metaY + rowSpacing * 2);

    // Column 2: Prepared by
    const col2Center = x2 + col2W / 2;
    doc.setFont('helvetica', 'italic');
    doc.setFontSize(8.5);
    doc.text('Prepared by', col2Center, boxY + 4.5, { align: 'center' });

    if (preparedQrUrl) {
      const qrSize = 17;
      const qrX = col2Center - qrSize / 2;
      doc.addImage(preparedQrUrl, 'PNG', qrX, boxY + 6.5, qrSize, qrSize);
    }

    doc.setFont('helvetica', 'bolditalic');
    doc.setFontSize(7.5);
    doc.text(preparedByName, col2Center, boxY + 27.5, { align: 'center' });
    const nameWidth = doc.getTextWidth(preparedByName);
    doc.setLineWidth(0.2);
    doc.line(col2Center - nameWidth / 2, boxY + 28, col2Center + nameWidth / 2, boxY + 28);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7);
    doc.text(preparedDateStr, col2Center, boxY + 32, { align: 'center' });

    // Column 3: Checked By
    const col3Center = x3 + col3W / 2;
    doc.setFont('helvetica', 'italic');
    doc.setFontSize(8.5);
    doc.text('Checked By', col3Center, boxY + 4.5, { align: 'center' });

    if (isCheckedApproved) {
      if (checkedQrUrl) {
        const qrSize = 17;
        const qrX = col3Center - qrSize / 2;
        doc.addImage(checkedQrUrl, 'PNG', qrX, boxY + 6.5, qrSize, qrSize);
      }
      doc.setFont('helvetica', 'bolditalic');
      doc.setFontSize(7.5);
      doc.text(checkedName, col3Center, boxY + 27.5, { align: 'center' });
      const cNameW = doc.getTextWidth(checkedName);
      doc.setLineWidth(0.2);
      doc.line(col3Center - cNameW / 2, boxY + 28, col3Center + cNameW / 2, boxY + 28);

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(7);
      doc.text(checkedDateStr, col3Center, boxY + 32, { align: 'center' });
    } else if (isCheckedRejected) {
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(8.5);
      doc.setTextColor(220, 38, 38);
      doc.text('REJECTED', col3Center, boxY + 20, { align: 'center' });
      doc.setTextColor(0, 0, 0);
    } else {
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8);
      doc.setTextColor(60, 60, 60);
      doc.text('PENDING', col3Center, boxY + 20, { align: 'center' });
      doc.setTextColor(0, 0, 0);
    }

    // Column 4: Approved by
    const col4Center = x4 + col4W / 2;
    doc.setFont('helvetica', 'italic');
    doc.setFontSize(8.5);
    doc.text('Approved by', col4Center, boxY + 4.5, { align: 'center' });

    if (isAppApproved) {
      if (approvedQrUrl) {
        const qrSize = 17;
        const qrX = col4Center - qrSize / 2;
        doc.addImage(approvedQrUrl, 'PNG', qrX, boxY + 6.5, qrSize, qrSize);
      }
      doc.setFont('helvetica', 'bolditalic');
      doc.setFontSize(7.5);
      doc.text(approvedName, col4Center, boxY + 27.5, { align: 'center' });
      const aNameW = doc.getTextWidth(approvedName);
      doc.setLineWidth(0.2);
      doc.line(col4Center - aNameW / 2, boxY + 28, col4Center + aNameW / 2, boxY + 28);

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(7);
      doc.text(approvedDateStr, col4Center, boxY + 32, { align: 'center' });
    } else if (isAppRejected) {
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(8.5);
      doc.setTextColor(220, 38, 38);
      doc.text('REJECTED', col4Center, boxY + 20, { align: 'center' });
      doc.setTextColor(0, 0, 0);
    } else {
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8);
      doc.setTextColor(60, 60, 60);
      doc.text('PENDING', col4Center, boxY + 20, { align: 'center' });
      doc.setTextColor(0, 0, 0);
    }
  };

  // -------------------------------------------------------------
  // LINE ITEMS TABLE (autoTable)
  // -------------------------------------------------------------
  const tableBody = [];
  lines.forEach((l, index) => {
    const lineNum = l.line || (index + 1) * 10;
    const prodCode = l.product_code || '-';
    const prodName = l.product_name || '';
    const formattedQty = Number(l.qty || 0).toLocaleString(undefined, {
      minimumFractionDigits: 0,
      maximumFractionDigits: l.uom_precision ?? 2,
    });
    const uomName = l.uom_name || '-';
    const reqDate = formatDateRequired(l.daterequired || requisition.daterequired);
    const lineDesc = l.description || '';

    // Row 1: Code, Qty, UOM, Required, Description
    tableBody.push([
      { content: String(lineNum), styles: { halign: 'center', fontStyle: 'bold' } },
      { content: prodCode, styles: { fontStyle: 'bold' } },
      { content: formattedQty, styles: { halign: 'right' } },
      { content: uomName, styles: { halign: 'left' } },
      { content: reqDate, styles: { halign: 'left' } },
      { content: lineDesc, styles: { halign: 'left', fontSize: 7.5 } },
    ]);

    // Row 2: Product Name (below code)
    tableBody.push([
      { content: '', styles: { halign: 'center' } },
      { content: prodName, styles: { fontStyle: 'normal', fontSize: 7.5, textColor: [30, 30, 30] } },
      { content: '' },
      { content: '' },
      { content: '' },
      { content: '' },
    ]);
  });

  callAutoTable(doc, {
    startY: boxY + boxHeight + 4, // 74mm
    margin: {
      top: boxY + boxHeight + 4,  // 74mm on EVERY page
      left: marginLeft,
      right: 210 - marginRight,
      bottom: 12,
    },
    tableWidth: contentWidth,
    showHead: 'everyPage', // Repeat table column headers on every page
    head: [
      ['Line', 'Product No / Name / SO Ref.', 'Qty', 'UoM', 'Required', 'Description'],
    ],
    body: tableBody.length > 0 ? tableBody : [
      [
        { content: '-', styles: { halign: 'center' } },
        { content: 'No line items recorded on this document.' },
        { content: '' },
        { content: '' },
        { content: '' },
        { content: '' },
      ],
    ],
    theme: 'plain',
    headStyles: {
      fillColor: false,
      textColor: [0, 0, 0],
      font: 'helvetica',
      fontStyle: 'bold',
      fontSize: 8.5,
      cellPadding: { top: 2.5, bottom: 2.5, left: 1.5, right: 1.5 },
      lineWidth: { top: 0.4, bottom: 0.4 },
      lineColor: [0, 0, 0],
    },
    bodyStyles: {
      textColor: [0, 0, 0],
      font: 'helvetica',
      fontSize: 8,
      cellPadding: { top: 1, bottom: 1, left: 1.5, right: 1.5 },
    },
    columnStyles: {
      0: { cellWidth: 14, halign: 'center' },
      1: { cellWidth: 80, halign: 'left' },
      2: { cellWidth: 16, halign: 'right' },
      3: { cellWidth: 16, halign: 'left' },
      4: { cellWidth: 24, halign: 'left' },
      5: { cellWidth: 36, halign: 'left' },
    },
    didDrawCell: (data) => {
      if (data.section === 'body') {
        const isSecondRowOfPair = data.row.index % 2 === 1;
        const isLastRow = data.row.index === tableBody.length - 1;

        if (isLastRow) {
          doc.setDrawColor(0, 0, 0);
          doc.setLineWidth(0.4);
          doc.line(
            data.cell.x,
            data.cell.y + data.cell.height,
            data.cell.x + data.cell.width,
            data.cell.y + data.cell.height
          );
        } else if (isSecondRowOfPair) {
          doc.setDrawColor(220, 220, 220);
          doc.setLineWidth(0.2);
          doc.line(
            data.cell.x,
            data.cell.y + data.cell.height,
            data.cell.x + data.cell.width,
            data.cell.y + data.cell.height
          );
        }
      }
    },
  });

  // -------------------------------------------------------------
  // NOTE SECTION
  // -------------------------------------------------------------
  let finalY = doc.lastAutoTable ? doc.lastAutoTable.finalY + 6 : boxY + boxHeight + 20;
  if (finalY > 265) {
    doc.addPage();
    finalY = boxY + boxHeight + 6; // Start below header area on new page
  }

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.setTextColor(0, 0, 0);
  doc.text('Note :', marginLeft, finalY);

  const noteContent = requisition.description || options.description || '-';
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(30, 30, 30);
  const noteLines = doc.splitTextToSize(noteContent, contentWidth);
  doc.text(noteLines, marginLeft, finalY + 4.5);

  // -------------------------------------------------------------
  // DRAW HEADER & FOOTER ON EVERY PAGE
  // -------------------------------------------------------------
  const totalPages = doc.getNumberOfPages();
  const printoutTimestamp = formatPrintDateTime(new Date());

  for (let page = 1; page <= totalPages; page++) {
    doc.setPage(page);
    
    // Draw Voucher Header
    drawPageHeader(page, totalPages);

    // Draw Voucher Footer (y = 290mm)
    const footerY = 290;
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(80, 80, 80);

    // Left Footer: Static code + printout datetime
    doc.text(`API/RC/PPIC/03/02  ${printoutTimestamp}`, marginLeft, footerY);

    // Right Footer: Page X of Y
    doc.text(`Page ${page} of ${totalPages}`, marginRight, footerY, { align: 'right' });
  }

  // Return generated doc & blob URL
  const pdfBlob = doc.output('blob');
  let blobUrl = null;
  if (typeof URL !== 'undefined' && typeof URL.createObjectURL === 'function') {
    blobUrl = URL.createObjectURL(pdfBlob);
  }

  return {
    doc,
    blob: pdfBlob,
    blobUrl,
  };
};
