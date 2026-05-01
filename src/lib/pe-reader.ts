import { execFileSync } from "child_process";

export interface PEVersionInfo {
  productName: string;
  originalFilename: string;
}

export function readPEVersionInfo(exePath: string): PEVersionInfo {
  // Escape single quotes for PowerShell literal path
  const safePath = exePath.replace(/'/g, "''");
  const script = `(Get-Item -LiteralPath '${safePath}').VersionInfo | Select-Object ProductName, OriginalFilename | ConvertTo-Json`;
  try {
    const output = execFileSync("powershell", ["-NoProfile", "-NonInteractive", "-Command", script], {
      encoding: "utf8",
      timeout: 5000,
    });
    const parsed = JSON.parse(output.trim());
    return {
      productName: parsed.ProductName ?? "",
      originalFilename: parsed.OriginalFilename ?? "",
    };
  } catch {
    return { productName: "", originalFilename: "" };
  }
}
