import { useQuery } from "@tanstack/react-query";
import { useRoute } from "wouter";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { 
  ArrowLeft, 
  Home, 
  MapPin, 
  Clock, 
  Bed, 
  Bath, 
  Calendar, 
  FileText,
  Navigation,
  ExternalLink
} from "lucide-react";
import { Link } from "wouter";
import type { Property } from "@shared/schema";

export default function PropertyProfile() {
  const [, params] = useRoute("/properties/:id");
  const propertyId = params?.id;

  const { data: property, isLoading } = useQuery<Property>({
    queryKey: [`/api/properties/${propertyId}/details`],
    enabled: !!propertyId,
  });

  const { data: travelTimes = [] } = useQuery<Array<{
    property: Property;
    distanceKm: number;
    travelTimeMinutes: number;
  }>>({
    queryKey: [`/api/properties/${propertyId}/travel-times`],
    enabled: !!propertyId && !!property?.latitude && !!property?.longitude,
  });

  if (isLoading) {
    return (
      <div className="p-8 space-y-6">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-[400px] w-full" />
      </div>
    );
  }

  if (!property) {
    return (
      <div className="p-8 text-center">
        <p className="text-muted-foreground">Property not found</p>
      </div>
    );
  }

  const hasCoordinates = property.latitude != null && property.longitude != null;
  const googleMapsUrl = hasCoordinates 
    ? `https://www.google.com/maps?q=${property.latitude},${property.longitude}`
    : null;

  return (
    <div className="p-8 space-y-6">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <Link href="/properties">
              <Button variant="ghost" size="icon" data-testid="button-back">
                <ArrowLeft className="h-4 w-4" />
              </Button>
            </Link>
            <h1 className="text-3xl font-bold" data-testid="text-property-name">{property.name}</h1>
          </div>
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <MapPin className="h-4 w-4" />
            <span data-testid="text-property-address">{property.address}</span>
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          <Badge variant={property.active ? "default" : "secondary"} data-testid="badge-status">
            {property.active ? "Active" : "Inactive"}
          </Badge>
          {property.propertyType && (
            <Badge variant="outline" data-testid="badge-property-type">{property.propertyType}</Badge>
          )}
        </div>
      </div>

      <Tabs defaultValue="overview" className="w-full">
        <TabsList data-testid="tabs-property-profile">
          <TabsTrigger value="overview" data-testid="tab-overview">Overview</TabsTrigger>
          <TabsTrigger value="instructions" data-testid="tab-instructions">Instructions</TabsTrigger>
          <TabsTrigger value="location" data-testid="tab-location">Location</TabsTrigger>
          <TabsTrigger value="travel" data-testid="tab-travel">Travel Times</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {property.propertyType && (
              <Card data-testid="card-property-type">
                <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
                  <CardTitle className="text-sm">Property Type</CardTitle>
                  <Home className="h-5 w-5 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <p className="text-2xl font-bold" data-testid="text-type-value">{property.propertyType}</p>
                </CardContent>
              </Card>
            )}

            {property.bedrooms != null && (
              <Card data-testid="card-bedrooms">
                <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
                  <CardTitle className="text-sm">Bedrooms</CardTitle>
                  <Bed className="h-5 w-5 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <p className="text-2xl font-bold" data-testid="text-bedrooms-value">{property.bedrooms}</p>
                </CardContent>
              </Card>
            )}

            {property.bathrooms != null && (
              <Card data-testid="card-bathrooms">
                <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
                  <CardTitle className="text-sm">Bathrooms</CardTitle>
                  <Bath className="h-5 w-5 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <p className="text-2xl font-bold" data-testid="text-bathrooms-value">{property.bathrooms}</p>
                </CardContent>
              </Card>
            )}

            <Card data-testid="card-clean-duration">
              <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
                <CardTitle className="text-sm">Average Clean Time</CardTitle>
                <Clock className="h-5 w-5 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-bold" data-testid="text-duration-value">{property.defaultCleanDuration} min</p>
              </CardContent>
            </Card>

            {property.cleaningFrequency && (
              <Card data-testid="card-cleaning-frequency">
                <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
                  <CardTitle className="text-sm">Cleaning Frequency</CardTitle>
                  <Calendar className="h-5 w-5 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <p className="text-lg font-semibold" data-testid="text-frequency-value">{property.cleaningFrequency}</p>
                </CardContent>
              </Card>
            )}
          </div>

          {property.notes && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileText className="h-5 w-5" />
                  Notes
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground whitespace-pre-wrap">{property.notes}</p>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="instructions">
          <Card>
            <CardHeader>
              <CardTitle>Special Cleaning Instructions</CardTitle>
              <CardDescription>Detailed instructions for cleaning this property</CardDescription>
            </CardHeader>
            <CardContent>
              {property.specialInstructions ? (
                <div className="prose prose-sm max-w-none" data-testid="text-special-instructions">
                  <p className="whitespace-pre-wrap">{property.specialInstructions}</p>
                </div>
              ) : (
                <p className="text-muted-foreground text-center py-8" data-testid="text-no-instructions">
                  No special instructions provided for this property.
                </p>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="location">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MapPin className="h-5 w-5" />
                Location
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <p className="text-sm font-medium mb-1">Address</p>
                <p className="text-muted-foreground" data-testid="text-location-address">{property.address}</p>
              </div>

              {hasCoordinates ? (
                <>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm font-medium mb-1">Latitude</p>
                      <p className="text-muted-foreground font-mono text-sm" data-testid="text-latitude">{property.latitude}</p>
                    </div>
                    <div>
                      <p className="text-sm font-medium mb-1">Longitude</p>
                      <p className="text-muted-foreground font-mono text-sm" data-testid="text-longitude">{property.longitude}</p>
                    </div>
                  </div>

                  {googleMapsUrl && (
                    <div>
                      <a 
                        href={googleMapsUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        <Button variant="outline" className="w-full" data-testid="button-view-map">
                          <ExternalLink className="h-4 w-4 mr-2" />
                          View on Google Maps
                        </Button>
                      </a>
                    </div>
                  )}
                </>
              ) : (
                <p className="text-muted-foreground text-center py-8" data-testid="text-no-coordinates">
                  No coordinates available for this property.
                  Add latitude and longitude to enable map view and travel time calculations.
                </p>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="travel">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Navigation className="h-5 w-5" />
                Nearby Properties
              </CardTitle>
              <CardDescription>
                Travel times calculated using straight-line distance at 30 mph average speed
              </CardDescription>
            </CardHeader>
            <CardContent>
              {!hasCoordinates ? (
                <p className="text-muted-foreground text-center py-8" data-testid="text-no-coordinates-travel">
                  Add coordinates to this property to calculate travel times.
                </p>
              ) : travelTimes.length === 0 ? (
                <p className="text-muted-foreground text-center py-8" data-testid="text-no-nearby-properties">
                  No nearby properties with coordinates found.
                </p>
              ) : (
                <div className="space-y-3">
                  {travelTimes.map((item, idx) => (
                    <Link key={item.property.id} href={`/properties/${item.property.id}`}>
                      <div 
                        className="flex items-center justify-between gap-4 p-4 border rounded-md hover-elevate cursor-pointer"
                        data-testid={`travel-time-${idx}`}
                      >
                        <div className="flex-1">
                          <p className="font-medium">{item.property.name}</p>
                          <p className="text-xs text-muted-foreground">{item.property.address}</p>
                        </div>
                        <div className="flex items-center gap-4">
                          <div className="text-right">
                            <p className="text-sm font-bold">{item.distanceKm} km</p>
                            <p className="text-xs text-muted-foreground">
                              ~{item.travelTimeMinutes} min drive
                            </p>
                          </div>
                          <Navigation className="h-4 w-4 text-muted-foreground" />
                        </div>
                      </div>
                    </Link>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
