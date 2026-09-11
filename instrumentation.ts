export async function register() {
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    // Every 10 minutes (600,000 ms), ping self /api/health to prevent Render free instance from spinning down
    const intervalMs = 10 * 60 * 1000;

    setInterval(async () => {
      try {
        const appUrl = process.env.RENDER_EXTERNAL_URL || process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
        const res = await fetch(`${appUrl}/api/health`);
        if (res.ok) {
          console.log(`[Render Keep-Alive] Heartbeat ping success at ${new Date().toISOString()}`);
        }
      } catch (err) {
        // Silent catch for initial boot or offline transient states
      }
    }, intervalMs);
  }
}
