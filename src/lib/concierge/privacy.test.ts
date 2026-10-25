import { describe, expect, it } from "vitest";

import { isSafetyQuestion, maskId, redactPII, redactionText } from "@/lib/concierge/privacy";

describe("redactPII", () => {
  it("masks phone numbers, emails, addresses, coordinates and account numbers", () => {
    const r = redactPII("Call 614-555-0123 or (614) 555 0199, email jo.smith+aep@gmail.com, I live at 12 Elm St, near 39.9612, -82.9988, account 1234567890.");
    expect(r.text).toBe("Call [phone] or [phone], email [email], I live at [address], near [coordinates], account [number].");
    expect(r.found).toEqual({ phone: 2, email: 1, address: 1, coordinates: 1, number: 1 });
    expect(r.total).toBe(6);
  });

  it("still masks a phone number written without separators", () => {
    expect(redactPII("call 6145550123").text).toBe("call [number]");
  });

  it("leaves ordinary questions and anonymized IDs alone", () => {
    for (const q of ["How long could it take?", "Is P-20417 on CIR22 at risk?", "Will 3 crews be enough for 2 poles?"]) {
      expect(redactPII(q)).toEqual({ text: q, found: {}, total: 0 });
    }
  });

  it("describes what it removed in plain words", () => {
    expect(redactionText({ phone: 1, address: 2 })).toBe("1 phone number and 2 street addresses");
    expect(redactionText({})).toBe("nothing");
  });
});

describe("maskId", () => {
  it("keeps only the first and last characters", () => {
    expect(maskId("X-00017")).toBe("X•••17");
    expect(maskId("AB")).toBe("•••");
  });
});

describe("isSafetyQuestion", () => {
  it.each(["There's a downed wire on my street", "the line is down by the school", "I see sparks on the pole", "smoke from the transformer", "my neighbor got shocked", "my oxygen machine needs power"])(
    "flags %s",
    (q) => expect(isSafetyQuestion(q)).toBe(true),
  );

  it.each(["How long could it take?", "Will I lose power?", "Do I get alerts?", "What should I do with my fridge?"])("does not flag %s", (q) => expect(isSafetyQuestion(q)).toBe(false));
});
