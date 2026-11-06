import { useQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { QrCode, Download, Printer, ShoppingCart } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { staggerContainer, staggerItem } from "@/lib/animations";

interface QRCodeData {
  type: string;
  number: number;
  label: string;
  qrCode: string;
  url: string;
}

export default function EquipmentQRCodes() {
  const { toast } = useToast();

  const { data: qrCodes = [], isLoading } = useQuery<QRCodeData[]>({
    queryKey: ["/api/equipment/qr-codes"],
  });

  const trolleys = qrCodes.filter((qr) => qr.type === "trolley");
  const caddies = qrCodes.filter((qr) => qr.type === "caddy");

  const downloadQRCode = (qr: QRCodeData) => {
    const link = document.createElement("a");
    link.href = qr.qrCode;
    link.download = `${qr.type}-${qr.number}-qr-code.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    toast({
      title: "Downloaded",
      description: `QR code for ${qr.label} downloaded`,
    });
  };

  const handlePrint = () => {
    window.print();
  };

  if (isLoading) {
    return (
      <div className="container mx-auto p-6">
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
            <p className="text-muted-foreground">Generating QR codes...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between print:hidden">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2" data-testid="heading-qr-codes">
            <QrCode className="h-8 w-8" />
            Equipment QR Codes
          </h1>
          <p className="text-muted-foreground mt-1" data-testid="text-qr-codes-description">
            Print and attach these QR codes to trolleys and caddies for quick scanning
          </p>
        </div>
        <Button
          onClick={handlePrint}
          size="lg"
          className="gap-2"
          data-testid="button-print-all"
        >
          <Printer className="h-5 w-5" />
          Print All QR Codes
        </Button>
      </div>

      <div className="print:hidden">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ShoppingCart className="h-5 w-5" />
              Overview
            </CardTitle>
            <CardDescription>
              Generated {qrCodes.length} QR codes for equipment tracking
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm">Trolleys:</span>
              <Badge variant="outline" data-testid="badge-trolley-count">
                {trolleys.length} QR codes
              </Badge>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm">Caddies:</span>
              <Badge variant="outline" data-testid="badge-caddy-count">
                {caddies.length} QR codes
              </Badge>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="print:hidden">
        <Separator />
      </div>

      <motion.div
        variants={staggerContainer}
        initial="initial"
        animate="animate"
        className="space-y-8"
      >
        {/* Trolleys Section */}
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <h2 className="text-2xl font-bold" data-testid="heading-trolleys">
              Trolleys
            </h2>
            <Badge variant="secondary" data-testid="badge-trolley-section-count">
              {trolleys.length} items
            </Badge>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4 print:grid-cols-3">
            {trolleys.map((qr) => (
              <motion.div key={qr.label} variants={staggerItem}>
                <Card className="hover-elevate print:break-inside-avoid">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-lg text-center" data-testid={`title-${qr.type}-${qr.number}`}>
                      {qr.label}
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="bg-white p-4 rounded-md flex items-center justify-center">
                      <img
                        src={qr.qrCode}
                        alt={qr.label}
                        className="w-full h-auto"
                        data-testid={`qr-image-${qr.type}-${qr.number}`}
                      />
                    </div>
                    <Button
                      onClick={() => downloadQRCode(qr)}
                      variant="outline"
                      size="sm"
                      className="w-full gap-2 print:hidden"
                      data-testid={`button-download-${qr.type}-${qr.number}`}
                    >
                      <Download className="h-4 w-4" />
                      Download PNG
                    </Button>
                    <p className="text-xs text-center text-muted-foreground break-all print:hidden">
                      {qr.url}
                    </p>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        </div>

        {/* Caddies Section */}
        <div className="space-y-4 print:pt-8">
          <div className="flex items-center gap-2">
            <h2 className="text-2xl font-bold" data-testid="heading-caddies">
              Caddies
            </h2>
            <Badge variant="secondary" data-testid="badge-caddy-section-count">
              {caddies.length} items
            </Badge>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4 print:grid-cols-3">
            {caddies.map((qr) => (
              <motion.div key={qr.label} variants={staggerItem}>
                <Card className="hover-elevate print:break-inside-avoid">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-lg text-center" data-testid={`title-${qr.type}-${qr.number}`}>
                      {qr.label}
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="bg-white p-4 rounded-md flex items-center justify-center">
                      <img
                        src={qr.qrCode}
                        alt={qr.label}
                        className="w-full h-auto"
                        data-testid={`qr-image-${qr.type}-${qr.number}`}
                      />
                    </div>
                    <Button
                      onClick={() => downloadQRCode(qr)}
                      variant="outline"
                      size="sm"
                      className="w-full gap-2 print:hidden"
                      data-testid={`button-download-${qr.type}-${qr.number}`}
                    >
                      <Download className="h-4 w-4" />
                      Download PNG
                    </Button>
                    <p className="text-xs text-center text-muted-foreground break-all print:hidden">
                      {qr.url}
                    </p>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        </div>
      </motion.div>
    </div>
  );
}
