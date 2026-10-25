import { describe, expect, it } from "vitest";

import { DEF, LIMITED_SAMPLE, NO_NEEDS, PREMISES, answer, eligibility, estimateLine, fallbackKind, llmContext, materials, model, previewMessages, type ConciergeInput } from "@/lib/concierge/model";

const input = (o: Partial<ConciergeInput> = {}): ConciergeInput => ({
  ...DEF,
  premise: "P-20417",
  scenario: "watch",
  medical: false,
  needs: NO_NEEDS,
  ch: { push: true, sms: true, email: false, call: false },
  ...o,
});
const limited = (o: Partial<ConciergeInput> = {}) => input({ premise: LIMITED_SAMPLE.record.id, premiseOverride: LIMITED_SAMPLE, ...o });

describe("prediction reliability", () => {
  it("predicts for every demo premise across the wind range", () => {
    for (const id of Object.keys(PREMISES))
      for (const wind of [30, 58, 75, 100]) {
        const m = model(input({ premise: id, wind }));
        expect(m.confidence.reliable, `${id} at ${wind} mph`).toBe(true);
        expect(fallbackKind({ unknownId: null }, m)).toBeNull();
      }
  });

  it("falls back for a premise with thin history and missing data during a storm", () => {
    const m = model(limited());
    expect(m.confidence.reliable).toBe(false);
    expect(m.conf).toBe(1);
    expect(fallbackKind({ unknownId: null }, m)).toBe("unreliable");
  });

  it("still answers when there's no storm", () => {
    expect(model(limited({ scenario: "normal" })).confidence.reliable).toBe(true);
  });

  it("an unknown ID always falls back", () => {
    expect(fallbackKind({ unknownId: "X-1" }, model(input()))).toBe("unknown-id");
  });
});

describe("no numbers without a reliable prediction", () => {
  const hasNumbers = (t: string) => /\d+\s*–\s*\d+\s*hours|between .* and |chance you lose power|plan to be without it until/i.test(t);

  it("customer messages carry no chance or time", () => {
    for (const msg of previewMessages(model(limited({ scenario: "outage" })), limited({ scenario: "outage" })).slice(0, 2)) expect(hasNumbers(msg.text), msg.text).toBe(false);
  });

  it("the estimate line, chat answers and AI context withhold the estimate", () => {
    const s = limited({ scenario: "outage" });
    expect(hasNumbers(estimateLine(model(s), "outage"))).toBe(false);
    expect(answer("time", s).headline).toBe("I can’t estimate this one reliably.");
    expect(answer("risk", limited()).headline).toBe("I can’t estimate this one reliably.");
    expect(llmContext(s)).toContain("NOT AVAILABLE");
  });

  it("confirmed facts still answer during an outage", () => {
    expect(answer("risk", limited({ scenario: "outage" })).headline).toBe("Yes, your power is out right now.");
  });

  it("a reliable premise still gets its numbers", () => {
    expect(hasNumbers(previewMessages(model(input()), input())[0].text)).toBe(true);
  });
});

describe("materials", () => {
  it("adds up parts from the structure drawings for each damage type", () => {
    const list = Object.fromEntries(materials({ poles: 2, spans: 3, xfmr: true }).map((x) => [x.name, x.qty]));
    expect(list).toMatchObject({ "Pole, 40–55 ft": 2, Crossarm: 2, Insulators: 6, "Insulator pins": 6, Grounding: 2, "Dead-ends": 6, Connectors: 6, "Transformer, 25 kVA": 1, "Fuse cutout": 1 });
  });

  it("is just the fuse when nothing else is damaged", () => {
    expect(materials({ poles: 0, spans: 0, xfmr: false })).toEqual([{ name: "Fuse cutout", qty: 1 }]);
  });
});

describe("alert eligibility without a reliable prediction", () => {
  it("keeps storm alerts on rather than trusting an unreliable low level", () => {
    const s = limited();
    expect(eligibility(model(s), s).ok).toBe(true);
  });
});
