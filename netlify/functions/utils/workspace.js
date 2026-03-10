const { createClient } = require("@supabase/supabase-js");

class HttpError extends Error {
  constructor(statusCode, message, details) {
    super(message);
    this.name = "HttpError";
    this.statusCode = statusCode;
    this.details = details;
  }
}

function json(statusCode, payload) {
  return {
    statusCode,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": "no-store"
    },
    body: JSON.stringify(payload)
  };
}

function handleError(error) {
  console.error(error);

  if (error instanceof HttpError) {
    return json(error.statusCode, {
      error: error.message,
      details: error.details || null
    });
  }

  return json(500, {
    error: error?.message || "Unexpected workspace error."
  });
}

function parseBody(event) {
  if (!event.body) {
    return {};
  }

  try {
    return JSON.parse(event.body);
  } catch {
    throw new HttpError(400, "Invalid JSON body.");
  }
}

function requireEnv(name) {
  const value = process.env[name];

  if (!value) {
    throw new HttpError(500, `Missing environment variable: ${name}`);
  }

  return value;
}

function createSupabaseAdmin() {
  const url = requireEnv("NEXT_PUBLIC_SUPABASE_URL");
  const serviceRoleKey = requireEnv("SUPABASE_SERVICE_ROLE_KEY");

  return createClient(url, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  });
}

function createSupabaseAuthClient() {
  const url = requireEnv("NEXT_PUBLIC_SUPABASE_URL");
  const anonKey = requireEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY");

  return createClient(url, anonKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  });
}

function getStorageBucket() {
  return process.env.WORKSPACE_STORAGE_BUCKET || "creator-workspace";
}

function normalizeRoles(value) {
  if (Array.isArray(value)) {
    return value.map(String).filter(Boolean);
  }

  if (typeof value === "string") {
    return value
      .split(",")
      .map((entry) => entry.trim())
      .filter(Boolean);
  }

  return [];
}

function normalizeLoginId(value) {
  return String(value || "").trim().toLowerCase();
}

function getAdminEmails() {
  return String(process.env.WORKSPACE_ADMIN_EMAILS || "")
    .split(",")
    .map((email) => email.trim().toLowerCase())
    .filter(Boolean);
}

function isConfiguredAdminEmail(email) {
  const normalizedEmail = normalizeLoginId(email);

  return !!normalizedEmail && (
    getAdminEmails().includes(normalizedEmail) ||
    normalizedEmail === getMasterAdminEmail()
  );
}

function getMasterAdminLoginId() {
  return normalizeLoginId(process.env.WORKSPACE_MASTER_LOGIN_ID || "admin");
}

function getMasterAdminEmail() {
  const explicitEmail = normalizeLoginId(process.env.WORKSPACE_MASTER_EMAIL);

  if (explicitEmail) {
    return explicitEmail;
  }

  return getAdminEmails()[0] || null;
}

async function maybeSingle(query) {
  const { data, error } = await query.maybeSingle();

  if (error && error.code !== "PGRST116") {
    throw error;
  }

  return data || null;
}

async function lookupCreatorByEmail(supabase, email) {
  const normalizedEmail = normalizeLoginId(email);

  if (!normalizedEmail) {
    return null;
  }

  return maybeSingle(
    supabase
      .from("creators")
      .select("id, name, channel_name, login_email")
      .ilike("login_email", normalizedEmail)
      .limit(1)
  );
}

async function lookupCreatorById(supabase, creatorId) {
  const normalizedCreatorId = normalizeLoginId(creatorId);

  if (!normalizedCreatorId) {
    return null;
  }

  return maybeSingle(
    supabase
      .from("creators")
      .select("id, name, channel_name, login_email")
      .eq("id", normalizedCreatorId)
      .limit(1)
  );
}

async function lookupAdminByUserIdRecord(supabase, userId) {
  if (!userId) {
    return null;
  }

  return maybeSingle(
    supabase
      .from("admin_users")
      .select("user_id, email")
      .eq("user_id", userId)
      .limit(1)
  );
}

async function lookupAdminByEmailRecord(supabase, email) {
  const normalizedEmail = normalizeLoginId(email);

  if (!normalizedEmail) {
    return null;
  }

  return maybeSingle(
    supabase
      .from("admin_users")
      .select("user_id, email")
      .ilike("email", normalizedEmail)
      .limit(1)
  );
}

async function lookupAdminByLoginIdRecord(supabase, loginId) {
  const normalizedLoginId = normalizeLoginId(loginId);
  const masterLoginId = getMasterAdminLoginId();
  const masterAdminEmail = getMasterAdminEmail();

  if (!normalizedLoginId || !masterLoginId || normalizedLoginId !== masterLoginId) {
    return null;
  }

  if (masterAdminEmail) {
    const adminRecord = await lookupAdminByEmailRecord(supabase, masterAdminEmail);

    if (adminRecord) {
      return adminRecord;
    }

    return buildConfiguredAdmin(masterAdminEmail);
  }

  return null;
}

function buildConfiguredAdmin(email) {
  return {
    user_id: null,
    email: normalizeLoginId(email),
    display_name: "Admin"
  };
}

async function lookupAdminByUser(supabase, userId, email, options = {}) {
  const { allowEnvFallback = true } = options;
  const byUserId = await lookupAdminByUserIdRecord(supabase, userId);

  if (byUserId) {
    return byUserId;
  }

  const byEmail = await lookupAdminByEmailRecord(supabase, email);

  if (byEmail) {
    return byEmail;
  }

  if (allowEnvFallback && isConfiguredAdminEmail(email)) {
    return buildConfiguredAdmin(email);
  }

  return null;
}

async function fetchAdminCreatorList(supabase) {
  const { data, error } = await supabase
    .from("creators")
    .select("id, name, channel_name")
    .order("name", { ascending: true });

  if (error) {
    throw error;
  }

  return data || [];
}

function getBearerToken(event) {
  const authorization =
    event?.headers?.authorization || event?.headers?.Authorization || "";
  const match = /^Bearer\s+(.+)$/i.exec(String(authorization));

  if (!match) {
    throw new HttpError(401, "Authentication required.");
  }

  return match[1].trim();
}

async function getUserFromRequest(event, supabase) {
  const accessToken = getBearerToken(event);
  const {
    data: { user },
    error
  } = await supabase.auth.getUser(accessToken);

  if (error || !user) {
    throw new HttpError(401, "Invalid or expired session.");
  }

  const email = normalizeLoginId(user.email);
  const [creator, admin] = await Promise.all([
    lookupCreatorByEmail(supabase, email),
    lookupAdminByUser(supabase, user.id, email, {
      allowEnvFallback: true
    })
  ]);
  const isCompanyAdmin = !!admin;
  const roles = isCompanyAdmin ? ["company_admin"] : [];
  const displayName =
    user.user_metadata?.full_name ||
    user.user_metadata?.name ||
    creator?.name ||
    admin?.display_name ||
    email ||
    "Workspace user";

  return {
    ...user,
    email,
    roles,
    creatorId: creator?.id || null,
    isCompanyAdmin,
    displayName
  };
}

async function authorizeCreatorAccess({ event, supabase, creatorId }) {
  if (!creatorId) {
    throw new HttpError(400, "creatorId is required.");
  }

  const user = await getUserFromRequest(event, supabase);

  if (user.isCompanyAdmin) {
    return { user, creatorId };
  }

  const allowedCreatorId = user.creatorId;

  if (!allowedCreatorId) {
    throw new HttpError(403, "No creator workspace is assigned to this account.");
  }

  if (allowedCreatorId !== creatorId) {
    throw new HttpError(403, "You do not have access to this workspace.");
  }

  return {
    user,
    creatorId: allowedCreatorId
  };
}

async function resolveLoginIdentifier({ supabase, loginId, mode = "workspace" }) {
  const normalizedLoginId = normalizeLoginId(loginId);

  if (!normalizedLoginId) {
    throw new HttpError(400, "ID is required.");
  }

  let creator = null;
  let admin = null;

  if (normalizedLoginId.includes("@")) {
    creator = await lookupCreatorByEmail(supabase, normalizedLoginId);
    admin =
      mode === "admin"
        ? await lookupAdminByEmailRecord(supabase, normalizedLoginId)
        : await lookupAdminByUser(supabase, null, normalizedLoginId, {
            allowEnvFallback: true
          });
  } else {
    creator = await lookupCreatorById(supabase, normalizedLoginId);
    admin =
      mode === "admin"
        ? await lookupAdminByLoginIdRecord(supabase, normalizedLoginId)
        : await lookupAdminByLoginIdRecord(supabase, normalizedLoginId);
  }

  if (mode === "admin") {
    const masterAdminMatch =
      normalizedLoginId === getMasterAdminLoginId() && getMasterAdminEmail();
    const adminEmail = normalizeLoginId(admin?.email || masterAdminMatch);

    if (!adminEmail) {
      throw new HttpError(403, "This ID is not authorized for the admin console.");
    }

    return {
      email: adminEmail,
      role: "admin",
      creatorId: null,
      redirectTo: "/admin/dashboard"
    };
  }

  if (admin?.email) {
    return {
      email: normalizeLoginId(admin.email),
      role: "admin",
      creatorId: null,
      redirectTo: "/workspace"
    };
  }

  if (!creator) {
    throw new HttpError(404, "This ID is not assigned to any creator workspace.");
  }

  if (!creator.login_email) {
    throw new HttpError(
      500,
      `The creator '${creator.id}' is missing a login_email value.`
    );
  }

  return {
    email: normalizeLoginId(creator.login_email),
    role: "creator",
    creatorId: creator.id,
    redirectTo: `/workspace/${encodeURIComponent(creator.id)}`
  };
}

function sanitizeFileName(fileName = "") {
  const cleaned = String(fileName)
    .toLowerCase()
    .replace(/[^a-z0-9._-]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");

  return cleaned || "attachment";
}

function buildStoragePath(creatorId, fileName) {
  const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
  const random = Math.random().toString(36).slice(2, 8);
  return `${creatorId}/${timestamp}-${random}-${sanitizeFileName(fileName)}`;
}

function storageRef(bucket, path) {
  return `storage://${bucket}/${path}`;
}

function parseStorageRef(value) {
  if (!value || typeof value !== "string") {
    return null;
  }

  if (/^https?:\/\//.test(value)) {
    return {
      external: true,
      url: value
    };
  }

  const match = /^storage:\/\/([^/]+)\/(.+)$/.exec(value);

  if (!match) {
    return null;
  }

  return {
    bucket: match[1],
    path: match[2]
  };
}

async function signMaybeStorageRef(supabase, value, expiresIn = 3600) {
  const parsed = parseStorageRef(value);

  if (!parsed) {
    return value || null;
  }

  if (parsed.external) {
    return parsed.url;
  }

  const { data, error } = await supabase.storage
    .from(parsed.bucket)
    .createSignedUrl(parsed.path, expiresIn);

  if (error) {
    console.error(error);
    return null;
  }

  return data?.signedUrl || null;
}

async function loadWorkspaceData(supabase, creatorId) {
  const creator = await maybeSingle(
    supabase
      .from("creators")
      .select(
        "id, name, channel_name, channel_concept, join_date, channel_url, total_views, subscribers_gained, created_at, updated_at"
      )
      .eq("id", creatorId)
  );

  if (!creator) {
    throw new HttpError(404, `Workspace for creator '${creatorId}' was not found.`);
  }

  const [meetingsResult, contentsResult, milestonesResult, attachmentsResult] =
    await Promise.all([
      supabase
        .from("meetings")
        .select(
          "id, creator_id, meeting_type, date, summary, notes, created_by, created_at"
        )
        .eq("creator_id", creatorId)
        .order("date", { ascending: false }),
      supabase
        .from("contents")
        .select(
          "id, creator_id, title, concept, script, thumbnail_url, status, publish_date, created_at, updated_at"
        )
        .eq("creator_id", creatorId)
        .order("updated_at", { ascending: false }),
      supabase
        .from("milestones")
        .select("id, creator_id, title, description, date, created_at")
        .eq("creator_id", creatorId)
        .order("date", { ascending: true }),
      supabase
        .from("attachments")
        .select(
          "id, creator_id, content_id, meeting_id, title, file_name, file_type, kind, storage_bucket, storage_path, uploaded_by, created_at"
        )
        .eq("creator_id", creatorId)
        .order("created_at", { ascending: false })
    ]);

  [meetingsResult, contentsResult, milestonesResult, attachmentsResult].forEach((result) => {
    if (result.error) {
      throw result.error;
    }
  });

  const meetings = meetingsResult.data || [];
  const contents = contentsResult.data || [];
  const milestones = milestonesResult.data || [];
  const attachments = attachmentsResult.data || [];
  const contentIds = contents.map((item) => item.id);

  let feedback = [];

  if (contentIds.length > 0) {
    const { data, error } = await supabase
      .from("feedback")
      .select("id, content_id, author, author_role, comment, created_at")
      .in("content_id", contentIds)
      .order("created_at", { ascending: false });

    if (error) {
      throw error;
    }

    feedback = data || [];
  }

  const signedContents = await Promise.all(
    contents.map(async (item) => ({
      ...item,
      thumbnail_signed_url: await signMaybeStorageRef(supabase, item.thumbnail_url)
    }))
  );

  const signedAttachments = await Promise.all(
    attachments.map(async (item) => ({
      ...item,
      signed_url: await signMaybeStorageRef(
        supabase,
        storageRef(item.storage_bucket, item.storage_path)
      )
    }))
  );

  return {
    creator,
    meetings,
    contents: signedContents,
    feedback,
    milestones,
    attachments: signedAttachments,
    stats: {
      videosPublished: contents.filter((item) => item.status === "published").length,
      totalViews: Number(creator.total_views || 0),
      subscribersGained: Number(creator.subscribers_gained || 0)
    }
  };
}

async function buildIdentityMapping(supabase, identityUser) {
  const email = normalizeLoginId(identityUser?.email);
  const creator = await lookupCreatorByEmail(supabase, email);
  const roles = Array.from(
    new Set(normalizeRoles(identityUser?.app_metadata?.roles))
  );

  if (isConfiguredAdminEmail(email)) {
    roles.push("company_admin");
  }

  const appMetadata = {
    ...(identityUser?.app_metadata || {})
  };

  if (roles.length > 0) {
    appMetadata.roles = Array.from(new Set(roles));
  }

  if (creator) {
    appMetadata.creator_id = creator.id;
  }

  return {
    creator,
    isAdmin: isConfiguredAdminEmail(email),
    appMetadata,
    userMetadata: {
      ...(identityUser?.user_metadata || {}),
      creator_name: creator?.name || identityUser?.user_metadata?.creator_name,
      creator_channel:
        creator?.channel_name || identityUser?.user_metadata?.creator_channel
    }
  };
}

module.exports = {
  HttpError,
  json,
  handleError,
  parseBody,
  createSupabaseAdmin,
  createSupabaseAuthClient,
  getStorageBucket,
  getUserFromRequest,
  lookupCreatorByEmail,
  lookupCreatorById,
  fetchAdminCreatorList,
  authorizeCreatorAccess,
  resolveLoginIdentifier,
  buildStoragePath,
  storageRef,
  loadWorkspaceData,
  buildIdentityMapping,
  maybeSingle
};
