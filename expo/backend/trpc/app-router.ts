import { createTRPCRouter } from "./create-context";
import { gaslessMintRouter } from "./routes/gasless-mint";

export const appRouter = createTRPCRouter({
  gasless: gaslessMintRouter,
});

export type AppRouter = typeof appRouter;
