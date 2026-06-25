import { createTRPCRouter } from "./create-context";
import { smsAuthRouter } from "./routes/sms-auth";
import { gaslessMintRouter } from "./routes/gasless-mint";

export const appRouter = createTRPCRouter({
  smsAuth: smsAuthRouter,
  gasless: gaslessMintRouter,
});

export type AppRouter = typeof appRouter;
