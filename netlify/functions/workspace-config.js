const { HttpError, json, handleError, getStorageBucket } = require("./utils/workspace");

exports.handler = async function handler() {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    if (!supabaseUrl || !supabaseAnonKey) {
      throw new HttpError(
        500,
        "Supabase public environment variables are not configured."
      );
    }

    return json(200, {
      supabaseUrl,
      supabaseAnonKey,
      storageBucket: getStorageBucket()
    });
  } catch (error) {
    return handleError(error);
  }
};
