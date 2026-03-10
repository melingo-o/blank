const {
  json,
  handleError,
  createSupabaseAdmin,
  authorizeCreatorAccess,
  loadWorkspaceData
} = require("./utils/workspace");

exports.handler = async function handler(event) {
  try {
    if (event.httpMethod !== "GET") {
      return json(405, { error: "Method not allowed." });
    }

    const creatorId = event.queryStringParameters?.creatorId || null;
    const supabase = createSupabaseAdmin();

    await authorizeCreatorAccess({
      event,
      supabase,
      creatorId
    });

    const payload = await loadWorkspaceData(supabase, creatorId);
    return json(200, payload);
  } catch (error) {
    return handleError(error);
  }
};
