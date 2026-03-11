const {
  HttpError,
  json,
  handleError,
  parseBody,
  createSupabaseAdmin,
  createSupabaseAuthClient,
  resolveLoginIdentifier
} = require("./utils/workspace");

function maskEmail(email = "") {
  const normalized = String(email || "").trim();
  const [localPart, domainPart] = normalized.split("@");

  if (!localPart || !domainPart) {
    return null;
  }

  if (localPart.length <= 2) {
    return `${localPart[0] || "*"}*@${domainPart}`;
  }

  return `${localPart.slice(0, 2)}***@${domainPart}`;
}

function normalizeRedirectTo(value = "") {
  const normalized = String(value || "").trim();

  if (!normalized) {
    return null;
  }

  if (!/^https?:\/\//i.test(normalized)) {
    throw new HttpError(400, "A valid redirect URL is required.");
  }

  return normalized;
}

exports.handler = async function handler(event) {
  try {
    if (event.httpMethod !== "POST") {
      return json(405, { error: "Method not allowed." });
    }

    const body = parseBody(event);
    const loginId = String(body.loginId || "").trim();
    const mode = body.mode === "admin" ? "admin" : "workspace";
    const redirectTo = normalizeRedirectTo(body.redirectTo);

    if (!loginId) {
      throw new HttpError(400, "ID is required.");
    }

    if (mode !== "admin") {
      throw new HttpError(403, "Only admin password recovery is supported here.");
    }

    const supabaseAdmin = createSupabaseAdmin();
    const authClient = createSupabaseAuthClient();
    const resolved = await resolveLoginIdentifier({
      supabase: supabaseAdmin,
      loginId,
      mode
    });

    if (resolved.role !== "admin") {
      throw new HttpError(403, "This ID is not authorized for admin recovery.");
    }

    const { error } = await authClient.auth.resetPasswordForEmail(
      resolved.email,
      redirectTo ? { redirectTo } : undefined
    );

    if (error) {
      throw new HttpError(400, error.message);
    }

    return json(200, {
      ok: true,
      message: "Password reset email sent. Open the link from your inbox to set a new password.",
      emailHint: maskEmail(resolved.email)
    });
  } catch (error) {
    return handleError(error);
  }
};
