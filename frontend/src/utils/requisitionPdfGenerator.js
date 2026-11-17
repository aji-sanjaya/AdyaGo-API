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
  const costCenterDisplay = requisition.cost_center_name || costCenterVal;
  const titleText = `Purchase Requisition ${costCenterVal}`;

  const docNo = requisition.documentno || options.documentno || '-';
  const dateDocFormatted = formatDateDoc(requisition.datedoc || options.datedoc);
  const statusLabel = requisition.status_label || requisition.docstatus || 'Draft';
  const dateRequiredFormatted = formatDateDoc(requisition.daterequired || options.daterequired);
  const warehouseDisplay = requisition.warehouse_name || options.warehouseName || requisition.warehouse || '-';
  const descriptionText = requisition.description || options.description || '-';

  // -------------------------------------------------------------
  // DYNAMIC SIGNATURE AUTHORIZERS (FROM ADW_RequisitionAuthorizerStatus)
  // -------------------------------------------------------------
  const rawAuthorizers = options.authorizers || requisition.authorizers || [];
  let sortedAuthorizers = Array.isArray(rawAuthorizers) ? [...rawAuthorizers] : [];
  sortedAuthorizers.sort((a, b) => {
    const seqA = Number(a.sequence ?? a.seq ?? 0);
    const seqB = Number(b.sequence ?? b.seq ?? 0);
    return seqA - seqB;
  });

  // Fallback if no authorizers are found
  if (sortedAuthorizers.length === 0) {
    if (requisition.checked_by_name || requisition.approved_by_name) {
      sortedAuthorizers = [
        {
          name: 'Checked By',
          user_name: requisition.checked_by_name || 'Checked User',
          isapproved: requisition.checked_isapproved || 'IP',
          updated: requisition.checked_date || null,
          sequence: 10,
        },
        {
          name: 'Approved by',
          user_name: requisition.approved_by_name || 'Approved User',
          isapproved: requisition.approved_isapproved || 'IP',
          updated: requisition.approved_date || null,
          sequence: 20,
        },
      ];
    } else {
      sortedAuthorizers = [
        {
          name: 'Checked By',
          user_name: 'Checked User',
          isapproved: 'IP',
          sequence: 10,
        },
        {
          name: 'Approved by',
          user_name: 'Approved User',
          isapproved: 'IP',
          sequence: 20,
        },
      ];
    }
  }

  // Pre-generate QR Codes for dynamic signature list
  const preparedByName = requisition.createdby || options.createdby || 'User';
  const rawCreatedAt = requisition.created_at || requisition.created || requisition.datedoc || new Date().toISOString();
  const preparedDateStr = formatDateTime(rawCreatedAt);
  const preparedQrText = `Prepared by ${preparedByName} on ${rawCreatedAt}`;
  const preparedQrUrl = await generateQRCodeDataUrl(preparedQrText);

  const sigList = [
    {
      title: 'Prepared by',
      signerName: preparedByName,
      dateText: preparedDateStr,
      qrUrl: preparedQrUrl,
      status: 'AP',
    },
  ];

  for (const auth of sortedAuthorizers) {
    const title = auth.name || 'Authorizer';
    const signerName = auth.user_name || auth.user_description || 'Authorized User';
    const statusCode = (auth.approval_doc_status || auth.isapproved || '').toUpperCase();
    const isApproved = statusCode === 'AP' || statusCode === 'CO';
    const isRejected = statusCode === 'RE';
    const updateDate = auth.updated || auth.updated_at;

    let qrUrl = null;
    let dateText = '';
    if (isApproved && updateDate) {
      dateText = formatDateTime(updateDate);
      const qrText = `${title} by ${signerName} on ${updateDate}`;
      qrUrl = await generateQRCodeDataUrl(qrText);
    } else if (isApproved) {
      dateText = 'Approved';
    } else if (isRejected) {
      dateText = updateDate ? formatDateTime(updateDate) : '';
    }

    sigList.push({
      title,
      signerName,
      dateText,
      qrUrl,
      status: isApproved ? 'AP' : (isRejected ? 'RE' : 'IP'),
    });
  }

  // -------------------------------------------------------------
  // TOP HEADER BOX DIMENSIONS (WITH DESCRIPTION)
  // -------------------------------------------------------------
  const boxY = 34;
  const metaHeight = 16.5;

  // Split description text to fit within header box width
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  const descLines = doc.splitTextToSize(descriptionText, contentWidth - 30);
  const descHeight = Math.max(descLines.length * 3.8, 7.5);
  const boxHeight = metaHeight + descHeight + 3;

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

    // 3. Document Info & Description Box (Top Header)
    doc.setDrawColor(0, 0, 0);
    doc.setLineWidth(0.3);
    doc.rect(marginLeft, boxY, contentWidth, boxHeight);

    // Section A: Meta Info (2 Columns: Left & Right)
    const metaY = boxY + 5;
    const rowSpacing = 4.5;
    const leftColX = marginLeft + 3;
    const leftColonX = marginLeft + 24;
    const leftValX = marginLeft + 27;

    const midX = marginLeft + 96;
    const rightColX = midX;
    const rightColonX = midX + 26;
    const rightValX = midX + 29;

    // Subtle vertical divider between left & right meta columns
    doc.setDrawColor(210, 210, 210);
    doc.setLineWidth(0.2);
    doc.line(midX - 4, boxY + 1.5, midX - 4, boxY + metaHeight);

    doc.setFontSize(8.5);

    // Left Column:
    // Row 1: Document No
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(0, 0, 0);
    doc.text('Document', leftColX, metaY);
    doc.text(':', leftColonX, metaY);
    doc.setFont('helvetica', 'bold');
    doc.text(String(docNo), leftValX, metaY);

    // Row 2: Date
    doc.setFont('helvetica', 'normal');
    doc.text('Date', leftColX, metaY + rowSpacing);
    doc.text(':', leftColonX, metaY + rowSpacing);
    doc.setFont('helvetica', 'bold');
    doc.text(dateDocFormatted, leftValX, metaY + rowSpacing);

    // Row 3: Status
    doc.setFont('helvetica', 'normal');
    doc.text('Status', leftColX, metaY + rowSpacing * 2);
    doc.text(':', leftColonX, metaY + rowSpacing * 2);
    doc.setFont('helvetica', 'bold');
    doc.text(statusLabel, leftValX, metaY + rowSpacing * 2);

    // Right Column:
    // Row 1: Cost Center
    doc.setFont('helvetica', 'normal');
    doc.text('Cost Center', rightColX, metaY);
    doc.text(':', rightColonX, metaY);
    doc.setFont('helvetica', 'bold');
    doc.text(String(costCenterDisplay), rightValX, metaY);

    // Row 2: Date Required
    doc.setFont('helvetica', 'normal');
    doc.text('Date Required', rightColX, metaY + rowSpacing);
    doc.text(':', rightColonX, metaY + rowSpacing);
    doc.setFont('helvetica', 'bold');
    doc.text(dateRequiredFormatted, rightValX, metaY + rowSpacing);

    // Row 3: Warehouse
    doc.setFont('helvetica', 'normal');
    doc.text('Warehouse', rightColX, metaY + rowSpacing * 2);
    doc.text(':', rightColonX, metaY + rowSpacing * 2);
    doc.setFont('helvetica', 'bold');
    doc.text(String(warehouseDisplay), rightValX, metaY + rowSpacing * 2);

    // Horizontal divider before Description
    doc.setDrawColor(0, 0, 0);
    doc.setLineWidth(0.25);
    doc.line(marginLeft, boxY + metaHeight, marginRight, boxY + metaHeight);

    // Section B: Description
    const descY = boxY + metaHeight + 4.2;
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8.5);
    doc.setTextColor(0, 0, 0);
    doc.text('Description', leftColX, descY);
    doc.text(':', leftColonX, descY);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(20, 20, 20);
    doc.text(descLines, leftValX, descY);
  };

  // -------------------------------------------------------------
  // FUNCTION TO DRAW DYNAMIC SIGNATURE FOOTER BOX
  // -------------------------------------------------------------
  const drawSignatureFooter = () => {
    const sigBoxY = 252;
    const sigBoxHeight = 32;
    const numCols = sigList.length;
    const sigColWidth = contentWidth / numCols;

    // Outer rectangle
    doc.setDrawColor(0, 0, 0);
    doc.setLineWidth(0.3);
    doc.rect(marginLeft, sigBoxY, contentWidth, sigBoxHeight);

    // Vertical dividers between columns
    for (let i = 1; i < numCols; i++) {
      const divX = marginLeft + i * sigColWidth;
      doc.line(divX, sigBoxY, divX, sigBoxY + sigBoxHeight);
    }

    // Render each column
    sigList.forEach((col, idx) => {
      const colLeft = marginLeft + idx * sigColWidth;
      const centerX = colLeft + sigColWidth / 2;

      // 1. Column Title (Prepared by, Checked By, Approved By, Legalized By, etc.)
      doc.setFont('helvetica', 'italic');
      doc.setFontSize(8.5);
      doc.setTextColor(0, 0, 0);
      doc.text(col.title, centerX, sigBoxY + 4.5, { align: 'center' });

      // 2. Middle area: QR code OR Status text (PENDING / REJECTED)
      if (col.qrUrl) {
        const qrSize = 14.5;
        const qrX = centerX - qrSize / 2;
        const qrY = sigBoxY + 6;
        doc.addImage(col.qrUrl, 'PNG', qrX, qrY, qrSize, qrSize);
      } else if (col.status === 'RE') {
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(8);
        doc.setTextColor(220, 38, 38);
        doc.text('REJECTED', centerX, sigBoxY + 15, { align: 'center' });
        doc.setTextColor(0, 0, 0);
      } else {
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(8);
        doc.setTextColor(110, 110, 110);
        doc.text('PENDING', centerX, sigBoxY + 15, { align: 'center' });
        doc.setTextColor(0, 0, 0);
      }

      // 3. Signer Name (Bold italic, underlined)
      doc.setFont('helvetica', 'bolditalic');
      doc.setFontSize(7.5);
      doc.setTextColor(0, 0, 0);
      const nameY = sigBoxY + 24.5;
      doc.text(col.signerName, centerX, nameY, { align: 'center' });

      const nameWidth = Math.min(doc.getTextWidth(col.signerName), sigColWidth - 4);
      doc.setLineWidth(0.2);
      doc.line(centerX - nameWidth / 2, nameY + 0.8, centerX + nameWidth / 2, nameY + 0.8);

      // 4. Date text below name
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(7);
      doc.setTextColor(50, 50, 50);
      if (col.dateText) {
        doc.text(col.dateText, centerX, sigBoxY + 29.5, { align: 'center' });
      }
    });
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
    startY: boxY + boxHeight + 3.5,
    margin: {
      top: boxY + boxHeight + 3.5,
      left: marginLeft,
      right: 210 - marginRight,
      bottom: 46, // Space reserved at bottom to avoid overlapping footer signature box
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
  // DRAW HEADER, FOOTER SIGNATURES & RUNNING FOOTER ON EVERY PAGE
  // -------------------------------------------------------------
  const totalPages = doc.getNumberOfPages();
  const printoutTimestamp = formatPrintDateTime(new Date());

  for (let page = 1; page <= totalPages; page++) {
    doc.setPage(page);
    
    // Draw Voucher Header (Company logo, title, metadata & description)
    drawPageHeader(page, totalPages);

    // Draw Dynamic Signature Box in footer on the last page
    if (page === totalPages) {
      drawSignatureFooter();
    }

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
