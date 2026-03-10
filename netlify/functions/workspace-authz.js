const {
  json,
  handleError,
  createSupabaseAdmin,
  fetchAdminCreatorList,
  getUserFromContext,
  lookupCreatorByEmail
} = require("./utils/workspace");

exports.handler = async function handler(event, context) {
  try {
    const supabase = createSupabaseAdmin();
    const user = getUserFromContext(context);
    const requestedCreatorId = event.queryStringParameters?.creatorId || null;
    const creatorMatch =
      user.creatorId ? { id: user.creatorId } : await lookupCreatorByEmail(supabase, user.email);
    const effectiveCreatorId = user.creatorId || creatorMatch?.id || null;

    if (!user.isCompanyAdmin && requestedCreatorId && effectiveCreatorId !== requestedCreatorId) {
      return json(403, {
        error: "You do not have access to this workspace."
      });
    }

    const creators = user.isCompanyAdmin ? await fetchAdminCreatorList(supabase) : [];

    return json(200, {
      user: {
        email: user.email,
        displayName: user.displayName,
        roles: user.roles,
        creatorId: effectiveCreatorId,
        isCompanyAdmin: user.isCompanyAdmin
      },
      redirectCreatorId: effectiveCreatorId,
      creators
    });
  } catch (error) {
    return handleError(error);
  }
};
