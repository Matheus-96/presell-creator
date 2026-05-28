const path = require("path");

const srcRoot = path.resolve(__dirname, "..");
const backendRoot = path.resolve(srcRoot, "..");
const repoRoot = path.resolve(backendRoot, "..");
const frontendRoot = path.join(repoRoot, "frontend");
const frontendDistDir = path.join(frontendRoot, "dist");
const frontendDistIndexFile = path.join(frontendDistDir, "index.html");
const publicDir = path.join(srcRoot, "public");
const viewsDir = path.join(srcRoot, "views");
const rootEnvFile = path.join(repoRoot, ".env");

function resolveFromRepoRoot(...segments) {
  return path.join(repoRoot, ...segments);
}

module.exports = {
  backendRoot,
  frontendDistDir,
  frontendDistIndexFile,
  frontendRoot,
  publicDir,
  repoRoot,
  resolveFromRepoRoot,
  rootEnvFile,
  srcRoot,
  viewsDir
};
