import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Package, Calendar, User, CheckCircle, AlertCircle, Save } from "lucide-react";
import { format } from "date-fns";
import type { OrderingProduct, StockCount } from "@shared/schema";

const LOCATION_CODE = "HEAD_OFFICE";

// Linen item names matching the task requirements
const LINEN_ITEMS = [
  "Cages to Collect",
  "Pillowcases",
  "Single Sheets",
  "Single Duvets",
  "Superking Sheets",
  "Superking Duvets",
  "Bath Towels",
  "Hand Towels",
  "Bath Mats",
  "Tea Towels",
];

// Form schema for stock count
const stockCountFormSchema = z.object({
  cagesToCollect: z.string().transform(val => parseInt(val) || 0),
  pillowcases: z.string().transform(val => parseInt(val) || 0),
  singleSheets: z.string().transform(val => parseInt(val) || 0),
  singleDuvets: z.string().transform(val => parseInt(val) || 0),
  superkingSheets: z.string().transform(val => parseInt(val) || 0),
  superkingDuvets: z.string().transform(val => parseInt(val) || 0),
  bathTowels: z.string().transform(val => parseInt(val) || 0),
  handTowels: z.string().transform(val => parseInt(val) || 0),
  bathMats: z.string().transform(val => parseInt(val) || 0),
  teaTowels: z.string().transform(val => parseInt(val) || 0),
  notes: z.string().optional(),
});

type StockCountFormValues = z.infer<typeof stockCountFormSchema>;

export default function Head OfficeStock() {
  const { toast } = useToast();

  // Fetch all linen products
  const { data: products = [], isLoading: productsLoading } = useQuery<OrderingProduct[]>({
    queryKey: ["/api/ordering/products"],
    select: (data) => data.filter((p: OrderingProduct) => p.category === "linen"),
  });

  // Fetch latest stock counts for Head Office
  const { data: latestCounts = [], isLoading: countsLoading } = useQuery<Array<StockCount & { product: OrderingProduct; countedByStaff?: any }>>({
    queryKey: ["/api/stock-counts/latest", LOCATION_CODE],
    queryFn: async () => {
      const response = await fetch(`/api/stock-counts/latest/${LOCATION_CODE}`);
      if (!response.ok) throw new Error("Failed to fetch latest counts");
      return response.json();
    },
  });

  // Get the most recent count date and counter
  const lastCount = latestCounts.length > 0 
    ? latestCounts.reduce((latest, current) => 
        new Date(current.countDate) > new Date(latest.countDate) ? current : latest
      )
    : null;

  // Create a map of product names to latest counts
  const countMap = new Map(
    latestCounts.map(count => [count.product.name, count])
  );

  // Create a map of product names to product IDs
  const productMap = new Map(
    products.map(product => [product.name, product.id])
  );

  const form = useForm<StockCountFormValues>({
    resolver: zodResolver(stockCountFormSchema),
    defaultValues: {
      cagesToCollect: "0",
      pillowcases: "0",
      singleSheets: "0",
      singleDuvets: "0",
      superkingSheets: "0",
      superkingDuvets: "0",
      bathTowels: "0",
      handTowels: "0",
      bathMats: "0",
      teaTowels: "0",
      notes: "",
    },
  });

  const submitCountsMutation = useMutation({
    mutationFn: async (data: StockCountFormValues) => {
      const { notes, ...quantities } = data;
      
      // Map form fields to product names
      const fieldToProductName: Record<string, string> = {
        cagesToCollect: "Cages to Collect",
        pillowcases: "Pillowcases",
        singleSheets: "Single Sheets",
        singleDuvets: "Single Duvets",
        superkingSheets: "Superking Sheets",
        superkingDuvets: "Superking Duvets",
        bathTowels: "Bath Towels",
        handTowels: "Hand Towels",
        bathMats: "Bath Mats",
        teaTowels: "Tea Towels",
      };

      // Create stock counts for each item
      const stockCounts = Object.entries(quantities).map(([field, quantity]) => {
        const productName = fieldToProductName[field];
        const productId = productMap.get(productName);
        
        if (!productId) {
          throw new Error(`Product not found: ${productName}`);
        }

        return {
          productId,
          locationCode: LOCATION_CODE,
          countedQuantity: Number(quantity), // Ensure numeric value
          notes: notes || undefined,
        };
      });

      // Submit all counts
      const responses = await Promise.all(
        stockCounts.map(count =>
          apiRequest("/api/stock-counts", {
            method: "POST",
            body: JSON.stringify(count),
          })
        )
      );

      return responses;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/stock-counts/latest", LOCATION_CODE] });
      queryClient.invalidateQueries({ queryKey: ["/api/stock-counts"] });
      
      toast({
        title: "Stock Count Submitted",
        description: "All linen stock counts have been recorded successfully.",
      });
      
      form.reset();
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to submit stock counts",
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: StockCountFormValues) => {
    submitCountsMutation.mutate(data);
  };

  const isLoading = productsLoading || countsLoading;

  // Check if all required products exist
  const missingProducts = LINEN_ITEMS.filter(item => !productMap.has(item));

  if (missingProducts.length > 0) {
    return (
      <div className="container mx-auto p-6 max-w-5xl">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertCircle className="h-5 w-5 text-destructive" />
              Missing Linen Products
            </CardTitle>
            <CardDescription>
              Some linen products are not configured in the system
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="mb-4">The following linen products need to be added to the ordering system with category "linen":</p>
            <ul className="list-disc list-inside space-y-1">
              {missingProducts.map(product => (
                <li key={product} className="text-sm">{product}</li>
              ))}
            </ul>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 max-w-5xl space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold mb-2" data-testid="heading-head-office-stock">1 Example Street Linen Stock</h1>
        <p className="text-muted-foreground" data-testid="text-head-office-description">
          Track and manage linen inventory at 1 Example Street location
        </p>
      </div>

      {/* Last Count Info */}
      {lastCount && (
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm font-medium">Last Count:</span>
                  <span className="text-sm" data-testid="text-last-count-date">
                    {format(new Date(lastCount.countDate), "PPP 'at' p")}
                  </span>
                </div>
                {lastCount.countedByStaff && (
                  <div className="flex items-center gap-2">
                    <User className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm font-medium">Counted by:</span>
                    <span className="text-sm" data-testid="text-last-counted-by">
                      {lastCount.countedByStaff.firstName} {lastCount.countedByStaff.lastName}
                    </span>
                  </div>
                )}
              </div>
              <Badge variant="outline" data-testid="badge-count-status">
                <CheckCircle className="h-3 w-3 mr-1" />
                Completed
              </Badge>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Current Stock Levels */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Package className="h-5 w-5" />
            Current Stock Levels
          </CardTitle>
          <CardDescription>
            Latest counted quantities for all linen items
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-8 text-muted-foreground">Loading stock levels...</div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
              {LINEN_ITEMS.map(itemName => {
                const count = countMap.get(itemName);
                return (
                  <div 
                    key={itemName} 
                    className="p-4 border rounded-md"
                    data-testid={`stock-level-${itemName.toLowerCase().replace(/\s+/g, '-')}`}
                  >
                    <div className="text-sm font-medium mb-1">{itemName}</div>
                    <div className="text-2xl font-bold">
                      {count?.countedQuantity ?? 0}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      <Separator />

      {/* Stock Take Form */}
      <Card>
        <CardHeader>
          <CardTitle>New Stock Take</CardTitle>
          <CardDescription>
            Enter the current quantity for each linen item
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="cagesToCollect"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Cages to Collect</FormLabel>
                      <FormControl>
                        <Input 
                          type="number" 
                          min="0" 
                          placeholder="0" 
                          {...field} 
                          data-testid="input-cages-to-collect"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="pillowcases"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Pillowcases</FormLabel>
                      <FormControl>
                        <Input 
                          type="number" 
                          min="0" 
                          placeholder="0" 
                          {...field} 
                          data-testid="input-pillowcases"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="singleSheets"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Single Sheets</FormLabel>
                      <FormControl>
                        <Input 
                          type="number" 
                          min="0" 
                          placeholder="0" 
                          {...field} 
                          data-testid="input-single-sheets"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="singleDuvets"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Single Duvets</FormLabel>
                      <FormControl>
                        <Input 
                          type="number" 
                          min="0" 
                          placeholder="0" 
                          {...field} 
                          data-testid="input-single-duvets"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="superkingSheets"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Superking Sheets</FormLabel>
                      <FormControl>
                        <Input 
                          type="number" 
                          min="0" 
                          placeholder="0" 
                          {...field} 
                          data-testid="input-superking-sheets"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="superkingDuvets"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Superking Duvets</FormLabel>
                      <FormControl>
                        <Input 
                          type="number" 
                          min="0" 
                          placeholder="0" 
                          {...field} 
                          data-testid="input-superking-duvets"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="bathTowels"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Bath Towels</FormLabel>
                      <FormControl>
                        <Input 
                          type="number" 
                          min="0" 
                          placeholder="0" 
                          {...field} 
                          data-testid="input-bath-towels"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="handTowels"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Hand Towels</FormLabel>
                      <FormControl>
                        <Input 
                          type="number" 
                          min="0" 
                          placeholder="0" 
                          {...field} 
                          data-testid="input-hand-towels"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="bathMats"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Bath Mats</FormLabel>
                      <FormControl>
                        <Input 
                          type="number" 
                          min="0" 
                          placeholder="0" 
                          {...field} 
                          data-testid="input-bath-mats"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="teaTowels"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Tea Towels</FormLabel>
                      <FormControl>
                        <Input 
                          type="number" 
                          min="0" 
                          placeholder="0" 
                          {...field} 
                          data-testid="input-tea-towels"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={form.control}
                name="notes"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Notes (Optional)</FormLabel>
                    <FormControl>
                      <Textarea 
                        placeholder="Add any notes about this stock count..." 
                        {...field} 
                        data-testid="input-notes"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <Button 
                type="submit" 
                className="w-full" 
                disabled={submitCountsMutation.isPending}
                data-testid="button-submit-stock-count"
              >
                <Save className="mr-2 h-4 w-4" />
                {submitCountsMutation.isPending ? "Submitting..." : "Submit Stock Count"}
              </Button>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
}
