import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Wrench, ExternalLink } from "lucide-react";
import { Link } from "wouter";
import { format } from "date-fns";
import { motion } from "framer-motion";
import { staggerContainer, staggerItem } from "@/lib/animations";
import { InstructionPanel } from "@/components/instruction-panel";
import { astMaintenanceInstructions } from "@/lib/page-instructions";
import { useState } from "react";

type MaintenanceRequest = {
  id: string;
  propertyId: string;
  title: string;
  description: string;
  priority: string;
  status: string;
  serviceType?: string;
  assignedWorkerId?: string;
  createdAt: string;
};

type AstProperty = {
  id: string;
  name: string;
  address: string;
};

export default function ASTMaintenancePage() {
  const [serviceTypeFilter, setServiceTypeFilter] = useState<string>("all");

  const { data: astProperties = [] } = useQuery<AstProperty[]>({
    queryKey: ["/api/ast/properties"],
  });

  const { data: maintenanceRequests = [], isLoading } = useQuery<MaintenanceRequest[]>({
    queryKey: ["/api/maintenance/requests"],
  });

  // Filter maintenance requests for AST properties only
  const astPropertyIds = astProperties.map((p) => p.id);
  let astMaintenance = maintenanceRequests.filter((r) => astPropertyIds.includes(r.propertyId));

  // Apply service type filter
  if (serviceTypeFilter !== "all") {
    astMaintenance = astMaintenance.filter((r) => r.serviceType === serviceTypeFilter);
  }

  const pendingRequests = astMaintenance.filter((r) => r.status === "pending");
  const inProgressRequests = astMaintenance.filter((r) => r.status === "in_progress");
  const completedRequests = astMaintenance.filter((r) => r.status === "completed");

  return (
    <div className="h-full overflow-auto p-6">
      <motion.div
        variants={staggerContainer}
        initial="initial"
        animate="animate"
        className="max-w-7xl mx-auto space-y-6"
      >
        <motion.div variants={staggerItem}>
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold">AST Maintenance</h1>
              <p className="text-muted-foreground">
                Maintenance requests for long-term rental properties
              </p>
            </div>
            <div className="flex gap-2">
              <InstructionPanel {...astMaintenanceInstructions} />
              <Link href="/maintenance">
                <Button variant="outline" data-testid="button-view-all-maintenance">
                  <ExternalLink className="h-4 w-4 mr-2" />
                  View All Maintenance
                </Button>
              </Link>
            </div>
          </div>
          
          <div className="mt-4 flex gap-2">
            <Select value={serviceTypeFilter} onValueChange={setServiceTypeFilter}>
              <SelectTrigger className="w-[200px]" data-testid="select-service-type">
                <SelectValue placeholder="Filter by service type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Service Types</SelectItem>
                <SelectItem value="general">General</SelectItem>
                <SelectItem value="waste_disposal">Waste Disposal</SelectItem>
                <SelectItem value="electrician">Electrician</SelectItem>
                <SelectItem value="plumber">Plumber</SelectItem>
                <SelectItem value="locksmith">Locksmith</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </motion.div>

        <motion.div variants={staggerItem} className="grid gap-4 md:grid-cols-3">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Pending</CardTitle>
              <Wrench className="h-4 w-4 text-yellow-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{pendingRequests.length}</div>
              <p className="text-xs text-muted-foreground">awaiting assignment</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">In Progress</CardTitle>
              <Wrench className="h-4 w-4 text-blue-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{inProgressRequests.length}</div>
              <p className="text-xs text-muted-foreground">being worked on</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Completed</CardTitle>
              <Wrench className="h-4 w-4 text-green-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{completedRequests.length}</div>
              <p className="text-xs text-muted-foreground">this month</p>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div variants={staggerItem}>
          <Card>
            <CardHeader>
              <CardTitle>Recent Maintenance Requests</CardTitle>
              <CardDescription>AST property maintenance only</CardDescription>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <p>Loading maintenance requests...</p>
              ) : astMaintenance.length === 0 ? (
                <div className="text-center p-12 text-muted-foreground">
                  <Wrench className="h-12 w-12 mx-auto mb-4" />
                  <p>No maintenance requests for AST properties</p>
                  <Link href="/maintenance">
                    <Button variant="outline" className="mt-4">
                      Create New Request
                    </Button>
                  </Link>
                </div>
              ) : (
                <div className="space-y-3">
                  {astMaintenance.slice(0, 10).map((request) => {
                    const property = astProperties.find((p) => p.id === request.propertyId);
                    
                    const serviceTypeLabel = request.serviceType 
                      ? request.serviceType.split('_').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ')
                      : 'General';
                    
                    return (
                      <Link key={request.id} href="/maintenance">
                        <div
                          className="flex items-center justify-between p-4 border rounded-lg hover-elevate cursor-pointer"
                          data-testid={`maintenance-${request.id}`}
                        >
                          <div className="flex-1">
                            <div className="font-semibold">{request.title}</div>
                            <div className="text-sm text-muted-foreground">
                              {property?.name || "Unknown Property"} • {request.description.substring(0, 60)}...
                            </div>
                            <div className="text-xs text-muted-foreground mt-1">
                              {format(new Date(request.createdAt), "dd MMM yyyy")}
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <Badge variant="secondary">{serviceTypeLabel}</Badge>
                            <Badge
                              variant={
                                request.priority === "critical"
                                  ? "destructive"
                                  : request.priority === "high"
                                  ? "default"
                                  : "outline"
                              }
                            >
                              {request.priority}
                            </Badge>
                            <Badge variant="outline">{request.status}</Badge>
                          </div>
                        </div>
                      </Link>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </motion.div>

        <motion.div variants={staggerItem}>
          <Card className="bg-primary/5 border-primary/20">
            <CardContent className="p-6">
              <div className="flex items-start gap-4">
                <ExternalLink className="h-5 w-5 text-primary mt-0.5" />
                <div>
                  <h3 className="font-semibold mb-2">Need to create or assign maintenance?</h3>
                  <p className="text-sm text-muted-foreground mb-4">
                    Visit the main Maintenance Dashboard to create new requests, assign workers, and manage all maintenance across both AST and short-stay properties.
                  </p>
                  <Link href="/maintenance">
                    <Button data-testid="button-go-to-maintenance">
                      Go to Maintenance Dashboard
                      <ExternalLink className="h-4 w-4 ml-2" />
                    </Button>
                  </Link>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </motion.div>
    </div>
  );
}
