function unavailable() {
  return Response.json(
    { error: "Booking is not available on this learning site. Please contact Fontaine Driving School directly." },
    { status: 410 },
  );
}

export async function OPTIONS() {
  return new Response(null, { status: 204, headers: { Allow: "OPTIONS" } });
}

export async function POST() {
  return unavailable();
}
