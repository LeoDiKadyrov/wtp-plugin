import { glob } from "glob";
import * as fs from "fs";

interface ReviewEntry {
  file: string;
  content: string;
}

export async function readReviewsHandler(dir: string, limit: number): Promise<ReviewEntry[]> {
  const files = await glob(`${dir}/**/*.md`);
  return files.slice(0, limit).map((file) => ({
    file,
    content: fs.readFileSync(file, "utf-8"),
  }));
}
