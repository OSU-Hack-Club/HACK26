import { DEF, ORDER, PREMISES, SC } from "@/lib/concierge/model";

// Demo event feed. In production the scenario and counts come from the outage
// management system (or a push event); here it serves the sample premises and
// the default what-if inputs so clients and judges can inspect them.
export async function GET() {
  return Response.json({
    scenario: "watch",
    scenarios: ORDER.map((id) => ({ id, label: SC[id].label, tag: SC[id].tag })),
    premises: Object.values(PREMISES).map(({ id, area, kind, circuit }) => ({ id, area, kind, circuit })),
    defaults: DEF,
  });
}
