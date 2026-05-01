import { describe, it, expect, vi } from "vitest";
import * as child_process from "child_process";

vi.mock("child_process");

const { readPEVersionInfo } = await import("../../src/lib/pe-reader.js");

describe("readPEVersionInfo", () => {
  it("extracts ProductName and OriginalFilename from exe", () => {
    vi.mocked(child_process.execFileSync).mockReturnValue(
      JSON.stringify({ ProductName: "The Witcher 3", OriginalFilename: "witcher3.exe" }) as any
    );

    const result = readPEVersionInfo("C:/Games/witcher3.exe");
    expect(result.productName).toBe("The Witcher 3");
    expect(result.originalFilename).toBe("witcher3.exe");
  });

  it("returns empty strings when PowerShell fails", () => {
    vi.mocked(child_process.execFileSync).mockImplementation(() => { throw new Error("Access denied"); });

    const result = readPEVersionInfo("C:/Games/unknown.exe");
    expect(result.productName).toBe("");
    expect(result.originalFilename).toBe("");
  });
});
