import { getMapData } from "@/lib/concierge/map-data";

// Outage-map GeoJSON (CIR2 lines, storm damage, zones). Deterministic, so it is
// prerendered at build time under Cache Components.
export async function GET() {
  return Response.json(getMapData());
}
