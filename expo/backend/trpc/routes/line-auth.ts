/**
 * LINE OAuth backend routes
 *
 * - POST /api/line/exchange: 認可コード → アクセストークン → プロフィール取得
 *   - currentUid あり → 既存ユーザーにLINE連携（line_user_id付与）
 *   - currentUid なし & line_user_id 既存 → カスタムトークン返却（ログイン）
 *   - currentUid なし & line_user_id 未存在 → status: 'new_user'
 * - POST /api/line/register: 新規LINEユーザー作成 → カスタムトークン返却
 */

import { Hono } from 'hono';
import { getAdminAuth, getAdminFirestore } from '../../lib/firebase-admin';
import { FieldValue } from 'firebase-admin/firestore';

const LINE_TOKEN_URL = 'https://api.line.me/oauth2/v2.1/token';
const LINE_PROFILE_URL = 'https://api.line.me/v2/profile';

interface LineProfileResponse {
  userId: string;
  displayName: string;
  pictureUrl?: string;
}

interface ExchangeBody {
  code: string;
  redirectUri: string;
  currentUid: string | null;
}

interface RegisterBody {
  lineUserId: string;
  lineDisplayName: string;
  linePictureUrl: string | null;
  name: string;
  role: 'hairdresser' | 'customer';
  gender: string;
  workplace?: string;
  workplaceName?: string;
  selfIntroduction?: string;
  latitude?: number;
  longitude?: number;
  address?: string;
  availableServices?: string[];
  referredBy?: string;
}

export const lineRoutes = new Hono();

/** 認可コードをアクセストークンと交換しLINE プロフィールを取得 */
async function exchangeCodeAndGetProfile(
  code: string,
  redirectUri: string,
): Promise<LineProfileResponse> {
  const channelId = process.env.EXPO_PUBLIC_LINE_CHANNEL_ID;
  const channelSecret = process.env.LINE_CHANNEL_SECRET;

  if (!channelId || !channelSecret) {
    throw new Error('LINE channel credentials are not configured');
  }

  const tokenResponse = await fetch(LINE_TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'authorization_code',
      code,
      redirect_uri: redirectUri,
      client_id: channelId,
      client_secret: channelSecret,
    }),
  });

  if (!tokenResponse.ok) {
    const errText = await tokenResponse.text();
    throw new Error(`LINE token exchange failed: ${errText}`);
  }

  const tokenData = await tokenResponse.json();
  const accessToken = tokenData.access_token;

  // LINE Profile API
  const profileResponse = await fetch(LINE_PROFILE_URL, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  if (!profileResponse.ok) {
    throw new Error('LINE profile fetch failed');
  }

  return profileResponse.json();
}

// ─── POST /api/line/exchange ───
lineRoutes.post('/exchange', async (c) => {
  try {
    const body = await c.req.json<ExchangeBody>();

    if (!body.code || !body.redirectUri) {
      return c.json({ error: 'code and redirectUri are required' }, 400);
    }

    const profile = await exchangeCodeAndGetProfile(
      body.code,
      body.redirectUri,
    );

    const adminAuth = getAdminAuth();
    const adminDb = getAdminFirestore();

    // currentUid がある場合 → 既存ユーザーへのLINE連携
    if (body.currentUid) {
      const userDocRef = adminDb.doc(`users/${body.currentUid}`);
      const userDoc = await userDocRef.get();

      if (!userDoc.exists) {
        return c.json({ error: 'User not found' }, 404);
      }

      // line_user_id が既に別のユーザーに紐付いているか確認
      const existingLineQuery = await adminDb
        .collection('users')
        .where('line_user_id', '==', profile.userId)
        .limit(1)
        .get();

      if (!existingLineQuery.empty) {
        const existingDoc = existingLineQuery.docs[0];
        if (existingDoc.id !== body.currentUid) {
          return c.json(
            { error: 'このLINEアカウントは別のユーザーに連携されています' },
            409,
          );
        }
      }

      await userDocRef.update({
        line_user_id: profile.userId,
        line_display_name: profile.displayName,
        line_picture_url: profile.pictureUrl ?? null,
        line_connected_at: FieldValue.serverTimestamp(),
      });

      return c.json({
        status: 'linked',
        lineUserId: profile.userId,
        displayName: profile.displayName,
        pictureUrl: profile.pictureUrl ?? null,
      });
    }

    // currentUid がない場合 → LINEログイン or 新規判定
    const lineQuery = await adminDb
      .collection('users')
      .where('line_user_id', '==', profile.userId)
      .limit(1)
      .get();

    if (!lineQuery.empty) {
      // 既存ユーザー → カスタムトークン発行
      const existingDoc = lineQuery.docs[0];
      const uid = existingDoc.id;
      const customToken = await adminAuth.createCustomToken(uid);

      // LINE情報を更新（プロフィール画像・表示名が変更されている可能性）
      await existingDoc.ref.update({
        line_display_name: profile.displayName,
        line_picture_url: profile.pictureUrl ?? null,
      });

      return c.json({
        status: 'login',
        customToken,
        lineUserId: profile.userId,
        displayName: profile.displayName,
        pictureUrl: profile.pictureUrl ?? null,
      });
    }

    // 新規ユーザー
    return c.json({
      status: 'new_user',
      lineUserId: profile.userId,
      displayName: profile.displayName,
      pictureUrl: profile.pictureUrl ?? null,
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : 'LINE exchange failed';
    console.error('[LINE Exchange] Error:', message);
    return c.json({ error: message }, 500);
  }
});

// ─── POST /api/line/register ───
lineRoutes.post('/register', async (c) => {
  try {
    const body = await c.req.json<RegisterBody>();

    if (!body.lineUserId || !body.name || !body.role) {
      return c.json({ error: 'lineUserId, name, and role are required' }, 400);
    }

    const adminAuth = getAdminAuth();
    const adminDb = getAdminFirestore();

    // 重複チェック: 同じLINE User IDが既に存在しないか
    const existingQuery = await adminDb
      .collection('users')
      .where('line_user_id', '==', body.lineUserId)
      .limit(1)
      .get();

    if (!existingQuery.empty) {
      const existingDoc = existingQuery.docs[0];
      const customToken = await adminAuth.createCustomToken(existingDoc.id);
      return c.json({
        status: 'login',
        customToken,
        lineUserId: body.lineUserId,
        displayName: body.lineDisplayName,
        pictureUrl: body.linePictureUrl,
      });
    }

    // Firebase Auth ユーザー作成（email不要・LINE User IDをuid生成元として使用）
    const firebaseUser = await adminAuth.createUser({
      displayName: body.name,
    });

    const uid = firebaseUser.uid;

    const userDocData: Record<string, unknown> = {
      name: body.name,
      email: `${body.lineUserId}@line.local`,
      role: body.role,
      gender: body.gender || 'unspecified',
      profileImageUri: body.linePictureUrl || null,
      status: 'approved',
      isVerified: false,
      isLineUser: true,
      line_user_id: body.lineUserId,
      line_display_name: body.lineDisplayName,
      line_picture_url: body.linePictureUrl || null,
      line_connected_at: FieldValue.serverTimestamp(),
      createdAt: FieldValue.serverTimestamp(),
    };

    if (body.referredBy) {
      userDocData.referredBy = body.referredBy;
    }

    if (body.role === 'hairdresser') {
      userDocData.workplace = body.workplace || null;
      userDocData.workplaceName = body.workplaceName || null;
      userDocData.hairdresserId =
        'ST' + Math.random().toString(36).substr(2, 6);
      userDocData.availableServices = body.availableServices || [];
      userDocData.selfIntroduction = body.selfIntroduction || null;
      userDocData.latitude = body.latitude ?? null;
      userDocData.longitude = body.longitude ?? null;
      userDocData.address = body.address || null;
      userDocData.recommendations = [];
      userDocData.recommendationBt = 0;
      userDocData.btBalance = 0;
    }

    await adminDb.doc(`users/${uid}`).set(userDocData);

    const customToken = await adminAuth.createCustomToken(uid);

    return c.json({
      status: 'login',
      customToken,
      lineUserId: body.lineUserId,
      displayName: body.lineDisplayName,
      pictureUrl: body.linePictureUrl,
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : 'LINE register failed';
    console.error('[LINE Register] Error:', message);
    return c.json({ error: message }, 500);
  }
});
