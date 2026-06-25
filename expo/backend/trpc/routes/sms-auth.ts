import * as z from "zod";
import { getAdminAuth } from "@/backend/lib/firebase-admin";
import { createTRPCRouter, publicProcedure } from "../create-context";

const verificationCodes = new Map<string, { code: string; expiresAt: number }>();

export const smsAuthRouter = createTRPCRouter({
  sendVerificationCode: publicProcedure
    .input(z.object({
      phoneNumber: z.string(),
    }))
    .mutation(async ({ input }) => {
      try {
        const code = Math.floor(100000 + Math.random() * 900000).toString();
        const expiresAt = Date.now() + 5 * 60 * 1000;
        
        verificationCodes.set(input.phoneNumber, { code, expiresAt });
        
        return {
          success: true,
          message: `認証コードを${input.phoneNumber}に送信しました`,
          devCode: process.env.NODE_ENV === 'development' ? code : undefined,
        };
      } catch (error: any) {
        throw new Error(`SMS送信エラー: ${error.message}`);
      }
    }),

  verifyCode: publicProcedure
    .input(z.object({
      phoneNumber: z.string(),
      code: z.string(),
    }))
    .mutation(async ({ input }) => {
      try {
        const stored = verificationCodes.get(input.phoneNumber);
        
        if (!stored) {
          throw new Error('認証コードが見つかりません。再送信してください。');
        }
        
        if (Date.now() > stored.expiresAt) {
          verificationCodes.delete(input.phoneNumber);
          throw new Error('認証コードの有効期限が切れました。再送信してください。');
        }
        
        if (stored.code !== input.code) {
          throw new Error('認証コードが正しくありません');
        }
        
        verificationCodes.delete(input.phoneNumber);
        
        const auth = getAdminAuth();
        let uid: string;
        
        try {
          const userRecord = await auth.getUserByPhoneNumber(input.phoneNumber);
          uid = userRecord.uid;
        } catch (error: any) {
          if (error.code === 'auth/user-not-found') {
            const newUser = await auth.createUser({
              phoneNumber: input.phoneNumber,
            });
            uid = newUser.uid;
          } else {
            throw error;
          }
        }
        
        const customToken = await auth.createCustomToken(uid);
        
        return {
          success: true,
          uid,
          customToken,
        };
      } catch (error: any) {
        throw new Error(`認証エラー: ${error.message}`);
      }
    }),

  checkPhoneDuplicate: publicProcedure
    .input(z.object({
      phoneNumber: z.string(),
    }))
    .query(async ({ input }) => {
      try {
        const auth = getAdminAuth();
        
        try {
          await auth.getUserByPhoneNumber(input.phoneNumber);
          return { isDuplicate: true };
        } catch (error: any) {
          if (error.code === 'auth/user-not-found') {
            return { isDuplicate: false };
          }
          throw error;
        }
      } catch (error: any) {
        throw new Error(`重複チェックエラー: ${error.message}`);
      }
    }),
});
