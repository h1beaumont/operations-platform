import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";
import { 
  AlertCircle, 
  Package, 
  ShoppingCart, 
  TrendingUp, 
  Users,
  Plus,
  Search,
  Filter,
  Download,
  Upload,
  Edit,
  Trash,
  RefreshCw,
  AlertTriangle,
  CheckCircle,
  Clock,
  DollarSign,
  BarChart3,
  TrendingDown,
  Truck,
  Package2,
  PackagePlus,
  PackageCheck,
  FileText,
  Phone,
  Mail,
  Globe,
  Calendar,
  ChevronRight,
  Eye,
  Receipt,
  Printer,
  Send,
  Archive,
  LineChart,
  Trash2
} from "lucide-react";
import { PriceHistoryChart } from "@/components/price-history-chart";
// Type inference from schema
type OrderingProduct = typeof import("@shared/schema").orderingProducts.$inferSelect;
type OrderingOrder = typeof import("@shared/schema").orderingOrders.$inferSelect;
type OrderingSupplier = typeof import("@shared/schema").orderingSuppliers.$inferSelect;
type OrderingOrderItem = typeof import("@shared/schema").orderingOrderItems.$inferSelect;
type OrderingStockMovement = typeof import("@shared/schema").orderingStockMovements.$inferSelect;
import { format } from "date-fns";
import { InstructionPanel } from "@/components/instruction-panel";
import { orderingInstructions } from "@/lib/page-instructions";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { insertOrderingProductSchema, insertOrderingOrderSchema, insertOrderingSupplierSchema } from "@shared/schema";
import { z } from "zod";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";

// Stock status helper
function getStockStatus(current: number, min: number | null, max: number | null) {
  if (!min) return "normal";
  if (current <= 0) return "out";
  if (current <= min) return "low";
  if (max && current >= max) return "excess";
  return "normal";
}

// Stock badge component
function StockBadge({ status }: { status: string }) {
  const variants: Record<string, any> = {
    out: { className: "bg-red-500 text-white", icon: AlertCircle },
    low: { className: "bg-yellow-500 text-white", icon: AlertTriangle },
    normal: { className: "bg-green-500 text-white", icon: CheckCircle },
    excess: { className: "bg-blue-500 text-white", icon: Package },
  };

  const variant = variants[status] || variants.normal;
  const Icon = variant.icon;

  return (
    <Badge className={variant.className} data-testid={`badge-stock-${status}`}>
      <Icon className="w-3 h-3 mr-1" />
      {status.toUpperCase()}
    </Badge>
  );
}

// Inventory Counting Tab Component
function InventoryCountingTab() {
  const [selectedLocation, setSelectedLocation] = useState("HEAD_OFFICE");
  const [selectedProductForCount, setSelectedProductForCount] = useState("");
  const [countQuantity, setCountQuantity] = useState("");
  const [countNotes, setCountNotes] = useState("");
  const [arasPhoneNumber, setArasPhoneNumber] = useState("");
  const { toast } = useToast();

  // Queries
  const productsQuery = useQuery({
    queryKey: ["/api/ordering/products"],
  });

  const countsQuery = useQuery({
    queryKey: ["/api/inventory/counts", selectedLocation],
    queryFn: async () => {
      const params = new URLSearchParams({ locationCode: selectedLocation });
      const response = await fetch(`/api/inventory/counts?${params}`);
      if (!response.ok) throw new Error('Failed to fetch stock counts');
      return response.json();
    }
  });

  const latestCountsQuery = useQuery({
    queryKey: ["/api/inventory/counts/latest", selectedLocation],
    queryFn: async () => {
      const params = new URLSearchParams({ locationCode: selectedLocation });
      const response = await fetch(`/api/inventory/counts/latest?${params}`);
      if (!response.ok) throw new Error('Failed to fetch latest counts');
      return response.json();
    }
  });

  const orderCalculationsQuery = useQuery({
    queryKey: ["/api/inventory/orders/calculate", selectedLocation],
    queryFn: async () => {
      const params = new URLSearchParams({ locationCode: selectedLocation });
      const response = await fetch(`/api/inventory/orders/calculate?${params}`);
      if (!response.ok) throw new Error('Failed to calculate order quantities');
      return response.json();
    }
  });

  // Mutations
  const submitCountMutation = useMutation({
    mutationFn: async (data: any) => {
      // Check for recent duplicate counts
      const recentCounts = latestCountsQuery.data || [];
      const isDuplicate = recentCounts.some((count: any) => 
        count.productId === data.productId && 
        count.locationCode === data.locationCode &&
        count.countedQuantity === data.countedQuantity &&
        new Date(count.countDate).getTime() > Date.now() - 300000 // Within 5 minutes
      );

      if (isDuplicate) {
        throw new Error('Duplicate count detected - same product, location, and quantity within 5 minutes');
      }

      return await apiRequest('/api/inventory/counts', {
        method: 'POST',
        body: JSON.stringify(data)
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/inventory/counts"] });
      queryClient.invalidateQueries({ queryKey: ["/api/inventory/counts/latest"] });
      queryClient.invalidateQueries({ queryKey: ["/api/inventory/orders/calculate"] });
      toast({ title: "Stock count submitted successfully" });
      setSelectedProductForCount("");
      setCountQuantity("");
      setCountNotes("");
    },
    onError: (error: any) => {
      toast({ 
        title: "Failed to submit stock count", 
        description: error.message || "Please try again",
        variant: "destructive" 
      });
    },
  });

  const updateTargetMutation = useMutation({
    mutationFn: async ({ productId, targetQuantity }: { productId: string; targetQuantity: number }) => {
      return await apiRequest(`/api/inventory/products/${productId}/target`, {
        method: 'PATCH',
        body: JSON.stringify({ targetQuantity })
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/ordering/products"] });
      queryClient.invalidateQueries({ queryKey: ["/api/inventory/orders/calculate"] });
      toast({ title: "Target quantity updated" });
    },
  });

  const sendImperialEmailMutation = useMutation({
    mutationFn: async (items: any[]) => {
      return await apiRequest('/api/inventory/orders/send-imperial', {
        method: 'POST',
        body: JSON.stringify({ items })
      });
    },
    onSuccess: (data: any) => {
      queryClient.invalidateQueries({ queryKey: ["/api/ordering/orders"] });
      toast({ title: `Imperial Laundry email sent successfully! Order ID: ${data.orderId}` });
    },
    onError: () => {
      toast({ title: "Failed to send email", variant: "destructive" });
    },
  });

  const sendHoopersEmailMutation = useMutation({
    mutationFn: async (items: any[]) => {
      return await apiRequest('/api/inventory/orders/send-hoopers', {
        method: 'POST',
        body: JSON.stringify({ items })
      });
    },
    onSuccess: (data: any) => {
      queryClient.invalidateQueries({ queryKey: ["/api/ordering/orders"] });
      toast({ title: `Hoopers email sent successfully! Order ID: ${data.orderId}` });
    },
    onError: () => {
      toast({ title: "Failed to send email", variant: "destructive" });
    },
  });

  const sendAmazonSMSMutation = useMutation({
    mutationFn: async ({ items, phoneNumber }: { items: any[]; phoneNumber: string }) => {
      return await apiRequest('/api/inventory/orders/send-amazon-sms', {
        method: 'POST',
        body: JSON.stringify({ items, phoneNumber })
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/ordering/orders"] });
      toast({ title: "SMS sent to Alex successfully!" });
    },
    onError: () => {
      toast({ title: "Failed to send SMS", variant: "destructive" });
    },
  });

  // Helper to group orders by supplier
  const groupedOrders = (orderCalculationsQuery.data || []).reduce((acc: any, order: any) => {
    const supplier = order.supplier;
    if (!acc[supplier]) acc[supplier] = [];
    acc[supplier].push(order);
    return acc;
  }, {});

  return (
    <div className="space-y-6">
      {/* Section A: Target Quantities Setup */}
      <Card>
        <CardHeader>
          <CardTitle data-testid="heading-target-quantities">Target Quantities Setup</CardTitle>
          <CardDescription data-testid="text-target-description">Set target stock levels for automatic reordering</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Product Name</TableHead>
                <TableHead>Category</TableHead>
                <TableHead>Current Stock</TableHead>
                <TableHead>Target Quantity</TableHead>
                <TableHead>Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {productsQuery.data?.map((product: any) => (
                <TableRow key={product.id} data-testid={`row-target-product-${product.id}`}>
                  <TableCell data-testid={`text-target-product-name-${product.id}`}>{product.name}</TableCell>
                  <TableCell><Badge data-testid={`badge-target-category-${product.id}`}>{product.category}</Badge></TableCell>
                  <TableCell data-testid={`text-target-current-stock-${product.id}`}>{product.currentStock}</TableCell>
                  <TableCell>
                    <Input
                      type="number"
                      defaultValue={product.targetQuantity || 0}
                      className="w-24"
                      data-testid={`input-target-${product.id}`}
                      onBlur={(e) => {
                        const newTarget = parseInt(e.target.value);
                        if (newTarget !== product.targetQuantity) {
                          updateTargetMutation.mutate({ productId: product.id, targetQuantity: newTarget });
                        }
                      }}
                    />
                  </TableCell>
                  <TableCell>
                    <Badge variant={product.orderingStrategy === 'auto_email' ? 'default' : 'secondary'} data-testid={`badge-target-strategy-${product.id}`}>
                      {product.orderingStrategy || 'manual_sms'}
                    </Badge>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Section B: Stock Count Submission */}
      <Card>
        <CardHeader>
          <CardTitle data-testid="heading-stock-count">Submit Stock Count</CardTitle>
          <CardDescription data-testid="text-stock-count-description">Record stock counts for inventory tracking</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label data-testid="label-location">Location</Label>
              <Select value={selectedLocation} onValueChange={setSelectedLocation}>
                <SelectTrigger data-testid="select-location">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="HEAD_OFFICE">Head Office</SelectItem>
                  <SelectItem value="HERITAGE">Building B</SelectItem>
                  <SelectItem value="DWELL">Building A</SelectItem>
                  <SelectItem value="STMARYS">Building C Quarters</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label data-testid="label-product">Product</Label>
              <Select value={selectedProductForCount} onValueChange={setSelectedProductForCount}>
                <SelectTrigger data-testid="select-product">
                  <SelectValue placeholder="Select product..." />
                </SelectTrigger>
                <SelectContent>
                  {productsQuery.data?.map((product: any) => (
                    <SelectItem key={product.id} value={product.id}>
                      {product.name} (Target: {product.targetQuantity || 0})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label data-testid="label-counted-quantity">Counted Quantity</Label>
              <Input
                type="number"
                value={countQuantity}
                onChange={(e) => setCountQuantity(e.target.value)}
                placeholder="Enter quantity..."
                data-testid="input-quantity"
              />
            </div>

            <div>
              <Label data-testid="label-notes">Notes (Optional)</Label>
              <Input
                value={countNotes}
                onChange={(e) => setCountNotes(e.target.value)}
                placeholder="Any notes..."
                data-testid="input-notes"
              />
            </div>
          </div>

          <Button 
            className="mt-4"
            onClick={() => {
              if (selectedProductForCount && countQuantity) {
                submitCountMutation.mutate({
                  productId: selectedProductForCount,
                  locationCode: selectedLocation,
                  countedQuantity: parseInt(countQuantity),
                  notes: countNotes
                });
              }
            }}
            disabled={!selectedProductForCount || !countQuantity || submitCountMutation.isPending}
            data-testid="button-submit-count"
          >
            <PackageCheck className="w-4 h-4 mr-2" />
            Submit Stock Count
          </Button>
        </CardContent>
      </Card>

      {/* Section C: Order Calculation Dashboard */}
      <Card>
        <CardHeader>
          <CardTitle data-testid="heading-reorder-requirements">Reorder Requirements</CardTitle>
          <CardDescription data-testid="text-reorder-description">Products that need reordering based on target quantities</CardDescription>
        </CardHeader>
        <CardContent>
          {orderCalculationsQuery.data && orderCalculationsQuery.data.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Product</TableHead>
                  <TableHead>Target Qty</TableHead>
                  <TableHead>Actual Qty</TableHead>
                  <TableHead>Order Qty</TableHead>
                  <TableHead>Supplier</TableHead>
                  <TableHead>Method</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {orderCalculationsQuery.data.map((order: any) => (
                  <TableRow key={order.productId} data-testid={`row-reorder-${order.productId}`}>
                    <TableCell className="font-medium" data-testid={`text-reorder-product-${order.productId}`}>{order.productName}</TableCell>
                    <TableCell data-testid={`text-reorder-target-${order.productId}`}>{order.targetQty}</TableCell>
                    <TableCell data-testid={`text-reorder-actual-${order.productId}`}>{order.actualQty}</TableCell>
                    <TableCell className="font-bold text-primary" data-testid={`text-reorder-qty-${order.productId}`}>{order.orderQty}</TableCell>
                    <TableCell data-testid={`text-reorder-supplier-${order.productId}`}>{order.supplier}</TableCell>
                    <TableCell>
                      <Badge variant={order.orderingStrategy === 'auto_email' ? 'default' : 'secondary'} data-testid={`badge-reorder-strategy-${order.productId}`}>
                        {order.orderingStrategy === 'auto_email' ? 'Auto Email' : 'Manual SMS'}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <p className="text-muted-foreground text-center py-8">
              No products need reordering at this time.
            </p>
          )}
        </CardContent>
      </Card>

      {/* Section D: Send Orders */}
      {orderCalculationsQuery.data && orderCalculationsQuery.data.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle data-testid="heading-send-orders">Send Orders</CardTitle>
            <CardDescription data-testid="text-send-orders-description">Send automated orders to suppliers</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {groupedOrders['Imperial Laundry'] && (
                <Button
                  onClick={() => sendImperialEmailMutation.mutate(groupedOrders['Imperial Laundry'])}
                  disabled={sendImperialEmailMutation.isPending}
                  data-testid="button-send-imperial"
                >
                  <Mail className="w-4 h-4 mr-2" />
                  Send Imperial Laundry Email ({groupedOrders['Imperial Laundry'].length} items)
                </Button>
              )}

              {groupedOrders['Hoopers'] && (
                <Button
                  onClick={() => sendHoopersEmailMutation.mutate(groupedOrders['Hoopers'])}
                  disabled={sendHoopersEmailMutation.isPending}
                  data-testid="button-send-hoopers"
                >
                  <Mail className="w-4 h-4 mr-2" />
                  Send Hoopers Email ({groupedOrders['Hoopers'].length} items)
                </Button>
              )}

              {groupedOrders['Amazon'] && (
                <div className="space-y-2">
                  <Input
                    placeholder="Alex phone number..."
                    value={arasPhoneNumber}
                    onChange={(e) => setArasPhoneNumber(e.target.value)}
                    data-testid="input-aras-phone"
                  />
                  <Button
                    onClick={() => sendAmazonSMSMutation.mutate({ 
                      items: groupedOrders['Amazon'], 
                      phoneNumber: arasPhoneNumber 
                    })}
                    disabled={!arasPhoneNumber || sendAmazonSMSMutation.isPending}
                    data-testid="button-send-amazon-sms"
                  >
                    <Phone className="w-4 h-4 mr-2" />
                    Send Amazon SMS ({groupedOrders['Amazon'].length} items)
                  </Button>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Section E: Count History */}
      <Card>
        <CardHeader>
          <CardTitle data-testid="heading-count-history">Stock Count History</CardTitle>
          <CardDescription data-testid="text-count-history-description">Recent stock counting records</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Product</TableHead>
                <TableHead>Location</TableHead>
                <TableHead>Quantity</TableHead>
                <TableHead>Counted By</TableHead>
                <TableHead>Notes</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {countsQuery.data?.slice(0, 20).map((count: any) => (
                <TableRow key={count.id} data-testid={`row-count-history-${count.id}`}>
                  <TableCell data-testid={`text-count-date-${count.id}`}>{format(new Date(count.countDate), 'PPp')}</TableCell>
                  <TableCell data-testid={`text-count-product-${count.id}`}>{count.product?.name}</TableCell>
                  <TableCell><Badge variant="outline" data-testid={`badge-count-location-${count.id}`}>{count.locationCode}</Badge></TableCell>
                  <TableCell className="font-medium" data-testid={`text-count-quantity-${count.id}`}>{count.countedQuantity}</TableCell>
                  <TableCell data-testid={`text-count-user-${count.id}`}>{count.countedByStaff?.fullName || 'Unknown'}</TableCell>
                  <TableCell className="text-muted-foreground" data-testid={`text-count-notes-${count.id}`}>{count.notes || '-'}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}

export default function OrderingSystem() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState("dashboard");
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [selectedSupplier, setSelectedSupplier] = useState("all");
  const [selectedOrder, setSelectedOrder] = useState<OrderingOrder | null>(null);
  const [isProductDialogOpen, setIsProductDialogOpen] = useState(false);
  const [isOrderDialogOpen, setIsOrderDialogOpen] = useState(false);
  const [isSupplierDialogOpen, setIsSupplierDialogOpen] = useState(false);
  const [isStockDialogOpen, setIsStockDialogOpen] = useState(false);
  const [isPriceHistoryDialogOpen, setIsPriceHistoryDialogOpen] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<OrderingProduct | null>(null);
  const [orderItems, setOrderItems] = useState<Array<{ productId: string; quantity: number; unitPrice: number }>>([]);

  // Invoice state
  const [invoiceFile, setInvoiceFile] = useState<File | null>(null);
  const [invoiceSupplier, setInvoiceSupplier] = useState("");
  const [invoiceDate, setInvoiceDate] = useState("");
  const [uploadingInvoice, setUploadingInvoice] = useState(false);

  // File validation constants
  const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
  const ALLOWED_INVOICE_TYPES = ['application/pdf', 'image/jpeg', 'image/jpg', 'image/png'];
  const ALLOWED_INVOICE_EXTENSIONS = ['.pdf', '.jpg', '.jpeg', '.png'];

  const validateInvoiceFile = (file: File): { valid: boolean; error?: string } => {
    // Check file size
    if (file.size > MAX_FILE_SIZE) {
      return {
        valid: false,
        error: `File size exceeds 10MB limit. Your file is ${(file.size / (1024 * 1024)).toFixed(2)}MB`
      };
    }

    // Check MIME type
    if (!ALLOWED_INVOICE_TYPES.includes(file.type)) {
      return {
        valid: false,
        error: `Invalid file type: ${file.type}. Only PDF and image files (JPEG, PNG) are allowed`
      };
    }

    // Check file extension
    const extension = file.name.toLowerCase().substring(file.name.lastIndexOf('.'));
    if (!ALLOWED_INVOICE_EXTENSIONS.includes(extension)) {
      return {
        valid: false,
        error: `Invalid file extension: ${extension}. Only .pdf, .jpg, .jpeg, .png are allowed`
      };
    }

    return { valid: true };
  };

  const handleInvoiceFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) {
      setInvoiceFile(null);
      return;
    }

    const validation = validateInvoiceFile(file);
    if (!validation.valid) {
      toast({
        title: "Invalid File",
        description: validation.error,
        variant: "destructive",
      });
      e.target.value = ''; // Clear the input
      setInvoiceFile(null);
      return;
    }

    setInvoiceFile(file);
  };

  const handleInvoiceUpload = async () => {
    if (!invoiceFile || !invoiceSupplier || !invoiceDate) {
      toast({
        title: "Validation Error",
        description: "Please select a file, supplier, and invoice date",
        variant: "destructive",
      });
      return;
    }

    // Re-validate file before upload (defense in depth)
    const validation = validateInvoiceFile(invoiceFile);
    if (!validation.valid) {
      toast({
        title: "Invalid File",
        description: validation.error,
        variant: "destructive",
      });
      return;
    }

    setUploadingInvoice(true);
    try {
      const formData = new FormData();
      formData.append("invoice", invoiceFile);
      formData.append("supplier", invoiceSupplier);
      formData.append("invoiceDate", invoiceDate);

      const response = await fetch("/api/ordering/invoices/upload", {
        method: "POST",
        body: formData,
        credentials: "include",
      });

      if (!response.ok) {
        throw new Error("Upload failed");
      }

      queryClient.invalidateQueries({ queryKey: ["/api/ordering/invoices"] });
      toast({ title: "Invoice uploaded successfully" });

      // Reset form
      setInvoiceFile(null);
      setInvoiceSupplier("");
      setInvoiceDate("");
    } catch (error: any) {
      toast({
        title: "Upload Failed",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setUploadingInvoice(false);
    }
  };

  // State for CRUD operations
  const [editingProduct, setEditingProduct] = useState<any>(null);
  const [editingSupplier, setEditingSupplier] = useState<any>(null);
  const [editingOrder, setEditingOrder] = useState<any>(null);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<{ type: string; id: string; name: string } | null>(null);

  // Form states
  const [productForm, setProductForm] = useState({
    name: "",
    category: "cleaning",
    sku: "",
    supplier: "",
    supplierId: "",
    unit: "each",
    packSize: 1,
    currentStock: 0,
    minStock: 0,
    maxStock: 0,
    lastPrice: 0,
    notes: "",
  });

  const [supplierForm, setSupplierForm] = useState({
    name: "",
    type: "cleaning",
    contactName: "",
    phone: "",
    email: "",
    website: "",
    accountNumber: "",
    deliveryDays: "",
    minimumOrder: 0,
    notes: "",
  });

  const [orderForm, setOrderForm] = useState({
    supplier: "",
    supplierId: "",
    orderDate: new Date().toISOString().split('T')[0],
    status: "pending",
    notes: "",
  });

  // Line items state for orders
  const [lineItems, setLineItems] = useState<Array<{
    productId: string;
    productName: string;
    quantity: number;
    unitPrice: number;
  }>>([]);

  // Current item being added
  const [currentItemProductId, setCurrentItemProductId] = useState("");
  const [currentItemQuantity, setCurrentItemQuantity] = useState("");
  const [currentItemUnitPrice, setCurrentItemUnitPrice] = useState("");

  // View order details dialog
  const [viewOrderDialogOpen, setViewOrderDialogOpen] = useState(false);
  const [viewingOrder, setViewingOrder] = useState<any>(null);

  // Helper functions for form resets
  const resetProductForm = () => {
    setProductForm({
      name: "",
      category: "cleaning",
      sku: "",
      supplier: "",
      supplierId: "",
      unit: "each",
      packSize: 1,
      currentStock: 0,
      minStock: 0,
      maxStock: 0,
      lastPrice: 0,
      notes: "",
    });
  };

  const resetSupplierForm = () => {
    setSupplierForm({
      name: "",
      type: "cleaning",
      contactName: "",
      phone: "",
      email: "",
      website: "",
      accountNumber: "",
      deliveryDays: "",
      minimumOrder: 0,
      notes: "",
    });
  };

  const resetOrderForm = () => {
    setOrderForm({
      supplier: "",
      supplierId: "",
      orderDate: new Date().toISOString().split('T')[0],
      status: "pending",
      notes: "",
    });
    setLineItems([]);
    setCurrentItemProductId("");
    setCurrentItemQuantity("");
    setCurrentItemUnitPrice("");
  };

  // Helper functions for line items
  const handleAddLineItem = () => {
    if (!currentItemProductId || !currentItemQuantity || !currentItemUnitPrice) {
      toast({
        title: "Validation Error",
        description: "Please select a product and enter quantity and unit price",
        variant: "destructive",
      });
      return;
    }

    const product = productsData?.find((p: any) => p.id === currentItemProductId);
    if (!product) return;

    const newItem = {
      productId: currentItemProductId,
      productName: product.name,
      quantity: parseFloat(currentItemQuantity),
      unitPrice: parseFloat(currentItemUnitPrice),
    };

    setLineItems([...lineItems, newItem]);
    setCurrentItemProductId("");
    setCurrentItemQuantity("");
    setCurrentItemUnitPrice("");
  };

  const handleRemoveLineItem = (index: number) => {
    setLineItems(lineItems.filter((_, i) => i !== index));
  };

  const calculateOrderTotal = () => {
    return lineItems.reduce((sum, item) => sum + (item.quantity * item.unitPrice), 0);
  };

  // Mutations for CRUD operations
  const createProductMutation = useMutation({
    mutationFn: async (data: any) => {
      const response = await fetch("/api/ordering/products", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(data),
      });
      if (!response.ok) throw new Error("Failed to create product");
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/ordering/products"] });
      setIsProductDialogOpen(false);
      resetProductForm();
      toast({
        title: "Success",
        description: "Product created successfully",
      });
    },
  });

  const updateProductMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: any }) => {
      const response = await fetch(`/api/ordering/products/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(data),
      });
      if (!response.ok) throw new Error("Failed to update product");
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/ordering/products"] });
      setIsProductDialogOpen(false);
      setEditingProduct(null);
      resetProductForm();
      toast({
        title: "Success",
        description: "Product updated successfully",
      });
    },
  });

  const deleteProductMutation = useMutation({
    mutationFn: async (id: string) => {
      const response = await fetch(`/api/ordering/products/${id}`, {
        method: "DELETE",
        credentials: "include",
      });
      if (!response.ok) throw new Error("Failed to delete product");
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/ordering/products"] });
      setDeleteConfirmOpen(false);
      setDeleteTarget(null);
      toast({
        title: "Success",
        description: "Product deleted successfully",
      });
    },
  });

  const createSupplierMutation = useMutation({
    mutationFn: async (data: any) => {
      const response = await fetch("/api/ordering/suppliers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(data),
      });
      if (!response.ok) throw new Error("Failed to create supplier");
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/ordering/suppliers"] });
      setIsSupplierDialogOpen(false);
      resetSupplierForm();
      toast({
        title: "Success",
        description: "Supplier created successfully",
      });
    },
  });

  const updateSupplierMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: any }) => {
      const response = await fetch(`/api/ordering/suppliers/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(data),
      });
      if (!response.ok) throw new Error("Failed to update supplier");
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/ordering/suppliers"] });
      setIsSupplierDialogOpen(false);
      setEditingSupplier(null);
      resetSupplierForm();
      toast({
        title: "Success",
        description: "Supplier updated successfully",
      });
    },
  });

  const deleteSupplierMutation = useMutation({
    mutationFn: async (id: string) => {
      const response = await fetch(`/api/ordering/suppliers/${id}`, {
        method: "DELETE",
        credentials: "include",
      });
      if (!response.ok) throw new Error("Failed to delete supplier");
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/ordering/suppliers"] });
      setDeleteConfirmOpen(false);
      setDeleteTarget(null);
      toast({
        title: "Success",
        description: "Supplier deleted successfully",
      });
    },
  });

  const createOrderMutation = useMutation({
    mutationFn: async (data: any) => {
      const response = await fetch("/api/ordering/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(data),
      });
      if (!response.ok) throw new Error("Failed to create order");
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/ordering/orders"] });
      setIsOrderDialogOpen(false);
      toast({
        title: "Success",
        description: "Order created successfully",
      });
    },
  });

  const updateOrderMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: any }) => {
      const response = await fetch(`/api/ordering/orders/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(data),
      });
      if (!response.ok) throw new Error("Failed to update order");
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/ordering/orders"] });
      setIsOrderDialogOpen(false);
      setEditingOrder(null);
      toast({
        title: "Success",
        description: "Order updated successfully",
      });
    },
  });

  const deleteOrderMutation = useMutation({
    mutationFn: async (id: string) => {
      const response = await fetch(`/api/ordering/orders/${id}`, {
        method: "DELETE",
        credentials: "include",
      });
      if (!response.ok) throw new Error("Failed to delete order");
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/ordering/orders"] });
      setDeleteConfirmOpen(false);
      setDeleteTarget(null);
      toast({
        title: "Success",
        description: "Order deleted successfully",
      });
    },
  });

  const quickReorderMutation = useMutation({
    mutationFn: async (productIds?: string[]) => {
      return await apiRequest("/api/ordering/quick-reorder", {
        method: "POST",
        body: JSON.stringify({ productIds }),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/ordering/orders"] });
      toast({
        title: "Success",
        description: "Quick reorder completed successfully",
      });
    },
  });

  const adjustStockMutation = useMutation({
    mutationFn: async ({ productId, adjustment, reason }: { productId: string; adjustment: number; reason: string }) => {
      return await apiRequest("/api/ordering/stock-movements", {
        method: "POST",
        body: JSON.stringify({ productId, adjustment, reason }),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/ordering/products"] });
      queryClient.invalidateQueries({ queryKey: ["/api/ordering/stock-movements"] });
      setIsStockDialogOpen(false);
      setSelectedProduct(null);
      toast({
        title: "Success",
        description: "Stock adjusted successfully",
      });
    },
  });

  // Handlers for CRUD operations
  const handleCreateProduct = () => {
    if (editingProduct) {
      updateProductMutation.mutate({ id: editingProduct.id, data: productForm });
    } else {
      createProductMutation.mutate(productForm);
    }
  };

  const handleEditProduct = (product: any) => {
    setEditingProduct(product);
    setProductForm({
      name: product.name || "",
      category: product.category || "cleaning",
      sku: product.sku || "",
      supplier: product.supplier || "",
      supplierId: product.supplierId || "",
      unit: product.unit || "each",
      packSize: product.packSize || 1,
      currentStock: product.currentStock || 0,
      minStock: product.minStock || 0,
      maxStock: product.maxStock || 0,
      lastPrice: product.lastPrice || 0,
      notes: product.notes || "",
    });
    setIsProductDialogOpen(true);
  };

  const handleDeleteProduct = (product: any) => {
    setDeleteTarget({ type: "product", id: product.id, name: product.name });
    setDeleteConfirmOpen(true);
  };

  const handleCreateSupplier = () => {
    if (editingSupplier) {
      updateSupplierMutation.mutate({ id: editingSupplier.id, data: supplierForm });
    } else {
      createSupplierMutation.mutate(supplierForm);
    }
  };

  const handleEditSupplier = (supplier: any) => {
    setEditingSupplier(supplier);
    setSupplierForm({
      name: supplier.name || "",
      type: supplier.type || "cleaning",
      contactName: supplier.contactName || "",
      phone: supplier.phone || "",
      email: supplier.email || "",
      website: supplier.website || "",
      accountNumber: supplier.accountNumber || "",
      deliveryDays: supplier.deliveryDays || "",
      minimumOrder: supplier.minimumOrder || 0,
      notes: supplier.notes || "",
    });
    setIsSupplierDialogOpen(true);
  };

  const handleDeleteSupplier = (supplier: any) => {
    setDeleteTarget({ type: "supplier", id: supplier.id, name: supplier.name });
    setDeleteConfirmOpen(true);
  };

  const handleCreateOrder = () => {
    if (!orderForm.supplier || !orderForm.orderDate) {
      toast({
        title: "Validation Error",
        description: "Please select a supplier and order date",
        variant: "destructive",
      });
      return;
    }

    if (lineItems.length === 0) {
      toast({
        title: "Validation Error",
        description: "Please add at least one item to the order",
        variant: "destructive",
      });
      return;
    }

    const orderData = {
      ...orderForm,
      items: lineItems.map(item => ({
        productId: item.productId,
        quantity: item.quantity,
        unitPrice: item.unitPrice,
      })),
    };

    if (editingOrder) {
      updateOrderMutation.mutate({ id: editingOrder.id, data: orderData });
    } else {
      createOrderMutation.mutate(orderData);
    }
  };

  const handleEditOrder = (order: any) => {
    setEditingOrder(order);
    setOrderForm({
      supplier: order.supplier || "",
      supplierId: order.supplierId || "",
      orderDate: order.orderDate ? new Date(order.orderDate).toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
      status: order.status || "pending",
      notes: order.notes || "",
    });
    setIsOrderDialogOpen(true);
  };

  const handleDeleteOrder = (order: any) => {
    setDeleteTarget({ type: "order", id: order.id, name: order.orderNumber });
    setDeleteConfirmOpen(true);
  };

  const confirmDelete = () => {
    if (!deleteTarget) return;

    switch (deleteTarget.type) {
      case "product":
        deleteProductMutation.mutate(deleteTarget.id);
        break;
      case "supplier":
        deleteSupplierMutation.mutate(deleteTarget.id);
        break;
      case "order":
        deleteOrderMutation.mutate(deleteTarget.id);
        break;
    }
  };

  // Queries
  const productsQuery = useQuery({
    queryKey: ["/api/ordering/products"],
  });
  const suppliersQuery = useQuery({
    queryKey: ["/api/ordering/suppliers"],
  });
  const ordersQuery = useQuery({
    queryKey: ["/api/ordering/orders"],
  });
  const invoicesQuery = useQuery({
    queryKey: ["/api/ordering/invoices"],
  });
  const lowStockQuery = useQuery({
    queryKey: ["/api/ordering/products/low-stock"],
  });
  const analyticsQuery = useQuery({
    queryKey: ["/api/ordering/analytics"],
  });
  const stockMovementsQuery = useQuery({
    queryKey: ["/api/ordering/stock-movements"],
  });

  const priceHistoryQuery = useQuery({
    queryKey: ["/api/products", selectedProduct?.id, "price-history"],
    queryFn: async () => {
      if (!selectedProduct?.id) return [];
      const response = await fetch(`/api/products/${selectedProduct.id}/price-history`);
      if (!response.ok) throw new Error('Failed to fetch price history');
      return response.json();
    },
    enabled: !!selectedProduct?.id && isPriceHistoryDialogOpen,
  });

  // Query to fetch order items when viewing/editing
  const orderItemsQuery = useQuery({
    queryKey: ["/api/ordering/orders", viewingOrder?.id || editingOrder?.id, "items"],
    queryFn: async () => {
      const orderId = viewingOrder?.id || editingOrder?.id;
      if (!orderId) return [];
      const response = await fetch(`/api/ordering/orders/${orderId}/items`);
      if (!response.ok) throw new Error('Failed to fetch order items');
      return response.json();
    },
    enabled: !!(viewingOrder?.id || editingOrder?.id),
  });

  // Fetch data for dropdowns
  const productsData = productsQuery.data;
  const suppliersData = suppliersQuery.data;
  const ordersData = ordersQuery.data;

  // Populate line items when editing an order
  useEffect(() => {
    if (editingOrder && orderItemsQuery.data && orderItemsQuery.data.length > 0) {
      const items = orderItemsQuery.data.map((item: any) => ({
        productId: item.productId,
        productName: item.productName || item.product?.name || 'Unknown Product',
        quantity: item.quantity,
        unitPrice: item.unitPrice,
      }));
      setLineItems(items);
    }
  }, [editingOrder, orderItemsQuery.data]);

  // Auto-fill unit price when product is selected
  const handleProductSelect = (productId: string) => {
    setCurrentItemProductId(productId);
    const product = productsData?.find((p: any) => p.id === productId);
    if (product && product.lastPrice) {
      setCurrentItemUnitPrice(product.lastPrice.toString());
    }
  };

  // Filter products for the products tab
  const filteredProducts = productsData?.filter((product: OrderingProduct) => {
    const matchesSearch = product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          product.sku?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = selectedCategory === "all" || product.category === selectedCategory;
    const matchesSupplier = selectedSupplier === "all" || product.supplier === selectedSupplier;
    return matchesSearch && matchesCategory && matchesSupplier;
  }) || [];

  // Dashboard statistics
  const dashboardStats = {
    lowStockCount: lowStockQuery.data?.length || 0,
    pendingOrders: ordersQuery.data?.filter((o: OrderingOrder) => o.status === "pending").length || 0,
    totalSpent: analyticsQuery.data?.totalSpent || 0,
    stockValue: analyticsQuery.data?.stockValue || 0,
  };


  return (
    <div className="container mx-auto p-4 space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold" data-testid="heading-ordering-system">Ordering System</h1>
          <p className="text-muted-foreground" data-testid="text-ordering-description">Manage products, orders, and inventory</p>
        </div>
        <div className="flex gap-2">
          <InstructionPanel {...orderingInstructions} />
          <Button onClick={() => quickReorderMutation.mutate()} data-testid="button-quick-reorder-all">
            <RefreshCw className="w-4 h-4 mr-2" />
            Quick Reorder All
          </Button>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid grid-cols-8 w-full">
          <TabsTrigger value="dashboard" data-testid="tab-dashboard">Dashboard</TabsTrigger>
          <TabsTrigger value="products" data-testid="tab-products">Products</TabsTrigger>
          <TabsTrigger value="orders" data-testid="tab-orders">Orders</TabsTrigger>
          <TabsTrigger value="stock" data-testid="tab-stock">Stock</TabsTrigger>
          <TabsTrigger value="inventory" data-testid="tab-inventory">Inventory</TabsTrigger>
          <TabsTrigger value="suppliers" data-testid="tab-suppliers">Suppliers</TabsTrigger>
          <TabsTrigger value="analytics" data-testid="tab-analytics">Analytics</TabsTrigger>
          <TabsTrigger value="invoices" data-testid="tab-invoices">
            <Receipt className="w-4 h-4 mr-2" />
            Invoices
          </TabsTrigger>
        </TabsList>

        {/* Dashboard Tab */}
        <TabsContent value="dashboard" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card data-testid="metric-low-stock">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium" data-testid="card-title-low-stock-items">Low Stock Items</CardTitle>
                <AlertTriangle className="h-4 w-4 text-yellow-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold" data-testid="value-low-stock">{dashboardStats.lowStockCount}</div>
                <p className="text-xs text-muted-foreground">Items need reordering</p>
              </CardContent>
            </Card>

            <Card data-testid="metric-pending-orders">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium" data-testid="card-title-pending-orders">Pending Orders</CardTitle>
                <Clock className="h-4 w-4 text-blue-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold" data-testid="value-pending-orders">{dashboardStats.pendingOrders}</div>
                <p className="text-xs text-muted-foreground">Awaiting delivery</p>
              </CardContent>
            </Card>

            <Card data-testid="metric-monthly-spend">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium" data-testid="card-title-monthly-spend">Monthly Spend</CardTitle>
                <DollarSign className="h-4 w-4 text-green-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold" data-testid="value-monthly-spend">
                  ${dashboardStats.totalSpent.toLocaleString()}
                </div>
                <p className="text-xs text-muted-foreground">This month</p>
              </CardContent>
            </Card>

            <Card data-testid="metric-stock-value">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium" data-testid="card-title-stock-value">Stock Value</CardTitle>
                <Package className="h-4 w-4 text-purple-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold" data-testid="value-stock-value">
                  ${dashboardStats.stockValue.toLocaleString()}
                </div>
                <p className="text-xs text-muted-foreground">Current inventory</p>
              </CardContent>
            </Card>
          </div>

          {/* Low Stock Alert Section */}
          <Card>
            <CardHeader>
              <CardTitle data-testid="card-title-low-stock-alerts">Low Stock Alerts</CardTitle>
              <CardDescription data-testid="card-desc-low-stock-alerts">Items that need immediate reordering</CardDescription>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-[300px]">
                <div className="space-y-2">
                  {lowStockQuery.data?.map((product: OrderingProduct & { percentageRemaining: number }) => (
                    <div key={product.id} className="flex items-center justify-between p-3 border rounded-lg" data-testid={`low-stock-item-${product.id}`}>
                      <div className="flex-1">
                        <p className="font-medium" data-testid={`low-stock-name-${product.id}`}>{product.name}</p>
                        <p className="text-sm text-muted-foreground" data-testid={`low-stock-quantity-${product.id}`}>
                          {product.currentStock} / {product.minStock} units
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="w-24">
                          <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                            <div 
                              className={`h-full ${
                                product.percentageRemaining < 20 ? 'bg-red-500' : 'bg-yellow-500'
                              }`}
                              style={{ width: `${product.percentageRemaining}%` }}
                            />
                          </div>
                        </div>
                        <Button
                          size="sm"
                          onClick={() => quickReorderMutation.mutate([product.id])}
                          disabled={quickReorderMutation.isPending}
                          data-testid={`button-reorder-${product.id}`}
                        >
                          Reorder
                        </Button>
                      </div>
                    </div>
                  ))}
                  {lowStockQuery.data?.length === 0 && (
                    <p className="text-center text-muted-foreground py-4">
                      All products are well stocked!
                    </p>
                  )}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>

          {/* Recent Orders Section */}
          <Card>
            <CardHeader>
              <CardTitle data-testid="card-title-recent-orders">Recent Orders</CardTitle>
              <CardDescription data-testid="card-desc-recent-orders">Latest procurement activities</CardDescription>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-[300px]">
                <div className="space-y-2">
                  {ordersQuery.data?.slice(0, 5).map((order: OrderingOrder) => (
                    <div key={order.id} className="flex items-center justify-between p-3 border rounded-lg" data-testid={`recent-order-${order.id}`}>
                      <div>
                        <p className="font-medium" data-testid={`recent-order-number-${order.id}`}>{order.orderNumber}</p>
                        <p className="text-sm text-muted-foreground">{order.supplier}</p>
                      </div>
                      <div className="text-right">
                        <Badge variant={
                          order.status === 'received' ? 'default' :
                          order.status === 'ordered' ? 'secondary' :
                          'outline'
                        } data-testid={`recent-order-status-${order.id}`}>
                          {order.status}
                        </Badge>
                        <p className="text-sm text-muted-foreground mt-1">
                          {format(new Date(order.orderDate), 'MMM dd')}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Products Tab */}
        <TabsContent value="products" className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="relative">
                <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search products..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-8 w-[300px]"
                  data-testid="input-search-products"
                />
              </div>

              <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                <SelectTrigger className="w-[150px]" data-testid="select-category-filter">
                  <SelectValue placeholder="Category" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Categories</SelectItem>
                  <SelectItem value="cleaning">Cleaning</SelectItem>
                  <SelectItem value="linen">Linen</SelectItem>
                  <SelectItem value="wholesale">Wholesale</SelectItem>
                  <SelectItem value="general">General</SelectItem>
                </SelectContent>
              </Select>

              <Select value={selectedSupplier} onValueChange={setSelectedSupplier}>
                <SelectTrigger className="w-[150px]" data-testid="select-supplier-filter">
                  <SelectValue placeholder="Supplier" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Suppliers</SelectItem>
                  {suppliersQuery.data?.map((supplier: OrderingSupplier) => (
                    <SelectItem key={supplier.id} value={supplier.name}>
                      {supplier.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex gap-2">
              <Button variant="outline" data-testid="button-import-csv">
                <Upload className="w-4 h-4 mr-2" />
                Import CSV
              </Button>
              <Button onClick={() => setIsProductDialogOpen(true)} data-testid="button-add-product">
                <Plus className="w-4 h-4 mr-2" />
                Add Product
              </Button>
            </div>
          </div>

          <Card>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Category</TableHead>
                    <TableHead>Supplier</TableHead>
                    <TableHead>Stock</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredProducts.map((product: OrderingProduct) => {
                    const stockStatus = getStockStatus(
                      product.currentStock,
                      product.minStock,
                      product.maxStock
                    );

                    return (
                      <TableRow key={product.id} data-testid={`product-row-${product.id}`}>
                        <TableCell className="font-medium" data-testid={`product-name-${product.id}`}>{product.name}</TableCell>
                        <TableCell data-testid={`product-category-${product.id}`}>{product.category}</TableCell>
                        <TableCell data-testid={`product-supplier-${product.id}`}>{product.supplier}</TableCell>
                        <TableCell data-testid={`product-stock-${product.id}`}>
                          <div className="flex items-center gap-2">
                            <span>{product.currentStock}</span>
                            <span className="text-sm text-muted-foreground">
                              / {product.maxStock}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <StockBadge status={stockStatus} />
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-2">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => {
                                setSelectedProduct(product);
                                setIsPriceHistoryDialogOpen(true);
                              }}
                              data-testid={`button-price-history-${product.id}`}
                            >
                              <LineChart className="w-4 h-4" />
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => {
                                setSelectedProduct(product);
                                setIsStockDialogOpen(true);
                              }}
                              data-testid={`button-stock-${product.id}`}
                            >
                              <Package className="w-4 h-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleEditProduct(product)}
                              data-testid={`button-edit-product-${product.id}`}
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleDeleteProduct(product)}
                              data-testid={`button-delete-product-${product.id}`}
                            >
                              <Trash2 className="h-4 w-4 text-destructive" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Orders Tab */}
        <TabsContent value="orders" className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Select>
                <SelectTrigger className="w-[150px]" data-testid="select-order-status-filter">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="draft">Draft</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="ordered">Ordered</SelectItem>
                  <SelectItem value="shipped">Shipped</SelectItem>
                  <SelectItem value="received">Received</SelectItem>
                  <SelectItem value="cancelled">Cancelled</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <Button onClick={() => setIsOrderDialogOpen(true)} data-testid="button-create-order">
              <Plus className="w-4 h-4 mr-2" />
              Create Order
            </Button>
          </div>

          <div className="grid grid-cols-1 gap-4">
            {ordersData?.map((order: OrderingOrder) => (
              <Card key={order.id} data-testid={`order-card-${order.id}`}>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="text-lg" data-testid={`order-number-${order.id}`}>{order.orderNumber}</CardTitle>
                      <CardDescription data-testid={`order-supplier-${order.id}`}>{order.supplier}</CardDescription>
                    </div>
                    <div className="text-right">
                      <Badge variant={
                        order.status === 'received' ? 'default' :
                        order.status === 'ordered' ? 'secondary' :
                        order.status === 'cancelled' ? 'destructive' :
                        'outline'
                      } data-testid={`order-status-${order.id}`}>
                        {order.status}
                      </Badge>
                      <p className="text-sm text-muted-foreground mt-1" data-testid={`order-date-${order.id}`}>
                        {format(new Date(order.orderDate), 'MMM dd, yyyy')}
                      </p>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center justify-between">
                    <div className="space-y-1">
                      <p className="text-sm text-muted-foreground">
                        Total Amount: <span className="font-semibold text-foreground" data-testid={`order-total-${order.id}`}>
                          £{order.totalAmount?.toFixed(2) || '0.00'}
                        </span>
                      </p>
                      {order.expectedDelivery && (
                        <p className="text-sm text-muted-foreground" data-testid={`order-delivery-${order.id}`}>
                          Expected: {format(new Date(order.expectedDelivery), 'MMM dd')}
                        </p>
                      )}
                      {order.trackingNumber && (
                        <p className="text-sm text-muted-foreground" data-testid={`order-tracking-${order.id}`}>
                          Tracking: {order.trackingNumber}
                        </p>
                      )}
                    </div>
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          setViewingOrder(order);
                          setViewOrderDialogOpen(true);
                        }}
                        data-testid={`button-view-order-${order.id}`}
                      >
                        <Eye className="w-4 h-4 mr-2" />
                        View
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => handleEditOrder(order)}
                        data-testid={`button-edit-order-${order.id}`}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => handleDeleteOrder(order)}
                        data-testid={`button-delete-order-${order.id}`}
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                      {order.status === 'shipped' && (
                        <Button
                          size="sm"
                          onClick={() => {/* Handle receive */}}
                          data-testid={`button-receive-order-${order.id}`}
                        >
                          <PackageCheck className="w-4 h-4 mr-2" />
                          Receive
                        </Button>
                      )}
                      {order.status === 'draft' && (
                        <Button
                          size="sm"
                          onClick={() => 
                            updateOrderMutation.mutate({
                              id: order.id,
                              data: { status: 'ordered' }
                            })
                          }
                          data-testid={`button-submit-order-${order.id}`}
                        >
                          <Send className="w-4 h-4 mr-2" />
                          Submit
                        </Button>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        {/* Stock Management Tab */}
        <TabsContent value="stock" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle data-testid="card-title-stock-movements">Stock Movements</CardTitle>
              <CardDescription data-testid="card-desc-stock-movements">Track inventory changes and adjustments</CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Product</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Quantity</TableHead>
                    <TableHead>Reason</TableHead>
                    <TableHead>Order</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {stockMovementsQuery.data?.map((movement: OrderingStockMovement & { product: OrderingProduct }) => (
                    <TableRow key={movement.id} data-testid={`stock-movement-${movement.id}`}>
                      <TableCell data-testid={`movement-date-${movement.id}`}>
                        {movement.createdAt ? format(new Date(movement.createdAt), 'MMM dd, HH:mm') : '-'}
                      </TableCell>
                      <TableCell data-testid={`movement-product-${movement.id}`}>{movement.product.name}</TableCell>
                      <TableCell>
                        <Badge variant={movement.movementType === 'in' ? 'default' : 'secondary'} data-testid={`movement-type-${movement.id}`}>
                          {movement.movementType}
                        </Badge>
                      </TableCell>
                      <TableCell className={movement.movementType === 'in' ? 'text-green-600' : 'text-red-600'} data-testid={`movement-quantity-${movement.id}`}>
                        {movement.movementType === 'in' ? '+' : '-'}{movement.quantity}
                      </TableCell>
                      <TableCell data-testid={`movement-reason-${movement.id}`}>{movement.reason}</TableCell>
                      <TableCell data-testid={`movement-order-${movement.id}`}>{movement.orderId || '-'}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Suppliers Tab */}
        <TabsContent value="suppliers" className="space-y-4">
          <div className="flex justify-end">
            <Button onClick={() => setIsSupplierDialogOpen(true)} data-testid="button-add-supplier">
              <Plus className="w-4 h-4 mr-2" />
              Add Supplier
            </Button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {suppliersQuery.data?.map((supplier: OrderingSupplier) => (
              <Card key={supplier.id} data-testid={`supplier-card-${supplier.id}`}>
                <CardHeader>
                  <CardTitle className="text-lg" data-testid={`supplier-name-${supplier.id}`}>{supplier.name}</CardTitle>
                  <CardDescription data-testid={`supplier-type-${supplier.id}`}>{supplier.type}</CardDescription>
                </CardHeader>
                <CardContent className="space-y-2">
                  {supplier.contactName && (
                    <div className="flex items-center gap-2 text-sm" data-testid={`supplier-contact-${supplier.id}`}>
                      <Users className="w-4 h-4 text-muted-foreground" />
                      <span>{supplier.contactName}</span>
                    </div>
                  )}
                  {supplier.phone && (
                    <div className="flex items-center gap-2 text-sm" data-testid={`supplier-phone-${supplier.id}`}>
                      <Phone className="w-4 h-4 text-muted-foreground" />
                      <span>{supplier.phone}</span>
                    </div>
                  )}
                  {supplier.email && (
                    <div className="flex items-center gap-2 text-sm" data-testid={`supplier-email-${supplier.id}`}>
                      <Mail className="w-4 h-4 text-muted-foreground" />
                      <span>{supplier.email}</span>
                    </div>
                  )}
                  {supplier.website && (
                    <div className="flex items-center gap-2 text-sm" data-testid={`supplier-website-${supplier.id}`}>
                      <Globe className="w-4 h-4 text-muted-foreground" />
                      <span>{supplier.website}</span>
                    </div>
                  )}
                  {supplier.accountNumber && (
                    <div className="flex items-center gap-2 text-sm" data-testid={`supplier-account-${supplier.id}`}>
                      <FileText className="w-4 h-4 text-muted-foreground" />
                      <span>Account: {supplier.accountNumber}</span>
                    </div>
                  )}
                  <Separator className="my-2" />
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Min Order:</span>
                    <span data-testid={`supplier-minorder-${supplier.id}`}>£{supplier.minimumOrder || 0}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Delivery Days:</span>
                    <span data-testid={`supplier-delivery-${supplier.id}`}>{supplier.deliveryDays || '-'}</span>
                  </div>
                </CardContent>
                <CardFooter className="flex justify-end gap-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleEditSupplier(supplier)}
                    data-testid={`button-edit-supplier-${supplier.id}`}
                  >
                    <Edit className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleDeleteSupplier(supplier)}
                    data-testid={`button-delete-supplier-${supplier.id}`}
                  >
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </CardFooter>
              </Card>
            ))}
          </div>
        </TabsContent>

        {/* Analytics Tab */}
        <TabsContent value="analytics" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card data-testid="analytics-spending-by-category">
              <CardHeader>
                <CardTitle data-testid="card-title-spending-by-category">Spending by Category</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {analyticsQuery.data?.spendingByCategory?.map((cat: any) => (
                    <div key={cat.category} className="flex items-center justify-between" data-testid={`category-spending-${cat.category}`}>
                      <span className="text-sm">{cat.category}</span>
                      <div className="flex items-center gap-2">
                        <div className="w-32 bg-gray-200 rounded-full h-2">
                          <div 
                            className="bg-primary h-2 rounded-full"
                            style={{ width: `${cat.percentage}%` }}
                          />
                        </div>
                        <span className="text-sm font-medium" data-testid={`category-total-${cat.category}`}>
                          £{cat.total.toFixed(0)}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card data-testid="analytics-top-suppliers">
              <CardHeader>
                <CardTitle data-testid="card-title-top-suppliers">Top Suppliers</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {analyticsQuery.data?.spendingBySupplier?.slice(0, 5).map((sup: any, index: number) => (
                    <div key={sup.supplier} className="flex items-center justify-between" data-testid={`top-supplier-${index}`}>
                      <div>
                        <p className="text-sm font-medium" data-testid={`supplier-name-${index}`}>{sup.supplier}</p>
                        <p className="text-xs text-muted-foreground" data-testid={`supplier-orders-${index}`}>
                          {sup.orderCount} orders
                        </p>
                      </div>
                      <span className="text-sm font-medium" data-testid={`supplier-total-${index}`}>
                        £{sup.total.toFixed(0)}
                      </span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card data-testid="analytics-top-products">
              <CardHeader>
                <CardTitle data-testid="card-title-top-products">Top Products</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {analyticsQuery.data?.topProducts?.slice(0, 5).map((item: any, index: number) => (
                    <div key={item.product.id} className="flex items-center justify-between" data-testid={`top-product-${index}`}>
                      <div>
                        <p className="text-sm font-medium" data-testid={`product-name-${index}`}>{item.product.name}</p>
                        <p className="text-xs text-muted-foreground" data-testid={`product-units-${index}`}>
                          {item.totalOrdered} units
                        </p>
                      </div>
                      <span className="text-sm font-medium" data-testid={`product-spent-${index}`}>
                        £{item.totalSpent.toFixed(0)}
                      </span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card data-testid="analytics-monthly-trend">
              <CardHeader>
                <CardTitle data-testid="card-title-monthly-trend">Monthly Trend</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {analyticsQuery.data?.monthlyTrend?.slice(-6).map((month: any, index: number) => (
                    <div key={month.month} className="flex items-center justify-between" data-testid={`month-trend-${index}`}>
                      <span className="text-sm" data-testid={`month-name-${index}`}>{month.month}</span>
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-muted-foreground" data-testid={`month-orders-${index}`}>
                          {month.orders} orders
                        </span>
                        <span className="text-sm font-medium" data-testid={`month-spent-${index}`}>
                          £{month.spent.toFixed(0)}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Invoices Tab */}
        <TabsContent value="invoices" className="space-y-6">
          {/* Upload Card */}
          <Card>
            <CardHeader>
              <CardTitle data-testid="card-title-upload-invoice">Upload Invoice</CardTitle>
              <CardDescription data-testid="card-desc-upload-invoice">
                Upload Hoopers or Amazon invoices. AI will automatically extract products, prices, and create orders.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleInvoiceUpload} className="space-y-4">
                <div>
                  <Label data-testid="label-supplier">Supplier</Label>
                  <Select value={invoiceSupplier} onValueChange={setInvoiceSupplier}>
                    <SelectTrigger data-testid="select-invoice-supplier">
                      <SelectValue placeholder="Select supplier..." />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Hoopers">Hoopers</SelectItem>
                      <SelectItem value="Amazon">Amazon</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label data-testid="label-invoice-date">Invoice Date</Label>
                  <Input
                    type="date"
                    value={invoiceDate}
                    onChange={(e) => setInvoiceDate(e.target.value)}
                    data-testid="input-invoice-date"
                    required
                  />
                </div>

                <div>
                  <Label data-testid="label-invoice-file">Invoice File (PDF or Image, max 10MB)</Label>
                  <Input
                    type="file"
                    accept=".pdf,.jpg,.jpeg,.png"
                    onChange={handleInvoiceFileChange}
                    data-testid="input-invoice-file"
                    required
                  />
                  {invoiceFile && (
                    <p className="text-sm text-muted-foreground mt-2">
                      ✅ {invoiceFile.name} ({(invoiceFile.size / 1024).toFixed(0)} KB)
                    </p>
                  )}
                </div>

                <Button 
                  type="submit" 
                  disabled={uploadingInvoice || !invoiceFile}
                  data-testid="button-upload-invoice"
                >
                  {uploadingInvoice ? (
                    <>
                      <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                      Processing...
                    </>
                  ) : (
                    <>
                      <Upload className="w-4 h-4 mr-2" />
                      Upload & Extract Data
                    </>
                  )}
                </Button>
              </form>
            </CardContent>
          </Card>

          {/* Invoices List */}
          <Card>
            <CardHeader>
              <CardTitle data-testid="card-title-recent-invoices">Recent Invoices</CardTitle>
              <CardDescription data-testid="card-desc-recent-invoices">
                {invoicesQuery.data?.length || 0} invoices uploaded
              </CardDescription>
            </CardHeader>
            <CardContent>
              {invoicesQuery.isLoading ? (
                <div>Loading invoices...</div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Invoice #</TableHead>
                      <TableHead>Supplier</TableHead>
                      <TableHead>Date</TableHead>
                      <TableHead>Amount</TableHead>
                      <TableHead>Items</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {invoicesQuery.data?.map((invoice: any) => (
                      <TableRow key={invoice.id} data-testid={`invoice-row-${invoice.id}`}>
                        <TableCell className="font-medium" data-testid={`invoice-number-${invoice.id}`}>{invoice.invoiceNumber}</TableCell>
                        <TableCell data-testid={`invoice-supplier-${invoice.id}`}>{invoice.supplier}</TableCell>
                        <TableCell data-testid={`invoice-date-${invoice.id}`}>{format(new Date(invoice.invoiceDate), 'PP')}</TableCell>
                        <TableCell data-testid={`invoice-amount-${invoice.id}`}>£{invoice.totalAmount?.toFixed(2) || '0.00'}</TableCell>
                        <TableCell data-testid={`invoice-items-${invoice.id}`}>
                          {invoice.extractedData?.lineItems?.length || 0} items
                        </TableCell>
                        <TableCell>
                          {invoice.aiProcessed ? (
                            invoice.aiErrors ? (
                              <Badge variant="destructive" data-testid={`invoice-status-${invoice.id}`}>
                                <AlertCircle className="w-3 h-3 mr-1" />
                                Error
                              </Badge>
                            ) : (
                              <Badge variant="default" className="bg-green-500" data-testid={`invoice-status-${invoice.id}`}>
                                <CheckCircle className="w-3 h-3 mr-1" />
                                Processed
                              </Badge>
                            )
                          ) : (
                            <Badge variant="secondary" data-testid={`invoice-status-${invoice.id}`}>
                              <Clock className="w-3 h-3 mr-1" />
                              Processing...
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell>
                          <Button size="sm" variant="ghost" data-testid={`button-view-invoice-${invoice.id}`}>
                            <Eye className="w-4 h-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Inventory Counting Tab */}
        <TabsContent value="inventory" className="space-y-4">
          <InventoryCountingTab />
        </TabsContent>
      </Tabs>

      {/* Product Dialog */}
      <Dialog open={isProductDialogOpen} onOpenChange={(open) => {
              setIsProductDialogOpen(open);
              if (!open) {
                setEditingProduct(null);
                resetProductForm();
              }
            }}>
              <DialogTrigger asChild>
                <Button data-testid="button-trigger-add-product-dialog">
                  <Plus className="h-4 w-4 mr-2" />
                  Add Product
                </Button>
              </DialogTrigger>
              <DialogContent className="max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>{editingProduct ? "Edit Product" : "Add New Product"}</DialogTitle>
                  <DialogDescription>
                    {editingProduct ? "Update product information" : "Add a new product to your inventory"}
                  </DialogDescription>
                </DialogHeader>

                <div className="grid gap-4 py-4">
                    <div className="grid gap-2">
                      <Label htmlFor="product-name" data-testid="label-product-name">Product Name *</Label>
                      <Input
                        id="product-name"
                        value={productForm.name}
                        onChange={(e) => setProductForm({ ...productForm, name: e.target.value })}
                        required
                        data-testid="input-product-name"
                      />
                    </div>
                    <div className="grid gap-2">
                      <Label htmlFor="product-sku" data-testid="label-product-sku">SKU</Label>
                      <Input
                        id="product-sku"
                        value={productForm.sku}
                        onChange={(e) => setProductForm({ ...productForm, sku: e.target.value })}
                        data-testid="input-product-sku"
                      />
                    </div>
                    <div className="grid gap-2">
                      <Label htmlFor="product-category" data-testid="label-product-category">Category</Label>
                      <Select
                        value={productForm.category}
                        onValueChange={(value) => setProductForm({ ...productForm, category: value })}
                      >
                        <SelectTrigger data-testid="select-product-category">
                          <SelectValue placeholder="Select category" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="cleaning">Cleaning</SelectItem>
                          <SelectItem value="linen">Linen</SelectItem>
                          <SelectItem value="wholesale">Wholesale</SelectItem>
                          <SelectItem value="general">General</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="grid gap-2">
                      <Label htmlFor="product-supplier" data-testid="label-product-supplier">Supplier</Label>
                      <Select
                        value={productForm.supplierId}
                        onValueChange={(value) => {
                          const supplier = suppliersData?.find((s: any) => s.id === value);
                          setProductForm({ 
                            ...productForm, 
                            supplierId: value,
                            supplier: supplier?.name || ""
                          });
                        }}
                      >
                        <SelectTrigger data-testid="select-product-supplier">
                          <SelectValue placeholder="Select supplier" />
                        </SelectTrigger>
                        <SelectContent>
                          {suppliersData?.map((supplier: any) => (
                            <SelectItem key={supplier.id} value={supplier.id}>
                              {supplier.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="grid gap-2">
                      <Label htmlFor="product-unit" data-testid="label-product-unit">Unit</Label>
                      <Select
                        value={productForm.unit}
                        onValueChange={(value) => setProductForm({ ...productForm, unit: value })}
                      >
                        <SelectTrigger data-testid="select-product-unit">
                          <SelectValue placeholder="Select unit" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="each">Each</SelectItem>
                          <SelectItem value="box">Box</SelectItem>
                          <SelectItem value="case">Case</SelectItem>
                          <SelectItem value="pack">Pack</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="grid gap-2">
                      <Label htmlFor="product-packsize" data-testid="label-product-packsize">Pack Size</Label>
                      <Input
                        id="product-packsize"
                        type="number"
                        value={productForm.packSize}
                        onChange={(e) => setProductForm({ ...productForm, packSize: parseInt(e.target.value) || 1 })}
                        data-testid="input-product-packsize"
                      />
                    </div>
                    <div className="grid gap-2">
                      <Label htmlFor="product-minstock" data-testid="label-product-minstock">Min Stock</Label>
                      <Input
                        id="product-minstock"
                        type="number"
                        value={productForm.minStock}
                        onChange={(e) => setProductForm({ ...productForm, minStock: parseInt(e.target.value) || 0 })}
                        data-testid="input-product-minstock"
                      />
                    </div>
                    <div className="grid gap-2">
                      <Label htmlFor="product-maxstock" data-testid="label-product-maxstock">Max Stock</Label>
                      <Input
                        id="product-maxstock"
                        type="number"
                        value={productForm.maxStock}
                        onChange={(e) => setProductForm({ ...productForm, maxStock: parseInt(e.target.value) || 0 })}
                        data-testid="input-product-maxstock"
                      />
                    </div>
                    <div className="grid gap-2">
                      <Label htmlFor="product-price" data-testid="label-product-price">Last Price (£)</Label>
                      <Input
                        id="product-price"
                        type="number"
                        step="0.01"
                        value={productForm.lastPrice}
                        onChange={(e) => setProductForm({ ...productForm, lastPrice: parseFloat(e.target.value) || 0 })}
                        data-testid="input-product-price"
                      />
                    </div>
                     <div className="grid gap-2">
                      <Label htmlFor="product-currentstock" data-testid="label-product-currentstock">Current Stock</Label>
                      <Input
                        id="product-currentstock"
                        type="number"
                        value={productForm.currentStock}
                        onChange={(e) => setProductForm({ ...productForm, currentStock: parseInt(e.target.value) || 0 })}
                        data-testid="input-product-currentstock"
                      />
                    </div>
                    <div className="grid gap-2 col-span-2">
                      <Label htmlFor="product-notes" data-testid="label-product-notes">Notes</Label>
                      <Textarea
                        id="product-notes"
                        value={productForm.notes}
                        onChange={(e) => setProductForm({ ...productForm, notes: e.target.value })}
                        rows={3}
                        data-testid="input-product-notes"
                      />
                    </div>
                  </div>
                <DialogFooter>
                  <Button onClick={handleCreateProduct} data-testid="button-save-product">
                    {editingProduct ? "Update Product" : "Add Product"}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>

      {/* Stock Adjustment Dialog */}
      <Dialog open={isStockDialogOpen} onOpenChange={setIsStockDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Adjust Stock</DialogTitle>
            <DialogDescription>
              {selectedProduct?.name}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <Label data-testid="label-current-stock">Current Stock</Label>
              <p className="text-2xl font-bold">{selectedProduct?.currentStock}</p>
            </div>

            <div>
              <Label data-testid="label-adjustment">Adjustment</Label>
              <Input 
                type="number" 
                placeholder="Enter positive or negative number"
                id="adjustment"
                data-testid="input-stock-adjustment"
              />
            </div>

            <div>
              <Label data-testid="label-reason">Reason</Label>
              <Textarea 
                placeholder="Reason for adjustment..."
                data-testid="input-adjustment-reason"
                id="reason"
              />
            </div>

            <DialogFooter>
              <Button 
                onClick={() => {
                  const adjustmentInput = document.getElementById('adjustment') as HTMLInputElement;
                  const reasonInput = document.getElementById('reason') as HTMLTextAreaElement;

                  const adjustment = parseInt(adjustmentInput.value);
                  const reason = reasonInput.value;

                  if (selectedProduct && !isNaN(adjustment) && reason) {
                    adjustStockMutation.mutate({
                      productId: selectedProduct.id,
                      adjustment,
                      reason
                    });
                  } else {
                     toast({
                       title: "Validation Error",
                       description: "Please enter a valid adjustment number and a reason.",
                       variant: "destructive"
                     });
                  }
                }}
                disabled={adjustStockMutation.isPending}
                data-testid="button-adjust-stock"
              >
                Adjust Stock
              </Button>
            </DialogFooter>
          </div>
        </DialogContent>
      </Dialog>

      {/* Supplier Dialog */}
      <Dialog open={isSupplierDialogOpen} onOpenChange={(open) => {
              setIsSupplierDialogOpen(open);
              if (!open) {
                setEditingSupplier(null);
                resetSupplierForm();
              }
            }}>
              <DialogTrigger asChild>
                <Button variant="outline" data-testid="button-trigger-add-supplier-dialog">
                  <Plus className="h-4 w-4 mr-2" />
                  Add Supplier
                </Button>
              </DialogTrigger>
              <DialogContent className="max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>{editingSupplier ? "Edit Supplier" : "Add New Supplier"}</DialogTitle>
                  <DialogDescription>
                    {editingSupplier ? "Update supplier information" : "Add a new supplier to your network"}
                  </DialogDescription>
                </DialogHeader>

                <div className="grid gap-4 py-4">
                    <div className="grid gap-2">
                      <Label htmlFor="supplier-name" data-testid="label-supplier-name">Supplier Name *</Label>
                      <Input
                        id="supplier-name"
                        value={supplierForm.name}
                        onChange={(e) => setSupplierForm({ ...supplierForm, name: e.target.value })}
                        required
                        data-testid="input-supplier-name"
                      />
                    </div>
                    <div className="grid gap-2">
                      <Label htmlFor="supplier-type" data-testid="label-supplier-type">Type</Label>
                      <Select
                        value={supplierForm.type}
                        onValueChange={(value) => setSupplierForm({ ...supplierForm, type: value })}
                      >
                        <SelectTrigger data-testid="select-supplier-type">
                          <SelectValue placeholder="Select type" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="cleaning">Cleaning</SelectItem>
                          <SelectItem value="linen">Linen</SelectItem>
                          <SelectItem value="wholesale">Wholesale</SelectItem>
                          <SelectItem value="amazon">Amazon</SelectItem>
                          <SelectItem value="general">General</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="grid gap-2">
                      <Label htmlFor="supplier-contact" data-testid="label-supplier-contact">Contact Name</Label>
                      <Input
                        id="supplier-contact"
                        value={supplierForm.contactName}
                        onChange={(e) => setSupplierForm({ ...supplierForm, contactName: e.target.value })}
                        data-testid="input-supplier-contact"
                      />
                    </div>
                    <div className="grid gap-2">
                      <Label htmlFor="supplier-phone" data-testid="label-supplier-phone">Phone</Label>
                      <Input
                        id="supplier-phone"
                        type="tel"
                        value={supplierForm.phone}
                        onChange={(e) => setSupplierForm({ ...supplierForm, phone: e.target.value })}
                        data-testid="input-supplier-phone"
                      />
                    </div>
                    <div className="grid gap-2">
                      <Label htmlFor="supplier-email" data-testid="label-supplier-email">Email</Label>
                      <Input
                        id="supplier-email"
                        type="email"
                        value={supplierForm.email}
                        onChange={(e) => setSupplierForm({ ...supplierForm, email: e.target.value })}
                        data-testid="input-supplier-email"
                      />
                    </div>
                    <div className="grid gap-2">
                      <Label htmlFor="supplier-website" data-testid="label-supplier-website">Website</Label>
                      <Input
                        id="supplier-website"
                        type="url"
                        value={supplierForm.website}
                        onChange={(e) => setSupplierForm({ ...supplierForm, website: e.target.value })}
                        data-testid="input-supplier-website"
                      />
                    </div>

                    <div className="grid gap-2">
                      <Label htmlFor="supplier-account" data-testid="label-supplier-account">Account Number</Label>
                      <Input
                        id="supplier-account"
                        value={supplierForm.accountNumber}
                        onChange={(e) => setSupplierForm({ ...supplierForm, accountNumber: e.target.value })}
                        data-testid="input-supplier-account"
                      />
                    </div>

                    <div className="grid gap-2">
                      <Label htmlFor="supplier-delivery" data-testid="label-supplier-delivery">Delivery Days</Label>
                      <Input
                        id="supplier-delivery"
                        placeholder="e.g., Mon, Wed, Fri"
                        value={supplierForm.deliveryDays}
                        onChange={(e) => setSupplierForm({ ...supplierForm, deliveryDays: e.target.value })}
                        data-testid="input-supplier-delivery"
                      />
                    </div>

                    <div className="grid gap-2">
                      <Label htmlFor="supplier-minimum" data-testid="label-supplier-minimum">Minimum Order (£)</Label>
                      <Input
                        id="supplier-minimum"
                        type="number"
                        step="0.01"
                        value={supplierForm.minimumOrder}
                        onChange={(e) => setSupplierForm({ ...supplierForm, minimumOrder: parseFloat(e.target.value) || 0 })}
                        data-testid="input-supplier-minimum"
                      />
                    </div>

                    <div className="grid gap-2">
                      <Label htmlFor="supplier-notes" data-testid="label-supplier-notes">Notes</Label>
                      <Textarea
                        id="supplier-notes"
                        value={supplierForm.notes}
                        onChange={(e) => setSupplierForm({ ...supplierForm, notes: e.target.value })}
                        rows={3}
                        data-testid="input-supplier-notes"
                      />
                    </div>
                  </div>
                <DialogFooter>
                  <Button onClick={handleCreateSupplier} data-testid="button-save-supplier">
                    {editingSupplier ? "Update Supplier" : "Add Supplier"}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>

      {/* Order Dialog */}
      <Dialog open={isOrderDialogOpen} onOpenChange={(open) => {
              setIsOrderDialogOpen(open);
              if (!open) {
                setEditingOrder(null);
                resetOrderForm();
              }
            }}>
              <DialogTrigger asChild>
                <Button data-testid="button-trigger-create-order-dialog">
                  <Plus className="h-4 w-4 mr-2" />
                  Create Order
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>{editingOrder ? "Edit Order" : "Create New Order"}</DialogTitle>
                  <DialogDescription>
                    {editingOrder ? "Update order details" : "Enter order information below"}
                  </DialogDescription>
                </DialogHeader>

                <div className="grid gap-4 py-4">
                  <div className="grid gap-2">
                    <Label htmlFor="order-supplier" data-testid="label-order-supplier">Supplier *</Label>
                    <Select
                      value={orderForm.supplierId}
                      onValueChange={(value) => {
                        const supplier = suppliersData?.find((s: any) => s.id === value);
                        setOrderForm({ 
                          ...orderForm, 
                          supplierId: value,
                          supplier: supplier?.name || ""
                        });
                      }}
                    >
                      <SelectTrigger data-testid="select-order-supplier">
                        <SelectValue placeholder="Select supplier" />
                      </SelectTrigger>
                      <SelectContent>
                        {suppliersData?.map((supplier: OrderingSupplier) => (
                          <SelectItem key={supplier.id} value={supplier.id}>
                            {supplier.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="grid gap-2">
                    <Label htmlFor="order-date" data-testid="label-order-date">Order Date *</Label>
                    <Input
                      id="order-date"
                      type="date"
                      value={orderForm.orderDate}
                      onChange={(e) => setOrderForm({ ...orderForm, orderDate: e.target.value })}
                      data-testid="input-order-date"
                    />
                  </div>

                  <div className="grid gap-2">
                    <Label htmlFor="order-status" data-testid="label-order-status">Status</Label>
                    <Select
                      value={orderForm.status}
                      onValueChange={(value) => setOrderForm({ ...orderForm, status: value })}
                    >
                      <SelectTrigger data-testid="select-order-status">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="pending">Pending</SelectItem>
                        <SelectItem value="ordered">Ordered</SelectItem>
                        <SelectItem value="received">Received</SelectItem>
                        <SelectItem value="cancelled">Cancelled</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="grid gap-2">
                    <Label htmlFor="order-notes" data-testid="label-order-notes">Notes</Label>
                    <Textarea
                      id="order-notes"
                      value={orderForm.notes}
                      onChange={(e) => setOrderForm({ ...orderForm, notes: e.target.value })}
                      rows={3}
                      placeholder="Additional notes..."
                      data-testid="input-order-notes"
                    />
                  </div>

                  <Separator className="my-4" />

                  {/* Line Items Section */}
                  <div className="space-y-4">
                    <h3 className="text-lg font-semibold">Order Items</h3>
                    
                    {/* Add Item Form */}
                    <div className="grid grid-cols-12 gap-2">
                      <div className="col-span-5">
                        <Label htmlFor="item-product" data-testid="label-item-product">Product *</Label>
                        <Select
                          value={currentItemProductId}
                          onValueChange={handleProductSelect}
                        >
                          <SelectTrigger data-testid="select-item-product">
                            <SelectValue placeholder="Select product" />
                          </SelectTrigger>
                          <SelectContent>
                            {productsData?.map((product: OrderingProduct) => (
                              <SelectItem key={product.id} value={product.id}>
                                {product.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="col-span-2">
                        <Label htmlFor="item-quantity" data-testid="label-item-quantity">Quantity *</Label>
                        <Input
                          id="item-quantity"
                          type="number"
                          min="1"
                          step="0.01"
                          value={currentItemQuantity}
                          onChange={(e) => setCurrentItemQuantity(e.target.value)}
                          placeholder="Qty"
                          data-testid="input-item-quantity"
                        />
                      </div>
                      <div className="col-span-3">
                        <Label htmlFor="item-price" data-testid="label-item-price">Unit Price (£) *</Label>
                        <Input
                          id="item-price"
                          type="number"
                          min="0"
                          step="0.01"
                          value={currentItemUnitPrice}
                          onChange={(e) => setCurrentItemUnitPrice(e.target.value)}
                          placeholder="Price"
                          data-testid="input-item-unit-price"
                        />
                      </div>
                      <div className="col-span-2 flex items-end">
                        <Button 
                          type="button" 
                          onClick={handleAddLineItem}
                          className="w-full"
                          data-testid="button-add-item"
                        >
                          <Plus className="h-4 w-4 mr-1" />
                          Add
                        </Button>
                      </div>
                    </div>

                    {/* Items Table */}
                    {lineItems.length > 0 ? (
                      <div className="border rounded-md">
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead>Product</TableHead>
                              <TableHead className="text-right">Quantity</TableHead>
                              <TableHead className="text-right">Unit Price</TableHead>
                              <TableHead className="text-right">Total</TableHead>
                              <TableHead className="w-[80px]">Actions</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {lineItems.map((item, index) => (
                              <TableRow key={index} data-testid={`row-line-item-${index}`}>
                                <TableCell data-testid={`text-item-name-${index}`}>{item.productName}</TableCell>
                                <TableCell className="text-right" data-testid={`text-item-quantity-${index}`}>
                                  {item.quantity}
                                </TableCell>
                                <TableCell className="text-right" data-testid={`text-item-unit-price-${index}`}>
                                  £{(item.unitPrice || 0).toFixed(2)}
                                </TableCell>
                                <TableCell className="text-right" data-testid={`text-item-total-${index}`}>
                                  £{((item.quantity || 0) * (item.unitPrice || 0)).toFixed(2)}
                                </TableCell>
                                <TableCell>
                                  <Button
                                    type="button"
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => handleRemoveLineItem(index)}
                                    data-testid={`button-remove-item-${index}`}
                                  >
                                    <Trash className="h-4 w-4" />
                                  </Button>
                                </TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                        <div className="border-t p-4 flex justify-between items-center bg-muted/50">
                          <span className="font-semibold">Order Total:</span>
                          <span className="text-xl font-bold" data-testid="text-order-total">
                            £{calculateOrderTotal().toFixed(2)}
                          </span>
                        </div>
                      </div>
                    ) : (
                      <div className="text-center py-8 text-muted-foreground border rounded-md bg-muted/20">
                        No items added yet. Please add at least one item to the order.
                      </div>
                    )}
                  </div>
                </div>

                <DialogFooter>
                  <Button onClick={handleCreateOrder} data-testid="button-save-order">
                    {editingOrder ? "Update Order" : "Create Order"}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>

      {/* View Order Details Dialog */}
      <Dialog open={viewOrderDialogOpen} onOpenChange={(open) => {
        setViewOrderDialogOpen(open);
        if (!open) {
          setViewingOrder(null);
        }
      }}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Order Details</DialogTitle>
            <DialogDescription>
              Order #{viewingOrder?.orderNumber}
            </DialogDescription>
          </DialogHeader>

          {viewingOrder && (
            <div className="space-y-6">
              {/* Order Header Info */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-muted-foreground" data-testid="label-view-supplier">Supplier</Label>
                  <p className="font-medium" data-testid="view-order-supplier">{viewingOrder.supplier}</p>
                </div>
                <div>
                  <Label className="text-muted-foreground" data-testid="label-view-status">Status</Label>
                  <div className="mt-1">
                    <Badge variant={
                      viewingOrder.status === 'received' ? 'default' :
                      viewingOrder.status === 'ordered' ? 'secondary' :
                      viewingOrder.status === 'cancelled' ? 'destructive' :
                      'outline'
                    } data-testid="view-order-status">
                      {viewingOrder.status}
                    </Badge>
                  </div>
                </div>
                <div>
                  <Label className="text-muted-foreground" data-testid="label-view-order-date">Order Date</Label>
                  <p className="font-medium" data-testid="view-order-date">
                    {format(new Date(viewingOrder.orderDate), 'MMM dd, yyyy')}
                  </p>
                </div>
                {viewingOrder.expectedDelivery && (
                  <div>
                    <Label className="text-muted-foreground" data-testid="label-view-expected-delivery">Expected Delivery</Label>
                    <p className="font-medium" data-testid="view-order-delivery">
                      {format(new Date(viewingOrder.expectedDelivery), 'MMM dd, yyyy')}
                    </p>
                  </div>
                )}
                {viewingOrder.trackingNumber && (
                  <div className="col-span-2">
                    <Label className="text-muted-foreground" data-testid="label-view-tracking-number">Tracking Number</Label>
                    <p className="font-medium" data-testid="view-order-tracking">{viewingOrder.trackingNumber}</p>
                  </div>
                )}
                {viewingOrder.notes && (
                  <div className="col-span-2">
                    <Label className="text-muted-foreground" data-testid="label-view-notes">Notes</Label>
                    <p className="text-sm" data-testid="view-order-notes">{viewingOrder.notes}</p>
                  </div>
                )}
              </div>

              <Separator />

              {/* Order Items */}
              <div>
                <h3 className="text-lg font-semibold mb-4">Order Items</h3>
                {orderItemsQuery.isLoading ? (
                  <div className="text-center py-8 text-muted-foreground">
                    Loading items...
                  </div>
                ) : orderItemsQuery.data && orderItemsQuery.data.length > 0 ? (
                  <div className="border rounded-md">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Product</TableHead>
                          <TableHead className="text-right">Quantity</TableHead>
                          <TableHead className="text-right">Unit Price</TableHead>
                          <TableHead className="text-right">Line Total</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {orderItemsQuery.data.map((item: any, index: number) => (
                          <TableRow key={index} data-testid={`view-item-row-${index}`}>
                            <TableCell data-testid={`view-item-name-${index}`}>
                              {item.productName || item.product?.name || 'Unknown Product'}
                            </TableCell>
                            <TableCell className="text-right" data-testid={`view-item-quantity-${index}`}>
                              {item.quantity}
                            </TableCell>
                            <TableCell className="text-right" data-testid={`view-item-unit-price-${index}`}>
                              £{(item.unitPrice || 0).toFixed(2)}
                            </TableCell>
                            <TableCell className="text-right" data-testid={`view-item-total-${index}`}>
                              £{((item.quantity || 0) * (item.unitPrice || 0)).toFixed(2)}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                    <div className="border-t p-4 flex justify-between items-center bg-muted/50">
                      <span className="font-semibold">Grand Total:</span>
                      <span className="text-xl font-bold" data-testid="view-order-grand-total">
                        £{viewingOrder.totalAmount?.toFixed(2) || '0.00'}
                      </span>
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-8 text-muted-foreground border rounded-md bg-muted/20">
                    No items in this order
                  </div>
                )}
              </div>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setViewOrderDialogOpen(false)} data-testid="button-close-view-order">
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Price History Dialog */}
      <Dialog open={isPriceHistoryDialogOpen} onOpenChange={setIsPriceHistoryDialogOpen}>
        <DialogContent className="max-w-4xl">
          <DialogHeader>
            <DialogTitle>Price History</DialogTitle>
            <DialogDescription>
              Historical price data for {selectedProduct?.name}
            </DialogDescription>
          </DialogHeader>

          <div className="py-4">
            {priceHistoryQuery.isLoading ? (
              <div className="flex items-center justify-center py-12">
                <RefreshCw className="w-6 h-6 animate-spin text-muted-foreground" />
              </div>
            ) : (
              <PriceHistoryChart 
                data={priceHistoryQuery.data || []} 
                productName={selectedProduct?.name || ""} 
              />
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteConfirmOpen} onOpenChange={setDeleteConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete the {deleteTarget?.type} "{deleteTarget?.name}". 
              This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel data-testid="button-cancel-delete">Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete} className="bg-destructive text-destructive-foreground" data-testid="button-confirm-delete">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}