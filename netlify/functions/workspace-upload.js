const {
  json,
  handleError,
  parseBody,
  createSupabaseAdmin,
  authorizeCreatorAccess,
  getStorageBucket,
  buildStoragePath
} = require("./utils/workspace");

exports.handler = async function handler(event) {
  try {
    if (event.httpMethod !== "POST") {
      return json(405, { error: "Method not allowed." });
    }

    const body = parseBody(event);
    const creatorId = body.creatorId;
    const supabase = createSupabaseAdmin();

    await authorizeCreatorAccess({
      event,
      supabase,
      creatorId
    });

    const bucket = getStorageBucket();
    const path = buildStoragePath(creatorId, body.fileName || "attachment");
    const { data, error } = await supabase.storage.from(bucket).createSignedUploadUrl(path, {
      upsert: true
    });

    if (error) {
      throw error;
    }

    return json(200, {
      bucket,
      path: data.path,
      token: data.token
    });
  } catch (error) {
    return handleError(error);
  }
};
