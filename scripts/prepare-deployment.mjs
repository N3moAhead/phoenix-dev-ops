import { access, cp, mkdir, rm, writeFile } from "node:fs/promises";
import path from "node:path";

const projectRoot = process.cwd();
const deploymentRoot = path.join(projectRoot, "deployment");
const packageRoot = path.join(deploymentRoot, "package");
const targetRoot = path.join(deploymentRoot, "target");
const deployedAppRoot = path.join(targetRoot, "phoenix-dev-ops");

async function ensureExists(targetPath, message) {
  try {
    await access(targetPath);
  } catch {
    throw new Error(message);
  }
}

async function main() {
  const distPath = path.join(projectRoot, "dist");
  await ensureExists(
    distPath,
    "Missing dist/ output. Run `npm run build` before preparing deployment.",
  );

  await rm(deploymentRoot, { recursive: true, force: true });
  await mkdir(packageRoot, { recursive: true });
  await mkdir(targetRoot, { recursive: true });

  await cp(distPath, path.join(packageRoot, "dist"), { recursive: true });
  await cp(
    path.join(projectRoot, "package.json"),
    path.join(packageRoot, "package.json"),
  );
  await cp(
    path.join(projectRoot, "README.md"),
    path.join(packageRoot, "README.md"),
  );

  const examplesPath = path.join(projectRoot, "examples");
  try {
    await access(examplesPath);
    await cp(examplesPath, path.join(packageRoot, "examples"), {
      recursive: true,
    });
  } catch {
    // Demo docs are optional for packaging.
  }

  await cp(packageRoot, deployedAppRoot, { recursive: true });

  const deploySummary = {
    commit: process.env.GITHUB_SHA ?? "local",
    builtAt: new Date().toISOString(),
    source: process.env.GITHUB_ACTIONS ? "github-actions" : "local",
    includedPaths: ["dist", "package.json", "README.md", "examples"],
  };

  await writeFile(
    path.join(targetRoot, "deploy-info.txt"),
    `commit=${deploySummary.commit}\nbuilt_at=${deploySummary.builtAt}\nsource=${deploySummary.source}\n`,
    "utf8",
  );

  await writeFile(
    path.join(targetRoot, "deploy-summary.json"),
    `${JSON.stringify(deploySummary, null, 2)}\n`,
    "utf8",
  );

  console.log(`Deployment target prepared at ${targetRoot}`);
}

await main();
