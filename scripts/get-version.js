const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

try {
  // Try to get commit hash - prioritize Vercel's env var, then git
  let commitHash = '';
  if (process.env.VERCEL_GIT_COMMIT_SHA) {
    // Vercel provides the full commit SHA
    commitHash = process.env.VERCEL_GIT_COMMIT_SHA.substring(0, 7);
  } else {
    try {
      // Try to get from git (for local development)
      commitHash = execSync('git rev-parse --short HEAD', { encoding: 'utf-8' }).trim();
    } catch (e) {
      commitHash = 'unknown';
    }
  }

  // Write to a JSON file that can be imported
  const versionData = {
    version: '0.5.3',
    commitHash: commitHash,
    buildTime: new Date().toISOString(),
  };

  const outputPath = path.join(process.cwd(), 'src', 'lib', 'version.json');
  fs.writeFileSync(outputPath, JSON.stringify(versionData, null, 2));
  console.log(`Version info written: ${commitHash}`);
} catch (error) {
  console.error('Error getting version:', error);
  // Write fallback version
  const versionData = {
    version: '0.5.3',
    commitHash: 'unknown',
    buildTime: new Date().toISOString(),
  };
  const outputPath = path.join(process.cwd(), 'src', 'lib', 'version.json');
  fs.writeFileSync(outputPath, JSON.stringify(versionData, null, 2));
}

