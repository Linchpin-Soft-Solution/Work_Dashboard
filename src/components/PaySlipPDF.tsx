import React from "react";
import { Document, Page, Text, View, StyleSheet, Image } from "@react-pdf/renderer";
import { numberToInrWords } from "@/lib/inrWords";

const styles = StyleSheet.create({
  page: { padding: 30, fontSize: 10, fontFamily: "Helvetica", color: "#334155" },
  headerContainer: { flexDirection: "row", justifyContent: "space-between", marginBottom: 20 },
  logo: { width: 180, height: 94, marginBottom: 10 },
  logoPlaceholder: { width: 60, height: 30, backgroundColor: "#059669", borderRadius: 4, justifyContent: "center", alignItems: "center", marginBottom: 8 },
  logoText: { color: "#fff", fontSize: 10, fontWeight: "bold" },
  companyName: { fontSize: 16, fontWeight: "bold", color: "#059669" },
  companyDetails: { fontSize: 8, lineHeight: 1.3 },
  docTitle: { fontSize: 24, fontWeight: "bold", color: "#059669", textTransform: "uppercase", textAlign: "right" },
  docSubtitle: { fontSize: 11, fontWeight: "bold", textAlign: "right", marginTop: 2 },
  
  metaGrid: { flexDirection: "row", borderTop: "1px solid #e2e8f0", borderBottom: "1px solid #e2e8f0", paddingVertical: 10, marginBottom: 15 },
  metaColumn: { flex: 1, paddingRight: 8 },
  metaLabel: { fontSize: 8, color: "#94a3b8", textTransform: "uppercase", marginBottom: 2 },
  metaValue: { fontSize: 10, fontWeight: "bold", color: "#1e293b", marginBottom: 2 },
  metaText: { fontSize: 9, lineHeight: 1.3 },

  attendanceGrid: { flexDirection: "row", backgroundColor: "#f8fafc", padding: 10, borderRadius: 4, marginBottom: 15 },
  attendanceBox: { flex: 1, alignItems: "center" },
  attendanceLabel: { fontSize: 8, color: "#64748b", textTransform: "uppercase", marginBottom: 2 },
  attendanceValue: { fontSize: 12, fontWeight: "bold", color: "#0f172a" },

  ledgersContainer: { flexDirection: "row", justifyContent: "space-between", marginBottom: 15 },
  ledgerBox: { width: "48%" },
  ledgerHeader: { backgroundColor: "#059669", color: "#fff", padding: 6, fontSize: 9, fontWeight: "bold", borderRadius: 2, textAlign: "center", marginBottom: 4 },
  ledgerRow: { flexDirection: "row", justifyContent: "space-between", borderBottom: "1px solid #f1f5f9", paddingVertical: 6, paddingHorizontal: 2 },
  ledgerItemName: { fontSize: 9, color: "#334155" },
  ledgerItemValue: { fontSize: 9, fontWeight: "bold", color: "#1e293b", textAlign: "right" },

  totalsSection: { borderTop: "2px solid #059669", paddingTop: 10, marginBottom: 20 },
  totalRow: { flexDirection: "row", justifyContent: "space-between", paddingVertical: 4 },
  netPayLabel: { fontSize: 12, fontWeight: "bold", color: "#059669" },
  netPayValue: { fontSize: 14, fontWeight: "bold", color: "#059669", textAlign: "right" },
  wordsText: { fontSize: 9, fontStyle: "italic", color: "#64748b", marginTop: 4, textAlign: "right" },

  signatureArea: { flexDirection: "row", justifyContent: "space-between", marginTop: 40, paddingHorizontal: 20 },
  signatureBox: { width: "40%", alignItems: "center" },
  signatureLine: { width: "100%", borderTop: "1px solid #1e293b", paddingTop: 4, alignItems: "center" },
  signatureText: { fontSize: 9, fontWeight: "bold", color: "#1e293b" },
  signatureSubText: { fontSize: 8, color: "#64748b", marginTop: 2 },
  signatureImage: { width: 120, height: 48, marginBottom: 5 }
});

interface PaySlipPDFProps {
  payRecord: any;
  companyDetails: any;
}

export const PaySlipPDF = ({ payRecord, companyDetails }: PaySlipPDFProps) => {
  const monthDate = new Date(payRecord.month);
  const monthString = monthDate.toLocaleDateString("en-IN", { month: "long", year: "numeric" });
  
  const dailyRate = payRecord.workingDays > 0 ? payRecord.baseSalary / payRecord.workingDays : 0;
  const absentDeduction = payRecord.absentDays * dailyRate;
  const lateDeduction = payRecord.lateDays * dailyRate * 0.5;

  const earnings: { name: string; amount: number }[] = [
    { name: "Basic Salary", amount: payRecord.baseSalary }
  ];
  const deductions: { name: string; amount: number }[] = [];

  if (absentDeduction > 0) {
    deductions.push({ name: "Loss of Pay (Absent)", amount: absentDeduction });
  }
  if (lateDeduction > 0) {
    deductions.push({ name: "Late Arrival Deduction", amount: lateDeduction });
  }

  // Process adjustments
  if (payRecord.PayAdjustment && payRecord.PayAdjustment.length > 0) {
    payRecord.PayAdjustment.forEach((adj: any) => {
      if (adj.type === "DEDUCTION") {
        deductions.push({ name: adj.reason || "Deduction", amount: adj.amount });
      } else {
        earnings.push({ name: adj.reason || adj.type, amount: adj.amount });
      }
    });
  }

  const totalEarnings = earnings.reduce((acc, curr) => acc + curr.amount, 0);
  const totalDeductions = deductions.reduce((acc, curr) => acc + curr.amount, 0);

  const formatMoney = (amount: number) => `Rs. ${amount.toFixed(2)}`;

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        
        {/* HEADER */}
        <View style={styles.headerContainer}>
          <View>
            {companyDetails.logoUrl ? (
              <Image src={companyDetails.logoUrl} style={styles.logo} />
            ) : (
              <View style={styles.logoPlaceholder}>
                <Text style={styles.logoText}>LSS</Text>
              </View>
            )}
            <Text style={styles.companyName}>{companyDetails.name}</Text>
            <Text style={styles.companyDetails}>{companyDetails.address}</Text>
            <Text style={styles.companyDetails}>{companyDetails.email} | {companyDetails.phone}</Text>
            {companyDetails.gstin ? <Text style={styles.companyDetails}>GSTIN: {companyDetails.gstin}</Text> : null}
          </View>
          <View style={{ alignItems: "flex-end" }}>
            <Text style={styles.docTitle}>PAYSLIP</Text>
            <Text style={styles.docSubtitle}>{monthString}</Text>
          </View>
        </View>

        {/* EMPLOYEE META */}
        <View style={styles.metaGrid}>
          <View style={styles.metaColumn}>
            <Text style={styles.metaLabel}>Employee Name</Text>
            <Text style={styles.metaValue}>{payRecord.User.name}</Text>
          </View>
          <View style={styles.metaColumn}>
            <Text style={styles.metaLabel}>Designation</Text>
            <Text style={styles.metaValue}>{payRecord.User.designation || "Employee"}</Text>
          </View>
        </View>

        {/* ATTENDANCE SUMMARY */}
        <View style={styles.attendanceGrid}>
          <View style={styles.attendanceBox}>
            <Text style={styles.attendanceLabel}>Working Days</Text>
            <Text style={styles.attendanceValue}>{payRecord.workingDays}</Text>
          </View>
          <View style={styles.attendanceBox}>
            <Text style={styles.attendanceLabel}>Present</Text>
            <Text style={styles.attendanceValue}>{payRecord.presentDays}</Text>
          </View>
          <View style={styles.attendanceBox}>
            <Text style={styles.attendanceLabel}>Late</Text>
            <Text style={styles.attendanceValue}>{payRecord.lateDays}</Text>
          </View>
          <View style={styles.attendanceBox}>
            <Text style={styles.attendanceLabel}>Absent</Text>
            <Text style={styles.attendanceValue}>{payRecord.absentDays}</Text>
          </View>
        </View>

        {/* LEDGERS */}
        <View style={styles.ledgersContainer}>
          {/* Earnings */}
          <View style={styles.ledgerBox}>
            <Text style={styles.ledgerHeader}>EARNINGS</Text>
            {earnings.map((item, i) => (
              <View style={styles.ledgerRow} key={i}>
                <Text style={styles.ledgerItemName}>{item.name}</Text>
                <Text style={styles.ledgerItemValue}>{formatMoney(item.amount)}</Text>
              </View>
            ))}
            <View style={[styles.ledgerRow, { borderTop: "1px solid #94a3b8", marginTop: 4, paddingTop: 6, borderBottom: "none" }]}>
              <Text style={[styles.ledgerItemName, { fontWeight: "bold" }]}>Total Earnings</Text>
              <Text style={styles.ledgerItemValue}>{formatMoney(totalEarnings)}</Text>
            </View>
          </View>

          {/* Deductions */}
          <View style={styles.ledgerBox}>
            <Text style={styles.ledgerHeader}>DEDUCTIONS</Text>
            {deductions.map((item, i) => (
              <View style={styles.ledgerRow} key={i}>
                <Text style={styles.ledgerItemName}>{item.name}</Text>
                <Text style={styles.ledgerItemValue}>{formatMoney(item.amount)}</Text>
              </View>
            ))}
            {deductions.length === 0 && (
              <View style={styles.ledgerRow}>
                <Text style={styles.ledgerItemName}>No Deductions</Text>
                <Text style={styles.ledgerItemValue}>-</Text>
              </View>
            )}
            <View style={[styles.ledgerRow, { borderTop: "1px solid #94a3b8", marginTop: 4, paddingTop: 6, borderBottom: "none" }]}>
              <Text style={[styles.ledgerItemName, { fontWeight: "bold" }]}>Total Deductions</Text>
              <Text style={styles.ledgerItemValue}>{formatMoney(totalDeductions)}</Text>
            </View>
          </View>
        </View>

        {/* NET PAY */}
        <View style={styles.totalsSection}>
          <View style={styles.totalRow}>
            <Text style={styles.netPayLabel}>Net Payable Salary</Text>
            <Text style={styles.netPayValue}>{formatMoney(payRecord.finalPay)}</Text>
          </View>
          <Text style={styles.wordsText}>Amount in words: {numberToInrWords(payRecord.finalPay)}</Text>
        </View>

        {/* DUAL SIGNATURE AREA */}
        <View style={styles.signatureArea}>
          <View style={styles.signatureBox}>
            {/* Blank space for Employee Signature */}
            <View style={{ height: 48, marginBottom: 5 }} />
            <View style={styles.signatureLine}>
              <Text style={styles.signatureText}>Signature of the Employee</Text>
            </View>
          </View>
          
          <View style={styles.signatureBox}>
            {companyDetails.signatureUrl ? (
              <Image src={companyDetails.signatureUrl} style={styles.signatureImage} />
            ) : (
              <View style={{ height: 48, marginBottom: 5 }} />
            )}
            <View style={styles.signatureLine}>
              <Text style={styles.signatureText}>P.R. Narendra Babu</Text>
              <Text style={styles.signatureSubText}>Authorised Signatory</Text>
            </View>
          </View>
        </View>

      </Page>
    </Document>
  );
};
