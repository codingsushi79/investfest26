const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

try {
  // Read current version from existing file, or use default
  const versionPath = path.join(process.cwd(), 'src', 'lib', 'version.json');
  let currentVersion = '0.5.3';
  try {
    if (fs.existsSync(versionPath)) {
      const existing = JSON.parse(fs.readFileSync(versionPath, 'utf-8'));
      currentVersion = existing.version || '0.5.3';
    }
  } catch (e) {
    // Use default if file doesn't exist or is invalid
  }

  // Try to get commit hash - prioritize Vercel's env var, then git
  let commitHash = '';
  let commitMessage = '';
  
  if (process.env.VERCEL_GIT_COMMIT_SHA) {
    // Vercel provides the full commit SHA
    commitHash = process.env.VERCEL_GIT_COMMIT_SHA.substring(0, 7);
    // Try to get commit message from git if available
    try {
      commitMessage = execSync('git log -1 --pretty=%B', { encoding: 'utf-8' }).trim();
    } catch (e) {
      commitMessage = '';
    }
  } else {
    try {
      // Try to get from git (for local development)
      commitHash = execSync('git rev-parse --short HEAD', { encoding: 'utf-8' }).trim();
      commitMessage = execSync('git log -1 --pretty=%B', { encoding: 'utf-8' }).trim();
    } catch (e) {
      commitHash = 'unknown';
      commitMessage = '';
    }
  }

  // Increment version based on commit message
  // Default: increment patch (0.5.3 → 0.5.4)
  // If "-next_ver-" in message: increment middle number and reset patch (0.5.3 → 0.6.0)
  let version = currentVersion;
  const versionParts = currentVersion.split('.');
  if (versionParts.length === 3) {
    const major = parseInt(versionParts[0]) || 0;
    const minor = parseInt(versionParts[1]) || 0;
    const patch = parseInt(versionParts[2]) || 0;
    
    if (commitMessage.includes('-next_ver-')) {
      // Increment middle number and reset patch to 0
      version = `${major}.${minor + 1}.0`;
      console.log(`Version incremented from ${currentVersion} to ${version} (found -next_ver- in commit message)`);
    } else {
      // Default: increment patch number
      version = `${major}.${minor}.${patch + 1}`;
      console.log(`Version incremented from ${currentVersion} to ${version} (patch increment)`);
    }
  }

  // Truncate commit message if too long (first line only, max 100 chars)
  const shortMessage = commitMessage.split('\n')[0].substring(0, 100);

  // Write to a JSON file that can be imported
  const versionData = {
    version: version,
    commitHash: commitHash,
    commitMessage: shortMessage,
    buildTime: new Date().toISOString(),
  };

  const outputPath = path.join(process.cwd(), 'src', 'lib', 'version.json');
  fs.writeFileSync(outputPath, JSON.stringify(versionData, null, 2));
  console.log(`Version info written: ${version} (${commitHash})${shortMessage ? ' - ' + shortMessage : ''}`);
} catch (error) {
  console.error('Error getting version:', error);
  // Write fallback version
  const versionData = {
    version: '0.5.3',
    commitHash: 'unknown',
    commitMessage: '',
    buildTime: new Date().toISOString(),
  };
  const outputPath = path.join(process.cwd(), 'src', 'lib', 'version.json');
  fs.writeFileSync(outputPath, JSON.stringify(versionData, null, 2));
}

