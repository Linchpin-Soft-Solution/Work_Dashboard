import { generateSummary } from "./src/lib/openrouter";

async function main() {
  try {
    const summary = await generateSummary("2026-04-20: task 1\n2026-04-21: task 2");
    console.log("Summary:", summary);
  } catch (err) {
    console.error("Error:", err);
  }
}
main();
