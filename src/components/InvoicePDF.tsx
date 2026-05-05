

import React from "react";
import { Document, Page, Text, View, StyleSheet, Font, Image } from "@react-pdf/renderer";
import { numberToInrWords } from "@/lib/inrWords";

// Register fonts if needed, using standard Helvetica for simplicity but structured well
const styles = StyleSheet.create({
  page: { padding: 30, fontSize: 10, fontFamily: "Helvetica", color: "#334155" },
  headerContainer: { flexDirection: "row", justifyContent: "space-between", marginBottom: 20 },
  logo: { width: 180, height: 94, marginBottom: 10 },
  companyName: { fontSize: 16, fontWeight: "bold", color: "#059669" },
  companyDetails: { fontSize: 8, lineHeight: 1.3 },
  docTitle: { fontSize: 24, fontWeight: "bold", color: "#059669", textTransform: "uppercase", textAlign: "right" },
  docNumber: { fontSize: 11, fontWeight: "bold", textAlign: "right", marginTop: 2 },
  statusBadge: { backgroundColor: "#ecfdf5", color: "#059669", paddingVertical: 3, paddingHorizontal: 6, borderRadius: 4, alignSelf: "flex-end", marginTop: 6, fontSize: 8, fontWeight: "bold" },
  
  metaGrid: { flexDirection: "row", borderTop: "1px solid #e2e8f0", borderBottom: "1px solid #e2e8f0", paddingVertical: 10, marginBottom: 15 },
  metaColumn: { flex: 1, paddingRight: 8 },
  metaLabel: { fontSize: 8, color: "#94a3b8", textTransform: "uppercase", marginBottom: 2 },
  metaValue: { fontSize: 9, fontWeight: "bold", color: "#1e293b", marginBottom: 1 },
  metaText: { fontSize: 8, lineHeight: 1.3 },

  validityBanner: { backgroundColor: "#fef3c7", padding: 6, borderRadius: 4, marginBottom: 10 },
  validityText: { color: "#b45309", fontSize: 9, fontWeight: "bold", textAlign: "center" },

  table: { width: "100%", marginBottom: 10 },
  tableHeader: { flexDirection: "row", backgroundColor: "#059669", color: "#fff", paddingVertical: 6, paddingHorizontal: 6, borderRadius: 4 },
  tableRow: { flexDirection: "row", borderBottom: "1px solid #f1f5f9", paddingVertical: 8, paddingHorizontal: 6 },
  col1: { width: "40%" }, // Name & Desc
  col2: { width: "15%", textAlign: "center" }, // Category
  col3: { width: "10%", textAlign: "center" }, // Qty
  col4: { width: "15%", textAlign: "right" }, // Rate
  col5: { width: "20%", textAlign: "right" }, // Amount
  th: { fontSize: 8, fontWeight: "bold" },
  tdTitle: { fontSize: 9, fontWeight: "bold", color: "#1e293b", marginBottom: 1 },
  tdDesc: { fontSize: 7, color: "#64748b" },
  catTag: { backgroundColor: "#f1f5f9", paddingVertical: 1, paddingHorizontal: 3, borderRadius: 4, fontSize: 7, alignSelf: "center", color: "#475569" },

  totalsSection: { flexDirection: "row", justifyContent: "flex-end", marginBottom: 15 },
  totalsBox: { width: "45%" },
  totalRow: { flexDirection: "row", justifyContent: "space-between", paddingVertical: 4, borderBottom: "1px solid #f8fafc" },
  totalLabel: { fontSize: 9, color: "#64748b" },
  totalValue: { fontSize: 9, fontWeight: "bold", color: "#1e293b" },
  grandTotalRow: { flexDirection: "row", justifyContent: "space-between", paddingVertical: 8, borderTop: "2px solid #059669", marginTop: 2, backgroundColor: "#ecfdf5", paddingHorizontal: 6, borderRadius: 4 },
  grandTotalLabel: { fontSize: 11, fontWeight: "bold", color: "#059669" },
  grandTotalValue: { fontSize: 11, fontWeight: "bold", color: "#059669" },

  wordsText: { fontSize: 8, fontStyle: "italic", color: "#64748b", marginTop: 6, textAlign: "right" },

  footerGrid: { flexDirection: "row", justifyContent: "space-between", marginTop: 10 },
  bankBox: { width: "45%", backgroundColor: "#f8fafc", padding: 8, borderRadius: 4 },
  bankTitle: { fontSize: 9, fontWeight: "bold", color: "#1e293b", marginBottom: 4 },
  bankRow: { flexDirection: "row", marginBottom: 2 },
  bankLabel: { width: 45, fontSize: 7, color: "#64748b" },
  bankValue: { fontSize: 7, fontWeight: "bold", color: "#1e293b", flex: 1 },

  notesBox: { width: "45%" },
  notesTitle: { fontSize: 9, fontWeight: "bold", color: "#1e293b", marginBottom: 2 },
  notesText: { fontSize: 7, color: "#64748b", lineHeight: 1.3 },

  signArea: { marginTop: 20, alignItems: "flex-end" },
  signature: { width: 200, height: 80, marginBottom: -15 },
  signLine: { width: 120, borderTop: "1px solid #1e293b", marginTop: 20, paddingTop: 2, textAlign: "center" },
  signText: { fontSize: 8, fontWeight: "bold", color: "#1e293b" },

  checklistArea: { marginTop: 10, padding: 10, backgroundColor: "#f8fafc", borderRadius: 4 },
  checklistTitle: { fontSize: 10, fontWeight: "bold", color: "#059669", marginBottom: 6 },
  checklistItem: { flexDirection: "row", marginBottom: 4 },
  checkIcon: { color: "#10b981", marginRight: 4, fontSize: 8 },
  checkText: { fontSize: 8, color: "#334155" },
});

interface InvoicePDFProps {
  invoice: any;
  companyDetails: any;
}

export const InvoicePDF = ({ invoice, companyDetails }: InvoicePDFProps) => {
  const isQuotation = invoice.isQuotation;
  const docTitle = isQuotation ? "Quotation" : "Invoice";
  
  const issueDate = invoice.issueDate ? new Date(invoice.issueDate).toLocaleDateString("en-IN", {
    year: "numeric", month: "short", day: "numeric"
  }) : "N/A";
  
  const dueDate = invoice.dueDate ? new Date(invoice.dueDate).toLocaleDateString("en-IN", {
    year: "numeric", month: "short", day: "numeric"
  }) : "N/A";

  // Render prices from paise
  const formatMoney = (paise: number) => `Rs. ${(paise / 100).toFixed(2)}`;

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        
        {/* HEADER */}
        <View style={styles.headerContainer}>
          <View>
            {companyDetails.logoUrl ? (
              <Image src={companyDetails.logoUrl} style={styles.logo} />
            ) : (
              <View style={{ width: 60, height: 30, backgroundColor: "#059669", borderRadius: 4, justifyContent: "center", alignItems: "center", marginBottom: 8 }}>
                <Text style={{ color: "#fff", fontSize: 10, fontWeight: "bold" }}>LSS</Text>
              </View>
            )}
            <Text style={styles.companyName}>{companyDetails.name}</Text>
            <Text style={styles.companyDetails}>{companyDetails.address}</Text>
            <Text style={styles.companyDetails}>{companyDetails.email} | {companyDetails.phone}</Text>
            {companyDetails.gstin ? <Text style={styles.companyDetails}>GSTIN: {companyDetails.gstin}</Text> : null}
          </View>
          <View style={{ alignItems: "flex-end" }}>
            <Text style={styles.docTitle}>{docTitle}</Text>
            <Text style={styles.docNumber}># {invoice.invoiceNumber}</Text>
            <View style={styles.statusBadge}>
              <Text>{invoice.status}</Text>
            </View>
          </View>
        </View>

        {/* 3-COLUMN META BLOCK */}
        <View style={styles.metaGrid}>
          <View style={styles.metaColumn}>
            <Text style={styles.metaLabel}>Billed To</Text>
            <Text style={styles.metaValue}>{invoice.clientName}</Text>
            {invoice.clientEmail ? <Text style={styles.metaText}>{invoice.clientEmail}</Text> : null}
            {invoice.clientPhone ? <Text style={styles.metaText}>{invoice.clientPhone}</Text> : null}
            {invoice.clientAddress ? <Text style={styles.metaText}>{invoice.clientAddress}</Text> : null}
            {invoice.clientGstin ? <Text style={styles.metaText}>GSTIN: {invoice.clientGstin}</Text> : null}
          </View>
          <View style={styles.metaColumn}>
            <Text style={styles.metaLabel}>Dates</Text>
            <Text style={styles.metaText}><Text style={{fontWeight: "bold"}}>Issue Date:</Text> {issueDate}</Text>
            {invoice.dueDate ? (
              <Text style={styles.metaText}><Text style={{fontWeight: "bold"}}>{isQuotation ? "Valid Until:" : "Due Date:"}</Text> {dueDate}</Text>
            ) : null}
          </View>
          <View style={styles.metaColumn}>
            <Text style={styles.metaLabel}>Project Details</Text>
            <Text style={styles.metaValue}>{invoice.projectName || "General Services"}</Text>
          </View>
        </View>

        {/* QUOTATION VALIDITY BANNER */}
        {isQuotation && invoice.dueDate ? (
          <View style={styles.validityBanner}>
            <Text style={styles.validityText}>This quotation is valid until {dueDate}.</Text>
          </View>
        ) : null}

        {/* LINE ITEMS TABLE */}
        <View style={styles.table}>
          <View style={styles.tableHeader}>
            <Text style={[styles.col1, styles.th]}>Item & Description</Text>
            <Text style={[styles.col2, styles.th]}>Category</Text>
            <Text style={[styles.col3, styles.th]}>Qty</Text>
            <Text style={[styles.col4, styles.th]}>Rate</Text>
            <Text style={[styles.col5, styles.th]}>Amount</Text>
          </View>
          {invoice.items ? invoice.items.map((item: any, i: number) => (
            <View style={styles.tableRow} key={i}>
              <View style={styles.col1}>
                <Text style={styles.tdTitle}>{item.name}</Text>
                {item.description ? <Text style={styles.tdDesc}>{item.description}</Text> : null}
                {item.gstPercent > 0 ? <Text style={{fontSize: 7, color: "#94a3b8", marginTop: 2}}>+ {item.gstPercent + "% GST"}</Text> : null}
              </View>
              <View style={styles.col2}>
                <View style={styles.catTag}>
                  <Text>{item.category}</Text>
                </View>
              </View>
              <Text style={styles.col3}>{String(item.qty)}</Text>
              <Text style={styles.col4}>{formatMoney(item.rate)}</Text>
              <Text style={styles.col5}>{formatMoney(item.qty * item.rate)}</Text>
            </View>
          )) : null}
        </View>

        {/* TOTALS */}
        <View style={styles.totalsSection}>
          <View style={styles.totalsBox}>
            <View style={styles.totalRow}>
              <Text style={styles.totalLabel}>Subtotal</Text>
              <Text style={styles.totalValue}>{formatMoney(invoice.subtotal)}</Text>
            </View>
            
            {invoice.discountAmount > 0 ? (
              <View style={styles.totalRow}>
                <Text style={styles.totalLabel}>Discount ({invoice.discountPercent}%)</Text>
                <Text style={styles.totalValue}>- {formatMoney(invoice.discountAmount)}</Text>
              </View>
            ) : null}

            {invoice.gstAmount > 0 ? (
              <View style={styles.totalRow}>
                <Text style={styles.totalLabel}>Total GST {invoice.gstPercent}%</Text>
                <Text style={styles.totalValue}>{formatMoney(invoice.gstAmount)}</Text>
              </View>
            ) : null}
            
            <View style={styles.grandTotalRow}>
              <Text style={styles.grandTotalLabel}>Grand Total</Text>
              <Text style={styles.grandTotalValue}>{formatMoney(invoice.totalAmount)}</Text>
            </View>
            <Text style={styles.wordsText}>Amount in words: {numberToInrWords(invoice.totalAmount / 100)}</Text>
          </View>
        </View>

        {/* FOOTER */}
        <View style={styles.footerGrid}>
          <View style={styles.bankBox}>
            <Text style={styles.bankTitle}>Bank Details</Text>
            <View style={styles.bankRow}>
              <Text style={styles.bankLabel}>Bank:</Text>
              <Text style={styles.bankValue}>{companyDetails.bank}</Text>
            </View>
            {companyDetails.bank_account_number && (
              <View style={styles.bankRow}>
                <Text style={styles.bankLabel}>A/C No:</Text>
                <Text style={styles.bankValue}>{companyDetails.bank_account_number}</Text>
              </View>
            )}
            <View style={styles.bankRow}>
              <Text style={styles.bankLabel}>IFSC:</Text>
              <Text style={styles.bankValue}>{companyDetails.ifsc}</Text>
            </View>
            {companyDetails.bank_address && (
              <View style={styles.bankRow}>
                <Text style={styles.bankLabel}>Address:</Text>
                <Text style={styles.bankValue}>{companyDetails.bank_address}</Text>
              </View>
            )}
            <View style={{ marginTop: 8 }}>
              <Text style={{ fontSize: 8, fontWeight: "bold", color: "#1e293b", marginBottom: 4 }}>
                UPI: yespay.bizbiz225096@yesbankltd
              </Text>
              {companyDetails.qrUrl && (
                <Image src={companyDetails.qrUrl} style={{ width: 80, height: 80, borderRadius: 4 }} />
              )}
            </View>
          </View>

          <View style={styles.notesBox}>
            <Text style={styles.notesTitle}>Terms & Notes</Text>
            <Text style={styles.notesText}>{invoice.notes || "Please process the payment within the due date. Thank you for your business!"}</Text>
            
            <View style={styles.signArea}>
              {companyDetails.signatureUrl && (
                <Image src={companyDetails.signatureUrl} style={styles.signature} />
              )}
              <View style={styles.signLine}>
                <Text style={styles.signText}>Authorised Signatory</Text>
              </View>
            </View>
          </View>
        </View>

      </Page>
    </Document>
  );
};
