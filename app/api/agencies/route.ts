export async function GET() {
  try {
    const response = await fetch(
      `https://api.pugetsound.onebusaway.org/api/where/agencies-with-coverage.json?key=${process.env.ONEBUSAWAY_API_KEY}`,
    );

    const data = await response.json();

    return Response.json(data);
  } catch (error) {
    return Response.json(
      { error: `Failed to fetch agencies: ${error}` },
      { status: 500 },
    );
  }
}
