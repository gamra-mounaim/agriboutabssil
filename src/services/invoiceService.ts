import { jsPDF } from 'jspdf';

export const formatNumber = (val: any) => {
  if (val === undefined || val === null) return '0';
  const num = typeof val === 'number' ? val : parseFloat(val);
  if (isNaN(num)) return '0';
  const rounded = Math.round(num * 100) / 100;
  const parts = rounded.toString().split('.');
  parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, " ");
  return parts.join('.');
};
import autoTable from 'jspdf-autotable';
import { SHOP_DETAILS } from '../constants';
import { translations } from '../translations';

interface InvoiceItem {
  name: string;
  qty: number;
  price: number;
}

interface InvoiceData {
  saleId: string;
  invoiceNumber?: number;
  date: string;
  items: InvoiceItem[];
  total: number;
  subtotal?: number;
  discount?: number;
  clientName?: string;
  clientPhone?: string;
  clientAddress?: string;
  staffName?: string;
  paymentMethod?: string;
  paymentStatus?: 'PAID' | 'CREDIT' | 'PARTIAL';
  notes?: string;
  checkNumber?: string;
  checkOwner?: string;
  checkAmount?: number;
  cashAmount?: number;
}

// Helper to render text (especially Arabic) to a high-quality data URL via canvas
const renderTextToImg = (text: string, options: { size: number, bold?: boolean, color?: string, align?: string }): string => {
  const { size, bold = false, color = '#1a1a1a', align = 'right' } = options;
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  if (!ctx) return '';

  // Use a scale factor for higher resolution
  const scale = 4;
  const fontSize = size * scale;
  
  // Try to use a font that likely has Arabic support on the system
  ctx.font = `${bold ? 'bold' : 'normal'} ${fontSize}px "Inter", "Segoe UI", "Tahoma", "Arial", sans-serif`;
  
  const metrics = ctx.measureText(text);
  const padding = 10;
  canvas.width = metrics.width + padding;
  canvas.height = fontSize * 1.5;

  // Re-set font after canvas resize
  ctx.font = `${bold ? 'bold' : 'normal'} ${fontSize}px "Inter", "Segoe UI", "Tahoma", "Arial", sans-serif`;
  ctx.fillStyle = color;
  ctx.textBaseline = 'middle';
  
  // Clean background (transparent)
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  
  // Draw text
  ctx.fillText(text, padding / 2, canvas.height / 2);
  
  return canvas.toDataURL('image/png');
};

const containsArabic = (text: string) => /[\u0600-\u06FF]/.test(text);

const prepareArabicCell = (data: any) => {
  if (data.cell.text && data.cell.text.length > 0) {
    const text = data.cell.text.join(' ');
    if (containsArabic(text)) {
      data.cell.rawArabicText = text;
      data.cell.text = []; // Clear text so autoTable doesn't render it garbled
    }
  }
};

const drawArabicCell = (doc: jsPDF, data: any, color?: string) => {
  if (data.cell.rawArabicText) {
    const textColor = color || (data.section === 'head' ? '#ffffff' : '#1a1a1a');
    const imgData = renderTextToImg(data.cell.rawArabicText, { 
      size: data.cell.styles.fontSize || 9, 
      bold: data.cell.styles.fontStyle === 'bold', 
      color: textColor 
    });
    const imgProps = (doc as any).getImageProperties(imgData);
    const padding = 2;
    const cellW = data.cell.width - padding * 2;
    const cellH = data.cell.height - padding * 2;
    
    let finalH = cellH;
    let finalW = (imgProps.width * finalH) / imgProps.height;
    
    if (finalW > cellW) {
      finalW = cellW;
      finalH = (imgProps.height * finalW) / imgProps.width;
    }

    const x = data.cell.x + (data.cell.width - finalW) / 2;
    const y = data.cell.y + (data.cell.height - finalH) / 2;
    
    doc.addImage(imgData, 'PNG', x, y, finalW, finalH);
  }
};

export const generateInvoicePDF = (data: InvoiceData, language: string = 'en', settings?: any, isProforma: boolean = false) => {
  const doc = new jsPDF('p', 'mm', 'a4');
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 15;

  // Header Left: Shop Branding & Coordinates
  const shopName = settings?.shopName || settings?.shop_name || SHOP_DETAILS.name || 'AGRI BOUTABSSIL';
  const shopAddress = settings?.shopAddress || settings?.shop_address || SHOP_DETAILS.address || '15, Avenue des FAR, Quartier Industriel, Agadir, Maroc';
  const shopPhone = settings?.shopPhone || settings?.shop_phone || SHOP_DETAILS.phone || '05 28 84 12 34';
  const shopEmail = settings?.shopEmail || settings?.shop_email || SHOP_DETAILS.email || 'contact@agriboutabssil.ma';

  let brandX = margin;
  if (SHOP_DETAILS.logo) {
    try {
      doc.addImage(SHOP_DETAILS.logo, 'PNG', margin, 14, 13, 13);
      brandX = margin + 16;
    } catch {
      try {
        doc.addImage(SHOP_DETAILS.logo, 'JPEG', margin, 14, 13, 13);
        brandX = margin + 16;
      } catch (e) {
        brandX = margin;
      }
    }
  }

  // Shop Name & Tagline
  doc.setFontSize(16);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(22, 101, 52); // Forest/Emerald
  doc.text(shopName, brandX, 19);

  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(71, 85, 105);
  doc.text(shopAddress, brandX, 24);
  doc.text(`Tél: ${shopPhone}`, brandX, 28.5);
  doc.text(`Email: ${shopEmail}`, brandX, 33);

  // Header Right: Document Title & Numbers
  const docTitle = isProforma ? 'BON DE PRÉPARATION' : 'FACTURE';
  doc.setFontSize(20);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(15, 23, 42);
  doc.text(docTitle, pageWidth - margin, 19, { align: 'right' });

  const invoiceNum = isProforma
    ? (data.invoiceNumber ? `DEV-${data.invoiceNumber}` : data.saleId.slice(0, 8).toUpperCase())
    : (data.invoiceNumber ? `INV-${data.invoiceNumber.toString().padStart(5, '0')}` : data.saleId.slice(0, 8).toUpperCase());

  doc.setFontSize(9);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(51, 65, 85);
  doc.text(`N° Facture: ${invoiceNum}`, pageWidth - margin, 26, { align: 'right' });

  const invoiceDate = data.date ? new Date(data.date) : new Date();
  const dateStr = invoiceDate.toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric' });
  doc.setFontSize(8.5);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(100, 116, 139);
  doc.text(`Date: ${dateStr}`, pageWidth - margin, 31, { align: 'right' });

  // Client Information Card (Right aligned underneath date/invoice number)
  const walkingCustomers = [
    translations.en.walkingCustomer,
    translations.fr.walkingCustomer,
    translations.ar.walkingCustomer,
    'Client Passager'
  ];

  const hasClient = data.clientName && data.clientName.trim() !== '' && !walkingCustomers.includes(data.clientName);
  const clientDisplayName = hasClient ? data.clientName! : 'Client Passager';
  const clientPhone = data.clientPhone && data.clientPhone.trim() !== '' ? data.clientPhone : null;
  const clientAddress = data.clientAddress && data.clientAddress.trim() !== '' ? data.clientAddress : null;

  const clientBoxW = 90;
  const clientBoxX = pageWidth - margin - clientBoxW;
  const clientBoxY = 38;
  
  let clientBoxH = 18;
  if (clientAddress) clientBoxH += 5;
  if (clientPhone) clientBoxH += 6;

  // Background Box
  doc.setFillColor(248, 250, 252);
  doc.setDrawColor(226, 232, 240);
  doc.roundedRect(clientBoxX, clientBoxY, clientBoxW, clientBoxH, 2.5, 2.5, 'FD');

  let currentClientTextY = clientBoxY + 5.5;

  // Client Name Row
  doc.setFontSize(8.5);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(71, 85, 105);
  doc.text('Client: ', clientBoxX + 4, currentClientTextY);

  if (containsArabic(clientDisplayName)) {
    const clientImg = renderTextToImg(clientDisplayName, { size: 10, bold: true, color: '#0f172a' });
    const clientImgProps = (doc as any).getImageProperties(clientImg);
    const imgH = 4;
    const imgW = Math.min((clientImgProps.width * imgH) / clientImgProps.height, clientBoxW - 22);
    doc.addImage(clientImg, 'PNG', clientBoxX + 16, currentClientTextY - 3.2, imgW, imgH);
  } else {
    doc.setFontSize(9.5);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(15, 23, 42);
    doc.text(clientDisplayName, clientBoxX + 16, currentClientTextY);
  }

  // Client Address Row (if available)
  if (clientAddress) {
    currentClientTextY += 5;
    doc.setFontSize(8);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(100, 116, 139);
    doc.text(`Adresse: ${clientAddress}`, clientBoxX + 4, currentClientTextY);
  }

  // Client Phone Row (Prominent)
  if (clientPhone) {
    currentClientTextY += 6;
    doc.setFontSize(9);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(15, 23, 42);
    doc.text(`Tél Client: ${clientPhone}`, clientBoxX + 4, currentClientTextY);
  }

  const tableStartY = Math.max(clientBoxY + clientBoxH + 6, 66);

  // Products Table (Structured Grid with light sage green / slate header)
  autoTable(doc, {
    startY: tableStartY,
    head: [['Désignation', 'Qté', 'Prix Unitaire DH', 'Total DH']],
    body: data.items.map(item => [
      item.name,
      item.qty.toString(),
      formatNumber(item.price),
      formatNumber(item.qty * item.price)
    ]),
    theme: 'grid',
    headStyles: {
      fillColor: [216, 235, 224], // Elegant light sage green
      textColor: [15, 23, 42],     // Crisp dark slate
      halign: 'left',
      fontStyle: 'bold',
      fontSize: 9,
      lineWidth: 0.25,
      lineColor: [180, 205, 195]
    },
    styles: {
      fontSize: 8.5,
      cellPadding: 4.5,
      textColor: [15, 23, 42],
      lineWidth: 0.15,
      lineColor: [203, 213, 225],
      valign: 'middle'
    },
    columnStyles: {
      0: { cellWidth: 'auto', fontStyle: 'normal' },
      1: { cellWidth: 20, halign: 'center', fontStyle: 'bold' },
      2: { cellWidth: 35, halign: 'right', fontStyle: 'normal' },
      3: { cellWidth: 35, halign: 'right', fontStyle: 'bold' }
    },
    didParseCell: (hookData) => {
      prepareArabicCell(hookData);
    },
    didDrawCell: (hookData) => {
      drawArabicCell(doc, hookData);
    },
    margin: { left: margin, right: margin, bottom: 28 }
  });

  let finalY = (doc as any).lastAutoTable.finalY + 6;
  const discountVal = data.discount || 0;
  const subtotalVal = data.subtotal || (data.total + discountVal);

  // Avoid overflow into footer
  if (finalY + (discountVal > 0 ? 36 : 22) > pageHeight - 26) {
    doc.addPage();
    finalY = 20;
  }

  // Totals Area (Right Aligned)
  const totalsBoxW = 76;
  const totalsBoxX = pageWidth - margin - totalsBoxW;

  if (discountVal > 0) {
    // Has Remise
    const boxHeight = 27;
    doc.setFillColor(248, 250, 252);
    doc.setDrawColor(203, 213, 225);
    doc.roundedRect(totalsBoxX, finalY, totalsBoxW, boxHeight, 2, 2, 'FD');

    // Subtotal Row
    doc.setFontSize(8.5);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(100, 116, 139);
    doc.text('Sous-Total:', totalsBoxX + 4, finalY + 6.5);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(30, 41, 59);
    doc.text(`${formatNumber(subtotalVal)} DH`, pageWidth - margin - 4, finalY + 6.5, { align: 'right' });

    // Discount Row
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(100, 116, 139);
    doc.text('Remise:', totalsBoxX + 4, finalY + 12.5);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(220, 38, 38);
    doc.text(`-${formatNumber(discountVal)} DH`, pageWidth - margin - 4, finalY + 12.5, { align: 'right' });

    // Divider
    doc.setDrawColor(226, 232, 240);
    doc.setLineWidth(0.3);
    doc.line(totalsBoxX + 4, finalY + 15.5, pageWidth - margin - 4, finalY + 15.5);

    // Total Net Row (highlighted sage green background)
    doc.setFillColor(216, 235, 224);
    doc.roundedRect(totalsBoxX + 2, finalY + 17.5, totalsBoxW - 4, 7.5, 1.5, 1.5, 'F');

    doc.setFontSize(8.5);
    doc.setTextColor(15, 23, 42);
    doc.setFont('helvetica', 'bold');
    doc.text('TOTAL NET À PAYER (DH):', totalsBoxX + 4, finalY + 22.5);

    doc.setFontSize(10.5);
    doc.text(`${formatNumber(data.total)} DH`, pageWidth - margin - 4, finalY + 22.5, { align: 'right' });
  } else {
    // No Remise: Single clean box with soft sage tint
    const boxHeight = 14;
    doc.setFillColor(216, 235, 224);
    doc.setDrawColor(180, 205, 195);
    doc.roundedRect(totalsBoxX, finalY, totalsBoxW, boxHeight, 2, 2, 'FD');

    doc.setFontSize(8.5);
    doc.setTextColor(15, 23, 42);
    doc.setFont('helvetica', 'bold');
    doc.text('TOTAL NET À PAYER (DH):', totalsBoxX + 4, finalY + 9);

    doc.setFontSize(11);
    doc.setTextColor(15, 23, 42);
    doc.text(`${formatNumber(data.total)} DH`, pageWidth - margin - 4, finalY + 9, { align: 'right' });
  }

  // Payment details / Check remaining debt (if applicable)
  let payY = finalY + (discountVal > 0 ? 32 : 18);
  if (data.checkAmount !== undefined && data.checkAmount !== null && data.checkAmount < data.total) {
    doc.setFontSize(8);
    doc.setTextColor(100, 116, 139);
    doc.setFont('helvetica', 'normal');
    doc.text('Payé par chèque:', totalsBoxX + 4, payY);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(30, 41, 59);
    doc.text(`${formatNumber(data.checkAmount)} DH`, pageWidth - margin - 4, payY, { align: 'right' });

    payY += 5;
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(100, 116, 139);
    doc.text('Reste à payer (Crédit):', totalsBoxX + 4, payY);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(220, 38, 38);
    doc.text(`${formatNumber(data.total - data.checkAmount)} DH`, pageWidth - margin - 4, payY, { align: 'right' });
  }

  // Payment method and staff on the bottom-left opposite totals
  if (data.paymentMethod) {
    doc.setFontSize(8);
    doc.setTextColor(100, 116, 139);
    doc.setFont('helvetica', 'normal');
    doc.text(`Mode de règlement: ${data.paymentMethod}`, margin, finalY + 6);
    if (data.staffName) {
      doc.text(`Vendeur: ${data.staffName}`, margin, finalY + 11);
    }
  }

  // Footer on all pages (No signature/cachet, elegant business activities message)
  const totalPages = (doc.internal as any).getNumberOfPages ? (doc.internal as any).getNumberOfPages() : 1;
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);

    // Subtle divider line
    doc.setDrawColor(226, 232, 240);
    doc.setLineWidth(0.4);
    doc.line(margin, pageHeight - 20, pageWidth - margin, pageHeight - 20);

    // Line 1: Business activities description
    doc.setFontSize(8);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(51, 65, 85);
    doc.text(
      "Vente de Matériel d'Irrigation • Pompage Solaire • Fertilisants & Équipements Agricoles",
      pageWidth / 2,
      pageHeight - 14,
      { align: 'center' }
    );

    // Line 2: Professional appreciation and partnership
    doc.setFontSize(7.5);
    doc.setFont('helvetica', 'italic');
    doc.setTextColor(100, 116, 139);
    doc.text(
      "Merci pour votre confiance ! AGRI BOUTABSSIL, votre partenaire pour l'excellence agricole.",
      pageWidth / 2,
      pageHeight - 9,
      { align: 'center' }
    );

    // Page counter if multi-page
    if (totalPages > 1) {
      doc.setFontSize(7);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(148, 163, 184);
      doc.text(`Page ${i}/${totalPages}`, pageWidth - margin, pageHeight - 5, { align: 'right' });
    }
  }

  const prefix = isProforma ? 'Bon_Preparation' : 'Facture';
  const fileName = `${prefix}_${data.saleId.slice(0, 8)}.pdf`;
  doc.save(fileName);
};

interface ReportData {
  entityName: string;
  remainingDebt: number;
  transactions: { 
    type: 'DEBT' | 'PAYMENT'; 
    amount: number; 
    date: string; 
    description: string;
    items?: { name: string; qty: number; price: number }[];
  }[];
  period?: string;
  type?: string;
}

export const generateStatementPDF = (data: ReportData, language: string = 'en', settings?: any) => {
  // Always force French for statements
  const t = translations.fr;
  const isAr = false;
  const partyRole = (data as any).type || 'customer';
  
  const doc = new jsPDF('p', 'mm', 'a4');
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 20;

  // Header Area
  doc.setFillColor(248, 250, 252);
  doc.rect(0, 0, pageWidth, 55, 'F');

  // Brand Name & Logo
  try {
    if (SHOP_DETAILS.logo) {
      try {
        doc.addImage(SHOP_DETAILS.logo, 'PNG', margin, 12, 18, 18);
      } catch (err) {
        doc.addImage(SHOP_DETAILS.logo, 'JPEG', margin, 12, 18, 18);
      }
    }
  } catch (e) {
    console.error('Error adding logo to PDF:', e);
  }

  const shopName = settings?.shopName || settings?.shop_name || SHOP_DETAILS.name || 'AGRI BOUTABSSIL';
  doc.setFontSize(20);
  doc.setTextColor(30, 41, 59);
  doc.setFont('helvetica', 'bold');
  doc.text(shopName, margin + 22, 22);
  doc.setFontSize(9);
  doc.setTextColor(100, 116, 139);
  doc.setFont('helvetica', 'normal');
  doc.text('RELEVÉ DE COMPTE', margin + 22, 28);

  // Shop Info (Right)
  doc.setFontSize(9);
  doc.text(settings?.shopAddress || settings?.shop_address || SHOP_DETAILS.address || 'votre adresse ici', pageWidth - margin, 15, { align: 'right' });
  doc.text(`Tél: ${settings?.shopPhone || settings?.shop_phone || SHOP_DETAILS.phone || '06 00 00 00 00'}`, pageWidth - margin, 20, { align: 'right' });

  // Date & Time
  const now = new Date();
  const dateStr = now.toLocaleDateString('fr-FR');
  const timeStr = now.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
  doc.setFontSize(9);
  doc.text(`Généré le: ${dateStr}`, pageWidth - margin, 25, { align: 'right' });
  doc.text(`Heure: ${timeStr}`, pageWidth - margin, 30, { align: 'right' });

  let currentY = 75;

  // Entity Info
  doc.setFontSize(10);
  doc.setTextColor(148, 163, 184);
  doc.text(partyRole === 'customer' ? 'NOM DU CLIENT:' : 'NOM DU FOURNISSEUR:', margin, currentY);
  doc.setFontSize(14);
  doc.setTextColor(30, 41, 59);
  doc.setFont('helvetica', 'bold');
  doc.text(data.entityName, margin, currentY + 8);

  // Remaining Debt
  const balanceX = pageWidth - margin - 60;
  doc.setFillColor(254, 242, 242);
  doc.roundedRect(balanceX, currentY - 5, 60, 25, 2, 2, 'F');
  doc.setFontSize(9);
  doc.setTextColor(153, 27, 27);
  doc.text('SOLDE DUE:', balanceX + 30, currentY + 5, { align: 'center' });
  doc.setFontSize(14);
  doc.text(`${data.remainingDebt.toFixed(2)} DH`, balanceX + 30, currentY + 15, { align: 'center' });

  currentY += 35;

  // Table
  autoTable(doc, {
    startY: currentY,
    head: [['Date', 'Description', 'Montant']],
    body: data.transactions.map(t => [
      new Date(t.date).toLocaleDateString('fr-FR'),
      t.description,
      `${t.type === 'PAYMENT' ? '-' : '+'}${t.amount.toFixed(2)} DH`
    ]),
    theme: 'grid',
    headStyles: { fillColor: [71, 85, 105], textColor: 255 },
    styles: { fontSize: 8, cellPadding: 3 },
    columnStyles: { 
      0: { cellWidth: 30, halign: 'center' },
      2: { cellWidth: 40, halign: 'right' } 
    }
  });

  // Footer
  doc.setFontSize(8);
  doc.setTextColor(148, 163, 184);
  doc.text(`${shopName} - ${SHOP_DETAILS.tagline || 'SOLUTIONS AGRICOLES & INDUSTRIELLES'}`, pageWidth / 2, pageHeight - 15, { align: 'center' });

  const filename = `${partyRole}_Releve_${data.entityName.replace(/\s+/g, '_')}.pdf`;
  doc.save(filename);
  return { doc, filename };
};


interface GlobalReportData {
  customers: { name: string; debt: number; phone?: string }[];
  totalDebt: number;
}

export const generateGlobalCustomerReportPDF = (data: GlobalReportData, language: string = 'en', settings?: any) => {
  const isAr = language === 'ar';
  const t = (translations as any)[language] || translations.en;
  const shop = {
    name: settings?.shopName || settings?.shop_name || SHOP_DETAILS.name,
    address: settings?.shopAddress || settings?.shop_address || SHOP_DETAILS.address,
    phone: settings?.shopPhone || settings?.shop_phone || SHOP_DETAILS.phone,
    email: settings?.shopEmail || settings?.shop_email || 'contact@example.com',
  };
  
  const doc = new jsPDF('p', 'mm', 'a4');
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 20;

  // Header Title
  doc.setFillColor(248, 250, 252);
  doc.rect(0, 0, pageWidth, 45, 'F');

  const titleText = isAr ? 'تقرير الديون الإجمالي' : 'GLOBAL DEBT REPORT';
  const titleImg = renderTextToImg(titleText, { size: 24, bold: true, color: '#1e293b' });
  const titleW = 80;
  const titleH = (doc as any).getImageProperties(titleImg).height * titleW / (doc as any).getImageProperties(titleImg).width;
  doc.addImage(titleImg, 'PNG', margin, margin - 5, titleW, titleH);

  doc.setFontSize(9);
  doc.setTextColor(100, 100, 100);
  doc.text(shop.name, pageWidth - margin, margin, { align: 'right' });
  doc.text(`${shop.address} | ${shop.phone}`, pageWidth - margin, margin + 5, { align: 'right' });
  
  let currentY = 60;
  
  // Total Highlights
  doc.setFillColor(254, 242, 242);
  doc.roundedRect(margin, currentY, pageWidth - margin * 2, 25, 3, 3, 'F');
  
  const sumLabel = isAr ? 'إجمالي المبالغ المستحقة بذمة الزبناء:' : 'TOTAL OUTSTANDING CUSTOMER DEBT:';
  const sumLabelImg = renderTextToImg(sumLabel, { size: 10, bold: true, color: '#991b1b' });
  doc.addImage(sumLabelImg, 'PNG', margin + 5, currentY + 5, isAr ? 50 : 70, 4);
  
  doc.setFontSize(22);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(220, 38, 38);
  doc.text(`${data.totalDebt.toFixed(2)} DH`, pageWidth - margin - 5, currentY + 16, { align: 'right' });
  
  currentY += 35;

  // Table
  const tableHeaders = isAr ? [[t.debt, t.phone, t.customerName]] : [[t.customerName, t.phone, t.debt]];
  const tableRows = data.customers.map(c => [
    isAr ? `${c.debt.toFixed(2)} DH` : c.name,
    c.phone || '-',
    isAr ? c.name : `${c.debt.toFixed(2)} DH`
  ]);

  autoTable(doc, {
    startY: currentY,
    head: tableHeaders,
    body: tableRows,
    theme: 'grid',
    headStyles: { fillColor: [30, 41, 59], textColor: [255, 255, 255], fontSize: 10, fontStyle: 'bold', halign: 'center' },
    styles: { fontSize: 9, cellPadding: 4, halign: isAr ? 'right' : 'left' },
    columnStyles: { 0: { halign: isAr ? 'center' : 'left' }, 1: { halign: 'center' }, 2: { halign: isAr ? 'right' : 'center' } },
    didParseCell: (data) => prepareArabicCell(data),
    didDrawCell: (data) => drawArabicCell(doc, data)
  });

  // Footer info
  doc.setFontSize(8);
  doc.setTextColor(150, 150, 150);
  const confidentialityNote = isAr ? 'وثيقة سرية - للاستخدام الداخلي فقط' : 'Confidential Document - Internal Use Only';
  const noteImg = renderTextToImg(confidentialityNote, { size: 8, color: '#94a3b8' });
  doc.addImage(noteImg, 'PNG', (pageWidth - 80) / 2, pageHeight - margin, 80, 3);

  // Save
  const filename = `Global_Debt_Report_${new Date().toISOString().split('T')[0]}.pdf`;
  doc.save(filename);

  doc.save(filename);
};


interface HistoryReportData {
  type: 'SALES' | 'PAYMENTS' | 'ACTIVITY';
  period?: string;
  items: any[];
  totalAmount: number;
}

export const generateHistoryReportPDF = (data: HistoryReportData, language: string = 'en', settings?: any) => {
  const isAr = language === 'ar';
  const shop = {
    name: settings?.shopName || settings?.shop_name || SHOP_DETAILS.name,
    address: settings?.shopAddress || settings?.shop_address || SHOP_DETAILS.address,
    phone: settings?.shopPhone || settings?.shop_phone || SHOP_DETAILS.phone,
  };
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();
  let currentY = 20;

  // Header Title
  const titleText = isAr 
    ? (data.type === 'SALES' ? 'تقرير المبيعات' : data.type === 'PAYMENTS' ? 'تقرير المدفوعات' : 'سجل الأنشطة') 
    : (data.type === 'SALES' ? 'SALES REPORT' : data.type === 'PAYMENTS' ? 'PAYMENTS REPORT' : 'ACTIVITY LOG');
  const titleImg = renderTextToImg(titleText, { size: 18, bold: true, color: '#1e293b' });
  const titleW = 60;
  const titleH = (doc as any).getImageProperties(titleImg).height * titleW / (doc as any).getImageProperties(titleImg).width;
  doc.addImage(titleImg, 'PNG', isAr ? pageWidth - 14 - titleW : 14, currentY, titleW, titleH);
  
  // Period
  if (data.period) {
    doc.setFontSize(10);
    doc.setTextColor(100, 100, 100);
    const periodText = isAr ? `الفترة: ${data.period}` : `Period: ${data.period}`;
    doc.text(periodText, isAr ? 14 : pageWidth - 14, currentY + titleH/2, { align: isAr ? 'left' : 'right' });
  }
  currentY += titleH + 15;

  // Total Summary (if applicable)
  if (data.type !== 'ACTIVITY') {
    doc.setDrawColor(240, 240, 240);
    doc.setFillColor(250, 250, 250);
    doc.roundedRect(14, currentY, pageWidth - 28, 15, 2, 2, 'FD');
    
    const totalLabel = isAr ? 'الإجمالي الكلي:' : 'TOTAL AMOUNT:';
    const totalLabelImg = renderTextToImg(totalLabel, { size: 9, bold: true });
    doc.addImage(totalLabelImg, 'PNG', isAr ? pageWidth - 50 : 19, currentY + 5.5, 30, 3.5);
    
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(30, 41, 59);
    doc.text(`${data.totalAmount.toFixed(2)} DH`, isAr ? 19 : pageWidth - 19, currentY + 10, { align: isAr ? 'left' : 'right' });
    currentY += 25;
  }

  // Table
  autoTable(doc, {
    startY: currentY,
    head: [[
      isAr ? 'المبلغ' : 'AMOUNT',
      isAr ? 'الوصف' : 'DESCRIPTION',
      isAr ? 'التاريخ' : 'DATE',
    ]],
    body: data.items.map(item => [
      `${item.amount.toFixed(2)} DH`,
      item.description,
      new Date(item.date).toLocaleString(isAr ? 'ar-EG' : 'en-US')
    ]),
    styles: {
      font: 'helvetica',
      fontSize: 9,
      cellPadding: 4,
      halign: isAr ? 'right' : 'left'
    },
    headStyles: {
      fillColor: [51, 65, 85],
      textColor: 255,
      fontStyle: 'bold'
    },
    alternateRowStyles: {
      fillColor: [248, 250, 252]
    },
    columnStyles: {
      0: { cellWidth: 35, halign: 'center' },
      2: { cellWidth: 50, halign: 'center' }
    },
    didParseCell: (data) => prepareArabicCell(data),
    didDrawCell: (data) => drawArabicCell(doc, data)
  });

  doc.save(`History_Report_${data.type}_${new Date().getTime()}.pdf`);
};

interface TransactionReceiptData {
  customerName: string;
  type: 'DEBT' | 'PAYMENT';
  amount: number;
  date: string;
  description: string;
  saleId?: string;
}

export const generateTransactionReceiptPDF = (data: TransactionReceiptData, language: string = 'en', settings?: any) => {
  const isAr = language === 'ar';
  const shop = {
    name: settings?.shopName || settings?.shop_name || SHOP_DETAILS.name,
    address: settings?.shopAddress || settings?.shop_address || SHOP_DETAILS.address,
    phone: settings?.shopPhone || settings?.shop_phone || SHOP_DETAILS.phone,
    tagline: SHOP_DETAILS.tagline || 'SOLUTIONS AGRICOLES & INDUSTRIELLES'
  };

  const doc = new jsPDF('p', 'mm', 'a4');
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 20;

  // Header background
  doc.setFillColor(248, 250, 252);
  doc.rect(0, 0, pageWidth, 28, 'F');

  // Brand Name & Logo
  try {
    if (SHOP_DETAILS.logo) {
      try {
        doc.addImage(SHOP_DETAILS.logo, 'PNG', margin, 5, 10, 10);
      } catch (err) {
        doc.addImage(SHOP_DETAILS.logo, 'JPEG', margin, 5, 10, 10);
      }
    }
  } catch (e) {
    console.error('Error adding logo to PDF:', e);
  }

  doc.setFontSize(12);
  doc.setTextColor(30, 41, 59);
  doc.setFont('helvetica', 'bold');
  doc.text(shop.name, margin + 12, 9);
  
  doc.setFontSize(6);
  doc.setTextColor(100, 116, 139);
  doc.setFont('helvetica', 'normal');
  doc.text(shop.tagline, margin + 12, 13);

  // Shop Info (Right)
  const shopX = pageWidth - margin;
  doc.setFontSize(7);
  doc.setTextColor(100, 116, 139);
  doc.text(shop.address, shopX, 8, { align: 'right' });
  doc.text(`Tél: ${shop.phone}`, shopX, 12, { align: 'right' });
  
  // Document Title
  const isReturn = data.description.toLowerCase().includes('retour');
  let title = data.type === 'PAYMENT' ? (isReturn ? 'BON DE RETOUR' : 'REÇU DE PAIEMENT') : 'BON DE DÉBIT';
  if (isAr) {
     title = data.type === 'PAYMENT' ? (isReturn ? 'وصل إرجاع' : 'وصل سداد') : 'وصل دين';
  }

  let currentY = 45;
  
  if (isAr) {
     const titleImg = renderTextToImg(title, { size: 16, bold: true, color: '#0f172a' });
     const imgProps = (doc as any).getImageProperties(titleImg);
     const titleW = 50;
     const titleH = imgProps.height * titleW / imgProps.width;
     doc.addImage(titleImg, 'PNG', pageWidth/2 - titleW/2, currentY, titleW, titleH);
     currentY += titleH + 10;
  } else {
     doc.setFontSize(16);
     doc.setTextColor(15, 23, 42);
     doc.setFont('helvetica', 'bold');
     doc.text(title, pageWidth / 2, currentY, { align: 'center' });
     currentY += 15;
  }

  // Ref & Date
  const refText = `RÉF: #${data.saleId?.slice(0, 8).toUpperCase() || Math.random().toString(36).slice(2, 8).toUpperCase()}`;
  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(71, 85, 105);
  doc.text(refText, margin, currentY);
  
  const dateStr = new Date(data.date).toLocaleString(isAr ? 'ar-EG' : 'fr-FR');
  doc.setFont('helvetica', 'normal');
  doc.text(`${isAr ? 'التاريخ' : 'Date'}: ${dateStr}`, pageWidth - margin, currentY, { align: 'right' });

  currentY += 10;

  // Customer Info Box
  doc.setFillColor(248, 250, 252);
  doc.setDrawColor(226, 232, 240);
  doc.roundedRect(margin, currentY, pageWidth - margin * 2, 20, 2, 2, 'FD');
  
  doc.setFontSize(8);
  doc.setTextColor(148, 163, 184);
  if (isAr) {
    const custLabelImg = renderTextToImg('العميل:', { size: 8, color: '#94a3b8' });
    doc.addImage(custLabelImg, 'PNG', pageWidth - margin - 15, currentY + 4, 8, 3);
  } else {
    doc.text('CLIENT:', margin + 5, currentY + 7);
  }

  doc.setFontSize(12);
  doc.setTextColor(30, 41, 59);
  doc.setFont('helvetica', 'bold');
  if (isAr || containsArabic(data.customerName)) {
    const custNameImg = renderTextToImg(data.customerName, { size: 12, bold: true, color: '#1e293b' });
    const props = (doc as any).getImageProperties(custNameImg);
    const w = Math.min(80, props.width * 5 / props.height);
    doc.addImage(custNameImg, 'PNG', isAr ? pageWidth - margin - 5 - w : margin + 5, currentY + 9, w, 5);
  } else {
    doc.text(data.customerName, margin + 5, currentY + 14);
  }

  currentY += 30;

  // Description and Amount using AutoTable for a clean look
  const tableHead = isAr ? [['المبلغ', 'التفاصيل']] : [['Désignation', 'Montant']];
  const tableBody = isAr ? [
    [`${data.amount.toFixed(2)} DH`, data.description]
  ] : [
    [data.description, `${data.amount.toFixed(2)} DH`]
  ];

  autoTable(doc, {
    startY: currentY,
    head: tableHead,
    body: tableBody,
    theme: 'grid',
    headStyles: { fillColor: [71, 85, 105], textColor: 255 },
    styles: { fontSize: 10, cellPadding: 8 },
    columnStyles: { 
      0: isAr ? { halign: 'center', cellWidth: 40 } : { halign: 'left' },
      1: isAr ? { halign: 'right' } : { halign: 'right', cellWidth: 40 }
    },
    didParseCell: (data) => prepareArabicCell(data),
    didDrawCell: (data) => drawArabicCell(doc, data)
  });

  currentY = (doc as any).lastAutoTable.finalY + 15;

  // Big Amount Box
  const boxW = 70;
  const boxX = pageWidth - margin - boxW;
  doc.setDrawColor(241, 245, 249);
  doc.setFillColor(248, 250, 252);
  doc.roundedRect(boxX, currentY, boxW, 20, 2, 2, 'FD');
  
  doc.setFontSize(8);
  doc.setTextColor(148, 163, 184);
  doc.setFont('helvetica', 'normal');
  doc.text(isAr ? 'الإجمالي:' : 'MONTANT TOTAL:', boxX + 5, currentY + 8);
  
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  if (data.type === 'PAYMENT') doc.setTextColor(22, 163, 74);
  else doc.setTextColor(220, 38, 38);
  
  doc.text(`${data.amount.toFixed(2)} DH`, boxX + boxW - 5, currentY + 14, { align: 'right' });

  // Footer
  doc.setFontSize(8);
  doc.setTextColor(148, 163, 184);
  doc.setFont('helvetica', 'normal');
  const footerText = isAr ? 'شكرا لتعاملكم معنا' : 'Merci de votre confiance';
  doc.text(footerText, pageWidth / 2, pageHeight - 15, { align: 'center' });

  const filename = `${isReturn ? 'Retour' : 'Recu'}_${new Date().getTime()}.pdf`;
  doc.save(filename);
};

interface StockReportData {
  items: any[];
  generatedAt: string;
  language: string;
}

export const generateStockReportPDF = (data: StockReportData) => {
  const { items, generatedAt, language } = data;
  const isAr = language === 'ar';
  const isFr = language === 'fr';
  const doc = new jsPDF();
  
  doc.setFontSize(22);
  doc.setTextColor(51, 65, 85);
  doc.text(isAr ? 'تقرير المخزون الحرج' : isFr ? 'Rapport de Stock Critique' : 'Critical Stock Report', 105, 20, { align: 'center' });

  doc.setFontSize(12);
  doc.setTextColor(100, 116, 139);
  doc.text(`${isAr ? 'تم الإنشاء في' : isFr ? 'Généré le' : 'Generated at'}: ${generatedAt}`, 105, 30, { align: 'center' });

  doc.setLineWidth(0.5);
  doc.setDrawColor(226, 232, 240);
  doc.line(20, 40, 190, 40);

  const tableColumn = isAr ? 
    ["اسم المنتج", "المورد", "الكمية", "الحد الأدنى", "الحالة"] : 
    isFr ? 
    ["Nom du produit", "Fournisseur", "Qté", "Min", "Statut"] : 
    ["Product Name", "Supplier", "Qty", "Min", "Status"];

  const tableRows = items.map(p => [
    p.name || '',
    p.supplier || '-',
    String(p.qty ?? 0),
    String(p.minStock ?? 5),
    (p.qty ?? 0) === 0 ? (isAr ? "نفذ المخزون" : isFr ? "Rupture de Stock" : "Out of Stock") : (isAr ? "مخزون منخفض" : isFr ? "Stock Faible" : "Low Stock")
  ]);

  autoTable(doc, {
    startY: 50,
    head: [tableColumn],
    body: tableRows,
    theme: 'striped',
    headStyles: { fillColor: [239, 68, 68] },
    styles: { fontSize: 9, halign: isAr ? 'right' : 'left' },
    didParseCell: function (data: any) {
      prepareArabicCell(data);
    },
    didDrawCell: function (data: any) {
      if (data.section === 'body' && data.column.index === 4) {
        const status = data.cell.raw;
        let customColor = '#1a1a1a';
        if (status === 'Out of Stock' || status === 'نفذ المخزون' || status === 'Rupture de Stock') {
          customColor = '#ea580c'; // Orange-600
        } else if (status === 'Low Stock' || status === 'مخزون منخفض' || status === 'Stock Faible') {
          customColor = '#dc2626'; // Red-600
        }
        drawArabicCell(doc, data, customColor);
      } else {
        drawArabicCell(doc, data);
      }
    }
  });

  doc.save(`STOCK_ALERTS_REPORT_${Date.now()}.pdf`);
};

export const generateDamagesReportPDF = (data: any[], totalValue: number, language: string = 'en', settings?: any) => {
  const isAr = language === 'ar';
  const isFr = language === 'fr';
  const t = translations[language as 'en' | 'fr' | 'ar'] || translations.en;
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();
  
  doc.setFontSize(22);
  doc.setTextColor(51, 65, 85);
  doc.text(t.damagesTitle, pageWidth / 2, 20, { align: 'center' });

  doc.setFontSize(12);
  doc.setTextColor(100, 116, 139);
  doc.text(`${isAr ? 'تاريخ التقرير' : isFr ? 'Date du rapport' : 'Date'}: ${new Date().toLocaleDateString(isAr ? 'ar-EG' : isFr ? 'fr-FR' : 'en-US')}`, pageWidth / 2, 30, { align: 'center' });

  doc.setLineWidth(0.5);
  doc.setDrawColor(226, 232, 240);
  doc.line(20, 40, pageWidth - 20, 40);

  const tableColumn = isAr ? 
    ["التاريخ", "المنتج", "الكمية", "تكلفة الوحدة", "الخسارة", "ملاحظة"] : 
    isFr ? 
    ["Date", "Produit", "Qté", "Coût Unitaire", "Perte Totale", "Motif"] : 
    ["Date", "Product", "Qty", "Unit Cost", "Total Loss", "Reason"];

  const tableRows = data.map(d => [
    new Date(d.timestamp).toLocaleDateString(),
    d.productName || '',
    String(d.quantity || 0),
    `${(d.costPrice || 0).toFixed(2)} DH`,
    `${((d.quantity || 0) * (d.costPrice || 0)).toFixed(2)} DH`,
    (d.reason || '').replace('[DAMAGE] ', '')
  ]);

  autoTable(doc, {
    startY: 50,
    head: [tableColumn],
    body: tableRows,
    theme: 'striped',
    headStyles: { fillColor: [220, 38, 38] }, // Red for damages
    styles: { fontSize: 9, halign: isAr ? 'right' : 'left' },
    didParseCell: function (data: any) {
      if (typeof prepareArabicCell === 'function') prepareArabicCell(data);
    },
    didDrawCell: function (data: any) {
      if (typeof drawArabicCell === 'function') drawArabicCell(doc, data);
    }
  });

  const finalY = (doc as any).lastAutoTable.finalY + 15;
  
  // Total Loss Area
  const boxW = 80;
  const boxX = pageWidth - 20 - boxW;
  doc.setDrawColor(241, 245, 249);
  doc.setFillColor(254, 242, 242); // light red bg
  doc.roundedRect(boxX, finalY, boxW, 25, 2, 2, 'FD');
  
  doc.setFontSize(10);
  doc.setTextColor(153, 27, 27);
  doc.text(isAr ? 'إجمالي الخسارة (درهم):' : isFr ? 'PERTE TOTALE (DH):' : 'TOTAL LOSS (DH):', boxX + boxW / 2, finalY + 8, { align: 'center' });
  
  doc.setFontSize(18);
  doc.setFont('helvetica', 'bold');
  doc.text(`${totalValue.toFixed(2)} DH`, boxX + boxW / 2, finalY + 18, { align: 'center' });

  doc.save(`Damaged_Goods_Report_${Date.now()}.pdf`);
};
