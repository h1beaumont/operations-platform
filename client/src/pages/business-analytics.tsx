import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { 
  DollarSign, TrendingUp, TrendingDown, FileText, Upload, 
  Download, Trash2, Edit, Eye, CheckCircle, XCircle, Loader2,
  Calendar as CalendarIcon, PieChart as PieChartIcon, BarChart3
} from "lucide-react";
import { format, startOfMonth, endOfMonth, subMonths, startOfYear, endOfYear } from "date-fns";
import { motion } from "framer-motion";
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip, BarChart, Bar, XAxis, YAxis, CartesianGrid } from "recharts";

type DateRangeType = 'this_month' | 'last_month' | 'this_year' | 'custom';

const INCOME_CATEGORIES = [
  'Rental Income',
  'Management Fees',
  'Other Income'
];

const EXPENSE_CATEGORIES = [
  'Maintenance Costs',
  'Contractor Fees',
  'Cleaning Costs',
  'Linen Costs',
  'Software Costs',
  'Utilities',
  'Insurance',
  'Other Expenses'
];

const COLORS = ['#3b82f6', '#8b5cf6', '#ec4899', '#f59e0b', '#10b981', '#06b6d4', '#f97316', '#6366f1'];

export default function BusinessAnalytics() {
  const { toast } = useToast();
  const [dateRange, setDateRange] = useState<DateRangeType>('this_month');
  const [customStart, setCustomStart] = useState<Date>();
  const [customEnd, setCustomEnd] = useState<Date>();
  
  // Transaction form state
  const [transactionType, setTransactionType] = useState<'income' | 'expense'>('expense');
  const [transactionCategory, setTransactionCategory] = useState('');
  const [transactionAmount, setTransactionAmount] = useState('');
  const [transactionDate, setTransactionDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [transactionDescription, setTransactionDescription] = useState('');
  
  // Document upload state
  const [documentType, setDocumentType] = useState<'bank_statement' | 'uplisting_report'>('bank_statement');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  
  // Review dialog state
  const [reviewDialogOpen, setReviewDialogOpen] = useState(false);
  const [reviewingDocument, setReviewingDocument] = useState<any>(null);
  const [editedTransactions, setEditedTransactions] = useState<any[]>([]);
  
  // Transaction filters
  const [transactionFilters, setTransactionFilters] = useState({
    type: '',
    category: '',
    dateFrom: '',
    dateTo: ''
  });
  
  // Edit transaction state
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [editingTransaction, setEditingTransaction] = useState<any>(null);

  // Calculate date parameters
  const getDateParams = () => {
    const now = new Date();
    if (dateRange === 'this_month') {
      return { startDate: startOfMonth(now), endDate: endOfMonth(now) };
    } else if (dateRange === 'last_month') {
      const lastMonth = subMonths(now, 1);
      return { startDate: startOfMonth(lastMonth), endDate: endOfMonth(lastMonth) };
    } else if (dateRange === 'this_year') {
      return { startDate: startOfYear(now), endDate: endOfYear(now) };
    } else if (dateRange === 'custom' && customStart && customEnd) {
      return { startDate: customStart, endDate: customEnd };
    }
    return { startDate: startOfMonth(now), endDate: endOfMonth(now) };
  };

  const { startDate, endDate } = getDateParams();

  // Fetch key metrics
  const { data: metrics, isLoading: metricsLoading } = useQuery({
    queryKey: ['/api/analytics/metrics', startDate.toISOString(), endDate.toISOString()],
    queryFn: async () => {
      const params = new URLSearchParams({
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString()
      });
      const response = await fetch(`/api/analytics/metrics?${params}`);
      return response.json();
    }
  });

  // Fetch P&L data
  const { data: pnl, isLoading: pnlLoading } = useQuery({
    queryKey: ['/api/analytics/pnl', startDate.toISOString(), endDate.toISOString()],
    queryFn: async () => {
      const params = new URLSearchParams({
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString()
      });
      const response = await fetch(`/api/analytics/pnl?${params}`);
      return response.json();
    }
  });

  // Fetch documents
  const { data: documents, isLoading: documentsLoading } = useQuery({
    queryKey: ['/api/analytics/documents'],
    queryFn: async () => {
      const response = await fetch('/api/analytics/documents');
      return response.json();
    }
  });

  // Fetch transactions with filters
  const { data: transactions, isLoading: transactionsLoading } = useQuery({
    queryKey: ['/api/analytics/transactions', transactionFilters],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (transactionFilters.type && transactionFilters.type !== 'all') params.append('type', transactionFilters.type);
      if (transactionFilters.category && transactionFilters.category !== 'all') params.append('category', transactionFilters.category);
      if (transactionFilters.dateFrom) params.append('startDate', new Date(transactionFilters.dateFrom).toISOString());
      if (transactionFilters.dateTo) params.append('endDate', new Date(transactionFilters.dateTo).toISOString());
      const response = await fetch(`/api/analytics/transactions?${params}`);
      return response.json();
    }
  });

  // Upload document mutation
  const uploadMutation = useMutation({
    mutationFn: async (file: File) => {
      const formData = new FormData();
      formData.append('document', file);
      formData.append('documentType', documentType);
      const response = await fetch('/api/analytics/documents/upload', {
        method: 'POST',
        body: formData,
        credentials: 'include'
      });
      if (!response.ok) throw new Error('Upload failed');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/analytics/documents'] });
      setSelectedFile(null);
      toast({
        title: "Document uploaded",
        description: "Your document has been uploaded successfully.",
      });
    },
    onError: () => {
      toast({
        title: "Upload failed",
        description: "Failed to upload document. Please try again.",
        variant: "destructive"
      });
    }
  });

  // Extract document mutation
  const extractMutation = useMutation({
    mutationFn: async (id: string) => {
      return apiRequest(`/api/analytics/documents/${id}/extract`, { method: 'POST' });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/analytics/documents'] });
      toast({
        title: "Extraction started",
        description: "AI extraction is in progress. This may take a moment.",
      });
    }
  });

  // Approve document mutation
  const approveMutation = useMutation({
    mutationFn: async ({ id, transactions }: { id: string; transactions: any[] }) => {
      return apiRequest(`/api/analytics/documents/${id}/approve`, {
        method: 'POST',
        body: JSON.stringify({ transactions })
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/analytics/transactions'] });
      queryClient.invalidateQueries({ queryKey: ['/api/analytics/pnl'] });
      queryClient.invalidateQueries({ queryKey: ['/api/analytics/metrics'] });
      queryClient.invalidateQueries({ queryKey: ['/api/analytics/documents'] });
      setReviewDialogOpen(false);
      toast({
        title: "Transactions approved",
        description: "Transactions have been saved successfully.",
      });
    }
  });

  // Create transaction mutation
  const createTransactionMutation = useMutation({
    mutationFn: async (data: any) => {
      return apiRequest('/api/analytics/transactions', {
        method: 'POST',
        body: JSON.stringify(data)
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/analytics/transactions'] });
      queryClient.invalidateQueries({ queryKey: ['/api/analytics/pnl'] });
      queryClient.invalidateQueries({ queryKey: ['/api/analytics/metrics'] });
      // Reset form
      setTransactionAmount('');
      setTransactionDescription('');
      setTransactionCategory('');
      setTransactionDate(format(new Date(), 'yyyy-MM-dd'));
      toast({
        title: "Transaction created",
        description: "Transaction has been added successfully.",
      });
    }
  });

  // Update transaction mutation
  const updateTransactionMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: any }) => {
      return apiRequest(`/api/analytics/transactions/${id}`, {
        method: 'PATCH',
        body: JSON.stringify(data)
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/analytics/transactions'] });
      queryClient.invalidateQueries({ queryKey: ['/api/analytics/pnl'] });
      queryClient.invalidateQueries({ queryKey: ['/api/analytics/metrics'] });
      setEditDialogOpen(false);
      toast({
        title: "Transaction updated",
        description: "Transaction has been updated successfully.",
      });
    }
  });

  // Delete transaction mutation
  const deleteTransactionMutation = useMutation({
    mutationFn: async (id: string) => {
      return apiRequest(`/api/analytics/transactions/${id}`, { method: 'DELETE' });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/analytics/transactions'] });
      queryClient.invalidateQueries({ queryKey: ['/api/analytics/pnl'] });
      queryClient.invalidateQueries({ queryKey: ['/api/analytics/metrics'] });
      toast({
        title: "Transaction deleted",
        description: "Transaction has been deleted successfully.",
      });
    }
  });

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setSelectedFile(e.target.files[0]);
    }
  };

  const handleUpload = () => {
    if (selectedFile) {
      uploadMutation.mutate(selectedFile);
    }
  };

  const handleExtract = (doc: any) => {
    extractMutation.mutate(doc.id);
  };

  const handleReview = (doc: any) => {
    setReviewingDocument(doc);
    setEditedTransactions(doc.extractedData || []);
    setReviewDialogOpen(true);
  };

  const handleApprove = () => {
    if (reviewingDocument) {
      approveMutation.mutate({
        id: reviewingDocument.id,
        transactions: editedTransactions
      });
    }
  };

  const handleCreateTransaction = () => {
    if (!transactionCategory || !transactionAmount || !transactionDescription) {
      toast({
        title: "Missing fields",
        description: "Please fill in all required fields.",
        variant: "destructive"
      });
      return;
    }

    createTransactionMutation.mutate({
      type: transactionType,
      category: transactionCategory,
      amount: parseFloat(transactionAmount),
      date: new Date(transactionDate),
      description: transactionDescription,
      source: 'manual'
    });
  };

  const handleEditTransaction = (transaction: any) => {
    setEditingTransaction(transaction);
    setEditDialogOpen(true);
  };

  const handleSaveEdit = () => {
    if (editingTransaction) {
      updateTransactionMutation.mutate({
        id: editingTransaction.id,
        data: editingTransaction
      });
    }
  };

  const handleDeleteTransaction = (id: string) => {
    if (confirm('Are you sure you want to delete this transaction?')) {
      deleteTransactionMutation.mutate(id);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-GB', {
      style: 'currency',
      currency: 'GBP',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount);
  };

  // Prepare chart data
  const expenseChartData = pnl?.expenses ? Object.entries(pnl.expenses)
    .filter(([key]) => key !== 'total')
    .map(([name, value]) => ({
      name,
      value: Math.abs(value as number)
    })) : [];

  const incomeVsExpenseData = [
    { name: 'Income', amount: pnl?.income?.total || 0 },
    { name: 'Expenses', amount: Math.abs(pnl?.expenses?.total || 0) }
  ];

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold" data-testid="heading-business-analytics">Business Analytics</h1>
          <p className="text-muted-foreground" data-testid="text-page-description">Comprehensive P&L and financial insights</p>
        </div>
        <div className="flex gap-2">
          <Select value={dateRange} onValueChange={(value) => setDateRange(value as DateRangeType)}>
            <SelectTrigger className="w-[180px]" data-testid="select-date-range">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="this_month">This Month</SelectItem>
              <SelectItem value="last_month">Last Month</SelectItem>
              <SelectItem value="this_year">This Year</SelectItem>
              <SelectItem value="custom">Custom Range</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="outline" data-testid="button-export">
            <Download className="mr-2 h-4 w-4" />
            Export
          </Button>
        </div>
      </div>

      {/* SECTION A: Key Metrics Dashboard */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card data-testid="card-total-revenue">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium" data-testid="card-title-total-revenue">Total Revenue</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {metricsLoading ? (
              <div className="h-8 bg-muted animate-pulse rounded" />
            ) : (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5 }}
              >
                <div className="text-2xl font-bold text-green-600" data-testid="text-total-revenue">
                  {formatCurrency(metrics?.totalRevenue || 0)}
                </div>
              </motion.div>
            )}
          </CardContent>
        </Card>

        <Card data-testid="card-management-fees">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium" data-testid="card-title-management-fees">Management Fees</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {metricsLoading ? (
              <div className="h-8 bg-muted animate-pulse rounded" />
            ) : (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.1 }}
              >
                <div className="text-2xl font-bold text-green-600" data-testid="text-management-fees">
                  {formatCurrency(metrics?.managementFees || 0)}
                </div>
              </motion.div>
            )}
          </CardContent>
        </Card>

        <Card data-testid="card-total-expenses">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium" data-testid="card-title-total-expenses">Total Expenses</CardTitle>
            <TrendingDown className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {metricsLoading ? (
              <div className="h-8 bg-muted animate-pulse rounded" />
            ) : (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.2 }}
              >
                <div className="text-2xl font-bold text-red-600" data-testid="text-total-expenses">
                  {formatCurrency(Math.abs(metrics?.totalExpenses || 0))}
                </div>
              </motion.div>
            )}
          </CardContent>
        </Card>

        <Card data-testid="card-net-profit">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium" data-testid="card-title-net-profit">Net Profit</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {metricsLoading ? (
              <div className="h-8 bg-muted animate-pulse rounded" />
            ) : (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.3 }}
              >
                <div 
                  className={`text-2xl font-bold ${(metrics?.netProfit || 0) >= 0 ? 'text-green-600' : 'text-red-600'}`}
                  data-testid="text-net-profit"
                >
                  {formatCurrency(metrics?.netProfit || 0)}
                </div>
              </motion.div>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* SECTION B: Full P&L Statement */}
        <Card data-testid="card-pnl-statement">
          <CardHeader>
            <CardTitle data-testid="card-title-pnl-statement">Profit & Loss Statement</CardTitle>
            <CardDescription data-testid="card-desc-pnl-statement">
              {format(startDate, 'MMM d, yyyy')} - {format(endDate, 'MMM d, yyyy')}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {pnlLoading ? (
              <div className="space-y-2">
                {[...Array(10)].map((_, i) => (
                  <div key={i} className="h-6 bg-muted animate-pulse rounded" />
                ))}
              </div>
            ) : (
              <div className="space-y-4 font-mono text-sm">
                {/* INCOME */}
                <div data-testid="section-income">
                  <div className="font-bold text-base mb-2" data-testid="heading-income">INCOME</div>
                  {INCOME_CATEGORIES.map((category) => (
                    <div key={category} className="flex justify-between py-1 pl-4" data-testid={`pnl-income-${category.toLowerCase().replace(/ /g, '-')}`}>
                      <span className="text-muted-foreground" data-testid={`label-${category.toLowerCase().replace(/ /g, '-')}`}>{category}</span>
                      <span className="text-green-600" data-testid={`value-${category.toLowerCase().replace(/ /g, '-')}`}>
                        {formatCurrency(pnl?.income?.[category.toLowerCase().replace(/ /g, '_')] || 0)}
                      </span>
                    </div>
                  ))}
                  <div className="border-t border-border my-2" />
                  <div className="flex justify-between font-bold" data-testid="pnl-total-income">
                    <span data-testid="label-total-income">Total Income</span>
                    <span className="text-green-600" data-testid="value-total-income">{formatCurrency(pnl?.income?.total || 0)}</span>
                  </div>
                </div>

                {/* EXPENSES */}
                <div className="mt-6" data-testid="section-expenses">
                  <div className="font-bold text-base mb-2" data-testid="heading-expenses">EXPENSES</div>
                  {EXPENSE_CATEGORIES.map((category) => (
                    <div key={category} className="flex justify-between py-1 pl-4" data-testid={`pnl-expense-${category.toLowerCase().replace(/ /g, '-')}`}>
                      <span className="text-muted-foreground" data-testid={`label-${category.toLowerCase().replace(/ /g, '-')}`}>{category}</span>
                      <span className="text-red-600" data-testid={`value-${category.toLowerCase().replace(/ /g, '-')}`}>
                        {formatCurrency(Math.abs(pnl?.expenses?.[category.toLowerCase().replace(/ /g, '_')] || 0))}
                      </span>
                    </div>
                  ))}
                  <div className="border-t border-border my-2" />
                  <div className="flex justify-between font-bold" data-testid="pnl-total-expenses">
                    <span data-testid="label-total-expenses">Total Expenses</span>
                    <span className="text-red-600" data-testid="value-total-expenses">{formatCurrency(Math.abs(pnl?.expenses?.total || 0))}</span>
                  </div>
                </div>

                {/* NET PROFIT */}
                <div className="border-t-2 border-border pt-4 mt-6" data-testid="section-net-profit">
                  <div className="flex justify-between font-bold text-base" data-testid="pnl-net-profit-summary">
                    <span data-testid="label-net-profit-pnl">NET PROFIT</span>
                    <span className={(pnl?.netProfit || 0) >= 0 ? 'text-green-600' : 'text-red-600'} data-testid="value-net-profit-pnl">
                      {formatCurrency(pnl?.netProfit || 0)}
                    </span>
                  </div>
                  <div className="flex justify-between mt-2 text-muted-foreground" data-testid="pnl-profit-margin">
                    <span data-testid="label-profit-margin">Profit Margin</span>
                    <span data-testid="value-profit-margin">{pnl?.profitMargin?.toFixed(1) || '0.0'}%</span>
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* SECTION C: Visual Analytics */}
        <div className="space-y-6">
          <Card data-testid="card-expense-breakdown">
            <CardHeader>
              <CardTitle className="flex items-center gap-2" data-testid="card-title-expense-breakdown">
                <PieChartIcon className="h-5 w-5" />
                Expense Breakdown
              </CardTitle>
            </CardHeader>
            <CardContent>
              {pnlLoading ? (
                <div className="h-64 bg-muted animate-pulse rounded" />
              ) : (
                <ResponsiveContainer width="100%" height={250} data-testid="chart-expense-breakdown">
                  <PieChart>
                    <Pie
                      data={expenseChartData}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="value"
                    >
                      {expenseChartData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(value: any) => formatCurrency(value)} />
                  </PieChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>

          <Card data-testid="card-income-vs-expenses">
            <CardHeader>
              <CardTitle className="flex items-center gap-2" data-testid="card-title-income-vs-expenses">
                <BarChart3 className="h-5 w-5" />
                Income vs Expenses
              </CardTitle>
            </CardHeader>
            <CardContent>
              {pnlLoading ? (
                <div className="h-64 bg-muted animate-pulse rounded" />
              ) : (
                <ResponsiveContainer width="100%" height={250} data-testid="chart-income-vs-expenses">
                  <BarChart data={incomeVsExpenseData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" />
                    <YAxis />
                    <Tooltip formatter={(value: any) => formatCurrency(value)} />
                    <Bar dataKey="amount" fill="#3b82f6" />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* SECTION D: Document Upload & Processing */}
      <Card data-testid="card-document-upload">
        <CardHeader>
          <CardTitle data-testid="card-title-document-processing">Document Processing</CardTitle>
          <CardDescription data-testid="card-desc-document-processing">Upload and extract financial data from documents</CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs value={documentType} onValueChange={(v) => setDocumentType(v as any)}>
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="bank_statement" data-testid="tab-bank-statements">Bank Statements</TabsTrigger>
              <TabsTrigger value="uplisting_report" data-testid="tab-uplisting-reports">Uplisting Reports</TabsTrigger>
            </TabsList>

            <TabsContent value={documentType} className="space-y-4">
              {/* Upload Area */}
              <div className="border-2 border-dashed rounded-lg p-6 text-center" data-testid="upload-area">
                <Upload className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
                <Input
                  type="file"
                  accept=".pdf,.csv,.xlsx"
                  onChange={handleFileSelect}
                  className="max-w-xs mx-auto"
                  data-testid="input-file-upload"
                />
                {selectedFile && (
                  <div className="mt-4" data-testid="selected-file-info">
                    <p className="text-sm text-muted-foreground mb-2" data-testid="text-selected-filename">{selectedFile.name}</p>
                    <Button 
                      onClick={handleUpload} 
                      disabled={uploadMutation.isPending}
                      data-testid="button-upload-file"
                    >
                      {uploadMutation.isPending ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Uploading...
                        </>
                      ) : (
                        <>
                          <Upload className="mr-2 h-4 w-4" />
                          Upload
                        </>
                      )}
                    </Button>
                  </div>
                )}
              </div>

              {/* Documents List */}
              <div className="border rounded-lg" data-testid="table-documents">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead data-testid="header-filename">Filename</TableHead>
                      <TableHead data-testid="header-type">Type</TableHead>
                      <TableHead data-testid="header-status">Status</TableHead>
                      <TableHead data-testid="header-uploaded">Uploaded</TableHead>
                      <TableHead data-testid="header-actions">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {documentsLoading ? (
                      <TableRow>
                        <TableCell colSpan={5} className="text-center">
                          <Loader2 className="h-6 w-6 animate-spin mx-auto" />
                        </TableCell>
                      </TableRow>
                    ) : documents?.filter((d: any) => d.documentType === documentType).length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={5} className="text-center text-muted-foreground">
                          No documents uploaded yet
                        </TableCell>
                      </TableRow>
                    ) : (
                      documents?.filter((d: any) => d.documentType === documentType).map((doc: any) => (
                        <TableRow key={doc.id} data-testid={`row-document-${doc.id}`}>
                          <TableCell className="font-medium" data-testid={`cell-filename-${doc.id}`}>{doc.filename}</TableCell>
                          <TableCell data-testid={`cell-type-${doc.id}`}>{doc.documentType}</TableCell>
                          <TableCell data-testid={`cell-status-${doc.id}`}>
                            {doc.processingStatus === 'completed' && (
                              <span className="flex items-center gap-1 text-green-600" data-testid={`status-completed-${doc.id}`}>
                                <CheckCircle className="h-4 w-4" />
                                Completed
                              </span>
                            )}
                            {doc.processingStatus === 'processing' && (
                              <span className="flex items-center gap-1 text-blue-600" data-testid={`status-processing-${doc.id}`}>
                                <Loader2 className="h-4 w-4 animate-spin" />
                                Processing
                              </span>
                            )}
                            {doc.processingStatus === 'pending' && (
                              <span className="text-muted-foreground" data-testid={`status-pending-${doc.id}`}>Pending</span>
                            )}
                            {doc.processingStatus === 'error' && (
                              <span className="flex items-center gap-1 text-red-600" data-testid={`status-error-${doc.id}`}>
                                <XCircle className="h-4 w-4" />
                                Error
                              </span>
                            )}
                          </TableCell>
                          <TableCell data-testid={`cell-date-${doc.id}`}>{format(new Date(doc.uploadedAt), 'MMM d, yyyy')}</TableCell>
                          <TableCell data-testid={`cell-actions-${doc.id}`}>
                            <div className="flex gap-2">
                              {doc.processingStatus === 'pending' && (
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => handleExtract(doc)}
                                  disabled={extractMutation.isPending}
                                  data-testid={`button-extract-${doc.id}`}
                                >
                                  Extract Data
                                </Button>
                              )}
                              {doc.processingStatus === 'completed' && doc.extractedData && (
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => handleReview(doc)}
                                  data-testid={`button-review-${doc.id}`}
                                >
                                  <Eye className="mr-2 h-4 w-4" />
                                  Review & Approve
                                </Button>
                              )}
                            </div>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* SECTION E: Manual Transaction Entry */}
        <Card data-testid="card-manual-entry">
          <CardHeader>
            <CardTitle data-testid="card-title-manual-entry">Manual Transaction Entry</CardTitle>
            <CardDescription data-testid="card-desc-manual-entry">Add transactions manually</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="type" data-testid="label-transaction-type">Type</Label>
              <Select value={transactionType} onValueChange={(v) => setTransactionType(v as any)}>
                <SelectTrigger data-testid="select-transaction-type">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="income">Income</SelectItem>
                  <SelectItem value="expense">Expense</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="category" data-testid="label-transaction-category">Category</Label>
              <Select value={transactionCategory} onValueChange={setTransactionCategory}>
                <SelectTrigger data-testid="select-transaction-category">
                  <SelectValue placeholder="Select category" />
                </SelectTrigger>
                <SelectContent>
                  {(transactionType === 'income' ? INCOME_CATEGORIES : EXPENSE_CATEGORIES).map((cat) => (
                    <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="amount" data-testid="label-transaction-amount">Amount (£)</Label>
              <Input
                id="amount"
                type="number"
                step="0.01"
                value={transactionAmount}
                onChange={(e) => setTransactionAmount(e.target.value)}
                placeholder="0.00"
                data-testid="input-transaction-amount"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="date" data-testid="label-transaction-date">Date</Label>
              <Input
                id="date"
                type="date"
                value={transactionDate}
                onChange={(e) => setTransactionDate(e.target.value)}
                data-testid="input-transaction-date"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="description" data-testid="label-transaction-description">Description</Label>
              <Textarea
                id="description"
                value={transactionDescription}
                onChange={(e) => setTransactionDescription(e.target.value)}
                placeholder="Enter transaction description"
                data-testid="input-transaction-description"
              />
            </div>

            <Button 
              onClick={handleCreateTransaction}
              disabled={createTransactionMutation.isPending}
              className="w-full"
              data-testid="button-create-transaction"
            >
              {createTransactionMutation.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Saving...
                </>
              ) : (
                'Save Transaction'
              )}
            </Button>
          </CardContent>
        </Card>

        {/* SECTION F: Recent Transactions Table - Preview */}
        <Card data-testid="card-transactions-preview">
          <CardHeader>
            <CardTitle data-testid="card-title-transactions-preview">Recent Transactions</CardTitle>
            <CardDescription data-testid="card-desc-transactions-preview">Latest financial transactions</CardDescription>
          </CardHeader>
          <CardContent>
            {transactionsLoading ? (
              <div className="space-y-2">
                {[...Array(5)].map((_, i) => (
                  <div key={i} className="h-12 bg-muted animate-pulse rounded" />
                ))}
              </div>
            ) : (
              <div className="space-y-2">
                {transactions?.slice(0, 5).map((txn: any) => (
                  <div key={txn.id} className="flex justify-between items-center p-3 border rounded-lg" data-testid={`preview-transaction-${txn.id}`}>
                    <div>
                      <div className="font-medium" data-testid={`preview-description-${txn.id}`}>{txn.description}</div>
                      <div className="text-sm text-muted-foreground" data-testid={`preview-meta-${txn.id}`}>
                        <span data-testid={`preview-date-${txn.id}`}>{format(new Date(txn.date), 'MMM d, yyyy')}</span> • <span data-testid={`preview-category-${txn.id}`}>{txn.category}</span>
                      </div>
                    </div>
                    <div className={`font-bold ${txn.type === 'income' ? 'text-green-600' : 'text-red-600'}`} data-testid={`preview-amount-${txn.id}`}>
                      {txn.type === 'income' ? '+' : '-'}{formatCurrency(Math.abs(txn.amount))}
                    </div>
                  </div>
                ))}
                {transactions?.length === 0 && (
                  <div className="text-center text-muted-foreground py-8" data-testid="empty-transactions">
                    No transactions found
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* SECTION F: Full Transactions Table with Filters */}
      <Card data-testid="card-transactions-full">
        <CardHeader>
          <CardTitle data-testid="card-title-transactions-full">All Transactions</CardTitle>
          <CardDescription data-testid="card-desc-transactions-full">Filter and manage all transactions</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Filters */}
          <div className="grid gap-4 md:grid-cols-4">
            <div className="space-y-2">
              <Label data-testid="label-filter-type">Type</Label>
              <Select 
                value={transactionFilters.type} 
                onValueChange={(v) => setTransactionFilters({ ...transactionFilters, type: v })}
              >
                <SelectTrigger data-testid="filter-type">
                  <SelectValue placeholder="All types" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All types</SelectItem>
                  <SelectItem value="income">Income</SelectItem>
                  <SelectItem value="expense">Expense</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label data-testid="label-filter-category">Category</Label>
              <Select 
                value={transactionFilters.category} 
                onValueChange={(v) => setTransactionFilters({ ...transactionFilters, category: v })}
              >
                <SelectTrigger data-testid="filter-category">
                  <SelectValue placeholder="All categories" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All categories</SelectItem>
                  {[...INCOME_CATEGORIES, ...EXPENSE_CATEGORIES].map((cat) => (
                    <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label data-testid="label-filter-date-from">From Date</Label>
              <Input
                type="date"
                value={transactionFilters.dateFrom}
                onChange={(e) => setTransactionFilters({ ...transactionFilters, dateFrom: e.target.value })}
                data-testid="filter-date-from"
              />
            </div>

            <div className="space-y-2">
              <Label data-testid="label-filter-date-to">To Date</Label>
              <Input
                type="date"
                value={transactionFilters.dateTo}
                onChange={(e) => setTransactionFilters({ ...transactionFilters, dateTo: e.target.value })}
                data-testid="filter-date-to"
              />
            </div>
          </div>

          {/* Transactions Table */}
          <div className="border rounded-lg" data-testid="table-transactions-full">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead data-testid="header-transaction-date">Date</TableHead>
                  <TableHead data-testid="header-transaction-description">Description</TableHead>
                  <TableHead data-testid="header-transaction-category">Category</TableHead>
                  <TableHead data-testid="header-transaction-amount">Amount</TableHead>
                  <TableHead data-testid="header-transaction-source">Source</TableHead>
                  <TableHead data-testid="header-transaction-actions">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {transactionsLoading ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center">
                      <Loader2 className="h-6 w-6 animate-spin mx-auto" />
                    </TableCell>
                  </TableRow>
                ) : transactions?.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center text-muted-foreground">
                      No transactions found
                    </TableCell>
                  </TableRow>
                ) : (
                  transactions?.map((txn: any) => (
                    <TableRow key={txn.id} data-testid={`row-transaction-${txn.id}`}>
                      <TableCell data-testid={`cell-date-${txn.id}`}>{format(new Date(txn.date), 'MMM d, yyyy')}</TableCell>
                      <TableCell className="font-medium" data-testid={`cell-description-${txn.id}`}>{txn.description}</TableCell>
                      <TableCell data-testid={`cell-category-${txn.id}`}>{txn.category}</TableCell>
                      <TableCell className={txn.type === 'income' ? 'text-green-600' : 'text-red-600'} data-testid={`cell-amount-${txn.id}`}>
                        {txn.type === 'income' ? '+' : '-'}{formatCurrency(Math.abs(txn.amount))}
                      </TableCell>
                      <TableCell data-testid={`cell-source-${txn.id}`}>
                        <span className="text-xs bg-muted px-2 py-1 rounded">{txn.source}</span>
                      </TableCell>
                      <TableCell data-testid={`cell-transaction-actions-${txn.id}`}>
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleEditTransaction(txn)}
                            data-testid={`button-edit-${txn.id}`}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleDeleteTransaction(txn.id)}
                            data-testid={`button-delete-${txn.id}`}
                          >
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
        </CardContent>
      </Card>

      {/* Review & Approve Dialog */}
      <Dialog open={reviewDialogOpen} onOpenChange={setReviewDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto" data-testid="dialog-review-transactions">
          <DialogHeader>
            <DialogTitle data-testid="dialog-title-review">Review & Approve Transactions</DialogTitle>
            <DialogDescription data-testid="dialog-description-review">
              Review extracted transactions from {reviewingDocument?.filename}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4" data-testid="review-transactions-list">
            {editedTransactions.map((txn, index) => (
              <div key={index} className="grid grid-cols-4 gap-4 p-4 border rounded-lg" data-testid={`review-transaction-${index}`}>
                <div>
                  <Label className="text-xs" data-testid={`review-label-type-${index}`}>Type</Label>
                  <Select
                    value={txn.type}
                    onValueChange={(v) => {
                      const updated = [...editedTransactions];
                      updated[index].type = v;
                      setEditedTransactions(updated);
                    }}
                  >
                    <SelectTrigger className="h-8" data-testid={`review-select-type-${index}`}>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="income">Income</SelectItem>
                      <SelectItem value="expense">Expense</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="text-xs" data-testid={`review-label-category-${index}`}>Category</Label>
                  <Input
                    className="h-8"
                    value={txn.category}
                    onChange={(e) => {
                      const updated = [...editedTransactions];
                      updated[index].category = e.target.value;
                      setEditedTransactions(updated);
                    }}
                    data-testid={`review-input-category-${index}`}
                  />
                </div>
                <div>
                  <Label className="text-xs" data-testid={`review-label-amount-${index}`}>Amount</Label>
                  <Input
                    className="h-8"
                    type="number"
                    value={txn.amount}
                    onChange={(e) => {
                      const updated = [...editedTransactions];
                      updated[index].amount = parseFloat(e.target.value);
                      setEditedTransactions(updated);
                    }}
                    data-testid={`review-input-amount-${index}`}
                  />
                </div>
                <div>
                  <Label className="text-xs" data-testid={`review-label-date-${index}`}>Date</Label>
                  <Input
                    className="h-8"
                    type="date"
                    value={txn.date ? format(new Date(txn.date), 'yyyy-MM-dd') : ''}
                    onChange={(e) => {
                      const updated = [...editedTransactions];
                      updated[index].date = e.target.value;
                      setEditedTransactions(updated);
                    }}
                    data-testid={`review-input-date-${index}`}
                  />
                </div>
                <div className="col-span-4">
                  <Label className="text-xs" data-testid={`review-label-description-${index}`}>Description</Label>
                  <Input
                    className="h-8"
                    value={txn.description}
                    onChange={(e) => {
                      const updated = [...editedTransactions];
                      updated[index].description = e.target.value;
                      setEditedTransactions(updated);
                    }}
                    data-testid={`review-input-description-${index}`}
                  />
                </div>
              </div>
            ))}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setReviewDialogOpen(false)} data-testid="button-cancel-review">
              Cancel
            </Button>
            <Button 
              onClick={handleApprove}
              disabled={approveMutation.isPending}
              data-testid="button-approve-transactions"
            >
              {approveMutation.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Approving...
                </>
              ) : (
                'Approve & Save'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Transaction Dialog */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent data-testid="dialog-edit-transaction">
          <DialogHeader>
            <DialogTitle data-testid="dialog-title-edit">Edit Transaction</DialogTitle>
          </DialogHeader>
          {editingTransaction && (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label data-testid="edit-label-type">Type</Label>
                <Select
                  value={editingTransaction.type}
                  onValueChange={(v) => setEditingTransaction({ ...editingTransaction, type: v })}
                >
                  <SelectTrigger data-testid="edit-select-type">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="income">Income</SelectItem>
                    <SelectItem value="expense">Expense</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label data-testid="edit-label-category">Category</Label>
                <Input
                  value={editingTransaction.category}
                  onChange={(e) => setEditingTransaction({ ...editingTransaction, category: e.target.value })}
                  data-testid="edit-input-category"
                />
              </div>
              <div className="space-y-2">
                <Label data-testid="edit-label-amount">Amount</Label>
                <Input
                  type="number"
                  value={editingTransaction.amount}
                  onChange={(e) => setEditingTransaction({ ...editingTransaction, amount: parseFloat(e.target.value) })}
                  data-testid="edit-input-amount"
                />
              </div>
              <div className="space-y-2">
                <Label data-testid="edit-label-date">Date</Label>
                <Input
                  type="date"
                  value={format(new Date(editingTransaction.date), 'yyyy-MM-dd')}
                  onChange={(e) => setEditingTransaction({ ...editingTransaction, date: e.target.value })}
                  data-testid="edit-input-date"
                />
              </div>
              <div className="space-y-2">
                <Label data-testid="edit-label-description">Description</Label>
                <Textarea
                  value={editingTransaction.description}
                  onChange={(e) => setEditingTransaction({ ...editingTransaction, description: e.target.value })}
                  data-testid="edit-input-description"
                />
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditDialogOpen(false)} data-testid="button-cancel-edit">
              Cancel
            </Button>
            <Button 
              onClick={handleSaveEdit}
              disabled={updateTransactionMutation.isPending}
              data-testid="button-save-edit"
            >
              {updateTransactionMutation.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Saving...
                </>
              ) : (
                'Save Changes'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
