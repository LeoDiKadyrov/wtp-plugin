import { describe, it, expect, vi } from "vitest";

vi.mock("glob", () => ({ glob: vi.fn() }));
vi.mock("fs", () => ({ default: { readFileSync: vi.fn() }, readFileSync: vi.fn() }));

import { glob } from "glob";
import * as fs from "fs";
import { readReviewsHandler } from "../../src/tools/reviews.js";

describe("readReviewsHandler", () => {
  it("reads and returns markdown files from directory", async () => {
    vi.mocked(glob).mockResolvedValue(["/notes/game1.md", "/notes/game2.md"]);
    vi.mocked(fs.readFileSync)
      .mockReturnValueOnce("# Game 1\nGreat atmosphere." as any)
      .mockReturnValueOnce("# Game 2\nToo hard." as any);

    const result = await readReviewsHandler("/notes", 10);
    expect(result).toHaveLength(2);
    expect(result[0]).toEqual({ file: "/notes/game1.md", content: "# Game 1\nGreat atmosphere." });
  });

  it("respects the limit parameter", async () => {
    vi.mocked(glob).mockResolvedValue(["/notes/a.md", "/notes/b.md", "/notes/c.md"]);
    vi.mocked(fs.readFileSync).mockReturnValue("content" as any);

    const result = await readReviewsHandler("/notes", 2);
    expect(result).toHaveLength(2);
  });
});
