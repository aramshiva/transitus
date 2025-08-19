import { NextResponse } from "next/server";

interface Agency {
  agencyId: string;
  name: string;
  [key: string]: unknown;
}

interface AgenciesResponse {
  code: number;
  data: {
    list: Array<{ agencyId: string }>;
    references: {
      agencies: Agency[];
    };
  };
}

interface VehicleResponse {
  code: number;
  currentTime: number;
  data: {
    limitExceeded: boolean;
    list: Array<{
      vehicleId: string;
      agencyId?: string;
      [key: string]: unknown;
    }>;
  };
}

export async function GET() {
  try {
    const apiKey = process.env.ONEBUSAWAY_API_KEY;

    const agenciesUrl = `https://api.pugetsound.onebusaway.org/api/where/agencies-with-coverage.json?key=${apiKey}`;
    const agenciesResponse = await fetch(agenciesUrl);

    if (!agenciesResponse.ok) {
      throw new Error(`Failed to fetch agencies: ${agenciesResponse.status}`);
    }

    const agenciesData: AgenciesResponse = await agenciesResponse.json();
    const agencies = agenciesData.data.list;
    const agencyRefs = agenciesData.data.references.agencies;

    const agencyLookup = agencyRefs.reduce(
      (acc, agency) => {
        acc[agency.agencyId] = agency;
        return acc;
      },
      {} as Record<string, Agency>,
    );

    const vehiclePromises = agencies.map(async (agency) => {
      try {
        const vehicleUrl = `https://api.pugetsound.onebusaway.org/api/where/vehicles-for-agency/${agency.agencyId}.json?key=${apiKey}`;
        const response = await fetch(vehicleUrl);

        if (!response.ok) {
          console.warn(
            `Failed to fetch vehicles for agency ${agency.agencyId}: ${response.status}`,
          );
          return { vehicles: [], agencyId: agency.agencyId };
        }

        const data: VehicleResponse = await response.json();

        const vehiclesWithAgency = data.data.list.map((vehicle) => ({
          ...vehicle,
          agencyId: agency.agencyId,
          agencyInfo: agencyLookup[agency.agencyId],
        }));

        return {
          vehicles: vehiclesWithAgency,
          agencyId: agency.agencyId,
          currentTime: data.currentTime,
        };
      } catch (error) {
        console.warn(
          `Error fetching vehicles for agency ${agency.agencyId}:`,
          error,
        );
        return { vehicles: [], agencyId: agency.agencyId };
      }
    });

    const results = await Promise.all(vehiclePromises);

    const allVehicles = results.flatMap((result) => result.vehicles);
    const latestTime = Math.max(
      ...results.map((r) => r.currentTime || 0).filter((t) => t > 0),
    );

    const combinedResponse = {
      code: 200,
      currentTime: latestTime || Date.now(),
      data: {
        limitExceeded: false,
        list: allVehicles,
      },
      text: "OK",
      version: 2,
    };

    return NextResponse.json(combinedResponse, {
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "GET",
        "Access-Control-Allow-Headers": "Content-Type",
      },
    });
  } catch (error) {
    console.error("Error fetching vehicle data:", error);

    return NextResponse.json(
      {
        error: "Failed to fetch vehicle data",
        message: error instanceof Error ? error.message : "Unknown error",
      },
      {
        status: 500,
        headers: {
          "Access-Control-Allow-Origin": "*",
          "Access-Control-Allow-Methods": "GET",
          "Access-Control-Allow-Headers": "Content-Type",
        },
      },
    );
  }
}

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 200,
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET",
      "Access-Control-Allow-Headers": "Content-Type",
    },
  });
}
