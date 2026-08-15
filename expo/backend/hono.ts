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

app.get("/", (c) => {
  return c.json({ status: "ok", message: "Beauty Token API is running" });
});

export default app;
