/**
 * Authentication routes for Instagram scraping
 */
import { existsSync } from "node:fs";
import { Hono } from "hono";
import {
  getCookiesFromDb,
  hasCredentials,
  saveCookies,
} from "../../services/instagram/credentials";
import {
  getCookiesPath,
  getSessionPath,
  launchLoginBrowser,
} from "../../services/instagram/scraper";

export const authRouter = new Hono();

// Auth status endpoint
authRouter.get("/status", async (c) => {
  const hasCookiesFile = existsSync(getCookiesPath());
  const hasSessionFile = existsSync(getSessionPath());
  const hasDbCredentials = await hasCredentials();

  return c.json({
    hasCookies: hasDbCredentials || hasCookiesFile,
    hasSession: hasDbCredentials || hasSessionFile,
    isConfigured: hasDbCredentials || hasCookiesFile || hasSessionFile,
    hasDbCredentials,
  });
});

// Get cookies from database (for scrapper service)
authRouter.get("/cookies", async (c) => {
  const cookies = await getCookiesFromDb();

  if (!cookies || cookies.length === 0) {
    return c.json({ error: "No cookies found" }, 404);
  }

  return c.json({ cookies });
});

// Upload cookies endpoint
authRouter.post("/cookies", async (c) => {
  try {
    const body = await c.req.json();

    if (!Array.isArray(body)) {
      return c.json({ error: "Cookies must be an array" }, 400);
    }

    // Validate cookie format
    for (const cookie of body) {
      if (!(cookie.name && cookie.value && cookie.domain)) {
        return c.json(
          { error: "Each cookie must have name, value, and domain" },
          400
        );
      }
    }

    // Сохраняем cookies в базу данных
    await saveCookies(body);

    return c.json({
      success: true,
      message: `Saved ${body.length} cookies to database`,
    });
  } catch (error) {
    console.error("Failed to save cookies:", error);
    return c.json({ error: "Failed to save cookies" }, 500);
  }
});

// Launch browser for manual login (only works on local machine with display)
authRouter.post("/login", (c) => {
  // This will run in background
  setImmediate(() => {
    launchLoginBrowser().catch((error) => {
      console.error("Login browser error:", error);
    });
  });

  return c.json({
    success: true,
    message:
      "Browser launched for login. Please log in and close the browser when done.",
  });
});
