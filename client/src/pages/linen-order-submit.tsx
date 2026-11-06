import { useState, useEffect } from "react";
import { useRoute } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { Loader2, CheckCircle, Package, Building2, Camera } from "lucide-react";
import type { DwellLinenOrder, LinenOrderSchedule } from "@shared/schema";
import { PageTransition } from "@/lib/animations";

const LINEN_ITEMS = [
  { name: "pillowcases", label: "Pillowcases" },
  { name: "singleSheets", label: "Single Sheets" },
  { name: "singleDuvets", label: "Single Duvets" },
  { name: "superkingSheets", label: "Superking Sheets" },
  { name: "superkingDuvets", label: "Superking Duvets" },
  { name: "bathTowels", label: "Bath Towels" },
  { name: "handTowels", label: "Hand Towels" },
  { name: "bathMats", label: "Bath Mats" },
  { name: "teaTowels", label: "Tea Towels" },
];

export default function LinenOrderSubmit() {
  const [, params] = useRoute("/linen-order/:token");
  const token = params?.token || "";
  const { toast } = useToast();
  
  const [building, setBuilding] = useState<"dwell" | "heritage">("dwell");
  const [cagesToCollect, setCagesToCollect] = useState("0");
  const [items, setItems] = useState<Record<string, number>>({
    pillowcases: 0,
    singleSheets: 0,
    singleDuvets: 0,
    superkingSheets: 0,
    superkingDuvets: 0,
    bathTowels: 0,
    handTowels: 0,
    bathMats: 0,
    teaTowels: 0,
  });
  const [submittedBy, setSubmittedBy] = useState("");
  const [isSubmitted, setIsSubmitted] = useState(false);

  useEffect(() => {
    console.log("[LinenOrder] Page loaded with token:", token);
  }, [token]);

  const { data, isLoading, error } = useQuery<{ order: DwellLinenOrder; schedule: LinenOrderSchedule | null }>({
    queryKey: ["/api/linen-order", token],
    queryFn: async () => {
      const response = await fetch(`/api/linen-order/${token}`);
      if (!response.ok) {
        throw new Error("Order not found or link expired");
      }
      return response.json();
    },
    enabled: !!token,
    retry: false,
  });

  const submitMutation = useMutation({
    mutationFn: async () => {
      const cages = parseInt(cagesToCollect) || 0;
      if (cages === 0) {
        throw new Error("Please specify the number of cages to collect");
      }

      return apiRequest("POST", `/api/linen-order/${token}/submit`, {
        building,
        cagesToCollect: cages,
        ...items,
        submittedBy: submittedBy || data?.schedule?.recipientName || "Unknown",
      });
    },
    onSuccess: () => {
      setIsSubmitted(true);
      toast({
        title: "Order Submitted!",
        description: "Your linen order has been submitted successfully.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to submit order",
        variant: "destructive",
      });
    },
  });

  const handleQuantityChange = (itemName: string, value: string) => {
    const qty = parseInt(value) || 0;
    setItems(prev => ({ ...prev, [itemName]: qty }));
  };

  if (isLoading) {
    return (
      <PageTransition>
        <div className="flex items-center justify-center min-h-screen p-4">
          <Card className="w-full max-w-md">
            <CardContent className="flex flex-col items-center justify-center p-8 space-y-4">
              <Loader2 className="h-12 w-12 animate-spin text-primary" data-testid="loader-order" />
              <p className="text-muted-foreground">Loading order...</p>
            </CardContent>
          </Card>
        </div>
      </PageTransition>
    );
  }

  if (error || !data) {
    return (
      <PageTransition>
        <div className="flex items-center justify-center min-h-screen p-4">
          <Card className="w-full max-w-md">
            <CardContent className="p-8">
              <Alert variant="destructive">
                <AlertDescription data-testid="text-error">
                  This order link is invalid or has expired. Please contact support if you believe this is an error.
                </AlertDescription>
              </Alert>
            </CardContent>
          </Card>
        </div>
      </PageTransition>
    );
  }

  if (data.order.submittedAt || isSubmitted) {
    return (
      <PageTransition>
        <div className="flex items-center justify-center min-h-screen p-4">
          <Card className="w-full max-w-md">
            <CardHeader className="text-center">
              <div className="flex justify-center mb-4">
                <CheckCircle className="h-16 w-16 text-green-500" data-testid="icon-success" />
              </div>
              <CardTitle className="text-2xl" data-testid="text-success-title">
                Order Submitted!
              </CardTitle>
              <CardDescription data-testid="text-success-message">
                Your linen order for {data.order.building === "dwell" ? "Building A" : "Building B"} has been received.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <Alert>
                <Camera className="h-4 w-4" />
                <AlertDescription>
                  <strong>Important:</strong> Please take a screenshot of this confirmation for your records.
                </AlertDescription>
              </Alert>
              {data.order.submittedBy && (
                <div className="text-sm text-muted-foreground text-center">
                  Submitted by: {data.order.submittedBy}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </PageTransition>
    );
  }

  return (
    <PageTransition>
      <div className="flex items-center justify-center min-h-screen p-4 bg-background">
        <Card className="w-full max-w-2xl">
          <CardHeader>
            <div className="flex items-center gap-2 mb-2">
              <Package className="h-6 w-6" />
              <CardTitle data-testid="text-order-title">Linen Order Form</CardTitle>
            </div>
            <CardDescription className="space-y-1">
              <div className="flex items-center gap-2">
                <Building2 className="h-4 w-4" />
                <span>Submit your weekly linen order</span>
              </div>
              {data.schedule && (
                <div className="text-sm">
                  Schedule: {data.schedule.scheduleDay} at {data.schedule.scheduleTime}
                </div>
              )}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="building">Building *</Label>
                <Select value={building} onValueChange={(value) => setBuilding(value as "dwell" | "heritage")}>
                  <SelectTrigger id="building" data-testid="select-building">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="dwell">Building A</SelectItem>
                    <SelectItem value="heritage">Building B</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="cagesToCollect">Cages to Collect *</Label>
                <Input
                  id="cagesToCollect"
                  type="number"
                  min="0"
                  value={cagesToCollect}
                  onChange={(e) => setCagesToCollect(e.target.value)}
                  placeholder="Number of cages"
                  data-testid="input-cages"
                />
              </div>

              <div className="space-y-4 pt-4 border-t">
                <h3 className="font-semibold text-sm">Linen Items</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {LINEN_ITEMS.map((item) => (
                    <div key={item.name} className="flex items-center justify-between gap-4" data-testid={`item-${item.name}`}>
                      <Label htmlFor={item.name} className="text-sm flex-1">
                        {item.label}
                      </Label>
                      <Input
                        id={item.name}
                        type="number"
                        min="0"
                        value={items[item.name] || 0}
                        onChange={(e) => handleQuantityChange(item.name, e.target.value)}
                        className="w-20"
                        data-testid={`input-${item.name}`}
                      />
                    </div>
                  ))}
                </div>
              </div>

              <div className="space-y-2 pt-4 border-t">
                <Label htmlFor="submittedBy">Your Name (Optional)</Label>
                <Input
                  id="submittedBy"
                  value={submittedBy}
                  onChange={(e) => setSubmittedBy(e.target.value)}
                  placeholder={data.schedule?.recipientName || "Enter your name"}
                  data-testid="input-submitted-by"
                />
              </div>
            </div>

            <Button
              className="w-full"
              size="lg"
              onClick={() => submitMutation.mutate()}
              disabled={submitMutation.isPending}
              data-testid="button-submit-order"
            >
              {submitMutation.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Submitting...
                </>
              ) : (
                "Submit Linen Order"
              )}
            </Button>
          </CardContent>
        </Card>
      </div>
    </PageTransition>
  );
}
