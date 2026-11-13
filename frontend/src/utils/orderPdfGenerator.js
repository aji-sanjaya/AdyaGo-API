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
 * Format date as "13 Nov 2026" (matches Carbon d M Y in Laravel)
 */
export const formatDateDMY = (dateStr) => {
  if (!dateStr) return '';
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

/**
 * Format date & time as "13 Nov 2026 14:35" (matches Carbon d M Y H:i in Laravel)
 */
export const formatDateTimeDMY = (dateStr) => {
  if (!dateStr) return '';
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return String(dateStr);
    const day = String(d.getDate()).padStart(2, '0');
    const months = [
      'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
      'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec',
    ];
    const hours = String(d.getHours()).padStart(2, '0');
    const mins = String(d.getMinutes()).padStart(2, '0');
    return `${day} ${months[d.getMonth()]} ${d.getFullYear()} ${hours}:${mins}`;
  } catch {
    return String(dateStr);
  }
};

/**
 * Number formatting with standard thousands comma and decimal places
 */
export const formatNumber = (val, decimals = 2) => {
  if (val === null || val === undefined || isNaN(val)) {
    return Number(0).toLocaleString('en-US', {
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals,
    });
  }
  return Number(val).toLocaleString('en-US', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
};

/**
 * Backwards compatibility helper
 */
export const formatDateDoc = formatDateDMY;
export const formatCurrencyIDR = (val) => `Rp ${formatNumber(val, 0)}`;

/**
 * Generate QR code data URL asynchronously
 */
const generateQRCodeDataUrl = async (text) => {
  if (!text) return null;
  try {
    const fn = typeof toDataURL === 'function' ? toDataURL : (QRCode?.toDataURL || QRCode?.default?.toDataURL);
    if (!fn) return null;
    return await fn(text, {
      width: 100,
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
 * Generate Purchase Order PDF identical to api-web-portal-v2 (pdf.blade.php)
 * @param {Object} order - Order header details
 * @param {Array} lines - Order line items
 * @param {Object} options - Additional options / fallbacks
 * @returns {Promise<{ blob: Blob, blobUrl: string, doc: jsPDF }>}
 */
export const generateOrderPdf = async (order = {}, lines = [], options = {}) => {
  const JsPDFClass = getJsPDF();
  const doc = new JsPDFClass({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  const pageWidth = doc.internal.pageSize.getWidth(); // 210mm
  const pageHeight = doc.internal.pageSize.getHeight(); // 297mm
  const marginLeft = 12;
  const marginRight = pageWidth - marginLeft; // 198mm
  const contentWidth = marginRight - marginLeft; // 186mm

  // -------------------------------------------------------------
  // RESOLVE HEADER DATA (MATCHING LARAVEL CONTROLLER)
  // -------------------------------------------------------------
  const clientName = order?.client_name || options?.clientName || idempiereConfig?.tenant?.name || 'PT. Adyawinsa Plastics Industry';

  // Org address (Invoice To)
  const orgAddress1 = order?.org_address1 || (order?.address_lines && order.address_lines[0]) || 'Jl. Angsana Raya Blok L6 No. 1, Delta Silicon I';
  const orgAddress2 = order?.org_address2 || (order?.address_lines && order.address_lines[1]) || 'Lippo Cikarang, Cikarang Selatan';
  const orgAddress3 = order?.org_address3 || (order?.address_lines && order.address_lines[2]) || '';
  const orgCity = order?.org_city || (order?.address_lines && order.address_lines[3]?.split(' ')[0]) || 'Kabupaten Bekasi';
  const orgPostal = order?.org_postal || (order?.address_lines && order.address_lines[3]?.split(' ')[1]) || '17530';
  const orgTaxID = order?.org_taxid || options?.orgTaxID || '01.745.244.7-413.000';

  // Vendor Details (Order To)
  const vendorName = order?.bpartner_name || order?.vendor_name || options?.vendorName || '-';
  const vendorAddress1 = order?.vendor_address1 || options?.vendorAddress1 || '';
  const vendorAddress2 = order?.vendor_address2 || options?.vendorAddress2 || '';
  const vendorCity = order?.vendor_city || options?.vendorCity || '';
  const vendorContact = order?.contact_name || order?.vendor_contact || options?.vendorContact || '-';
  const vendorPhone = order?.vendor_phone || options?.vendorPhone || '-';
  const paymentTerm = order?.paymentterm_name || order?.payment_term_name || options?.paymentTerm || '-';

  // PO Meta
  const documentNo = order?.documentno || options?.documentno || 'DRAFT';
  const dateOrdered = formatDateDMY(order?.dateordered || options?.dateordered);
  const currencyCode = order?.currency_code || options?.currencyCode || 'IDR';
  const pricePrecision = typeof order?.price_precision === 'number' ? order.price_precision : (options?.priceListPrecision || 2);

  // Logo Resolution
  const clientLogo = order?.logo_base64 || options?.logo_base64 || options?.logoBase64 || LOGO_ADW_BASE64;
  let logoWidth = 34;
  let logoHeight = 16.8;
  if (clientLogo) {
    try {
      const props = doc.getImageProperties(clientLogo);
      if (props && props.width && props.height) {
        const ratio = props.height / props.width;
        logoWidth = 34;
        logoHeight = logoWidth * ratio;
        if (logoHeight > 16) {
          logoHeight = 16;
          logoWidth = logoHeight / ratio;
        }
      }
    } catch (e) {
      logoWidth = 34;
      logoHeight = 16.8;
    }
  }

  // Pre-generate QR Codes for Signatures (matching Laravel)
  const preparedBy = order?.createdby_name || order?.created_by_name || options?.preparedBy || 'Staff';
  const rawCreatedAt = order?.created_at || order?.created || order?.dateordered || new Date().toISOString();
  const preparedDate = formatDateTimeDMY(rawCreatedAt);
  const preparedQrText = `Prepared by ${preparedBy} on ${rawCreatedAt}`;
  const preparedQr = await generateQRCodeDataUrl(preparedQrText);

  const checkedBy = order?.checkedby_name || options?.checkedBy || null;
  let checkedDate = 'Pending';
  let checkedQr = null;
  if (checkedBy) {
    if (order?.checked_date) {
      checkedDate = formatDateTimeDMY(order.checked_date);
      checkedQr = await generateQRCodeDataUrl(`Checked by ${checkedBy} on ${order.checked_date}`);
    } else if (order?.checked_isapproved === 'RE') {
      checkedDate = 'Rejected';
    }
  }

  const approvedBy = order?.approvedby_name || options?.approvedBy || null;
  let approvedDate = 'Pending';
  let approvedQr = null;
  if (approvedBy) {
    if (order?.approved_date) {
      approvedDate = formatDateTimeDMY(order.approved_date);
      approvedQr = await generateQRCodeDataUrl(`Approved by ${approvedBy} on ${order.approved_date}`);
    } else if (order?.approved_isapproved === 'RE') {
      approvedDate = 'Rejected';
    }
  }

  // -------------------------------------------------------------
  // HEADER GEOMETRY & PRE-CALCULATIONS (USED ON EVERY PAGE)
  // -------------------------------------------------------------
  const headerTopY = 12;
  const infoBoxY = 40;
  const colWidth = contentWidth / 2; // 93mm
  const infoBoxHeight = 46;
  const headerBottomY = infoBoxY + infoBoxHeight + 4; // 90mm

  // Pre-calculate multiline texts for the info box to avoid redundant calculations
  const vendorFullAddr = [vendorAddress1, [vendorAddress2, vendorCity].filter(Boolean).join(' ')].filter(Boolean).join('\n') || '-';
  const splitVendorAddr = doc.splitTextToSize(vendorFullAddr, colWidth - 35);

  const cityPostalText = trim([orgCity, orgPostal].filter(Boolean).join(', '));
  const invoiceAddr = [orgAddress1, orgAddress2, orgAddress3, cityPostalText].filter(Boolean).join('\n');
  const splitInvAddr = doc.splitTextToSize(invoiceAddr, colWidth - 33);

  /**
   * Draws the full corporate header on the active page
   * Includes: Tenant name, address lines, logo, document title, and 2-column Info Box
   */
  const drawPageHeader = (pageNumber, totalPages) => {
    // 1. Company Name & Address (Top Left)
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(13);
    doc.setTextColor(0, 0, 0);
    doc.text(clientName, marginLeft, headerTopY + 4);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.setTextColor(0, 0, 0);
    let addrY = headerTopY + 8.5;

    if (orgAddress1) {
      doc.text(orgAddress1, marginLeft, addrY);
      addrY += 4;
    }
    if (orgAddress2) {
      doc.text(orgAddress2, marginLeft, addrY);
      addrY += 4;
    }
    if (orgAddress3) {
      doc.text(orgAddress3, marginLeft, addrY);
      addrY += 4;
    }
    if (cityPostalText) {
      doc.text(cityPostalText, marginLeft, addrY);
      addrY += 4;
    }

    // 2. Logo & Document Title (Top Right)
    let rightY = headerTopY;
    if (clientLogo) {
      try {
        const logoX = marginRight - logoWidth;
        const imgFormat = clientLogo.startsWith('data:image/jpeg') || clientLogo.startsWith('data:image/jpg') ? 'JPEG' : 'PNG';
        doc.addImage(clientLogo, imgFormat, logoX, rightY, logoWidth, logoHeight);
        rightY += logoHeight + 3;
      } catch (err) {
        console.warn('Failed to embed client logo:', err);
        rightY += 5;
      }
    } else {
      rightY += 5;
    }

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(14);
    doc.setTextColor(0, 0, 0);
    doc.text('Purchase Order', marginRight, rightY + 3, { align: 'right' });

    // 3. Info Box (.info-container: 2 Columns with 1px black border)
    doc.setDrawColor(0, 0, 0);
    doc.setLineWidth(0.3);
    doc.rect(marginLeft, infoBoxY, contentWidth, infoBoxHeight, 'S');
    doc.line(marginLeft + colWidth, infoBoxY, marginLeft + colWidth, infoBoxY + infoBoxHeight);

    const drawRow = (x, y, label, val, isBold = false, labelW = 28) => {
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(8.5);
      doc.setTextColor(0, 0, 0);
      doc.text(label, x, y);
      doc.text(':', x + labelW, y);

      doc.setFont('helvetica', isBold ? 'bold' : 'normal');
      doc.setTextColor(0, 0, 0);
      doc.text(String(val || '-'), x + labelW + 3, y);
    };

    // --- Left Column: Order to ---
    const leftX = marginLeft + 3;
    let curLeftY = infoBoxY + 5;

    drawRow(leftX, curLeftY, 'Order to', vendorName, true, 28);
    curLeftY += 5;

    // Address (multiline)
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8.5);
    doc.text('Address', leftX, curLeftY);
    doc.text(':', leftX + 28, curLeftY);
    doc.setFont('helvetica', 'normal');
    doc.text(splitVendorAddr, leftX + 31, curLeftY);
    curLeftY += (splitVendorAddr.length * 3.8) + 1.5;

    drawRow(leftX, curLeftY, 'Contact Person', vendorContact, false, 28);
    curLeftY += 5;

    drawRow(leftX, curLeftY, 'Phone', vendorPhone, false, 28);
    curLeftY += 5;

    drawRow(leftX, curLeftY, 'Term Of Payment', paymentTerm, false, 28);

    // --- Right Column: PO Number, Date, Invoice To, NPWP ---
    const rightX = marginLeft + colWidth + 3;
    let curRightY = infoBoxY + 5;

    drawRow(rightX, curRightY, 'PO Number', documentNo, false, 26);
    curRightY += 5;

    drawRow(rightX, curRightY, 'Date', dateOrdered, false, 26);
    curRightY += 5;

    // Invoice To (multiline)
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8.5);
    doc.text('Invoice To', rightX, curRightY);
    doc.text(':', rightX + 26, curRightY);
    doc.text(clientName, rightX + 29, curRightY);
    curRightY += 4;

    doc.setFont('helvetica', 'normal');
    doc.text(splitInvAddr, rightX + 29, curRightY);
    curRightY += (splitInvAddr.length * 3.6) + 3;

    drawRow(rightX, curRightY, 'NPWP', orgTaxID || '-', false, 26);
  };

  // -------------------------------------------------------------
  // ITEMS TABLE (.items-table WITH TOP & BOTTOM BLACK BORDERS)
  // -------------------------------------------------------------
  let subTotal = 0;
  const tableRows = (lines || []).map((line, idx) => {
    const lineAmt = typeof line.linenetamt === 'number'
      ? line.linenetamt
      : ((line.qtyentered || line.qtyordered || 0) * (line.priceactual || line.priceentered || 0));
    subTotal += lineAmt;

    const prodVal = line.product_value || line.product_code || '';
    const prodName = line.product_name || line.charge_name || '';
    const prodDisplay = prodVal && prodName ? `${prodVal}\n${prodName}` : (prodVal || prodName || '-');

    const deliveryDate = line.datepromised
      ? formatDateDMY(line.datepromised)
      : (order?.datepromised ? formatDateDMY(order.datepromised) : '');

    const qtyVal = formatNumber(line.qtyentered ?? line.qtyordered ?? line.qty ?? 0, 0);
    const uomVal = line.uomsymbol || line.uom_symbol || line.uom_name || '';

    const priceVal = line.priceactual ?? line.priceentered ?? 0;
    const priceFormatted = formatNumber(priceVal, Math.max(pricePrecision, 2));
    const amountFormatted = formatNumber(lineAmt, 2);

    return [
      idx + 1,
      prodDisplay,
      deliveryDate,
      qtyVal,
      uomVal,
      priceFormatted,
      amountFormatted,
    ];
  });

  if (tableRows.length === 0) {
    tableRows.push(['1', 'No line items recorded', '-', '0', '-', '0.00', '0.00']);
  }

  callAutoTable(doc, {
    startY: headerBottomY,
    margin: {
      top: headerBottomY, // 90mm on EVERY page so overflowing lines start cleanly below header
      left: marginLeft,
      right: pageWidth - marginRight,
      bottom: 14,
    },
    tableWidth: contentWidth,
    showHead: 'everyPage', // Repeat table column headers on every page
    head: [
      ['NO', 'Product', 'Delivery', 'Qty', 'UOM', 'Price', 'Amount'],
    ],
    body: tableRows,
    theme: 'plain',
    headStyles: {
      fillColor: false,
      textColor: [0, 0, 0],
      fontStyle: 'bold',
      fontSize: 9,
      cellPadding: { top: 2.5, bottom: 2.5, left: 1.5, right: 1.5 },
      lineWidth: { top: 0.5, bottom: 0.5, left: 0, right: 0 },
      lineColor: [0, 0, 0],
    },
    bodyStyles: {
      textColor: [0, 0, 0],
      fontSize: 8.5,
      cellPadding: { top: 2.5, bottom: 2.5, left: 1.5, right: 1.5 },
      lineWidth: 0,
    },
    columnStyles: {
      0: { cellWidth: 10, halign: 'left' },
      1: { cellWidth: 64, halign: 'left' },
      2: { cellWidth: 24, halign: 'left' },
      3: { cellWidth: 15, halign: 'right' },
      4: { cellWidth: 16, halign: 'left' },
      5: { cellWidth: 28, halign: 'right' },
      6: { cellWidth: 29, halign: 'right' },
    },
    didDrawPage: (data) => {
      // Draw solid border line at bottom of the items table
      doc.setDrawColor(0, 0, 0);
      doc.setLineWidth(0.5);
      doc.line(marginLeft, data.cursor.y, marginRight, data.cursor.y);
    },
  });

  let currentY = doc.lastAutoTable.finalY + 3;

  // -------------------------------------------------------------
  // TOTALS + NOTES SECTION (.notes-section & .totals-table)
  // -------------------------------------------------------------
  // Calculate Totals matching Laravel
  const taxAmount = typeof order?.taxamt === 'number'
    ? order.taxamt
    : (order?.taxes && order.taxes[0] ? order.taxes.reduce((acc, t) => acc + (t.taxamt || 0), 0) : 0);

  const taxName = order?.tax_name || (order?.taxes && order.taxes[0]?.tax_name) || '';
  const taxRate = order?.tax_rate || (order?.taxes && order.taxes[0]?.tax_rate) || 0;
  let taxLabel = 'Non PPN';
  if (taxName) {
    taxLabel = (taxName.toLowerCase() === 'standard' || taxName.toLowerCase() === 'ppn')
      ? `PPN (${taxRate || 11}%)`
      : taxName;
  }

  const withholdingTotal = Number(order?.adw_withholdingamount || order?.withholdingamount || 0);
  const grandTotal = subTotal + taxAmount - withholdingTotal;

  // Check if Totals + Provisions + Signatures fit on current page; otherwise add new page
  if (currentY > pageHeight - 85) {
    doc.addPage();
    currentY = headerBottomY;
  }

  const totalsTableWidth = 95;
  const totalsStartX = marginRight - totalsTableWidth;
  const notesWidth = contentWidth - totalsTableWidth - 8;

  // Notes on left (width ~42%)
  const notesY = currentY + 3;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(0, 0, 0);
  doc.text('Note :', marginLeft, notesY);

  const orderDesc = trim(order?.description || '');
  if (orderDesc) {
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8.5);
    const splitNotes = doc.splitTextToSize(orderDesc, notesWidth);
    doc.text(splitNotes, marginLeft, notesY + 4.5);
  }

  // Totals on right (width ~58%)
  let curTotalsY = currentY + 3;
  const currencyColX = totalsStartX + 30; // Fixed X position so ": IDR" aligns vertically across all rows

  const drawTotalRow = (label, amtStr, isGrandTotal = false, isPPh = false) => {
    // 1. Row Label (e.g. Total Amount, PPN, PPh23, Grand Total)
    doc.setFont('helvetica', isGrandTotal ? 'bold' : 'normal');
    doc.setFontSize(9);
    doc.setTextColor(0, 0, 0);
    doc.text(label, totalsStartX, curTotalsY);

    // 2. Colon & Currency code aligned at exact same X position
    doc.setFont('helvetica', isGrandTotal ? 'bold' : 'normal');
    doc.text(`: ${currencyCode}`, currencyColX, curTotalsY);

    // 3. Amount right-aligned to marginRight
    if (isPPh) {
      doc.setTextColor(192, 86, 33); // #c05621
      doc.setFont('helvetica', 'normal');
    } else if (isGrandTotal) {
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(0, 0, 0);
    } else {
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(0, 0, 0);
    }
    doc.text(amtStr, marginRight, curTotalsY, { align: 'right' });
    curTotalsY += 5;
  };

  drawTotalRow('Total Amount', formatNumber(subTotal, 2));
  drawTotalRow(taxLabel, formatNumber(taxAmount, 2));

  if (withholdingTotal > 0) {
    drawTotalRow('PPh23', `(${formatNumber(withholdingTotal, 2)})`, false, true);
  }

  // Separator line before Grand Total with proper padding above and below
  const lineY = curTotalsY - 0.5;
  doc.setDrawColor(0, 0, 0);
  doc.setLineWidth(0.3);
  doc.line(totalsStartX, lineY, marginRight, lineY);

  // Spacing below the separator line so the Grand Total text does not collide with the border
  curTotalsY = lineY + 5.5;
  drawTotalRow('Grand Total', formatNumber(grandTotal, 2), true);

  currentY = Math.max(curTotalsY + 2, notesY + 18);

  // -------------------------------------------------------------
  // GENERAL PROVISION
  // -------------------------------------------------------------
  if (currentY > pageHeight - 55) {
    doc.addPage();
    currentY = headerBottomY;
  }

  doc.setFont('helvetica', 'italic');
  doc.setFontSize(8.5);
  doc.setTextColor(0, 0, 0);
  doc.text('General Provision:', marginLeft, currentY);
  currentY += 4;

  const provisions = [
    '1. Payments will be scheduled every 28th after due.',
    '2. Good which are not meet with the requirement (specification and condition), will be returned.',
    '3. For payment purpose, please attach this purchase order in your invoice.',
    '4. Field this Purchase Order number in your delivery order.',
    '5. Invoice will be received at 10:00 - 15:00 PM every Monday & Thursday.',
    '6. Delivery product will be received under 15:00 PM every work day.',
  ];

  doc.setFontSize(8);
  provisions.forEach((prov) => {
    doc.text(prov, marginLeft + 2, currentY);
    currentY += 3.8;
  });

  currentY += 4;

  // -------------------------------------------------------------
  // SIGNATURE SECTION (.signature-table: 4 EQUAL COLUMNS)
  // -------------------------------------------------------------
  if (currentY > pageHeight - 45) {
    doc.addPage();
    currentY = headerBottomY;
  }

  const sigColWidth = contentWidth / 4; // 46.5mm
  const sigBoxY = currentY;

  // Helper to render signature column
  const renderSigColumn = (idx, title, qrDataUrl, signerName, dateText, isSupplier = false) => {
    const colX = marginLeft + idx * sigColWidth;
    const centerX = colX + sigColWidth / 2;

    // Title
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8.5);
    doc.setTextColor(0, 0, 0);
    if (title) {
      doc.text(title, centerX, sigBoxY + 3, { align: 'center' });
    }

    // QR Code or Empty gap
    const qrSize = 16;
    const qrY = sigBoxY + 5;
    if (qrDataUrl) {
      try {
        doc.addImage(qrDataUrl, 'PNG', centerX - qrSize / 2, qrY, qrSize, qrSize);
      } catch (err) {
        console.warn('Failed to embed signature QR:', err);
      }
    }

    // Underline line
    const lineY = qrY + qrSize + 2;
    doc.setDrawColor(0, 0, 0);
    doc.setLineWidth(0.3);
    doc.line(centerX - 17, lineY, centerX + 17, lineY);

    // Signer Name
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    doc.setTextColor(0, 0, 0);
    if (signerName && !isSupplier) {
      doc.text(signerName, centerX, lineY + 3.8, { align: 'center' });
    } else if (isSupplier) {
      doc.text('Supplier', centerX, lineY + 3.8, { align: 'center' });
    }

    // Date / Status
    if (dateText && !isSupplier) {
      doc.setFont('helvetica', 'italic');
      doc.setFontSize(7);
      doc.setTextColor(0, 0, 0);
      doc.text(`(${dateText})`, centerX, lineY + 7.2, { align: 'center' });
    }
  };

  renderSigColumn(0, 'Prepared By', preparedQr, preparedBy, preparedDate);
  renderSigColumn(1, 'Checked By', checkedQr, checkedBy || '..................', checkedDate);
  renderSigColumn(2, 'Approved By', approvedQr, approvedBy || '..................', approvedDate);
  renderSigColumn(3, '', null, '', '', true);

  // -------------------------------------------------------------
  // DRAW HEADER & FOOTER ON EVERY PAGE
  // -------------------------------------------------------------
  const totalPages = doc.internal.getNumberOfPages();
  for (let page = 1; page <= totalPages; page++) {
    doc.setPage(page);

    // Draw full voucher header (Tenant, Logo, Title, Info Box with Order To & PO Number)
    drawPageHeader(page, totalPages);

    // Draw Footer Page Numbering: Page {PAGE_NUM} of {PAGE_COUNT}
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(0, 0, 0);
    doc.text(`Page ${page} of ${totalPages}`, marginLeft, pageHeight - 8);
  }

  const blob = doc.output('blob');
  const blobUrl = URL.createObjectURL(blob);

  return { doc, blob, blobUrl };
};

// Simple string trim helper
function trim(str) {
  return str ? String(str).trim() : '';
}
