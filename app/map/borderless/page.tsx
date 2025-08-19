"use client";

import { useEffect, useState } from "react";
import dynamic from "next/dynamic";

const MapComponent = dynamic(() => import("../MapComponent"), {
  ssr: false,
});

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
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);

  const fetchVehicles = async () => {
    try {
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
      } else {
        throw new Error(`API error: ${data.code}`);
      }
    } catch (err) {
      console.error("Error fetching vehicles:", err);
    }
  };

  useEffect(() => {
    fetchVehicles();
    const interval = setInterval(fetchVehicles, 10000);

    return () => clearInterval(interval);
  }, []);
  return (
    <div className="h-screen">
      <MapComponent vehicles={vehicles} />
    </div>
  );
}
