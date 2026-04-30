"use client";

import { useState, useMemo } from "react";
import dynamic from "next/dynamic";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { useConfirm } from "@/hooks/use-confirm";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { PlusCircle, FileText, Trash2, Download } from "lucide-react";
import { InvoicePDF } from "@/components/InvoicePDF";

// Dynamically import PDFDownloadLink to avoid SSR issues
const PDFDownloadLink = dynamic(
  () => import("@react-pdf/renderer").then((mod) => mod.PDFDownloadLink),
  { ssr: false, loading: () => <Button variant="outline" size="sm" disabled className="w-full">Loading PDF...</Button> }
);

interface LineItem {
  description: string;
  qty: number;
  rate: number;
}

interface Invoice {
  id: string;
  invoiceNumber: string;
  clientName: string;
  totalAmount: number;
  status: string;
  isQuotation: boolean;
  createdAt: string;
  [key: string]: any;
}

interface Props {
  initialInvoices: Invoice[];
  companyDetails: { name: string; address: string; gstin: string };
}

const GST_RATES = [0, 5, 12, 18, 28];

export default function InvoicesClient({ initialInvoices, companyDetails }: Props) {
  const [invoices, setInvoices] = useState<Invoice[]>(initialInvoices);
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const { confirm, ConfirmDialog } = useConfirm();
  
  // Form State
  const [isQuotation, setIsQuotation] = useState(false);
  const [clientName, setClientName] = useState("");
  const [clientAddress, setClientAddress] = useState("");
  const [clientGstin, setClientGstin] = useState("");
  const [gstRate, setGstRate] = useState("18");
  const [lineItems, setLineItems] = useState<LineItem[]>([{ description: "", qty: 1, rate: 0 }]);

  const subtotal = useMemo(() => {
    return lineItems.reduce((acc, item) => acc + (item.qty * item.rate), 0);
  }, [lineItems]);

  const gstAmount = useMemo(() => {
    return subtotal * (parseFloat(gstRate) / 100);
  }, [subtotal, gstRate]);

  const totalAmount = useMemo(() => {
    return subtotal + gstAmount;
  }, [subtotal, gstAmount]);

  const handleAddItem = () => {
    setLineItems([...lineItems, { description: "", qty: 1, rate: 0 }]);
  };

  const handleRemoveItem = (index: number) => {
    if (lineItems.length === 1) return;
    setLineItems(lineItems.filter((_, i) => i !== index));
  };

  const updateItem = (index: number, field: keyof LineItem, value: any) => {
    const newItems = [...lineItems];
    newItems[index] = { ...newItems[index], [field]: value };
    setLineItems(newItems);
  };

  const resetForm = () => {
    setClientName("");
    setClientAddress("");
    setClientGstin("");
    setGstRate("18");
    setLineItems([{ description: "", qty: 1, rate: 0 }]);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!clientName) { toast.error("Client name is required"); return; }
    if (lineItems.some(i => !i.description)) { toast.error("All line items must have a description"); return; }
    
    setLoading(true);
    const res = await fetch("/api/invoices", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        clientName,
        clientAddress,
        clientGstin,
        lineItems,
        gstRate,
        subtotal,
        gstAmount,
        totalAmount,
        isQuotation
      })
    });
    
    const data = await res.json();
    setLoading(false);
    
    if (res.ok) {
      setInvoices([data.invoice, ...invoices]);
      setIsAddOpen(false);
      resetForm();
    } else {
      toast.error(data.error || "Failed to save document");
    }
  };

  const updateStatus = async (id: string, status: string) => {
    const res = await fetch(`/api/invoices/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status })
    });
    if (res.ok) {
      setInvoices(invoices.map(inv => inv.id === id ? { ...inv, status } : inv));
    }
  };

  const handleDelete = async (id: string) => {
    const ok = await confirm("Delete Document", "Are you sure you want to delete this document?");
    if (!ok) return;
    const res = await fetch(`/api/invoices/${id}`, { method: "DELETE" });
    if (res.ok) {
      setInvoices(invoices.filter(inv => inv.id !== id));
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Invoices & Quotations</h1>
          <p className="text-sm text-muted-foreground mt-1">Manage billing documents and generate PDFs.</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => { setIsQuotation(true); resetForm(); setIsAddOpen(true); }}>
            <FileText className="mr-2 h-4 w-4" /> New Quotation
          </Button>
          <Button onClick={() => { setIsQuotation(false); resetForm(); setIsAddOpen(true); }}>
            <PlusCircle className="mr-2 h-4 w-4" /> New Invoice
          </Button>
        </div>
      </div>

      <div className="rounded-xl border bg-card shadow-sm overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/50">
              <TableHead>Number</TableHead>
              <TableHead>Type</TableHead>
              <TableHead>Client</TableHead>
              <TableHead>Date</TableHead>
              <TableHead className="text-right">Amount</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {invoices.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                  No documents found. Create your first invoice or quotation.
                </TableCell>
              </TableRow>
            ) : (
              invoices.map((inv) => (
                <TableRow key={inv.id}>
                  <TableCell className="font-medium">{inv.invoiceNumber}</TableCell>
                  <TableCell>
                    <Badge variant={inv.isQuotation ? "secondary" : "default"} className="font-normal text-[10px] uppercase tracking-wider">
                      {inv.isQuotation ? "Quotation" : "Invoice"}
                    </Badge>
                  </TableCell>
                  <TableCell>{inv.clientName}</TableCell>
                  <TableCell>{new Date(inv.createdAt).toLocaleDateString()}</TableCell>
                  <TableCell className="text-right font-semibold">₹{inv.totalAmount.toFixed(2)}</TableCell>
                  <TableCell>
                    <Select value={inv.status} onValueChange={(val) => { if (val) updateStatus(inv.id, val); }}>
                      <SelectTrigger className={`h-8 w-28 text-xs ${inv.status === 'PAID' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : inv.status === 'SENT' ? 'bg-blue-50 text-blue-700 border-blue-200' : ''}`}>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="DRAFT">Draft</SelectItem>
                        <SelectItem value="SENT">Sent</SelectItem>
                        <SelectItem value="PAID">Paid</SelectItem>
                      </SelectContent>
                    </Select>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-2">
                      <PDFDownloadLink
                        document={<InvoicePDF invoice={inv} companyName={companyDetails.name} companyAddress={companyDetails.address} companyGstin={companyDetails.gstin} />}
                        fileName={`${inv.invoiceNumber}.pdf`}
                      >
                        {/* @ts-ignore */}
                        {({ loading: pdfLoading }) => (
                          <Button variant="ghost" size="icon" disabled={pdfLoading} className="h-8 w-8 text-indigo-600 hover:text-indigo-700 hover:bg-indigo-50">
                            <Download className="h-4 w-4" />
                          </Button>
                        )}
                      </PDFDownloadLink>
                      <Button variant="ghost" size="icon" onClick={() => handleDelete(inv.id)} className="h-8 w-8 text-muted-foreground hover:text-destructive">
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Create {isQuotation ? "Quotation" : "Invoice"}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-6 pt-4">
            <div className="grid grid-cols-2 gap-6">
              <div className="space-y-4">
                <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wide">Client Details</h3>
                <div className="space-y-2">
                  <Label>Client Name <span className="text-destructive">*</span></Label>
                  <Input required value={clientName} onChange={e => setClientName(e.target.value)} placeholder="Acme Corp" />
                </div>
                <div className="space-y-2">
                  <Label>Address</Label>
                  <Textarea rows={2} value={clientAddress} onChange={e => setClientAddress(e.target.value)} placeholder="123 Business St..." />
                </div>
                <div className="space-y-2">
                  <Label>GSTIN</Label>
                  <Input value={clientGstin} onChange={e => setClientGstin(e.target.value)} placeholder="22AAAAA0000A1Z5" />
                </div>
              </div>
              <div className="space-y-4 bg-muted/30 p-4 rounded-xl border border-border/50">
                <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wide">Summary Preview</h3>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Subtotal:</span>
                  <span>₹{subtotal.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-sm items-center">
                  <span className="text-muted-foreground">GST Rate:</span>
                  <Select value={gstRate} onValueChange={(val) => { if (val) setGstRate(val); }}>
                    <SelectTrigger className="w-24 h-8 text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {GST_RATES.map(r => <SelectItem key={r} value={r.toString()}>{r}%</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">GST Amount:</span>
                  <span>₹{gstAmount.toFixed(2)}</span>
                </div>
                <div className="pt-3 border-t border-border flex justify-between font-bold text-lg text-primary">
                  <span>Total:</span>
                  <span>₹{totalAmount.toFixed(2)}</span>
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wide">Line Items</h3>
                <Button type="button" variant="outline" size="sm" onClick={handleAddItem}>
                  <PlusCircle className="h-3.5 w-3.5 mr-1.5" /> Add Item
                </Button>
              </div>
              
              <div className="border rounded-xl overflow-hidden">
                <Table>
                  <TableHeader className="bg-muted/50">
                    <TableRow>
                      <TableHead>Description</TableHead>
                      <TableHead className="w-24">Qty</TableHead>
                      <TableHead className="w-32">Rate (₹)</TableHead>
                      <TableHead className="w-32 text-right">Amount</TableHead>
                      <TableHead className="w-12"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {lineItems.map((item, index) => (
                      <TableRow key={index}>
                        <TableCell className="p-2">
                          <Input required value={item.description} onChange={e => updateItem(index, 'description', e.target.value)} placeholder="Service description..." className="border-transparent hover:border-input focus:border-input bg-transparent" />
                        </TableCell>
                        <TableCell className="p-2">
                          <Input type="number" min="1" required value={item.qty} onChange={e => updateItem(index, 'qty', parseInt(e.target.value)||0)} className="border-transparent hover:border-input focus:border-input bg-transparent" />
                        </TableCell>
                        <TableCell className="p-2">
                          <Input type="number" min="0" step="0.01" required value={item.rate} onChange={e => updateItem(index, 'rate', parseFloat(e.target.value)||0)} className="border-transparent hover:border-input focus:border-input bg-transparent" />
                        </TableCell>
                        <TableCell className="p-2 text-right font-medium">
                          {(item.qty * item.rate).toFixed(2)}
                        </TableCell>
                        <TableCell className="p-2 text-right">
                          <Button type="button" variant="ghost" size="icon" onClick={() => handleRemoveItem(index)} disabled={lineItems.length === 1} className="h-8 w-8 text-muted-foreground hover:text-destructive">
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </div>

            <DialogFooter className="pt-4 border-t">
              <Button type="button" variant="ghost" onClick={() => setIsAddOpen(false)}>Cancel</Button>
              <Button type="submit" disabled={loading}>
                {loading ? "Saving..." : `Save ${isQuotation ? "Quotation" : "Invoice"}`}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
      <ConfirmDialog />
    </div>
  );
}
