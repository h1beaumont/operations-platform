import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { AlertCircle, Building2 } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useLocation, Link } from "wouter";
import { useEffect, useState } from "react";
import logoUrl from "@assets/Northstay logo black-01 (8)_1761129570743.png";
import { DualClocks } from "@/components/dual-clocks";

export default function Landing() {
  const [location] = useLocation();
  const [showError, setShowError] = useState(false);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('error') === 'domain_not_allowed') {
      setShowError(true);
      setTimeout(() => setShowError(false), 8000);
    }
  }, [location]);

  const handleSignIn = () => {
    window.location.href = "/api/login";
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-6 bg-background">
      <div className="w-full max-w-md space-y-6">
        {showError && (
          <Alert variant="destructive" data-testid="alert-domain-error">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              Access denied. Only users with @example.com or @northstaystays.co.uk email addresses can access this system.
            </AlertDescription>
          </Alert>
        )}

        <div className="text-center space-y-6">
          <div className="flex items-center justify-center">
            <img 
              src={logoUrl} 
              alt="Northstay" 
              className="h-72 w-auto"
              data-testid="img-logo"
            />
          </div>
          
          {/* Dual Clocks below logo */}
          <div className="flex justify-center">
            <DualClocks />
          </div>
          
          <p className="text-3xl font-bold text-muted-foreground" data-testid="text-subtitle">
            Operations Hub
          </p>
        </div>

        <Card>
          <CardHeader className="text-center space-y-2">
            <CardTitle className="text-2xl">Sign In</CardTitle>
            <CardDescription>
              Sign in with your authorized account
            </CardDescription>
          </CardHeader>
          <CardContent className="flex justify-center">
            <Button 
              size="lg" 
              onClick={handleSignIn}
              className="w-full"
              data-testid="button-sign-in"
            >
              Sign In with Replit
            </Button>
          </CardContent>
        </Card>

        <p className="text-center text-sm text-muted-foreground" data-testid="text-footer">
          Authorized access only • @example.com • @northstaystays.co.uk
        </p>

        <div className="pt-4 border-t">
          <Link href="/landlord-login">
            <Button 
              variant="outline" 
              className="w-full gap-2"
              data-testid="button-landlord-portal"
            >
              <Building2 className="h-4 w-4" />
              Landlord Portal
            </Button>
          </Link>
          <p className="text-center text-xs text-muted-foreground mt-2" data-testid="text-landlord-description">
            Property owners: Access your statements, maintenance requests, and contracts
          </p>
        </div>
      </div>
    </div>
  );
}
