import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Download, QrCode, Link as LinkIcon, Copy, Check } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Skeleton } from "@/components/ui/skeleton";
import { useState } from "react";

export default function CleaningAssistantQR() {
  const { toast } = useToast();
  const [copied, setCopied] = useState(false);

  // Fetch QR code
  const { data, isLoading } = useQuery({
    queryKey: ["/api/cleaning-assistant/qr-code"],
  });

  const handleDownloadQR = () => {
    if (!data?.qrCode) return;

    // Create a download link
    const link = document.createElement('a');
    link.href = data.qrCode;
    link.download = 'cleaning-assistant-qr-code.png';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    toast({
      title: "QR Code Downloaded",
      description: "The QR code has been downloaded successfully",
    });
  };

  const handleCopyLink = async () => {
    if (!data?.url) return;

    try {
      await navigator.clipboard.writeText(data.url);
      setCopied(true);
      toast({
        title: "Link Copied",
        description: "The chatbot link has been copied to your clipboard",
      });
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      toast({
        title: "Copy Failed",
        description: "Failed to copy link to clipboard",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-6">
      <div>
        <h1 className="text-3xl font-bold mb-2">Cleaning Staff Assistant QR Code</h1>
        <p className="text-muted-foreground">
          Share this QR code with your cleaning staff for easy access to the AI assistant
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <QrCode className="w-5 h-5" />
            QR Code & Link
          </CardTitle>
          <CardDescription>
            Print this QR code and place it in the linen packing area or display it on the TV screen
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {isLoading ? (
            <div className="flex flex-col items-center gap-4">
              <Skeleton className="w-80 h-80" />
              <Skeleton className="w-64 h-10" />
            </div>
          ) : data ? (
            <>
              {/* QR Code Display */}
              <div className="flex flex-col items-center gap-4">
                <div className="p-6 bg-white rounded-lg border-2 border-border">
                  <img 
                    src={data.qrCode} 
                    alt="Cleaning Assistant QR Code" 
                    className="w-80 h-80"
                    data-testid="img-qr-code"
                  />
                </div>
                <p className="text-sm text-muted-foreground text-center max-w-md">
                  Scan this QR code with your phone camera to access the Cleaning Staff Assistant
                </p>
              </div>

              {/* URL Display */}
              <div className="space-y-2">
                <label className="text-sm font-medium">Direct Link:</label>
                <div className="flex gap-2">
                  <div className="flex-1 px-4 py-2 bg-muted rounded-md font-mono text-sm break-all">
                    {data.url}
                  </div>
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={handleCopyLink}
                    data-testid="button-copy-link"
                  >
                    {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                  </Button>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex gap-3">
                <Button
                  onClick={handleDownloadQR}
                  className="flex-1"
                  data-testid="button-download-qr"
                >
                  <Download className="w-4 h-4 mr-2" />
                  Download QR Code
                </Button>
                <Button
                  variant="outline"
                  onClick={() => window.open(data.url, '_blank')}
                  className="flex-1"
                  data-testid="button-open-link"
                >
                  <LinkIcon className="w-4 h-4 mr-2" />
                  Open Chatbot
                </Button>
              </div>

              {/* Usage Instructions */}
              <div className="mt-6 p-4 bg-muted rounded-lg space-y-2">
                <h3 className="font-semibold text-sm">Usage Instructions:</h3>
                <ul className="text-sm space-y-1 text-muted-foreground list-disc list-inside">
                  <li>Download the QR code and print it</li>
                  <li>Place it in the linen packing area for easy cleaner access</li>
                  <li>Display it on the TV screen alongside the leaderboard</li>
                  <li>Share the direct link via SMS or messaging apps</li>
                  <li>No login required - cleaners can start chatting immediately</li>
                </ul>
              </div>
            </>
          ) : (
            <div className="text-center py-12 text-muted-foreground">
              <p>Failed to load QR code. Please try refreshing the page.</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Features Card */}
      <Card>
        <CardHeader>
          <CardTitle>Chatbot Features</CardTitle>
          <CardDescription>
            What cleaners can ask the AI assistant
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <h4 className="font-semibold text-sm">Linen & Packing</h4>
              <ul className="text-sm text-muted-foreground space-y-1">
                <li>• Linen packing instructions</li>
                <li>• Bed sizes and requirements</li>
                <li>• Special guest requests</li>
              </ul>
            </div>
            <div className="space-y-2">
              <h4 className="font-semibold text-sm">Cleaning Guidance</h4>
              <ul className="text-sm text-muted-foreground space-y-1">
                <li>• Cleaning checklists</li>
                <li>• Product recommendations</li>
                <li>• Stain removal tips</li>
              </ul>
            </div>
            <div className="space-y-2">
              <h4 className="font-semibold text-sm">Property Info</h4>
              <ul className="text-sm text-muted-foreground space-y-1">
                <li>• Access codes & instructions</li>
                <li>• Property details</li>
                <li>• Special requirements</li>
              </ul>
            </div>
            <div className="space-y-2">
              <h4 className="font-semibold text-sm">Best Practices</h4>
              <ul className="text-sm text-muted-foreground space-y-1">
                <li>• Time management tips</li>
                <li>• Quality standards</li>
                <li>• Efficiency guidance</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
