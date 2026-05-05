"use client";

import { useState, useMemo } from "react";
import { format } from "date-fns";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { useConfirm } from "@/hooks/use-confirm";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { 
  PlusCircle, FileText, Trash2, Download, Search, 
  ArrowLeft, Copy, Eye, MoreHorizontal, IndianRupee,
  Briefcase, PenTool, LayoutDashboard, MessageSquare
} from "lucide-react";

// Service Quick Add Configurations
const QUICK_SERVICES = [
  { name: "Reels Management", category: "Reels", rate: 15000, desc: "Monthly Instagram Reels Production & Editing", icon: Briefcase, color: "bg-pink-100 dark:bg-pink-900/20 text-pink-700 dark:text-pink-400 border-pink-200 dark:border-pink-800/50" },
  { name: "Social Media", category: "Social Media", rate: 25000, desc: "End-to-end SM Management (FB, IG, LI)", icon: MessageSquare, color: "bg-teal-100 dark:bg-teal-900/20 text-teal-700 dark:text-teal-400 border-teal-200 dark:border-teal-800/50" },
  { name: "Paid Ads", category: "Paid Ads", rate: 20000, desc: "Google & Meta Ads Management", icon: LayoutDashboard, color: "bg-purple-100 dark:bg-purple-900/20 text-purple-700 dark:text-purple-400 border-purple-200 dark:border-purple-800/50" },
  { name: "SEO Optimization", category: "SEO", rate: 18000, desc: "On-page & Off-page SEO Services", icon: Search, color: "bg-green-100 dark:bg-green-900/20 text-green-700 dark:text-green-400 border-green-200 dark:border-green-800/50" },
  { name: "UI/UX Design", category: "Design", rate: 40000, desc: "Website/App Interface Design", icon: PenTool, color: "bg-orange-100 dark:bg-orange-900/20 text-orange-700 dark:text-orange-400 border-orange-200 dark:border-orange-800/50" },
  { name: "CRM Setup", category: "CRM", rate: 30000, desc: "Lead Management System Configuration", icon: LayoutDashboard, color: "bg-indigo-100 dark:bg-indigo-900/20 text-indigo-700 dark:text-indigo-400 border-indigo-200 dark:border-indigo-800/50" }
];

interface LineItem {
  name: string;
  description: string;
  category: string;
  qty: number;
  rate: number;
  gstPercent: number;
}

interface Invoice {
  id: string;
  invoiceNumber: string;
  clientName: string;
  totalAmount: number;
  status: string;
  isQuotation: boolean;
  createdAt: any;
  issueDate?: any;
  [key: string]: any;
}

interface Props {
  initialInvoices: Invoice[];
  companyDetails: any;
}

export default function InvoicesClient({ initialInvoices, companyDetails }: Props) {
  const [invoices, setInvoices] = useState<Invoice[]>(initialInvoices);
  const [view, setView] = useState<"LIST" | "FORM">("LIST");
  const [loading, setLoading] = useState(false);
  const { confirm, ConfirmDialog } = useConfirm();
  
  // List Filters & Search
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [typeFilter, setTypeFilter] = useState("ALL");

  // Form State
  const [editingInvoiceId, setEditingInvoiceId] = useState<string | null>(null);
  const [isQuotation, setIsQuotation] = useState(false);
  const [clientName, setClientName] = useState("");
  const [clientEmail, setClientEmail] = useState("");
  const [clientPhone, setClientPhone] = useState("");
  const [clientAddress, setClientAddress] = useState("");
  const [clientGstin, setClientGstin] = useState("");
  const [projectName, setProjectName] = useState("");
  const [issueDate, setIssueDate] = useState(format(new Date(), "yyyy-MM-dd"));
  const [dueDate, setDueDate] = useState("");
  const [notes, setNotes] = useState("");
  const [discountPercent, setDiscountPercent] = useState<number>(0);
  
  const [lineItems, setLineItems] = useState<LineItem[]>([
    { name: "", description: "", category: "General", qty: 1, rate: 0, gstPercent: 18 }
  ]);

  // Derived calculations for form
  const calculations = useMemo(() => {
    let sub = 0;
    let gst = 0;
    lineItems.forEach(item => {
      const itemTotal = item.qty * item.rate;
      const itemGst = itemTotal * (item.gstPercent / 100);
      sub += itemTotal;
      gst += itemGst;
    });
    const disc = sub * (discountPercent / 100);
    const total = sub + gst - disc;
    return { subtotal: sub, gstAmount: gst, discountAmount: disc, totalAmount: total };
  }, [lineItems, discountPercent]);

  // Summary Metrics
  const metrics = useMemo(() => {
    const billed = invoices.filter(i => !i.isQuotation && i.status !== "CANCELLED").reduce((acc, i) => acc + i.totalAmount, 0);
    const paid = invoices.filter(i => !i.isQuotation && i.status === "PAID").reduce((acc, i) => acc + i.totalAmount, 0);
    const pending = invoices.filter(i => !i.isQuotation && i.status === "SENT").reduce((acc, i) => acc + i.totalAmount, 0);
    const drafts = invoices.filter(i => i.status === "DRAFT").length;
    return { billed, paid, pending, drafts };
  }, [invoices]);

  const filteredInvoices = useMemo(() => {
    return invoices.filter(inv => {
      const matchesSearch = inv.clientName.toLowerCase().includes(searchQuery.toLowerCase()) || 
                            inv.invoiceNumber.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesStatus = statusFilter === "ALL" || inv.status === statusFilter;
      const matchesType = typeFilter === "ALL" || (typeFilter === "QUOTATION" ? inv.isQuotation : !inv.isQuotation);
      return matchesSearch && matchesStatus && matchesType;
    });
  }, [invoices, searchQuery, statusFilter, typeFilter]);

  // Form Handlers
  const handleAddItem = () => {
    setLineItems([...lineItems, { name: "", description: "", category: "General", qty: 1, rate: 0, gstPercent: 18 }]);
  };

  const handleQuickAdd = (service: typeof QUICK_SERVICES[0]) => {
    // If the first item is empty, replace it, otherwise append
    const newItem = { name: service.name, description: service.desc, category: service.category, qty: 1, rate: service.rate, gstPercent: 18 };
    if (lineItems.length === 1 && !lineItems[0].name && lineItems[0].rate === 0) {
      setLineItems([newItem]);
    } else {
      setLineItems([...lineItems, newItem]);
    }
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
    setClientName(""); setClientEmail(""); setClientPhone(""); setClientAddress(""); setClientGstin("");
    setProjectName(""); setIssueDate(format(new Date(), "yyyy-MM-dd")); setDueDate(""); setNotes(""); setDiscountPercent(0);
    setLineItems([{ name: "", description: "", category: "General", qty: 1, rate: 0, gstPercent: 18 }]);
    setEditingInvoiceId(null);
  };

  const handleEdit = async (inv: Invoice) => {
    const res = await fetch(`/api/invoices/${inv.id}`);
    if (!res.ok) {
      toast.error("Failed to load invoice details");
      return;
    }
    const data = await res.json();
    const fullInvoice = data.invoice;

    setEditingInvoiceId(fullInvoice.id);
    setIsQuotation(fullInvoice.isQuotation);
    setClientName(fullInvoice.clientName || "");
    setClientEmail(fullInvoice.clientEmail || "");
    setClientPhone(fullInvoice.clientPhone || "");
    setClientAddress(fullInvoice.clientAddress || "");
    setClientGstin(fullInvoice.clientGstin || "");
    setProjectName(fullInvoice.projectName || "");
    setIssueDate(fullInvoice.issueDate ? format(new Date(fullInvoice.issueDate), "yyyy-MM-dd") : format(new Date(), "yyyy-MM-dd"));
    setDueDate(fullInvoice.dueDate ? format(new Date(fullInvoice.dueDate), "yyyy-MM-dd") : "");
    setNotes(fullInvoice.notes || "");
    setDiscountPercent(fullInvoice.discountPercent || 0);

    if (fullInvoice.items && fullInvoice.items.length > 0) {
      setLineItems(fullInvoice.items.map((item: any) => ({
        name: item.name,
        description: item.description || "",
        category: item.category || "General",
        qty: item.qty,
        rate: item.rate / 100, // convert back to float
        gstPercent: item.gstPercent,
      })));
    } else {
      setLineItems([{ name: "", description: "", category: "General", qty: 1, rate: 0, gstPercent: 18 }]);
    }
    
    setView("FORM");
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!clientName) { toast.error("Client name is required"); return; }
    if (lineItems.some(i => !i.name)) { toast.error("All items must have a name"); return; }
    
    setLoading(true);
    const method = editingInvoiceId ? "PUT" : "POST";
    const url = editingInvoiceId ? `/api/invoices/${editingInvoiceId}` : "/api/invoices";

    const res = await fetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        clientName, clientEmail, clientPhone, clientAddress, clientGstin,
        projectName, issueDate, dueDate, notes, discountPercent, isQuotation,
        lineItems
      })
    });
    
    const data = await res.json();
    setLoading(false);
    
    if (res.ok) {
      if (editingInvoiceId) {
        setInvoices(invoices.map(inv => inv.id === editingInvoiceId ? data.invoice : inv));
        toast.success(`${isQuotation ? "Quotation" : "Invoice"} updated successfully`);
      } else {
        setInvoices([data.invoice, ...invoices]);
        toast.success(`${isQuotation ? "Quotation" : "Invoice"} created successfully`);
      }
      setView("LIST");
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
      toast.success("Status updated");
    }
  };

  const handleDelete = async (id: string) => {
    const ok = await confirm("Delete Document", "Are you sure you want to delete this document? This action cannot be undone.");
    if (!ok) return;
    const res = await fetch(`/api/invoices/${id}`, { method: "DELETE" });
    if (res.ok) {
      setInvoices(invoices.filter(inv => inv.id !== id));
      toast.success("Document deleted");
    }
  };

  // Helper for money format (from paise)
  const formatMoney = (paise: number) => `₹${(paise / 100).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "PAID": return <Badge className="bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 hover:bg-emerald-100 border-none">Paid</Badge>;
      case "SENT": return <Badge className="bg-emerald-50 dark:bg-emerald-950/20 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-50 border-none">Sent</Badge>;
      case "CANCELLED": return <Badge className="bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400 hover:bg-red-100 border-none">Cancelled</Badge>;
      default: return <Badge className="bg-slate-100 dark:bg-gray-800 text-slate-700 dark:text-gray-300 hover:bg-slate-100 border-none">Draft</Badge>;
    }
  };

  if (view === "FORM") {
    return (
      <div className="space-y-6 max-w-6xl mx-auto pb-10">
        <div className="flex items-center justify-between border-b dark:border-gray-800 pb-4">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={() => { setView("LIST"); resetForm(); }}><ArrowLeft className="h-5 w-5" /></Button>
            <div className="flex items-center gap-4">
              {companyDetails.logoUrl && (
                <img src={companyDetails.logoUrl} alt="Logo" className="h-12 w-auto object-contain" />
              )}
              <div>
                <h1 className="text-2xl font-bold tracking-tight text-gray-900 dark:text-gray-100">{editingInvoiceId ? "Edit" : "Create"} {isQuotation ? "Quotation" : "Invoice"}</h1>
                <p className="text-sm text-muted-foreground">{editingInvoiceId ? "Update the details of this document." : "Fill in the details below to generate a new document."}</p>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <div className="bg-muted dark:bg-gray-800 p-1 rounded-lg flex items-center mr-4">
              <Button size="sm" variant={!isQuotation ? "secondary" : "ghost"} onClick={() => setIsQuotation(false)}>Invoice</Button>
              <Button size="sm" variant={isQuotation ? "secondary" : "ghost"} onClick={() => setIsQuotation(true)}>Quotation</Button>
            </div>
            <Button variant="outline" onClick={() => { setView("LIST"); resetForm(); }}>Cancel</Button>
            <Button onClick={handleSubmit} disabled={loading}>{loading ? "Saving..." : (editingInvoiceId ? "Update Document" : "Save Document")}</Button>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column: Details */}
          <div className="lg:col-span-2 space-y-6">
            <Card>
              <CardContent className="p-6 space-y-4">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold flex items-center gap-2"><Briefcase className="w-5 h-5 text-primary" /> Client Details</h3>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Client Name <span className="text-destructive">*</span></Label>
                    <Input required value={clientName} onChange={e => setClientName(e.target.value)} placeholder="Acme Corp" className="dark:bg-gray-800 dark:border-gray-700" />
                  </div>
                  <div className="space-y-2">
                    <Label>Project Name</Label>
                    <Input value={projectName} onChange={e => setProjectName(e.target.value)} placeholder="Website Redesign" className="dark:bg-gray-800 dark:border-gray-700" />
                  </div>
                  <div className="space-y-2">
                    <Label>Email</Label>
                    <Input type="email" value={clientEmail} onChange={e => setClientEmail(e.target.value)} placeholder="client@example.com" className="dark:bg-gray-800 dark:border-gray-700" />
                  </div>
                  <div className="space-y-2">
                    <Label>Phone</Label>
                    <Input value={clientPhone} onChange={e => setClientPhone(e.target.value)} placeholder="+91 9876543210" className="dark:bg-gray-800 dark:border-gray-700" />
                  </div>
                  <div className="space-y-2 col-span-2">
                    <Label>Address</Label>
                    <Textarea rows={2} value={clientAddress} onChange={e => setClientAddress(e.target.value)} placeholder="123 Business St..." className="dark:bg-gray-800 dark:border-gray-700" />
                  </div>
                  <div className="space-y-2">
                    <Label>GSTIN (Optional)</Label>
                    <Input value={clientGstin} onChange={e => setClientGstin(e.target.value)} placeholder="22AAAAA0000A1Z5" className="dark:bg-gray-800 dark:border-gray-700" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6 space-y-4">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold">Line Items</h3>
                  <Button type="button" variant="outline" size="sm" onClick={handleAddItem}>
                    <PlusCircle className="h-4 w-4 mr-2" /> Add Custom Row
                  </Button>
                </div>
                
                {/* Quick Add Services */}
                <div className="flex flex-wrap gap-2 mb-6">
                  {QUICK_SERVICES.map(svc => (
                    <Badge key={svc.name} variant="outline" className={`cursor-pointer hover:opacity-80 py-1.5 px-3 ${svc.color}`} onClick={() => handleQuickAdd(svc)}>
                      <PlusCircle className="w-3 h-3 mr-1" /> {svc.name}
                    </Badge>
                  ))}
                </div>

                <div className="border dark:border-gray-800 rounded-xl overflow-hidden">
                  <Table>
                    <TableHeader className="bg-muted/50 dark:bg-gray-800/50">
                      <TableRow className="border-b dark:border-gray-800">
                        <TableHead className="dark:text-gray-300">Service / Description</TableHead>
                        <TableHead className="w-24 dark:text-gray-300">Cat</TableHead>
                        <TableHead className="w-20 dark:text-gray-300">Qty</TableHead>
                        <TableHead className="w-28 dark:text-gray-300">Rate (₹)</TableHead>
                        <TableHead className="w-20 dark:text-gray-300">GST %</TableHead>
                        <TableHead className="w-28 text-right dark:text-gray-300">Total</TableHead>
                        <TableHead className="w-12"></TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {lineItems.map((item, index) => (
                        <TableRow key={index} className="group">
                          <TableCell className="p-2 align-top">
                            <div className="flex flex-col gap-1 w-full min-w-[200px]">
                              <Input required value={item.name} onChange={e => updateItem(index, 'name', e.target.value)} placeholder="Service Name" className="font-medium border-transparent hover:border-input focus:border-input bg-transparent h-8" />
                              <Textarea value={item.description} onChange={e => updateItem(index, 'description', e.target.value)} placeholder="Description (optional)" className="text-xs text-muted-foreground border-transparent hover:border-input focus:border-input bg-transparent min-h-[40px] resize-none py-1" rows={2} />
                            </div>
                          </TableCell>
                          <TableCell className="p-2 align-top">
                             <Select value={item.category} onValueChange={(val) => { if (val) updateItem(index, 'category', val); }}>
                                <SelectTrigger className="h-8 border-transparent hover:border-input text-xs px-2"><SelectValue /></SelectTrigger>
                                <SelectContent>
                                  {Array.from(new Set([...QUICK_SERVICES.map(s=>s.category), "General"])).map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                                </SelectContent>
                             </Select>
                          </TableCell>
                          <TableCell className="p-2 align-top">
                            <Input type="number" min="1" required value={item.qty} onChange={e => updateItem(index, 'qty', parseInt(e.target.value)||0)} className="h-8 border-transparent hover:border-input focus:border-input bg-transparent" />
                          </TableCell>
                          <TableCell className="p-2 align-top">
                            <Input type="number" min="0" step="1" required value={item.rate} onChange={e => updateItem(index, 'rate', parseFloat(e.target.value)||0)} className="h-8 border-transparent hover:border-input focus:border-input bg-transparent" />
                          </TableCell>
                          <TableCell className="p-2 align-top">
                            <Select value={item.gstPercent.toString()} onValueChange={(val) => { if (val) updateItem(index, 'gstPercent', parseFloat(val)); }}>
                                <SelectTrigger className="h-8 border-transparent hover:border-input text-xs px-2"><SelectValue /></SelectTrigger>
                                <SelectContent>
                                  {[0, 5, 12, 18, 28].map(r => <SelectItem key={r} value={r.toString()}>{r}%</SelectItem>)}
                                </SelectContent>
                             </Select>
                          </TableCell>
                          <TableCell className="p-2 align-top text-right font-medium text-sm pt-4 dark:text-gray-300">
                            ₹{(item.qty * item.rate).toLocaleString('en-IN', {minimumFractionDigits: 2})}
                          </TableCell>
                          <TableCell className="p-2 align-top pt-3">
                            <Button type="button" variant="ghost" size="icon" onClick={() => handleRemoveItem(index)} disabled={lineItems.length === 1} className="h-8 w-8 text-muted-foreground hover:text-destructive opacity-0 group-hover:opacity-100 transition-opacity">
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <Label>Notes & Terms</Label>
                <Textarea rows={3} value={notes} onChange={e => setNotes(e.target.value)} placeholder="Special terms, payment instructions, etc." className="mt-2 dark:bg-gray-800 dark:border-gray-700" />
              </CardContent>
            </Card>
          </div>

          {/* Right Column: Meta & Totals */}
          <div className="space-y-6">
            <Card>
              <CardContent className="p-6 space-y-4">
                <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">Document Settings</h3>
                <div className="space-y-2">
                  <Label>Issue Date</Label>
                  <Input type="date" value={issueDate} onChange={e => setIssueDate(e.target.value)} className="dark:bg-gray-800 dark:border-gray-700" />
                </div>
                <div className="space-y-2">
                  <Label>{isQuotation ? "Valid Until" : "Due Date"}</Label>
                  <Input type="date" value={dueDate} onChange={e => setDueDate(e.target.value)} className="dark:bg-gray-800 dark:border-gray-700" />
                </div>
              </CardContent>
            </Card>

            <Card className="bg-primary/5 border-primary/20">
              <CardContent className="p-6 space-y-4">
                <h3 className="text-sm font-semibold uppercase tracking-wider text-primary">Financial Summary</h3>
                
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Subtotal</span>
                  <span className="font-medium">₹{calculations.subtotal.toLocaleString('en-IN', {minimumFractionDigits: 2})}</span>
                </div>
                
                <div className="flex justify-between items-center text-sm">
                  <span className="text-muted-foreground">Discount (%)</span>
                  <Input type="number" min="0" max="100" value={discountPercent} onChange={e => setDiscountPercent(parseFloat(e.target.value)||0)} className="w-20 h-8 text-right bg-white dark:bg-gray-800 dark:border-gray-700" />
                </div>
                {calculations.discountAmount > 0 && (
                  <div className="flex justify-between text-sm text-emerald-600">
                    <span>Discount Amt</span>
                    <span>- ₹{calculations.discountAmount.toLocaleString('en-IN', {minimumFractionDigits: 2})}</span>
                  </div>
                )}

                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Total GST</span>
                  <span className="font-medium">₹{calculations.gstAmount.toLocaleString('en-IN', {minimumFractionDigits: 2})}</span>
                </div>

                <div className="pt-4 border-t border-primary/20 flex justify-between items-end">
                  <span className="font-bold text-primary">Grand Total</span>
                  <span className="text-2xl font-black text-primary">₹{calculations.totalAmount.toLocaleString('en-IN', {minimumFractionDigits: 2})}</span>
                </div>
              </CardContent>
            </Card>
          </div>
        </form>
      </div>
    );
  }

  // LIST VIEW
  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="flex items-center gap-4">
          {companyDetails.logoUrl && (
            <img src={companyDetails.logoUrl} alt="Logo" className="h-14 w-auto object-contain" />
          )}
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-primary">Billing Overview</h1>
            <p className="text-sm text-muted-foreground mt-1">Manage all your invoices, quotations, and payments in one place.</p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button onClick={() => { setIsQuotation(false); resetForm(); setView("FORM"); }}>
            <PlusCircle className="mr-2 h-4 w-4" /> Create Document
          </Button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="bg-white dark:bg-gray-900 border-l-4 border-l-primary dark:border-l-indigo-500 shadow-sm hover:shadow-md transition-shadow">
          <CardContent className="p-6">
            <div className="flex justify-between items-center">
              <p className="text-sm font-medium text-muted-foreground">Total Billed</p>
              <IndianRupee className="h-4 w-4 text-primary dark:text-indigo-400" />
            </div>
            <p className="text-2xl font-bold text-slate-800 dark:text-gray-100 mt-2">{formatMoney(metrics.billed)}</p>
          </CardContent>
        </Card>
        <Card className="bg-white dark:bg-gray-900 border-l-4 border-l-emerald-500 shadow-sm hover:shadow-md transition-shadow">
          <CardContent className="p-6">
            <div className="flex justify-between items-center">
              <p className="text-sm font-medium text-muted-foreground">Amount Paid</p>
              <IndianRupee className="h-4 w-4 text-emerald-500" />
            </div>
            <p className="text-2xl font-bold text-emerald-600 dark:text-emerald-400 mt-2">{formatMoney(metrics.paid)}</p>
          </CardContent>
        </Card>
        <Card className="bg-white dark:bg-gray-900 border-l-4 border-l-emerald-400 shadow-sm hover:shadow-md transition-shadow">
          <CardContent className="p-6">
            <div className="flex justify-between items-center">
              <p className="text-sm font-medium text-muted-foreground">Pending Payment</p>
              <IndianRupee className="h-4 w-4 text-emerald-400" />
            </div>
            <p className="text-2xl font-bold text-emerald-500 dark:text-emerald-300 mt-2">{formatMoney(metrics.pending)}</p>
          </CardContent>
        </Card>
        <Card className="bg-white dark:bg-gray-900 border-l-4 border-l-slate-400 dark:border-l-gray-600 shadow-sm hover:shadow-md transition-shadow">
          <CardContent className="p-6">
            <div className="flex justify-between items-center">
              <p className="text-sm font-medium text-muted-foreground">Draft Documents</p>
              <FileText className="h-4 w-4 text-slate-400 dark:text-gray-500" />
            </div>
            <p className="text-2xl font-bold text-slate-700 dark:text-gray-300 mt-2">{metrics.drafts}</p>
          </CardContent>
        </Card>
      </div>

      {/* Filters and Search */}
      <div className="flex flex-col sm:flex-row gap-4 items-center bg-white dark:bg-gray-900 p-4 rounded-xl border dark:border-gray-800 shadow-sm">
        <div className="relative flex-1 w-full">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input 
            placeholder="Search by client or invoice number..." 
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9 bg-muted/50 dark:bg-gray-800/50 border-transparent focus-visible:bg-white dark:focus-visible:bg-gray-800"
          />
        </div>
        <Select value={typeFilter} onValueChange={(val) => { if (val) setTypeFilter(val); }}>
          <SelectTrigger className="w-[160px] bg-muted/50 border-transparent focus:bg-white"><SelectValue placeholder="Document Type" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">All Types</SelectItem>
            <SelectItem value="INVOICE">Invoices</SelectItem>
            <SelectItem value="QUOTATION">Quotations</SelectItem>
          </SelectContent>
        </Select>
        <Select value={statusFilter} onValueChange={(val) => { if (val) setStatusFilter(val); }}>
          <SelectTrigger className="w-[160px] bg-muted/50 dark:bg-gray-800/50 border-transparent focus:bg-white dark:focus:bg-gray-800"><SelectValue placeholder="Status" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">All Statuses</SelectItem>
            <SelectItem value="DRAFT">Draft</SelectItem>
            <SelectItem value="SENT">Sent</SelectItem>
            <SelectItem value="PAID">Paid</SelectItem>
            <SelectItem value="CANCELLED">Cancelled</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Table */}
      <div className="rounded-xl border dark:border-gray-800 bg-white dark:bg-gray-900 shadow-sm overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="bg-slate-50/50 dark:bg-gray-800/30 hover:bg-slate-50/50 dark:hover:bg-gray-800/30">
              <TableHead className="font-semibold text-slate-600 dark:text-gray-400">Document</TableHead>
              <TableHead className="font-semibold text-slate-600 dark:text-gray-400">Client / Project</TableHead>
              <TableHead className="font-semibold text-slate-600 dark:text-gray-400">Date</TableHead>
              <TableHead className="text-right font-semibold text-slate-600 dark:text-gray-400">Amount</TableHead>
              <TableHead className="font-semibold text-slate-600 dark:text-gray-400">Status</TableHead>
              <TableHead className="text-right font-semibold text-slate-600 dark:text-gray-400">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredInvoices.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-16 text-muted-foreground">
                  <div className="flex flex-col items-center justify-center space-y-3">
                    <div className="h-12 w-12 rounded-full bg-slate-100 flex items-center justify-center">
                      <FileText className="h-6 w-6 text-slate-400" />
                    </div>
                    <p>No documents found matching your criteria.</p>
                  </div>
                </TableCell>
              </TableRow>
            ) : (
              filteredInvoices.map((inv) => (
                <TableRow key={inv.id} className="hover:bg-slate-50/50 dark:hover:bg-gray-800/20 transition-colors border-b dark:border-gray-800">
                  <TableCell>
                    <div className="font-medium text-slate-900 dark:text-gray-100">{inv.invoiceNumber}</div>
                    <div className="text-[10px] uppercase font-bold tracking-wider text-slate-500 dark:text-gray-500 mt-1">
                      {inv.isQuotation ? "Quotation" : "Invoice"}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="font-medium text-slate-900 dark:text-gray-100">{inv.clientName}</div>
                    {inv.projectName && <div className="text-xs text-muted-foreground mt-0.5">{inv.projectName}</div>}
                  </TableCell>
                  <TableCell>
                    <div className="text-sm dark:text-gray-300">{format(new Date(inv.issueDate || inv.createdAt), "MMM dd, yyyy")}</div>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="font-semibold text-slate-900 dark:text-gray-100">{formatMoney(inv.totalAmount)}</div>
                  </TableCell>
                  <TableCell>
                    <Select value={inv.status} onValueChange={(val) => { if (val) updateStatus(inv.id, val); }}>
                      <SelectTrigger className="h-8 w-[110px] border-none shadow-none bg-transparent p-0 focus:ring-0">
                        {getStatusBadge(inv.status)}
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="DRAFT">Draft</SelectItem>
                        <SelectItem value="SENT">Sent</SelectItem>
                        <SelectItem value="PAID">Paid</SelectItem>
                        <SelectItem value="CANCELLED">Cancelled</SelectItem>
                      </SelectContent>
                    </Select>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-1">
                      <Button variant="ghost" size="icon" onClick={() => handleEdit(inv)} className="h-8 w-8 text-slate-500 hover:text-primary hover:bg-primary/10" title="Edit">
                        <PenTool className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="icon" onClick={() => window.open(`/api/invoices/${inv.id}/pdf`, '_blank')} className="h-8 w-8 text-slate-500 hover:text-primary hover:bg-primary/10" title="Download PDF">
                        <Download className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="icon" onClick={() => handleDelete(inv.id)} className="h-8 w-8 text-slate-500 hover:text-destructive hover:bg-destructive/10" title="Delete">
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

      <ConfirmDialog />
    </div>
  );
}
