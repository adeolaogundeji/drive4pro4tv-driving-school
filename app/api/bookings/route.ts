function unavailable() {
  return Response.json(
    { error: "Please book appointments through Fountain Driving School at https://fountaindrivingschooltx.com/request-an-appointment/" },
    { status: 410 },
  );
}

export async function OPTIONS() {
  return new Response(null, { status: 204, headers: { Allow: "OPTIONS" } });
}

export async function POST() {
  return unavailable();
}
