const {
  HttpError,
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

    if (!mapping.isAdmin && !mapping.creator) {
      throw new HttpError(
        401,
        "This email address is not approved for a creator workspace."
      );
    }

    return json(200, {
      ok: true
    });
  } catch (error) {
    return handleError(error);
  }
};
