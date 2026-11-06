import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { useToast } from "@/hooks/use-toast";
import { Search, Package, AlertCircle, CheckCircle2, Loader2, AlertTriangle, DollarSign } from "lucide-react";
import { queryClient, apiRequest } from "@/lib/queryClient";
import type { LinenPackingItem, SpecialRequest, CleaningCost } from "@shared/schema";
import { motion, AnimatePresence } from "framer-motion";

export default function LinenPackingPage() {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedProperty, setSelectedProperty] = useState<string | null>(null);
  const [sessionLogged, setSessionLogged] = useState(false);
  const [isUnregistered, setIsUnregistered] = useState(false);
  const { toast } = useToast();

  // Fetch all properties
  const { data: properties = [] } = useQuery<string[]>({
    queryKey: ['/api/linen-packing/properties'],
  });

  // Fetch packing list for selected property
  const { data: packingList = [], isLoading: loadingPackingList } = useQuery<LinenPackingItem[]>({
    queryKey: ['/api/linen-packing', selectedProperty],
    enabled: !!selectedProperty,
    queryFn: async () => {
      const res = await fetch(`/api/linen-packing/${encodeURIComponent(selectedProperty!)}`);
      if (!res.ok) throw new Error('Failed to fetch packing list');
      return res.json();
    },
  });

  // Fetch active special requests
  const { data: specialRequests = [], isLoading: loadingSpecialRequests } = useQuery<SpecialRequest[]>({
    queryKey: ['/api/special-requests/active', selectedProperty],
    enabled: !!selectedProperty,
    queryFn: async () => {
      const res = await fetch(`/api/special-requests/active/${encodeURIComponent(selectedProperty!)}`);
      if (!res.ok) throw new Error('Failed to fetch special requests');
      return res.json();
    },
  });

  // Fetch cleaning cost data
  const { data: cleaningCost, isLoading: loadingCost } = useQuery<CleaningCost | null>({
    queryKey: ['/api/cleaning-costs', selectedProperty],
    enabled: !!selectedProperty,
    queryFn: async () => {
      const res = await fetch(`/api/cleaning-costs/${encodeURIComponent(selectedProperty!)}`);
      if (!res.ok) {
        if (res.status === 404) return null; // No cost data for this property
        throw new Error('Failed to fetch cleaning cost');
      }
      return res.json();
    },
  });

  // Mark special request as completed
  const completeMutation = useMutation({
    mutationFn: async (requestId: string) => {
      return await apiRequest(`/api/special-requests/${requestId}/complete`, 'POST');
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/special-requests/active', selectedProperty] });
      toast({
        title: "Request Completed",
        description: "Special request marked as completed",
      });
    },
  });

  // Log linen packing session for compliance automation
  const logSessionMutation = useMutation({
    mutationFn: async ({ propertyAddress, specialRequestsCount }: { propertyAddress: string; specialRequestsCount: number }) => {
      return await apiRequest('/api/linen-packing/log-session', 'POST', { 
        propertyAddress, 
        specialRequestsCount 
      });
    },
    onSuccess: () => {
      console.log('[LINEN-SESSION] Session logged successfully');
      setSessionLogged(true);
    },
    onError: (error: any) => {
      console.error('[LINEN-SESSION] Failed to log session:', error);
      setSessionLogged(false);
      
      // Check if this is a staff-not-found error (404)
      if (error?.message?.includes("Staff member not found") || error?.message?.includes("404")) {
        setIsUnregistered(true);
        toast({
          title: "Account Not Found",
          description: "Your email is not registered. Please contact support to complete setup.",
          variant: "destructive",
        });
      } else {
        toast({
          title: "Failed to Log Session",
          description: "Could not log your packing session. Will retry automatically.",
          variant: "destructive",
        });
      }
    },
  });

  // Log session when property is selected and special requests are loaded
  useEffect(() => {
    if (selectedProperty && !loadingSpecialRequests && !sessionLogged && !isUnregistered && !logSessionMutation.isPending) {
      logSessionMutation.mutate({
        propertyAddress: selectedProperty,
        specialRequestsCount: specialRequests.length,
      });
    }
  }, [selectedProperty, loadingSpecialRequests, specialRequests, sessionLogged, isUnregistered, logSessionMutation.isPending]);

  // Filter properties based on search
  const filteredProperties = properties.filter(prop =>
    prop.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handlePropertySelect = (property: string) => {
    setSelectedProperty(property);
    setSearchQuery("");
    setSessionLogged(false);
    setIsUnregistered(false);
  };

  const handleReset = () => {
    setSelectedProperty(null);
    setSearchQuery("");
    setSessionLogged(false);
    setIsUnregistered(false);
  };

  return (
    <div className="container mx-auto p-6 max-w-4xl">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Linen Packing Assistant</h1>
        <p className="text-muted-foreground">
          Search for your property to get the complete packing list
        </p>
      </div>

      <AnimatePresence mode="wait">
        {!selectedProperty ? (
          <motion.div
            key="search"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.2 }}
          >
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Search className="w-5 h-5" />
                  Search Property
                </CardTitle>
                <CardDescription>
                  Enter the property name or address you're cleaning today
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <Input
                    placeholder="Type property name or address..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="text-lg"
                    data-testid="input-property-search"
                    autoFocus
                  />

                  {searchQuery && (
                    <div className="space-y-2">
                      <p className="text-sm text-muted-foreground">
                        {filteredProperties.length} properties found
                      </p>
                      <div className="max-h-96 overflow-y-auto space-y-2">
                        {filteredProperties.map((property) => (
                          <Button
                            key={property}
                            variant="outline"
                            className="w-full justify-start text-left h-auto py-3 px-4 hover-elevate"
                            onClick={() => handlePropertySelect(property)}
                            data-testid={`button-select-${property}`}
                          >
                            <Package className="w-4 h-4 mr-2 flex-shrink-0" />
                            <span className="break-words">{property}</span>
                          </Button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </motion.div>
        ) : (
          <motion.div
            key="packing-list"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.2 }}
            className="space-y-6"
          >
            {/* Header with property name */}
            <Card>
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <CardTitle className="text-xl mb-1">{selectedProperty}</CardTitle>
                    <CardDescription>Complete packing list for this property</CardDescription>
                  </div>
                  <Button variant="outline" size="sm" onClick={handleReset} data-testid="button-change-property">
                    Change Property
                  </Button>
                </div>
              </CardHeader>
            </Card>

            {/* Unregistered Alert Banner */}
            {isUnregistered && (
              <Alert variant="destructive" data-testid="alert-unregistered">
                <AlertTriangle className="h-4 w-4" />
                <AlertTitle>Account Not Registered</AlertTitle>
                <AlertDescription>
                  Your email is not registered in the staff database. Your packing sessions are not being tracked. Please contact support to complete setup.
                </AlertDescription>
              </Alert>
            )}

            {/* Labour Cost Information */}
            {loadingCost ? (
              <Card>
                <CardContent className="flex items-center justify-center py-8">
                  <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
                </CardContent>
              </Card>
            ) : cleaningCost ? (
              <Card className="border-green-500 border-2">
                <CardHeader className="bg-green-50 dark:bg-green-950/20">
                  <CardTitle className="text-lg flex items-center gap-2 text-green-700 dark:text-green-400">
                    <DollarSign className="w-5 h-5" />
                    Your Labour Cost
                  </CardTitle>
                  <CardDescription>
                    Your pay for cleaning this property
                  </CardDescription>
                </CardHeader>
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between">
                    <span className="text-2xl font-bold text-green-600 dark:text-green-400">
                      £{cleaningCost.labourCost}
                    </span>
                    <Badge variant="outline" className="text-xs">
                      Labour Cost
                    </Badge>
                  </div>
                  {/* Cost Breakdown Details */}
                  <div className="mt-4 pt-4 border-t space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Total Cleaning Fee:</span>
                      <span className="font-medium">£{cleaningCost.cleaningFee}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Linen Cost:</span>
                      <span className="font-medium">£{cleaningCost.linenCost}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Supplies Cost:</span>
                      <span className="font-medium">£{cleaningCost.disposableCost}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Cleaning Products:</span>
                      <span className="font-medium">£{cleaningCost.cleaningProductCost}</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ) : null}

            {/* Special Requests Section */}
            {loadingSpecialRequests ? (
              <Card>
                <CardContent className="flex items-center justify-center py-8">
                  <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
                </CardContent>
              </Card>
            ) : specialRequests.length > 0 ? (
              <Card className="border-orange-500 border-2">
                <CardHeader className="bg-orange-50 dark:bg-orange-950/20">
                  <CardTitle className="text-lg flex items-center gap-2 text-orange-700 dark:text-orange-400">
                    <AlertCircle className="w-5 h-5" />
                    Special Requests
                  </CardTitle>
                  <CardDescription>
                    Additional items needed for this property
                  </CardDescription>
                </CardHeader>
                <CardContent className="pt-6">
                  <div className="space-y-4">
                    {specialRequests.map((request) => (
                      <div
                        key={request.id}
                        className="flex items-start justify-between gap-4 p-4 rounded-lg border bg-card"
                        data-testid={`special-request-${request.id}`}
                      >
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <h4 className="font-semibold">{request.itemRequested}</h4>
                            <Badge variant="secondary">×{request.quantity}</Badge>
                          </div>
                          {request.notes && (
                            <p className="text-sm text-muted-foreground">{request.notes}</p>
                          )}
                          <p className="text-xs text-muted-foreground mt-1">
                            Needed by: {new Date(request.dateRequired).toLocaleDateString()}
                          </p>
                        </div>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => completeMutation.mutate(request.id)}
                          disabled={completeMutation.isPending}
                          data-testid={`button-complete-${request.id}`}
                        >
                          <CheckCircle2 className="w-4 h-4 mr-1" />
                          Packed
                        </Button>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            ) : null}

            {/* Standard Packing List */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Package className="w-5 h-5" />
                  Standard Packing List
                </CardTitle>
                <CardDescription>
                  Standard items required for every clean
                </CardDescription>
              </CardHeader>
              <CardContent>
                {loadingPackingList ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
                  </div>
                ) : packingList.length > 0 ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {packingList.map((item, index) => (
                      <div
                        key={index}
                        className="flex items-center justify-between p-3 rounded-lg border bg-card hover-elevate"
                        data-testid={`packing-item-${index}`}
                      >
                        <span className="font-medium">{item.itemType}</span>
                        <Badge variant="outline">×{item.quantity}</Badge>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-center py-8 text-muted-foreground">
                    No packing items found for this property
                  </p>
                )}
              </CardContent>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
