const expected = process.argv[2];
const url = 'https://hardware-workspace.github.io/';
if (!expected || !/^[a-f0-9]{40}$/i.test(expected)) {
  console.error('Usage: node scripts/verify-deployment.mjs <40-character commit SHA>');
  process.exit(2);
}

for (let attempt = 1; attempt <= 12; attempt++) {
  try {
    const response = await fetch(`${url}?build=${expected}&attempt=${attempt}`, { cache: 'no-store' });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const html = await response.text();
    const deployed = html.match(/<meta name="build-commit" content="([a-f0-9]{40})"\s*\/>/i)?.[1];
    if (deployed === expected) {
      const asset = html.match(/<script[^>]+src="([^"]+\.js)"/i)?.[1];
      if (!asset) throw new Error('No JavaScript entrypoint found');
      const assetResponse = await fetch(new URL(asset, url));
      if (!assetResponse.ok) throw new Error(`JavaScript entrypoint HTTP ${assetResponse.status}`);
      console.log(`PASS: production serves commit ${expected} and its JavaScript entrypoint.`);
      process.exit(0);
    }
    console.log(`Waiting for Pages propagation (${attempt}/12); live commit ${deployed || 'unknown'}.`);
  } catch (error) {
    console.log(`Waiting for Pages (${attempt}/12): ${error.message}`);
  }
  if (attempt < 12) await new Promise((resolve) => setTimeout(resolve, 10_000));
}
console.error(`FAIL: ${url} did not serve commit ${expected} within two minutes.`);
process.exit(1);
