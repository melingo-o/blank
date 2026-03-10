const {
  json,
  handleError,
  parseBody,
  createSupabaseAdmin,
  buildIdentityMapping
} = require("./utils/workspace");

exports.handler = async function handler(event) {
  try {
    const payload = parseBody(event);
    const identityUser = payload.user || payload;
    const supabase = createSupabaseAdmin();
    const mapping = await buildIdentityMapping(supabase, identityUser);

    return json(200, {
      app_metadata: mapping.appMetadata,
      user_metadata: mapping.userMetadata
    });
  } catch (error) {
    return handleError(error);
  }
};
