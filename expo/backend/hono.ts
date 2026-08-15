import { trpcServer } from "@hono/trpc-server";
import { Hono } from "hono";
import { cors } from "hono/cors";

import { appRouter } from "./trpc/app-router";
import { createContext } from "./trpc/create-context";
import { lineRoutes } from "./trpc/routes/line-auth";

const app = new Hono();

app.use("*", cors());

app.use(
  "/trpc/*",
  trpcServer({
    endpoint: "/api/trpc",
    router: appRouter,
    createContext,
  }),
);

// LINE OAuth endpoints
app.route("/api/line", lineRoutes);

// 住所ジオコーディング（Nominatim経由）
// ブラウザのCORS制限を回避するため、サーバー側で呼び出す
app.get("/api/geocode", async (c) => {
  const q = c.req.query("q");
  if (!q || q.trim().length === 0) {
    return c.json({ error: "query is required" }, 400);
  }

  try {
    const url = new URL("https://nominatim.openstreetmap.org/search");
    url.searchParams.set("format", "json");
    url.searchParams.set("q", q.trim());
    url.searchParams.set("limit", "5");
    url.searchParams.set("accept-language", "ja");
    url.searchParams.set("countrycodes", "jp");
    url.searchParams.set("addressdetails", "1");

    const response = await fetch(url.toString(), {
      headers: {
        "User-Agent": "BeautyProofApp/1.0 (contact@beautyproof.jp)",
      },
    });

    if (!response.ok) {
      return c.json(
        { error: `geocoding service error: ${response.status}` },
        502
      );
    }

    const data = (await response.json()) as Array<{
      place_id: number;
      lat: string;
      lon: string;
      display_name: string;
      type: string;
      importance: number;
      address?: Record<string, string>;
    }>;

    const results = data.map((item) => ({
      latitude: parseFloat(item.lat),
      longitude: parseFloat(item.lon),
      displayName: item.display_name,
      type: item.type,
      importance: item.importance,
    }));

    return c.json({ results });
  } catch (error) {
    const message = error instanceof Error ? error.message : "unknown error";
    return c.json({ error: message }, 500);
  }
});

app.get("/", (c) => {
  return c.json({ status: "ok", message: "Beauty Token API is running" });
});

export default app;
