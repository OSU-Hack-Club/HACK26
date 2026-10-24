// Nearby help and critical-facility resources for the Services screen.
// Emergency pins come from the challenge priority-location extract (fire / ambulance),
// snapped to a ~1 km grid. Warming centers and facility playbooks are demo content —
// never exact addresses, never inferred from life-support flags.

import { getMapData } from "@/lib/concierge/map-data";
import type { Declared, IconName, Scenario } from "@/lib/concierge/model";

export type ServiceKind = "fire" | "ambulance" | "hospital" | "warming" | "cooling" | "shelter" | "school";

export interface NearbyService {
  id: string;
  kind: ServiceKind;
  /** Public label; never a precise street address. */
  name: string;
  /** Coarse area description only (~1 km). */
  area: string;
  /** Rough distance band from the customer's approximate home. */
  distance: string;
  /** Hours open, or null when 24/7 emergency. */
  hours: string | null;
  /** Why this appears for the current storm stage. */
  note: string;
  icon: IconName;
  /** From the challenge shapefile extract (privacy-snapped). */
  fromData: boolean;
}

export interface FacilityStep {
  id: string;
  title: string;
  detail: string;
  icon: IconName;
  /** When this step matters most. */
  when: "before" | "during" | "after";
}

export interface AlertPref {
  heartbeat: boolean;
  /** Send a warming/cooling center list when escalation fires. */
  centerList: boolean;
  /** Critical-facility operational digest during an outage. */
  facilityDigest: boolean;
}

export const DEFAULT_ALERT_PREFS: AlertPref = {
  heartbeat: true,
  centerList: true,
  facilityDigest: true,
};

const KIND_META: Record<
  string,
  { kind: ServiceKind; name: string; icon: IconName; note: string }
> = {
  F: { kind: "fire", name: "Fire Station (General Area)", icon: "triangle-alert", note: "Public fire department area from the challenge data. Exact address is never shown." },
  A: { kind: "ambulance", name: "Ambulance Station (General Area)", icon: "heart-pulse", note: "Public ambulance area from the challenge data. Exact address is never shown." },
  H: { kind: "hospital", name: "Hospital (General Area)", icon: "building-2", note: "Public hospital area from the challenge data. Exact address is never shown." },
};

const km = (ax: number, ay: number, bx: number, by: number) =>
  Math.hypot((ax - bx) * 111.32 * Math.cos((ay * Math.PI) / 180), (ay - by) * 110.57);

function band(kmAway: number): string {
  if (kmAway < 1.5) return "About 1 km away";
  if (kmAway < 3) return "About 2–3 km away";
  if (kmAway < 6) return "About 4–6 km away";
  return "About 6–10 km away";
}

function areaLabel(x: number, y: number): string {
  // Coarse grid already applied in map-data; label by relative offset only.
  const ns = y >= 37.1 ? "north" : "south";
  const ew = x >= -80.16 ? "east" : "west";
  return `General ${ns}-${ew} area of your circuit`;
}

/** Emergency services from the priority-location extract, coarsened and ranked by distance. */
export function emergencyServices(): NearbyService[] {
  const map = getMapData();
  const [hx, hy] = map.home;
  const ranked = map.fac
    .map((f, i) => ({ f, i, d: km(f.x, f.y, hx, hy) }))
    .sort((a, b) => a.d - b.d);
  return ranked.map(({ f, i, d }) => {
    const meta = KIND_META[f.k] ?? KIND_META.F;
    return {
      id: `fac-${f.k}-${i}`,
      kind: meta.kind,
      name: meta.name,
      area: areaLabel(f.x, f.y),
      distance: band(d),
      hours: null,
      note: meta.note,
      icon: meta.icon,
      fromData: true,
    };
  });
}

/** Demo warming / cooling / shelter sites for long outages. Synthetic, area-only. */
export function stormCenters(area: string, sc: Scenario): NearbyService[] {
  if (sc === "normal") return [];
  const open = sc === "outage" || sc === "restoring" || sc === "restored";
  return [
    {
      id: "warm-1",
      kind: "warming",
      name: "Community Warming Center",
      area: `Near ${area} (general area)`,
      distance: "About 3–5 km away",
      hours: open ? "Open while the outage lasts · 8 AM – 10 PM" : "Opens if the outage runs long",
      note: "Demo shelter list for judges. Real centers would come from the county emergency management feed.",
      icon: "sun",
      fromData: false,
    },
    {
      id: "cool-1",
      kind: "cooling",
      name: "Cooling & Charging Station",
      area: `Near ${area} (general area)`,
      distance: "About 4–6 km away",
      hours: open ? "Open while the outage lasts · 9 AM – 9 PM" : "Opens if the outage runs long",
      note: "Phone charging, water, and a cool place to wait. Location is approximate only.",
      icon: "battery-charging",
      fromData: false,
    },
    {
      id: "shelter-1",
      kind: "shelter",
      name: "Overnight Shelter",
      area: `County shelter zone near ${area}`,
      distance: "About 6–8 km away",
      hours: open ? "Opens after 10 PM if still without power" : "Standby until needed",
      note: "For customers who cannot stay home safely overnight. Never shown as a precise pin.",
      icon: "moon",
      fromData: false,
    },
  ];
}

/** Playbook for accounts that declared themselves a critical facility. */
export function facilityPlaybook(sc: Scenario): FacilityStep[] {
  const all: FacilityStep[] = [
    {
      id: "gen",
      title: "Test Backup Generators",
      detail: "Run a load test and confirm fuel for at least 24 hours. Log who can start the generator after hours.",
      icon: "zap",
      when: "before",
    },
    {
      id: "roster",
      title: "Confirm Closure / Relocation Decision",
      detail: "Name the person who decides to close, shelter in place, or move people. Keep that contact current with AEP.",
      icon: "building-2",
      when: "before",
    },
    {
      id: "fuel",
      title: "Check Fuel and Vendor Reachability",
      detail: "If roads may be blocked, arrange a fuel drop now. Confirm the vendor’s storm number.",
      icon: "truck",
      when: "before",
    },
    {
      id: "handoff",
      title: "Critical-Facility Team Hand-Off",
      detail: "After 4 hours without power, AEP’s critical-facility team gets your site for follow-up. Keep your phone line free.",
      icon: "bell",
      when: "during",
    },
    {
      id: "ops",
      title: "Operations Digest Every Few Hours",
      detail: "You’ll get a short ops update (estimate, crew status, next escalation) so staff can plan shifts without calling in.",
      icon: "bell",
      when: "during",
    },
    {
      id: "reopen",
      title: "Reopen Checklist",
      detail: "When power returns, walk elevators, HVAC, medical devices, and cold storage before inviting people back.",
      icon: "circle-check",
      when: "after",
    },
  ];
  const phase = sc === "normal" || sc === "watch" ? "before" : sc === "restored" ? "after" : "during";
  // Show the current phase first, then the rest for context.
  return [...all.filter((s) => s.when === phase), ...all.filter((s) => s.when !== phase)];
}

export function servicesSummary(d: Declared, sc: Scenario, area: string): { title: string; body: string } {
  if (d.needs.facility) {
    return {
      title: "Critical Facility Playbook",
      body: sc === "normal"
        ? "Your account is marked as a critical facility. Review the storm playbook and keep generators ready."
        : "Follow the facility playbook below. Escalation to AEP’s critical-facility team fires after 4 hours without power.",
    };
  }
  if (d.medical || d.needs.mobility) {
    return {
      title: "Nearby Help",
      body: `Warming and cooling centers near ${area} appear here when a storm is active. Locations are approximate areas only.`,
    };
  }
  return {
    title: "Nearby Help & Services",
    body: "Public fire and ambulance areas from AEP’s challenge data, plus demo warming centers during a storm. Exact sensitive sites are never shown.",
  };
}
