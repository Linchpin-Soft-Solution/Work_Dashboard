"use client";

import React from "react";
import { Document, Page, Text, View, StyleSheet } from "@react-pdf/renderer";
import { numberToInrWords } from "@/lib/inrWords";

const styles = StyleSheet.create({
  page: { padding: 40, fontSize: 10, fontFamily: "Helvetica", color: "#333" },
  header: { flexDirection: "row", justifyContent: "space-between", marginBottom: 30 },
  companyName: { fontSize: 20, fontWeight: "bold", color: "#111" },
  companyDetails: { fontSize: 10, marginTop: 4, lineHeight: 1.4 },
  title: { fontSize: 24, fontWeight: "bold", color: "#4f46e5", textTransform: "uppercase" },
  invoiceMeta: { marginTop: 10, lineHeight: 1.5, textAlign: "right" },
  clientSection: { marginBottom: 30, borderTop: "1px solid #eee", paddingTop: 15 },
  clientLabel: { fontSize: 10, color: "#666", marginBottom: 4 },
  clientName: { fontSize: 14, fontWeight: "bold", color: "#111" },
  clientText: { marginTop: 2, lineHeight: 1.4 },
  table: { width: "100%", marginBottom: 30 },
  tableHeader: { flexDirection: "row", backgroundColor: "#f8fafc", borderBottom: "1px solid #e2e8f0", paddingVertical: 8, paddingHorizontal: 4 },
  tableRow: { flexDirection: "row", borderBottom: "1px solid #f1f5f9", paddingVertical: 8, paddingHorizontal: 4 },
  col1: { width: "5%" },
  col2: { width: "45%" },
  col3: { width: "15%", textAlign: "right" },
  col4: { width: "15%", textAlign: "right" },
  col5: { width: "20%", textAlign: "right" },
  th: { fontWeight: "bold", color: "#475569" },
  totals: { width: "40%", alignSelf: "flex-end" },
  totalRow: { flexDirection: "row", justifyContent: "space-between", paddingVertical: 4 },
  totalLabel: { color: "#64748b" },
  totalValue: { fontWeight: "bold" },
  grandTotalRow: { flexDirection: "row", justifyContent: "space-between", paddingVertical: 8, borderTop: "2px solid #e2e8f0", marginTop: 4 },
  grandTotalLabel: { fontSize: 12, fontWeight: "bold" },
  grandTotalValue: { fontSize: 12, fontWeight: "bold", color: "#4f46e5" },
  words: { marginTop: 30, fontStyle: "italic", color: "#64748b" },
  footer: { position: "absolute", bottom: 40, left: 40, right: 40, borderTop: "1px solid #eee", paddingTop: 15, textAlign: "center", color: "#94a3b8", fontSize: 9 },
});

interface LineItem {
  description: string;
  qty: number;
  rate: number;
}

interface InvoicePDFProps {
  invoice: any; // Using any to simplify type passing from DB model
  companyName: string;
  companyAddress: string;
  companyGstin: string;
}

export const InvoicePDF = ({ invoice, companyName, companyAddress, companyGstin }: InvoicePDFProps) => {
  const isQuotation = invoice.isQuotation;
  const docTitle = isQuotation ? "Quotation" : "Invoice";
  const dateStr = new Date(invoice.createdAt || Date.now()).toLocaleDateString("en-IN", {
    year: "numeric", month: "long", day: "numeric"
  });

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <View style={styles.header}>
          <View>
            <Text style={styles.companyName}>{companyName}</Text>
            <Text style={styles.companyDetails}>{companyAddress}</Text>
            {companyGstin && <Text style={styles.companyDetails}>GSTIN: {companyGstin}</Text>}
          </View>
          <View>
            <Text style={styles.title}>{docTitle}</Text>
            <View style={styles.invoiceMeta}>
              <Text>{docTitle} #: {invoice.invoiceNumber}</Text>
              <Text>Date: {dateStr}</Text>
            </View>
          </View>
        </View>

        <View style={styles.clientSection}>
          <Text style={styles.clientLabel}>Billed To:</Text>
          <Text style={styles.clientName}>{invoice.clientName}</Text>
          {invoice.clientAddress && <Text style={styles.clientText}>{invoice.clientAddress}</Text>}
          {invoice.clientGstin && <Text style={styles.clientText}>GSTIN: {invoice.clientGstin}</Text>}
        </View>

        <View style={styles.table}>
          <View style={styles.tableHeader}>
            <Text style={[styles.col1, styles.th]}>#</Text>
            <Text style={[styles.col2, styles.th]}>Description</Text>
            <Text style={[styles.col3, styles.th]}>Qty</Text>
            <Text style={[styles.col4, styles.th]}>Rate</Text>
            <Text style={[styles.col5, styles.th]}>Amount</Text>
          </View>
          {invoice.lineItems?.map((item: LineItem, i: number) => (
            <View style={styles.tableRow} key={i}>
              <Text style={styles.col1}>{i + 1}</Text>
              <Text style={styles.col2}>{item.description}</Text>
              <Text style={styles.col3}>{item.qty}</Text>
              <Text style={styles.col4}>{item.rate.toFixed(2)}</Text>
              <Text style={styles.col5}>{(item.qty * item.rate).toFixed(2)}</Text>
            </View>
          ))}
        </View>

        <View style={styles.totals}>
          <View style={styles.totalRow}>
            <Text style={styles.totalLabel}>Subtotal</Text>
            <Text style={styles.totalValue}>{invoice.subtotal.toFixed(2)}</Text>
          </View>
          {invoice.gstRate > 0 && (
            <View style={styles.totalRow}>
              <Text style={styles.totalLabel}>GST ({invoice.gstRate}%)</Text>
              <Text style={styles.totalValue}>{invoice.gstAmount.toFixed(2)}</Text>
            </View>
          )}
          <View style={styles.grandTotalRow}>
            <Text style={styles.grandTotalLabel}>Total</Text>
            <Text style={styles.grandTotalValue}>₹{invoice.totalAmount.toFixed(2)}</Text>
          </View>
        </View>

        <Text style={styles.words}>
          Amount in words: {numberToInrWords(invoice.totalAmount)}
        </Text>

        <View style={styles.footer}>
          <Text>Thank you for your business!</Text>
        </View>
      </Page>
    </Document>
  );
};
