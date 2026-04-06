import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { planId, userId } = await req.json();

    if (!planId || !userId) {
      return new Response(
        JSON.stringify({ error: "planId and userId are required." }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Only claim if plan has no user_id yet (prevent hijacking)
    const { error } = await supabase
      .from("plans")
      .update({ user_id: userId, email: null })
      .eq("id", planId)
      .is("user_id", null);

    if (error) {
      console.error("Claim plan error:", error.message);
      return new Response(
        JSON.stringify({ error: "Failed to claim plan." }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Also update email from user profile
    const { data: userData } = await supabase.auth.admin.getUserById(userId);
    if (userData?.user?.email) {
      await supabase
        .from("plans")
        .update({ email: userData.user.email })
        .eq("id", planId);
    }

    return new Response(
      JSON.stringify({ success: true }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("Claim plan error:", err);
    return new Response(
      JSON.stringify({ error: "Failed to claim plan." }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
