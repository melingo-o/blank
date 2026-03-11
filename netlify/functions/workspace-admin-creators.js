const {
  HttpError,
  json,
  handleError,
  parseBody,
  createSupabaseAdmin,
  getUserFromRequest,
  maybeSingle
} = require("./utils/workspace");

const CREATOR_SELECT_FIELDS =
  "id, auth_user_id, name, channel_name, channel_concept, join_date, channel_url, login_email, total_views, subscribers_gained, created_at, updated_at";

function sanitizeCreatorId(value = "") {
  const normalized = String(value)
    .trim()
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .replace(/-{2,}/g, "-");

  return normalized;
}

function normalizeEmail(value = "") {
  return String(value || "").trim().toLowerCase();
}

async function requireCompanyAdmin(event, supabase) {
  const user = await getUserFromRequest(event, supabase);

  if (!user.isCompanyAdmin) {
    throw new HttpError(403, "Admin access is required.");
  }

  return user;
}

async function listCreators(supabase) {
  const { data, error } = await supabase
    .from("creators")
    .select(CREATOR_SELECT_FIELDS)
    .order("created_at", { ascending: false });

  if (error) {
    throw error;
  }

  return data || [];
}

async function findCreatorById(supabase, creatorId) {
  return maybeSingle(
    supabase.from("creators").select(CREATOR_SELECT_FIELDS).eq("id", creatorId).limit(1)
  );
}

async function ensureCreatorIdAvailable(supabase, creatorId) {
  const existingCreator = await maybeSingle(
    supabase.from("creators").select("id").eq("id", creatorId).limit(1)
  );

  if (existingCreator) {
    throw new HttpError(409, "This creator ID is already in use.");
  }
}

async function ensureLoginEmailAvailable(supabase, loginEmail, creatorIdToExclude = null) {
  if (!loginEmail) {
    return;
  }

  let query = supabase.from("creators").select("id").ilike("login_email", loginEmail).limit(1);

  if (creatorIdToExclude) {
    query = query.neq("id", creatorIdToExclude);
  }

  const existingEmail = await maybeSingle(query);

  if (existingEmail) {
    throw new HttpError(409, "This login email is already assigned.");
  }
}

function buildCreatorProfilePayload(payload, overrides = {}) {
  return {
    id: sanitizeCreatorId(payload.creatorId || payload.id),
    auth_user_id: overrides.auth_user_id || null,
    name: String(payload.name || "").trim(),
    channel_name: String(payload.channelName || payload.channel_name || "").trim(),
    channel_concept: String(payload.channelConcept || payload.channel_concept || "").trim() || null,
    join_date: String(payload.joinDate || payload.join_date || ""),
    channel_url: String(payload.channelUrl || payload.channel_url || "").trim() || null,
    login_email: overrides.login_email === undefined ? null : overrides.login_email,
    total_views: Number(payload.totalViews || payload.total_views || 0),
    subscribers_gained: Number(payload.subscribersGained || payload.subscribers_gained || 0)
  };
}

async function createCreatorProfile(supabase, payload) {
  const creatorId = sanitizeCreatorId(payload.creatorId);

  if (!creatorId) {
    throw new HttpError(400, "Creator ID is required.");
  }

  if (!payload.name || !payload.channelName || !payload.joinDate) {
    throw new HttpError(400, "Missing required creator fields.");
  }

  await ensureCreatorIdAvailable(supabase, creatorId);

  const insertPayload = buildCreatorProfilePayload(payload, {
    auth_user_id: null,
    login_email: null
  });

  const { data, error } = await supabase
    .from("creators")
    .insert(insertPayload)
    .select(CREATOR_SELECT_FIELDS)
    .single();

  if (error) {
    throw error;
  }

  return data;
}

async function createCreator(supabase, payload) {
  const creatorId = sanitizeCreatorId(payload.creatorId);
  const loginEmail = normalizeEmail(payload.loginEmail);
  const password = String(payload.password || "");

  if (!creatorId) {
    throw new HttpError(400, "Creator ID is required.");
  }

  if (!payload.name || !payload.channelName || !payload.joinDate || !loginEmail || !password) {
    throw new HttpError(400, "Missing required creator fields.");
  }

  await ensureCreatorIdAvailable(supabase, creatorId);
  await ensureLoginEmailAvailable(supabase, loginEmail);

  const { data: authData, error: authError } = await supabase.auth.admin.createUser({
    email: loginEmail,
    password,
    email_confirm: true,
    user_metadata: {
      full_name: String(payload.name),
      creator_id: creatorId
    }
  });

  if (authError || !authData?.user) {
    throw new HttpError(400, authError?.message || "Unable to create the auth account.");
  }

  try {
    const insertPayload = buildCreatorProfilePayload(payload, {
      auth_user_id: authData.user.id,
      login_email: loginEmail
    });

    const { data, error } = await supabase
      .from("creators")
      .insert(insertPayload)
      .select(CREATOR_SELECT_FIELDS)
      .single();

    if (error) {
      throw error;
    }

    return data;
  } catch (error) {
    await supabase.auth.admin.deleteUser(authData.user.id).catch(() => null);
    throw error;
  }
}

async function issueCreatorAccount(supabase, payload) {
  const creatorId = sanitizeCreatorId(payload.creatorId);
  const loginEmail = normalizeEmail(payload.loginEmail);
  const password = String(payload.password || "");

  if (!creatorId || !loginEmail || !password) {
    throw new HttpError(400, "Creator ID, login email, and password are required.");
  }

  const creator = await findCreatorById(supabase, creatorId);

  if (!creator) {
    throw new HttpError(404, "Creator not found.");
  }

  if (creator.auth_user_id || creator.login_email) {
    throw new HttpError(409, "This creator already has an issued account.");
  }

  await ensureLoginEmailAvailable(supabase, loginEmail, creatorId);

  const { data: authData, error: authError } = await supabase.auth.admin.createUser({
    email: loginEmail,
    password,
    email_confirm: true,
    user_metadata: {
      full_name: creator.name,
      creator_id: creator.id
    }
  });

  if (authError || !authData?.user) {
    throw new HttpError(400, authError?.message || "Unable to create the auth account.");
  }

  try {
    const { data, error } = await supabase
      .from("creators")
      .update({
        auth_user_id: authData.user.id,
        login_email: loginEmail
      })
      .eq("id", creatorId)
      .select(CREATOR_SELECT_FIELDS)
      .single();

    if (error) {
      throw error;
    }

    return data;
  } catch (error) {
    await supabase.auth.admin.deleteUser(authData.user.id).catch(() => null);
    throw error;
  }
}

async function updateCreator(supabase, payload) {
  const creatorId = sanitizeCreatorId(payload.creatorId);

  if (!creatorId) {
    throw new HttpError(400, "Creator ID is required.");
  }

  const creator = await maybeSingle(
    supabase
      .from("creators")
      .select("id, auth_user_id, login_email")
      .eq("id", creatorId)
      .limit(1)
  );

  if (!creator) {
    throw new HttpError(404, "Creator not found.");
  }

  const nextLoginEmail = normalizeEmail(payload.loginEmail || creator.login_email);

  if (nextLoginEmail && nextLoginEmail !== normalizeEmail(creator.login_email)) {
    await ensureLoginEmailAvailable(supabase, nextLoginEmail, creatorId);
  }

  if (creator.auth_user_id && nextLoginEmail && nextLoginEmail !== normalizeEmail(creator.login_email)) {
    const { error: authUpdateError } = await supabase.auth.admin.updateUserById(
      creator.auth_user_id,
      {
        email: nextLoginEmail,
        email_confirm: true
      }
    );

    if (authUpdateError) {
      throw new HttpError(400, authUpdateError.message || "Unable to update the auth email.");
    }
  }

  const { data, error } = await supabase
    .from("creators")
    .update({
      name: String(payload.name).trim(),
      channel_name: String(payload.channelName).trim(),
      channel_concept: String(payload.channelConcept || "").trim() || null,
      join_date: String(payload.joinDate),
      channel_url: String(payload.channelUrl || "").trim() || null,
      login_email: nextLoginEmail || null,
      total_views: Number(payload.totalViews || 0),
      subscribers_gained: Number(payload.subscribersGained || 0)
    })
    .eq("id", creatorId)
    .select(CREATOR_SELECT_FIELDS)
    .single();

  if (error) {
    throw error;
  }

  return data;
}

async function resetCreatorPassword(supabase, payload) {
  const creatorId = sanitizeCreatorId(payload.creatorId);
  const password = String(payload.password || "");

  if (!creatorId || !password) {
    throw new HttpError(400, "Creator ID and a new password are required.");
  }

  const creator = await maybeSingle(
    supabase
      .from("creators")
      .select("id, auth_user_id")
      .eq("id", creatorId)
      .limit(1)
  );

  if (!creator?.auth_user_id) {
    throw new HttpError(404, "This creator does not have an auth account yet.");
  }

  const { error } = await supabase.auth.admin.updateUserById(creator.auth_user_id, {
    password
  });

  if (error) {
    throw new HttpError(400, error.message || "Unable to reset the password.");
  }

  return { ok: true };
}

exports.handler = async function handler(event) {
  try {
    const supabase = createSupabaseAdmin();
    await requireCompanyAdmin(event, supabase);

    if (event.httpMethod === "GET") {
      return json(200, {
        creators: await listCreators(supabase)
      });
    }

    if (event.httpMethod !== "POST") {
      return json(405, { error: "Method not allowed." });
    }

    const body = parseBody(event);
    const action = body.action;

    if (action === "createCreator") {
      return json(200, {
        ok: true,
        creator: await createCreator(supabase, body.payload || {})
      });
    }

    if (action === "createCreatorProfile") {
      return json(200, {
        ok: true,
        creator: await createCreatorProfile(supabase, body.payload || {})
      });
    }

    if (action === "issueCreatorAccount") {
      return json(200, {
        ok: true,
        creator: await issueCreatorAccount(supabase, body.payload || {})
      });
    }

    if (action === "updateCreator") {
      return json(200, {
        ok: true,
        creator: await updateCreator(supabase, body.payload || {})
      });
    }

    if (action === "resetCreatorPassword") {
      return json(200, {
        ok: true,
        result: await resetCreatorPassword(supabase, body.payload || {})
      });
    }

    throw new HttpError(400, `Unsupported action: ${action}`);
  } catch (error) {
    return handleError(error);
  }
};
