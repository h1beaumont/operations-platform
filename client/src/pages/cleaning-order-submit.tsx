import { useState, useEffect } from "react";
import { useRoute } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { Loader2, CheckCircle, Package, Calendar, Camera } from "lucide-react";
import type { CleaningOrder, CleaningOrderSchedule } from "@shared/schema";
import { PageTransition } from "@/lib/animations";

const CLEANING_ITEMS = [
  { name: "Multi-purpose cleaner", defaultQty: 0 },
  { name: "Bathroom cleaner", defaultQty: 0 },
  { name: "Glass cleaner", defaultQty: 0 },
  { name: "Floor cleaner", defaultQty: 0 },
  { name: "Bleach", defaultQty: 0 },
  { name: "Bin bags (small)", defaultQty: 0 },
  { name: "Bin bags (large)", defaultQty: 0 },
  { name: "Cloths", defaultQty: 0 },
  { name: "Sponges", defaultQty: 0 },
  { name: "Toilet paper", defaultQty: 0 },
  { name: "Hand soap", defaultQty: 0 },
  { name: "Paper towels", defaultQty: 0 },
  { name: "Dishwasher tablets", defaultQty: 0 },
];

export default function CleaningOrderSubmit() {
  const [, params] = useRoute("/cleaning-order/:token");
  const token = params?.token || "";
  const { toast } = useToast();
  
  const [items, setItems] = useState<Record<string, number>>({});
  const [otherItem, setOtherItem] = useState({ name: "", quantity: 0 });
  const [notes, setNotes] = useState("");
  const [submittedBy, setSubmittedBy] = useState("");
  const [isSubmitted, setIsSubmitted] = useState(false);

  useEffect(() => {
    console.log("[CleaningOrder] Page loaded with token:", token);
  }, [token]);

  const { data, isLoading, error } = useQuery<{ order: CleaningOrder; schedule: CleaningOrderSchedule | null }>({
    queryKey: ["/api/cleaning-order", token],
    queryFn: async () => {
      const response = await fetch(`/api/cleaning-order/${token}`);
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
      const itemsArray = Object.entries(items)
        .filter(([_, qty]) => qty > 0)
        .map(([name, quantity]) => ({ name, quantity }));

      if (otherItem.name && otherItem.quantity > 0) {
        itemsArray.push({ name: otherItem.name, quantity: otherItem.quantity });
      }

      if (itemsArray.length === 0) {
        throw new Error("Please select at least one item");
      }

      return apiRequest("POST", `/api/cleaning-order/${token}/submit`, {
        items: itemsArray,
        notes,
        submittedBy: submittedBy || data?.schedule?.recipientName || "Unknown",
      });
    },
    onSuccess: () => {
      setIsSubmitted(true);
      toast({
        title: "Order Submitted!",
        description: "Your cleaning supplies order has been submitted successfully.",
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
                Your cleaning supplies order for {data.order.propertyName} has been received.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <Alert>
                <Camera className="h-4 w-4" />
                <AlertDescription>
                  <strong>Important:</strong> Please take a screenshot of this confirmation for your records.
                </AlertDescription>
              </Alert>
              {data.schedule && (
                <div className="text-sm text-muted-foreground text-center">
                  Your order will be delivered on {data.schedule.deliveryDay}.
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
              <Package className="h-6 w-6" data-testid="icon-package" />
              <CardTitle data-testid="text-order-title">Cleaning Supplies Order</CardTitle>
            </div>
            <CardDescription className="space-y-1">
              <div data-testid="text-property-name">Property: {data.order.propertyName}</div>
              {data.schedule && (
                <div className="flex items-center gap-2" data-testid="text-delivery-day">
                  <Calendar className="h-4 w-4" />
                  <span>Delivery: {data.schedule.deliveryDay}</span>
                </div>
              )}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-4">
              <h3 className="font-semibold text-sm" data-testid="heading-items-section">Select Items and Quantities</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {CLEANING_ITEMS.map((item) => (
                  <div key={item.name} className="flex items-center justify-between gap-4" data-testid={`item-${item.name.replace(/\s+/g, '-').toLowerCase()}`}>
                    <Label htmlFor={item.name} className="text-sm flex-1">
                      {item.name}
                    </Label>
                    <Input
                      id={item.name}
                      type="number"
                      min="0"
                      value={items[item.name] || 0}
                      onChange={(e) => handleQuantityChange(item.name, e.target.value)}
                      className="w-20"
                      data-testid={`input-qty-${item.name.replace(/\s+/g, '-').toLowerCase()}`}
                    />
                  </div>
                ))}
              </div>
            </div>

            <div className="space-y-4 pt-4 border-t">
              <h3 className="font-semibold text-sm" data-testid="heading-other-item">Other Item</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="otherName">Item Name</Label>
                  <Input
                    id="otherName"
                    value={otherItem.name}
                    onChange={(e) => setOtherItem({ ...otherItem, name: e.target.value })}
                    placeholder="Enter item name"
                    data-testid="input-other-name"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="otherQty">Quantity</Label>
                  <Input
                    id="otherQty"
                    type="number"
                    min="0"
                    value={otherItem.quantity || 0}
                    onChange={(e) => setOtherItem({ ...otherItem, quantity: parseInt(e.target.value) || 0 })}
                    data-testid="input-other-qty"
                  />
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="submittedBy">Your Name (Optional)</Label>
              <Input
                id="submittedBy"
                value={submittedBy}
                onChange={(e) => setSubmittedBy(e.target.value)}
                placeholder={data.schedule?.recipientName || "Enter your name"}
                data-testid="input-submitted-by"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="notes">Additional Notes (Optional)</Label>
              <Textarea
                id="notes"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Any special requests or notes..."
                className="min-h-[100px]"
                data-testid="textarea-notes"
              />
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
                "Submit Order"
              )}
            </Button>
          </CardContent>
        </Card>
      </div>
    </PageTransition>
  );
}
