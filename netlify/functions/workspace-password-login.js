const {
  HttpError,
  json,
  handleError,
  parseBody,
  createSupabaseAdmin,
  createSupabaseAuthClient,
  resolveLoginIdentifier,
  fetchAdminCreatorList,
  normalizeWorkspaceProfile,
  loadWorkspaceData
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

    const workspaceProfile = normalizeWorkspaceProfile(user.user_metadata?.workspace_profile);
    const displayName =
      workspaceProfile.nickname ||
      user.user_metadata?.full_name ||
      user.user_metadata?.name ||
      resolved.loginId ||
      user.email ||
      "Workspace user";
    const creators =
      mode === "workspace" && resolved.role === "admin"
        ? await fetchAdminCreatorList(supabaseAdmin)
        : [];
    const initialCreatorId =
      mode === "workspace"
        ? resolved.creatorId || creators[0]?.id || null
        : resolved.creatorId || null;
    const workspaceData =
      mode === "workspace" && initialCreatorId
        ? await loadWorkspaceData(supabaseAdmin, initialCreatorId)
        : null;
    const redirectTo =
      mode === "workspace" && initialCreatorId
        ? `/workspace/${encodeURIComponent(initialCreatorId)}`
        : resolved.redirectTo;

    return json(200, {
      ok: true,
      redirectTo,
      creatorId: initialCreatorId,
      isCompanyAdmin: resolved.role === "admin",
      loginId: resolved.loginId,
      redirectCreatorId: initialCreatorId,
      creators,
      workspaceData,
      user: {
        email: String(user.email || "").trim().toLowerCase(),
        displayName,
        roles: resolved.role === "admin" ? ["company_admin"] : [],
        creatorId: initialCreatorId,
        isCompanyAdmin: resolved.role === "admin",
        loginId: resolved.loginId,
        workspaceProfile
      },
      accessToken: session.access_token,
      refreshToken: session.refresh_token,
      expiresAt: session.expires_at
    });
  } catch (error) {
    return handleError(error);
  }
};
