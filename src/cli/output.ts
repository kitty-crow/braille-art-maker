import { writeFile } from "node:fs/promises";

export const writeOutput = async (path: string | undefined, body: string): Promise<void> => {
  if (path) await writeFile(path, body, "utf8");
  else process.stdout.write(body);
};
