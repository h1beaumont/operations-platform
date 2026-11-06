import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { Building2, FileText, Wrench, LogOut, AlertCircle, File } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";

interface Landlord {
  id: number;
  name: string;
  email: string;
  phone: string | null;
  address: string | null;
  statementDay: number | null;
}

interface AstProperty {
  id: string;
  name: string;
  address: string;
  bedrooms: number | null;
  bathrooms: number | null;
  propertyType: string | null;
  active: boolean;
}

interface MaintenanceRequest {
  id: string;
  propertyId: string | null;
  title: string;
  description: string;
  priority: string;
  status: string;
  reportedDate: string;
  completedAt: string | null;
}

interface MonthlyStatement {
  id: number;
  month: number;
  year: number;
  fileName: string;
  status: string;
  sentDate: string | null;
}

interface ManagementContract {
  id: string;
  propertyName: string;
  contractName: string;
  startDate: string | null;
  endDate: string | null;
  status: string;
}

export default function LandlordPortal() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  // Check authentication
  const { data: landlord, isLoading: landlordLoading, error: landlordError } = useQuery<Landlord>({
    queryKey: ['/api/landlord-auth/me'],
  });

  // Redirect to login if not authenticated
  useEffect(() => {
    if (landlordError) {
      setLocation("/landlord-login");
    }
  }, [landlordError, setLocation]);

  // Fetch landlord data
  const { data: properties = [], isLoading: propertiesLoading } = useQuery<AstProperty[]>({
    queryKey: ['/api/landlord/properties'],
    enabled: !!landlord,
  });

  const { data: maintenance = [], isLoading: maintenanceLoading } = useQuery<MaintenanceRequest[]>({
    queryKey: ['/api/landlord/maintenance'],
    enabled: !!landlord,
  });

  const { data: statements = [], isLoading: statementsLoading } = useQuery<MonthlyStatement[]>({
    queryKey: ['/api/landlord/statements'],
    enabled: !!landlord,
  });

  const { data: contracts = [], isLoading: contractsLoading } = useQuery<ManagementContract[]>({
    queryKey: ['/api/landlord/contracts'],
    enabled: !!landlord,
  });

  async function handleLogout() {
    setIsLoggingOut(true);
    try {
      await apiRequest("POST", "/api/landlord-auth/logout");
      toast({
        title: "Logged out",
        description: "You have been successfully logged out",
      });
      setLocation("/landlord-login");
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Logout failed",
        description: "Failed to logout. Please try again.",
      });
      setIsLoggingOut(false);
    }
  }

  if (landlordLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center space-y-4">
          <Skeleton className="h-12 w-48 mx-auto" />
          <Skeleton className="h-4 w-32 mx-auto" />
        </div>
      </div>
    );
  }

  if (!landlord) {
    return null;
  }

  function getPriorityBadge(priority: string) {
    const variants: Record<string, "default" | "destructive" | "secondary"> = {
      critical: "destructive",
      high: "destructive",
      medium: "default",
      low: "secondary",
    };
    return <Badge variant={variants[priority] || "default"}>{priority}</Badge>;
  }

  function getStatusBadge(status: string) {
    const variants: Record<string, "default" | "destructive" | "secondary"> = {
      pending: "secondary",
      assigned: "default",
      in_progress: "default",
      completed: "default",
      cancelled: "destructive",
    };
    return <Badge variant={variants[status] || "default"}>{status.replace('_', ' ')}</Badge>;
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b bg-card">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Building2 className="h-6 w-6 text-primary" />
              <div>
                <h1 className="text-2xl font-bold" data-testid="text-landlord-name">
                  {landlord.name}
                </h1>
                <p className="text-sm text-muted-foreground">{landlord.email}</p>
              </div>
            </div>
            <Button
              variant="outline"
              onClick={handleLogout}
              disabled={isLoggingOut}
              data-testid="button-logout"
            >
              <LogOut className="h-4 w-4 mr-2" />
              {isLoggingOut ? "Logging out..." : "Logout"}
            </Button>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        <Tabs defaultValue="properties" className="space-y-6">
          <TabsList className="grid w-full grid-cols-4 max-w-2xl">
            <TabsTrigger value="properties" data-testid="tab-properties">
              <Building2 className="h-4 w-4 mr-2" />
              Properties
            </TabsTrigger>
            <TabsTrigger value="maintenance" data-testid="tab-maintenance">
              <Wrench className="h-4 w-4 mr-2" />
              Maintenance
            </TabsTrigger>
            <TabsTrigger value="statements" data-testid="tab-statements">
              <FileText className="h-4 w-4 mr-2" />
              Statements
            </TabsTrigger>
            <TabsTrigger value="contracts" data-testid="tab-contracts">
              <File className="h-4 w-4 mr-2" />
              Contracts
            </TabsTrigger>
          </TabsList>

          <TabsContent value="properties" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Your Properties</CardTitle>
                <CardDescription>
                  Manage and view all your rental properties
                </CardDescription>
              </CardHeader>
              <CardContent>
                {propertiesLoading ? (
                  <div className="space-y-4">
                    {[1, 2, 3].map((i) => (
                      <Skeleton key={i} className="h-24 w-full" />
                    ))}
                  </div>
                ) : properties.length === 0 ? (
                  <Alert>
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>
                      No properties found. Contact support to add properties to your account.
                    </AlertDescription>
                  </Alert>
                ) : (
                  <div className="space-y-4">
                    {properties.map((property) => (
                      <Card key={property.id} data-testid={`card-property-${property.id}`}>
                        <CardHeader>
                          <div className="flex items-start justify-between">
                            <div>
                              <CardTitle className="text-lg">{property.name}</CardTitle>
                              <CardDescription>{property.address}</CardDescription>
                            </div>
                            <Badge variant={property.active ? "default" : "secondary"}>
                              {property.active ? "Active" : "Inactive"}
                            </Badge>
                          </div>
                        </CardHeader>
                        {(property.bedrooms || property.bathrooms || property.propertyType) && (
                          <CardContent>
                            <div className="flex gap-4 text-sm text-muted-foreground">
                              {property.propertyType && <span>{property.propertyType}</span>}
                              {property.bedrooms && <span>{property.bedrooms} bed</span>}
                              {property.bathrooms && <span>{property.bathrooms} bath</span>}
                            </div>
                          </CardContent>
                        )}
                      </Card>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="maintenance" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Maintenance Requests</CardTitle>
                <CardDescription>
                  View and track maintenance requests for your properties
                </CardDescription>
              </CardHeader>
              <CardContent>
                {maintenanceLoading ? (
                  <div className="space-y-4">
                    {[1, 2, 3].map((i) => (
                      <Skeleton key={i} className="h-32 w-full" />
                    ))}
                  </div>
                ) : maintenance.length === 0 ? (
                  <Alert>
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>
                      No maintenance requests found.
                    </AlertDescription>
                  </Alert>
                ) : (
                  <div className="space-y-4">
                    {maintenance.map((request) => (
                      <Card key={request.id} data-testid={`card-maintenance-${request.id}`}>
                        <CardHeader>
                          <div className="flex items-start justify-between gap-2">
                            <div className="flex-1">
                              <CardTitle className="text-lg">{request.title}</CardTitle>
                              <CardDescription className="mt-1">
                                {request.description}
                              </CardDescription>
                            </div>
                            <div className="flex flex-col gap-2">
                              {getPriorityBadge(request.priority)}
                              {getStatusBadge(request.status)}
                            </div>
                          </div>
                        </CardHeader>
                        <CardContent>
                          <div className="text-sm text-muted-foreground space-y-1">
                            <div>Reported: {format(new Date(request.reportedDate), "PPP")}</div>
                            {request.completedAt && (
                              <div>Completed: {format(new Date(request.completedAt), "PPP")}</div>
                            )}
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="statements" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Financial Statements</CardTitle>
                <CardDescription>
                  View your monthly financial statements
                </CardDescription>
              </CardHeader>
              <CardContent>
                {statementsLoading ? (
                  <div className="space-y-4">
                    {[1, 2, 3].map((i) => (
                      <Skeleton key={i} className="h-20 w-full" />
                    ))}
                  </div>
                ) : statements.length === 0 ? (
                  <Alert>
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>
                      No financial statements available yet.
                    </AlertDescription>
                  </Alert>
                ) : (
                  <div className="space-y-4">
                    {statements.map((statement) => (
                      <Card key={statement.id} data-testid={`card-statement-${statement.id}`}>
                        <CardHeader>
                          <div className="flex items-start justify-between">
                            <div>
                              <CardTitle className="text-lg">
                                {new Date(statement.year, statement.month - 1).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
                              </CardTitle>
                              <CardDescription>{statement.fileName}</CardDescription>
                            </div>
                            <Badge variant={statement.status === "sent" ? "default" : "secondary"}>
                              {statement.status}
                            </Badge>
                          </div>
                        </CardHeader>
                        {statement.sentDate && (
                          <CardContent>
                            <p className="text-sm text-muted-foreground">
                              Sent: {format(new Date(statement.sentDate), "PPP")}
                            </p>
                          </CardContent>
                        )}
                      </Card>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="contracts" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Management Contracts</CardTitle>
                <CardDescription>
                  View your property management contracts
                </CardDescription>
              </CardHeader>
              <CardContent>
                {contractsLoading ? (
                  <div className="space-y-4">
                    {[1, 2, 3].map((i) => (
                      <Skeleton key={i} className="h-24 w-full" />
                    ))}
                  </div>
                ) : contracts.length === 0 ? (
                  <Alert>
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>
                      No management contracts found.
                    </AlertDescription>
                  </Alert>
                ) : (
                  <div className="space-y-4">
                    {contracts.map((contract) => (
                      <Card key={contract.id} data-testid={`card-contract-${contract.id}`}>
                        <CardHeader>
                          <div className="flex items-start justify-between">
                            <div>
                              <CardTitle className="text-lg">{contract.contractName}</CardTitle>
                              <CardDescription>{contract.propertyName}</CardDescription>
                            </div>
                            <Badge variant={contract.status === "active" ? "default" : "secondary"}>
                              {contract.status}
                            </Badge>
                          </div>
                        </CardHeader>
                        {(contract.startDate || contract.endDate) && (
                          <CardContent>
                            <div className="text-sm text-muted-foreground space-y-1">
                              {contract.startDate && (
                                <div>Start: {format(new Date(contract.startDate), "PPP")}</div>
                              )}
                              {contract.endDate && (
                                <div>End: {format(new Date(contract.endDate), "PPP")}</div>
                              )}
                            </div>
                          </CardContent>
                        )}
                      </Card>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}
