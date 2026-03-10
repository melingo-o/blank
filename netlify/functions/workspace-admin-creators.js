const {
  HttpError,
  json,
  handleError,
  parseBody,
  createSupabaseAdmin,
  getUserFromRequest,
  maybeSingle
} = require("./utils/workspace");

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
    .select(
      "id, auth_user_id, name, channel_name, channel_concept, join_date, channel_url, login_email, total_views, subscribers_gained, created_at, updated_at"
    )
    .order("created_at", { ascending: false });

  if (error) {
    throw error;
  }

  return data || [];
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

  const existingCreator = await maybeSingle(
    supabase.from("creators").select("id").eq("id", creatorId).limit(1)
  );

  if (existingCreator) {
    throw new HttpError(409, "This creator ID is already in use.");
  }

  const existingEmail = await maybeSingle(
    supabase
      .from("creators")
      .select("id")
      .ilike("login_email", loginEmail)
      .limit(1)
  );

  if (existingEmail) {
    throw new HttpError(409, "This login email is already assigned.");
  }

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
    const insertPayload = {
      id: creatorId,
      auth_user_id: authData.user.id,
      name: String(payload.name).trim(),
      channel_name: String(payload.channelName).trim(),
      channel_concept: String(payload.channelConcept || "").trim() || null,
      join_date: String(payload.joinDate),
      channel_url: String(payload.channelUrl || "").trim() || null,
      login_email: loginEmail,
      total_views: Number(payload.totalViews || 0),
      subscribers_gained: Number(payload.subscribersGained || 0)
    };

    const { data, error } = await supabase
      .from("creators")
      .insert(insertPayload)
      .select(
        "id, auth_user_id, name, channel_name, channel_concept, join_date, channel_url, login_email, total_views, subscribers_gained, created_at, updated_at"
      )
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
    const existingEmail = await maybeSingle(
      supabase
        .from("creators")
        .select("id")
        .ilike("login_email", nextLoginEmail)
        .neq("id", creatorId)
        .limit(1)
    );

    if (existingEmail) {
      throw new HttpError(409, "This login email is already assigned.");
    }
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
    .select(
      "id, auth_user_id, name, channel_name, channel_concept, join_date, channel_url, login_email, total_views, subscribers_gained, created_at, updated_at"
    )
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
