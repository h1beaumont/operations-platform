import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { ShoppingCart, LogIn, LogOut, QrCode, AlertCircle, Info } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import { format } from "date-fns";
import { InstructionPanel } from "@/components/instruction-panel";
import { equipmentTrackingInstructions } from "@/lib/page-instructions";
import { staggerContainer, staggerItem } from "@/lib/animations";
import type { EquipmentMovement } from "@shared/schema";

interface EquipmentStatus {
  equipmentNumber: number;
  isOut: boolean;
  staffName?: string;
  signedOutAt?: string;
}

export default function EquipmentTracking() {
  const [activeTab, setActiveTab] = useState<"trolleys" | "caddies">("trolleys");

  const equipmentType = activeTab === "trolleys" ? "trolley" : "caddy";
  const maxEquipment = activeTab === "trolleys" ? 10 : 20;

  // Fetch current status
  const { data: equipmentStatus = [], isLoading: loadingStatus } = useQuery<EquipmentStatus[]>({
    queryKey: [`/api/equipment-movements/status/${equipmentType}`],
  });

  // Fetch recent movements
  const { data: movements = [], isLoading: loadingMovements } = useQuery<EquipmentMovement[]>({
    queryKey: [`/api/equipment-movements?equipmentType=${equipmentType}`],
  });

  const getStatusBadge = (status: EquipmentStatus) => {
    if (status.isOut) {
      return (
        <Badge variant="destructive" data-testid={`badge-status-out-${status.equipmentNumber}`}>
          Out - {status.staffName}
        </Badge>
      );
    }
    return (
      <Badge variant="default" className="bg-green-500/10 text-green-500 border-green-500/20" data-testid={`badge-status-in-${status.equipmentNumber}`}>
        Available
      </Badge>
    );
  };

  const getActionIcon = (actionType: string) => {
    return actionType === "sign_out" ? <LogOut className="h-4 w-4" /> : <LogIn className="h-4 w-4" />;
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-end mb-4">
        <Link href="/equipment/qr-codes">
          <Button className="gap-2" data-testid="button-qr-codes">
            <QrCode className="h-5 w-5" />
            Download QR Codes
          </Button>
        </Link>
      </div>
      
      <Tabs value={activeTab} onValueChange={(val) => setActiveTab(val as "trolleys" | "caddies")}>
        <TabsList className="grid w-full max-w-md grid-cols-2">
          <TabsTrigger value="trolleys" data-testid="tab-trolleys">
            Trolleys
          </TabsTrigger>
          <TabsTrigger value="caddies" data-testid="tab-caddies">
            Caddies
          </TabsTrigger>
        </TabsList>

        <TabsContent value={activeTab} className="space-y-6">
          {/* Current Status Section */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                Current Status
              </CardTitle>
              <CardDescription>
                Real-time availability of all {equipmentType}s
              </CardDescription>
            </CardHeader>
            <CardContent>
              {loadingStatus ? (
                <div className="flex justify-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                </div>
              ) : (
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
                  {Array.from({ length: maxEquipment }, (_, i) => i + 1).map((num) => {
                    const status = equipmentStatus.find((s) => s.equipmentNumber === num) || {
                      equipmentNumber: num,
                      isOut: false,
                    };
                    
                    return (
                      <Card key={num} className="hover-elevate" data-testid={`card-status-${num}`}>
                        <CardHeader className="pb-2">
                          <CardTitle className="text-sm">
                            {equipmentType.charAt(0).toUpperCase() + equipmentType.slice(1)} #{num}
                          </CardTitle>
                        </CardHeader>
                        <CardContent>
                          {getStatusBadge(status)}
                          {status.signedOutAt && (
                            <p className="text-xs text-muted-foreground mt-2">
                              Since {format(new Date(status.signedOutAt), "PPp")}
                            </p>
                          )}
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Recent Movements Section */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                Recent Movements
              </CardTitle>
              <CardDescription>
                Latest sign-outs and sign-ins
              </CardDescription>
            </CardHeader>
            <CardContent>
              {loadingMovements ? (
                <div className="flex justify-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                </div>
              ) : movements.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <AlertCircle className="h-12 w-12 mx-auto mb-2 opacity-50" />
                  <p>No movements recorded yet</p>
                </div>
              ) : (
                <motion.div
                  variants={staggerContainer}
                  initial="initial"
                  animate="animate"
                  className="space-y-3"
                >
                  {movements.slice(0, 20).map((movement) => (
                    <motion.div
                      key={movement.id}
                      variants={staggerItem}
                      data-testid={`movement-${movement.id}`}
                    >
                      <Card className="hover-elevate">
                        <CardContent className="flex items-center justify-between p-4">
                          <div className="flex items-center gap-3">
                            <div className="flex items-center justify-center w-10 h-10 rounded-full bg-primary/10">
                              {getActionIcon(movement.action)}
                            </div>
                            <div>
                              <p className="font-medium" data-testid={`text-movement-equipment-${movement.id}`}>
                                {equipmentType.charAt(0).toUpperCase() + equipmentType.slice(1)} #{movement.equipmentNumber}
                              </p>
                              <p className="text-sm text-muted-foreground" data-testid={`text-movement-staff-${movement.id}`}>
                                {movement.staffName}
                              </p>
                            </div>
                          </div>
                          <div className="text-right">
                            <Badge variant={movement.action === "sign_out" ? "destructive" : "default"} data-testid={`badge-action-${movement.id}`}>
                              {movement.action === "sign_out" ? "Signed Out" : "Signed In"}
                            </Badge>
                            <p className="text-xs text-muted-foreground mt-1" data-testid={`text-timestamp-${movement.id}`}>
                              {format(new Date(movement.timestamp), "PPp")}
                            </p>
                          </div>
                        </CardContent>
                      </Card>
                    </motion.div>
                  ))}
                </motion.div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
