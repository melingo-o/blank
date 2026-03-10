const {
  HttpError,
  json,
  handleError,
  parseBody,
  createSupabaseAdmin,
  authorizeCreatorAccess,
  storageRef,
  maybeSingle
} = require("./utils/workspace");

async function findContentForCreator(supabase, creatorId, contentId) {
  return maybeSingle(
    supabase
      .from("contents")
      .select("id, creator_id")
      .eq("id", contentId)
      .eq("creator_id", creatorId)
  );
}

exports.handler = async function handler(event) {
  try {
    if (event.httpMethod !== "POST") {
      return json(405, { error: "Method not allowed." });
    }

    const body = parseBody(event);
    const creatorId = body.creatorId;
    const action = body.action;
    const payload = body.payload || {};
    const supabase = createSupabaseAdmin();
    const { user } = await authorizeCreatorAccess({
      event,
      supabase,
      creatorId
    });

    let result = null;

    switch (action) {
      case "createMeeting": {
        const { data, error } = await supabase
          .from("meetings")
          .insert({
            creator_id: creatorId,
            meeting_type: payload.meetingType,
            date: payload.date,
            summary: payload.summary,
            notes: payload.notes || null,
            created_by: user.displayName
          })
          .select("*")
          .single();

        if (error) {
          throw error;
        }

        result = data;
        break;
      }

      case "createContent": {
        const { data, error } = await supabase
          .from("contents")
          .insert({
            creator_id: creatorId,
            title: payload.title,
            concept: payload.concept || null,
            script: payload.script || null,
            status: payload.status || "idea",
            publish_date: payload.publishDate || null
          })
          .select("*")
          .single();

        if (error) {
          throw error;
        }

        result = data;
        break;
      }

      case "updateContent": {
        const content = await findContentForCreator(supabase, creatorId, payload.contentId);

        if (!content) {
          throw new HttpError(404, "Content card was not found.");
        }

        const { data, error } = await supabase
          .from("contents")
          .update({
            title: payload.title,
            concept: payload.concept || null,
            script: payload.script || null,
            status: payload.status || "idea",
            publish_date: payload.publishDate || null
          })
          .eq("id", payload.contentId)
          .eq("creator_id", creatorId)
          .select("*")
          .single();

        if (error) {
          throw error;
        }

        result = data;
        break;
      }

      case "createFeedback": {
        const content = await findContentForCreator(supabase, creatorId, payload.contentId);

        if (!content) {
          throw new HttpError(404, "Content card was not found.");
        }

        const { data, error } = await supabase
          .from("feedback")
          .insert({
            content_id: payload.contentId,
            author: user.displayName,
            author_role: user.isCompanyAdmin ? "company" : "creator",
            comment: payload.comment
          })
          .select("*")
          .single();

        if (error) {
          throw error;
        }

        result = data;
        break;
      }

      case "createMilestone": {
        const { data, error } = await supabase
          .from("milestones")
          .insert({
            creator_id: creatorId,
            title: payload.title,
            description: payload.description || null,
            date: payload.date
          })
          .select("*")
          .single();

        if (error) {
          throw error;
        }

        result = data;
        break;
      }

      case "registerAttachment": {
        if (!payload.storageBucket || !payload.storagePath) {
          throw new HttpError(400, "Attachment storage metadata is required.");
        }

        if (payload.contentId) {
          const content = await findContentForCreator(supabase, creatorId, payload.contentId);

          if (!content) {
            throw new HttpError(404, "Content card was not found.");
          }
        }

        const { data, error } = await supabase
          .from("attachments")
          .insert({
            creator_id: creatorId,
            content_id: payload.contentId || null,
            meeting_id: payload.meetingId || null,
            title: payload.title || null,
            file_name: payload.fileName,
            file_type: payload.fileType || null,
            kind: payload.kind || "reference",
            storage_bucket: payload.storageBucket,
            storage_path: payload.storagePath,
            uploaded_by: user.displayName
          })
          .select("*")
          .single();

        if (error) {
          throw error;
        }

        if (payload.kind === "thumbnail" && payload.contentId) {
          const { error: updateError } = await supabase
            .from("contents")
            .update({
              thumbnail_url: storageRef(payload.storageBucket, payload.storagePath)
            })
            .eq("id", payload.contentId)
            .eq("creator_id", creatorId);

          if (updateError) {
            throw updateError;
          }
        }

        result = data;
        break;
      }

      default:
        throw new HttpError(400, `Unsupported action: ${action}`);
    }

    return json(200, {
      ok: true,
      data: result
    });
  } catch (error) {
    return handleError(error);
  }
};
