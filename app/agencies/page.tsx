import {
  Card,
  CardContent,
  // CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import Link from "next/link";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

interface Agency {
  id: string;
  name: string;
  disclaimer?: string;
  phone?: string;
  email?: string;
  lang: string;
  timezone: string;
  url?: string;
}

export default async function Agencies() {
  let agencies: Agency[] = [];

  try {
    const { GET } = await import("../api/agencies/route");
    const response = await GET();
    
    if (response.ok) {
      const data = await response.json();
      agencies = data.data?.references?.agencies || [];
    }
  } catch (error) {
    console.error("Failed to fetch agencies:", error);
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 p-20">
      {agencies.map((agency: Agency) => (
        <Card key={agency.id}>
          <CardHeader>
            <CardTitle>{agency.name}</CardTitle>
          </CardHeader>
          <CardContent>
            {agency.disclaimer && (
              <Alert variant="destructive">
                <AlertTitle>Disclaimer</AlertTitle>
                <AlertDescription>{agency.disclaimer}</AlertDescription>
              </Alert>
            )}
            <div className="space-y-2 text-sm">
              {agency.phone && (
                <p>
                  <strong>Phone:</strong> {agency.phone}
                </p>
              )}
              {agency.email && (
                <p>
                  <strong>Email:</strong> {agency.email}
                </p>
              )}
              <p>
                <strong>Timezone:</strong> {agency.timezone}
              </p>
              {agency.url && (
                <Link
                  href={agency.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="underline"
                >
                  Visit Website
                </Link>
              )}
            </div>
          </CardContent>
          <CardFooter className="text-gray-700 text-xs pb-2 mt-auto">
            Reference ID - {agency.id}
            {agency.lang}
          </CardFooter>
        </Card>
      ))}
    </div>
  );
}
