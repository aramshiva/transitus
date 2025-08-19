import { NextRequest, NextResponse } from "next/server";

interface AgencyEntry {
  disclaimer: string;
  email: string;
  fareUrl: string;
  id: string;
  lang: string;
  name: string;
  phone: string;
  privateService: boolean;
  timezone: string;
  url: string;
}

interface AgencyResponse {
  code: number;
  currentTime: number;
  data: {
    entry: AgencyEntry;
    references: {
      agencies: unknown[];
      routes: unknown[];
      situations: unknown[];
      stopTimes: unknown[];
      stops: unknown[];
      trips: unknown[];
    };
  };
  text: string;
  version: number;
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const agencyId = searchParams.get("id");

    if (!agencyId) {
      return NextResponse.json(
        { error: "Agency ID is required. Use ?id=AGENCY_ID parameter." },
        { status: 400 },
      );
    }

    const apiKey = process.env.ONEBUSAWAY_API_KEY || "TEST";
    const baseUrl =
      process.env.ONEBUSAWAY_BASE_URL ||
      "https://api.pugetsound.onebusaway.org";

    const url = `${baseUrl}/api/where/agency/${agencyId}.json?key=${apiKey}`;

    const response = await fetch(url);

    if (!response.ok) {
      throw new Error(
        `OneBusAway API error: ${response.status} ${response.statusText}`,
      );
    }

    const data: AgencyResponse = await response.json();

    if (data.code !== 200) {
      return NextResponse.json(
        {
          error: "Failed to fetch agency data",
          message: data.text || "Unknown error",
          code: data.code,
        },
        { status: 400 },
      );
    }

    return NextResponse.json({
      agency: data.data.entry,
      references: data.data.references,
      meta: {
        currentTime: data.currentTime,
        version: data.version,
      },
    });
  } catch (error) {
    console.error("Error fetching agency data:", error);

    return NextResponse.json(
      {
        error: "Internal server error",
        message:
          error instanceof Error ? error.message : "Unknown error occurred",
      },
      { status: 500 },
    );
  }
}
