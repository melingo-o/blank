const {
  HttpError,
  json,
  handleError,
  parseBody,
  createSupabaseAdmin,
  createSupabaseAuthClient,
  resolveLoginIdentifier
} = require("./utils/workspace");

exports.handler = async function handler(event) {
  try {
    if (event.httpMethod !== "POST") {
      return json(405, { error: "Method not allowed." });
    }

    const body = parseBody(event);
    const loginId = String(body.loginId || "").trim();
    const password = String(body.password || "");
    const mode = body.mode === "admin" ? "admin" : "workspace";

    if (!loginId) {
      throw new HttpError(400, "ID is required.");
    }

    if (!password) {
      throw new HttpError(400, "Password is required.");
    }

    const supabaseAdmin = createSupabaseAdmin();
    const authClient = createSupabaseAuthClient();
    const resolved = await resolveLoginIdentifier({
      supabase: supabaseAdmin,
      loginId,
      mode
    });
    const {
      data: { session, user },
      error
    } = await authClient.auth.signInWithPassword({
      email: resolved.email,
      password
    });

    if (error || !session || !user) {
      throw new HttpError(401, "Invalid ID or password.");
    }

    return json(200, {
      ok: true,
      redirectTo: resolved.redirectTo,
      creatorId: resolved.creatorId,
      isCompanyAdmin: resolved.role === "admin",
      accessToken: session.access_token,
      refreshToken: session.refresh_token,
      expiresAt: session.expires_at
    });
  } catch (error) {
    return handleError(error);
  }
};
