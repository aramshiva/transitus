"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import dynamic from "next/dynamic";
import { Card, CardContent } from "@/components/ui/card";

const MapComponent = dynamic(() => import("./MapComponent"), {
  ssr: false,
  loading: () => (
    <div className="flex items-center justify-center h-full">
      Loading map...
    </div>
  ),
});

interface Agency {
  id: string;
  name: string;
  phone?: string;
  url?: string;
  fareUrl?: string;
  timezone?: string;
  email?: string;
  disclaimer?: string;
  lang?: string;
  privateService?: boolean;
}

interface Vehicle {
  vehicleId: string;
  lastLocationUpdateTime: number;
  lastUpdateTime: number;
  location?: {
    lat: number;
    lon: number;
  };
  tripId?: string;
  status: string;
  phase: string;
  agencyId?: string;
  agencyInfo?: {
    agencyId: string;
    name: string;
    phone?: string;
    url?: string;
    [key: string]: unknown;
  };
  agency?: {
    id: string;
    name: string;
    phone?: string;
    url?: string;
    [key: string]: unknown;
  };
  tripStatus?: {
    orientation?: number;
    nextStop?: string;
    closestStop?: string;
    scheduleDeviation?: number;
    occupancyCount?: number;
    occupancyCapacity?: number;
    [key: string]: unknown;
  };
  [key: string]: unknown;
}

interface VehicleResponse {
  code: number;
  currentTime: number;
  data: {
    limitExceeded: boolean;
    list: Vehicle[];
  };
}

export default function MapPage() {
  const searchParams = useSearchParams();
  const borderless = searchParams.get('borderless') === 'true';
  
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdate, setLastUpdate] = useState<number>(0);

  const fetchVehicles = async () => {
    try {
      setError(null);
      const response = await fetch("/api/vehicles");

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data: VehicleResponse = await response.json();

      if (data.code === 200) {
        const vehiclesWithLocation = data.data.list
          .filter(
            (vehicle) =>
              vehicle.location &&
              vehicle.location.lat &&
              vehicle.location.lon &&
              vehicle.lastLocationUpdateTime > 0,
          )
          .map((vehicle) => ({
            ...vehicle,
            agency: vehicle.agencyInfo
              ? {
                  id: vehicle.agencyInfo.agencyId,
                  name: vehicle.agencyInfo.name,
                  phone: vehicle.agencyInfo.phone,
                  url: vehicle.agencyInfo.url,
                }
              : vehicle.agencyId
                ? {
                    id: vehicle.agencyId,
                    name: `Agency ${vehicle.agencyId}`,
                  }
                : undefined,
          }));

        setVehicles(vehiclesWithLocation);
        setLastUpdate(data.currentTime);
      } else {
        throw new Error(`API error: ${data.code}`);
      }
    } catch (err) {
      console.error("Error fetching vehicles:", err);
      setError(
        err instanceof Error ? err.message : "Failed to fetch vehicle data",
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchVehicles();

    const interval = setInterval(fetchVehicles, 15000);

    return () => clearInterval(interval);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const formatTime = (timestamp: number) => {
    return new Date(timestamp).toLocaleTimeString();
  };

  if (borderless) {
    return (
      <div className="h-screen w-full">
        <MapComponent vehicles={vehicles} />
      </div>
    );
  }

  return (
    <div className="container mx-auto p-4 space-y-6">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div className="pt-5">
          <h1 className="text-3xl font-bold">Live Map</h1>
          <p className="text-gray-600">
            Real-time tracking of vehicles across Sound Transit brands.
          </p>
          <p className="text-gray-600 text-xs">
            Last Update: {lastUpdate ? formatTime(lastUpdate) : "Never"} -
            Active Vehicles: {vehicles.length}
          </p>
        </div>
      </div>

      {error && (
        <Card className="border-red-200 bg-red-50">
          <CardContent className="pt-6">
            <div className="text-red-600 font-medium">Error</div>
            <div className="text-red-800">{error}</div>
            <button
              onClick={fetchVehicles}
              className="mt-2 px-3 py-1 text-sm bg-red-600 text-white rounded hover:bg-red-700"
            >
              Try Again
            </button>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardContent>
          <div className="h-[600px] rounded-lg overflow-hidden">
            <MapComponent vehicles={vehicles} />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
