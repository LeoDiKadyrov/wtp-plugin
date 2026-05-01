import { describe, it, expect } from "vitest";
import { parseAcf } from "../../src/lib/acf-parser.js";

describe("parseAcf", () => {
  it("extracts appid and name from acf content", () => {
    const content = `"AppState"\n{\n\t"appid"\t\t"730"\n\t"name"\t\t"Counter-Strike 2"\n\t"StateFlags"\t\t"4"\n}`;
    const result = parseAcf(content);
    expect(result.appid).toBe("730");
    expect(result.name).toBe("Counter-Strike 2");
  });

  it("returns empty strings for missing keys", () => {
    const result = parseAcf(`"AppState"\n{\n}`);
    expect(result.appid).toBe("");
    expect(result.name).toBe("");
  });
});
