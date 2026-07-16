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
  // Always use French for invoices as requested
  const t = translations.fr;
  const isAr = false;
  
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

  const shopName = settings?.shopName || settings?.shop_name || SHOP_DETAILS.name || 'AGRI BOUTABSSIL';
  doc.setFontSize(12);
  doc.setTextColor(30, 41, 59);
  doc.setFont('helvetica', 'bold');
  doc.text(shopName, margin + 12, 9);
  
  doc.setFontSize(6);
  doc.setTextColor(100, 116, 139);
  doc.setFont('helvetica', 'normal');
  doc.text(SHOP_DETAILS.tagline || 'Solutions Agricoles & Industrielles', margin + 12, 13);

  doc.setFontSize(14);
  doc.setTextColor(15, 23, 42);
  doc.setFont('helvetica', 'bold');
  doc.text(isProforma ? 'BON DE PRÉPARATION' : 'FACTURE', margin + 12, 21);

  // Shop Info (Right)
  const shopX = pageWidth - margin;
  doc.setFontSize(7);
  doc.setTextColor(100, 116, 139);
  doc.setFont('helvetica', 'normal');
  doc.text(settings?.shopAddress || settings?.shop_address || SHOP_DETAILS.address || 'votre adresse ici', shopX, 8, { align: 'right' });
  doc.text(`Tél: ${settings?.shopPhone || settings?.shop_phone || SHOP_DETAILS.phone || '06 00 00 00 00'}`, shopX, 12, { align: 'right' });
  
  // Date & Time
  const invoiceDate = data.date ? new Date(data.date) : new Date();
  const dateStr = invoiceDate.toLocaleDateString('fr-FR');
  const timeStr = invoiceDate.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(15, 23, 42);
  doc.text(`DATE: ${dateStr}`, shopX, 18, { align: 'right' });
  doc.text(`HEURE: ${timeStr}`, shopX, 22, { align: 'right' });

  let currentY = 32;

  const walkingCustomers = [
    translations.en.walkingCustomer,
    translations.fr.walkingCustomer,
    translations.ar.walkingCustomer,
    'Client Passager'
  ];

  // Bill To
  const hasClient = data.clientName && data.clientName.trim() !== '' && !walkingCustomers.includes(data.clientName);
  if (hasClient) {
    doc.setFontSize(8);
    doc.setTextColor(148, 163, 184);
    doc.text('CLIENT:', margin, currentY);
    doc.setFontSize(14);
    doc.setTextColor(30, 41, 59);
    
    if (containsArabic(data.clientName || '')) {
      const clientImg = renderTextToImg(data.clientName || '', { size: 12, bold: true, color: '#1e293b' });
      const imgProps = (doc as any).getImageProperties(clientImg);
      const imgW = 50;
      const hScale = imgProps.height / imgProps.width;
      doc.addImage(clientImg, 'PNG', margin, currentY + 1, imgW, imgW * hScale);
    } else {
      doc.setFont('helvetica', 'bold');
      doc.text(data.clientName || '', margin, currentY + 5);
    }
  }

  // Invoice Number
  if (!isProforma) {
    const invoiceNum = data.invoiceNumber 
      ? data.invoiceNumber.toString().padStart(6, '0') 
      : data.saleId.toUpperCase().slice(0, 8);
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(30, 41, 59);
    doc.text(`N° (${invoiceNum})`, pageWidth - margin, currentY + 5, { align: 'right' });
  }

  currentY += 12;

  // Items Table
  autoTable(doc, {
    startY: currentY,
    head: [['Designation', 'Qté', 'Prix Unitaire', 'Total']],
    body: data.items.map(item => [
      item.name,
      item.qty.toString(),
      `${formatNumber(item.price)} DH`,
      `${formatNumber(item.qty * item.price)} DH`
    ]),
    theme: 'striped',
    headStyles: { fillColor: [30, 41, 59], textColor: 255, halign: 'center' },
    styles: { fontSize: 9, cellPadding: 5 },
    columnStyles: { 
      1: { halign: 'center' },
      2: { halign: 'right' },
      3: { halign: 'right' }
    }
  });

  let finalY = (doc as any).lastAutoTable.finalY + 10;
  
  // Check if we have enough space for the totals box (max 40mm)
  if (finalY + 40 > pageHeight - 15) {
    doc.addPage();
    finalY = 20;
  }
  
  // Totals Area
  const boxW = 80;
  const boxX = pageWidth - margin - boxW;
  doc.setDrawColor(241, 245, 249);
  doc.setFillColor(252, 252, 252);

  const discountVal = data.discount || 0;
  const subtotalVal = data.subtotal || (data.total + discountVal);

  if (discountVal > 0) {
    doc.roundedRect(boxX, finalY, boxW, 35, 2, 2, 'FD');
    
    // Subtotal Row
    doc.setFontSize(8);
    doc.setTextColor(148, 163, 184);
    doc.setFont('helvetica', 'normal');
    doc.text('TOTAL BRUT (TTC):', boxX + 5, finalY + 8);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(100, 116, 139);
    doc.text(`${formatNumber(subtotalVal)} DH`, pageWidth - margin - 5, finalY + 8, { align: 'right' });

    // Discount Row
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(148, 163, 184);
    doc.text('REMISE (TAKHFID):', boxX + 5, finalY + 14);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(220, 38, 38);
    doc.text(`-${formatNumber(discountVal)} DH`, pageWidth - margin - 5, finalY + 14, { align: 'right' });

    // Divider
    doc.setDrawColor(226, 232, 240);
    doc.setLineWidth(0.3);
    doc.line(boxX + 5, finalY + 18, pageWidth - margin - 5, finalY + 18);

    // Total Net Row
    doc.setFontSize(9);
    doc.setTextColor(148, 163, 184);
    doc.setFont('helvetica', 'normal');
    doc.text('NET À PAYER (TTC):', boxX + 5, finalY + 24);
    
    doc.setFontSize(16);
    doc.setTextColor(15, 23, 42);
    doc.setFont('helvetica', 'bold');
    doc.text(`${formatNumber(data.total)} DH`, pageWidth - margin - 5, finalY + 31, { align: 'right' });
  } else {
    doc.roundedRect(boxX, finalY, boxW, 25, 2, 2, 'FD');
    
    doc.setFontSize(9);
    doc.setTextColor(148, 163, 184);
    doc.setFont('helvetica', 'normal');
    doc.text('TOTAL NET À PAYER (TTC):', boxX + 5, finalY + 10);
    
    doc.setFontSize(18);
    doc.setTextColor(15, 23, 42); // Darker black
    doc.setFont('helvetica', 'bold');
    doc.text(`${formatNumber(data.total)} DH`, pageWidth - margin - 5, finalY + 20, { align: 'right' });
  }

  // Display paid amount and remaining debt if a check amount is set
  if (data.checkAmount !== undefined && data.checkAmount !== null && data.checkAmount < data.total) {
    const finalRowY = finalY + (discountVal > 0 ? 43 : 33);
    
    doc.setFontSize(9);
    doc.setTextColor(148, 163, 184);
    doc.setFont('helvetica', 'normal');
    doc.text('PAYÉ PAR CHÈQUE:', boxX - 10, finalRowY);
    
    doc.setFontSize(11);
    doc.setTextColor(15, 23, 42);
    doc.setFont('helvetica', 'bold');
    doc.text(`${formatNumber(data.checkAmount)} DH`, pageWidth - margin - 5, finalRowY, { align: 'right' });

    doc.setFontSize(9);
    doc.setTextColor(148, 163, 184);
    doc.setFont('helvetica', 'normal');
    doc.text('RESTE À PAYER (CRÉDIT):', boxX - 10, finalRowY + 6);
    
    doc.setFontSize(11);
    doc.setTextColor(220, 38, 38); // Red color for debt
    doc.setFont('helvetica', 'bold');
    doc.text(`${formatNumber(data.total - data.checkAmount)} DH`, pageWidth - margin - 5, finalRowY + 6, { align: 'right' });
  }

  if (data.paymentMethod) {
    doc.setFontSize(8);
    doc.setTextColor(148, 163, 184);
    doc.text(`Mode de paiement: ${data.paymentMethod}`, margin, finalY + 10);
  }

  // Footer
  doc.setFontSize(8);
  doc.setTextColor(148, 163, 184);
  doc.text(`${shopName} - ${SHOP_DETAILS.tagline || 'SOLUTIONS AGRICOLES & INDUSTRIELLES'}`, pageWidth / 2, pageHeight - 15, { align: 'center' });

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
  };
  const doc = new jsPDF({
    unit: 'mm',
    format: [80, 150]
  });
  const pageWidth = doc.internal.pageSize.getWidth();
  let currentY = 15;

  // Header Title
  const titleText = data.type === 'PAYMENT' 
    ? (isAr ? 'وصل سداد' : 'RECEIPT') 
    : (isAr ? 'وصل دين' : 'DEBIT NOTE');
  const titleImg = renderTextToImg(titleText, { size: 16, bold: true, color: '#334155' });
  const titleW = 40;
  const titleH = (doc as any).getImageProperties(titleImg).height * titleW / (doc as any).getImageProperties(titleImg).width;
  doc.addImage(titleImg, 'PNG', (pageWidth - titleW) / 2, currentY, titleW, titleH);
  currentY += titleH + 8;

  // Shop Info
  const shopNameImg = renderTextToImg(shop.name, { size: 10, bold: true });
  doc.addImage(shopNameImg, 'PNG', (pageWidth - 30) / 2, currentY, 30, 4);
  currentY += 6;

  // Ref & Date
  const refText = `REF: #${data.saleId?.slice(0, 8).toUpperCase() || Math.random().toString(36).slice(2, 8).toUpperCase()}`;
  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');
  doc.text(refText, pageWidth / 2, currentY, { align: 'center' });
  currentY += 4;
  
  const dateStr = new Date(data.date).toLocaleString(isAr ? 'ar-EG' : 'en-US');
  doc.text(dateStr, pageWidth / 2, currentY, { align: 'center' });
  currentY += 10;

  doc.setLineDashPattern([1, 1], 0);
  doc.line(5, currentY, pageWidth - 5, currentY);
  currentY += 10;

  // Customer & Details
  const customerLabel = isAr ? 'اسم الزبون:' : 'Customer:';
  const customerLabelImg = renderTextToImg(customerLabel, { size: 9 });
  doc.addImage(customerLabelImg, 'PNG', isAr ? pageWidth - 20 : 10, currentY, 12, 3.5);
  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.text(data.customerName, isAr ? 10 : pageWidth - 10, currentY + 3, { align: isAr ? 'left' : 'right' });
  
  currentY += 8;
  const descLabel = isAr ? 'التفاصيل:' : 'Details:';
  const descLabelImg = renderTextToImg(descLabel, { size: 9 });
  doc.addImage(descLabelImg, 'PNG', isAr ? pageWidth - 20 : 10, currentY, 12, 3.5);
  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.text(data.description, isAr ? 10 : pageWidth - 10, currentY + 3, { align: isAr ? 'left' : 'right' });

  currentY += 15;

  // Amount Box
  doc.setDrawColor(230, 230, 230);
  doc.setFillColor(248, 250, 252);
  doc.roundedRect(10, currentY, pageWidth - 20, 20, 2, 2, 'FD');
  
  const amtLabel = isAr ? 'المبلغ:' : 'AMOUNT:';
  const amtLabelImg = renderTextToImg(amtLabel, { size: 10, bold: true });
  doc.addImage(amtLabelImg, 'PNG', (pageWidth - 15) / 2, currentY + 3, 15, 3.5);
  
  doc.setFontSize(16);
  doc.setFont('helvetica', 'bold');
  if (data.type === 'PAYMENT') doc.setTextColor(22, 163, 74);
  else doc.setTextColor(220, 38, 38);
  doc.text(`${data.amount.toFixed(2)} DH`, pageWidth / 2, currentY + 14, { align: 'center' });

  // Footer
  currentY += 30;
  const footerText = isAr ? 'شكرا لتعاملكم معنا' : 'Thank you for your business';
  const footerImg = renderTextToImg(footerText, { size: 8 });
  doc.addImage(footerImg, 'PNG', (pageWidth - 30) / 2, currentY, 30, 3);

  // Save
  const filename = `Receipt_${data.type}_${new Date().getTime()}.pdf`;
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
