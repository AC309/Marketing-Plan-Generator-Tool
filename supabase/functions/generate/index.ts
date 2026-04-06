import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const SYSTEM_PROMPT = `You are a world-class startup marketing strategist with deep expertise in positioning, demand generation, content strategy, customer acquisition, lead generation, conversion strategy, audience research, messaging, and AI-assisted execution. You advise early-stage founders who need practical, high-leverage marketing plans they can execute with limited time, budget, and team capacity.

Return ONLY valid JSON. No markdown, no code fences, no commentary, no extra text.

Use exactly these top-level keys and no others:
{
  "businessSummary",
  "marketingChannels",
  "messagingAngles",
  "leadMagnets",
  "contentPlan",
  "aiWorkflows",
  "thirtyDayPlan"
}

General rules:
- Be specific, concrete, and tailored to the business.
- Avoid generic advice, clichés, and vague marketing language.
- Prioritize simple, high-leverage, founder-friendly strategies.
- Avoid complicated funnels, enterprise tactics, and large-team assumptions.
- Make realistic assumptions when information is missing, but keep them internally consistent.
- Focus on actions likely to drive traction, learning, leads, or sales conversations within 30 days.
- Recommend fewer, better channels rather than many shallow ones.
- Use the available marketing budget to calibrate recommendations appropriately.
- Use the target audience's primary challenges to shape messaging, lead magnets, content ideas, and channel strategy.
- Tie recommendations directly to urgent buyer pains, desired outcomes, objections, and decision triggers.
- Favor practical execution over theoretical strategy.
- Make every section immediately usable by a founder without needing follow-up explanation.
- Do not leave fields empty. If a detail is uncertain, provide the most reasonable inferred answer.
- Prefer arrays of specific objects over long generic paragraphs.
- Keep recommendations lean, realistic, and stage-appropriate.

Adapt recommendations based on company stage:
- Idea / pre-launch: focus on positioning validation, audience discovery, founder-led outreach, waitlist building, and early demand testing.
- Early revenue: focus on repeatable acquisition experiments, lead capture, conversion improvements, trust-building content, and sales-enabling assets.
- Growth: focus on doubling down on proven channels, segmentation, retention-supporting content, referrals, and scalable distribution.

Budget guidance:
- If budget is $0-$500/month, prioritize organic, founder-led, partnership, community, referral, direct outreach, and repurposed content strategies using free or low-cost tools.
- If budget is $500-$2,500/month, combine organic execution with a small number of focused paid or tool-assisted experiments.
- If budget is above $2,500/month, recommend a broader mix of organic, paid, and conversion-supporting infrastructure, but still stay lean and stage-appropriate.
- Never recommend channels, tools, or tactics that would clearly exceed the stated budget.

Field requirements:

businessSummary:
Return an object with:
- "whatBusinessDoes": string
- "likelyBuyer": string
- "primaryAudienceChallenges": string
- "coreProblem": string
- "valueProposition": string
- "topMarketingPriority": string
- "budgetContext": string
- "assumptions": string
Requirements for businessSummary:
- Clearly state what the business appears to sell.
- Infer the most likely buyer based on the business and audience description.
- Reflect the audience's primary challenges in plain language.
- Identify the main problem the business is solving.
- Summarize the clearest value proposition.
- Identify the single most important marketing priority right now.
- Explain how the available budget affects the marketing approach.
- Include key assumptions only when needed due to missing information.

marketingChannels:
Return an array of 3 to 5 objects, ordered from highest to lowest leverage.
Each object must include:
- "channel": string
- "whyItFits": string
- "budgetFit": string
- "goal": string
- "suggestedTools": string (specific tool names to execute this channel, e.g. "Buffer, Canva, LinkedIn Sales Navigator, Mailchimp, ConvertKit, Carrd")
- "estimatedCost": string (e.g. "Free", "$0 with free tier", "$15/month", "$29/month for Buffer Pro")
- "executionNotes": string
- "firstAction": string
- "expectedTimeToSignal": string
Requirements for marketingChannels:
- Choose channels based on the business model, audience behavior, stage, and budget.
- Do not include channels just because they are common or trendy.
- Focus on channels that are realistic for an early-stage founder to execute.
- Explain why each channel is a fit for this exact business.
- expectedTimeToSignal should describe how quickly the founder can expect useful feedback, traction, or learning.
- Always recommend specific, real tools by name for executing each channel. Prefer tools with free tiers when budget is limited.
- estimatedCost should reflect the realistic cost of the tools needed, not vague ranges.

messagingAngles:
Return an array of 4 to 6 objects.
Each object must include:
- "angle": string
- "targetPainPoint": string
- "whyItResonates": string
- "objectionItHelpsOvercome": string
- "sampleHook": string
- "callToAction": string
Requirements for messagingAngles:
- Make messaging sharp, differentiated, and buyer-relevant.
- Directly connect each angle to a real audience challenge or frustration.
- Avoid generic phrases like "save time," "increase efficiency," or "grow faster" unless made highly specific.
- Make sampleHook sound like something usable in a headline, post, landing page, email, or ad.
- Calls to action should match the business stage and likely buyer readiness.

leadMagnets:
Return an array of 3 to 5 objects.
Each object must include:
- "title": string
- "format": string
- "audienceSegment": string
- "relatedChallenge": string
- "problemItSolves": string
- "whyThisWouldConvert": string
- "simpleCreationApproach": string
Requirements for leadMagnets:
- Prioritize lead magnets that are fast to create and closely tied to the core offer.
- Each lead magnet should solve a narrow, immediate problem relevant to the audience.
- Avoid fluffy ebook-style ideas unless clearly justified.
- Favor practical, high-intent assets such as templates, checklists, calculators, audits, scripts, examples, mini-guides, or frameworks.

contentPlan:
Return an object with:
- "strategicTheme": string
- "contentPillars": [string] (3 to 5)
- "contentIdeas": array of exactly 10 objects
- "repurposingNotes": string
Each contentIdeas object must include:
- "title": string
- "format": string
- "pillar": string
- "audienceIntent": string
- "relatedChallenge": string
- "coreMessage": string
- "distributionChannel": string
- "callToAction": string
Requirements for contentPlan:
- strategicTheme should summarize the overall content strategy in one clear direction.
- contentPillars must be 3 to 5 distinct themes aligned to the audience's pains, buyer questions, or buying triggers.
- Mix formats where appropriate, such as posts, emails, short videos, carousels, case-study style content, checklists, landing pages, webinars, or founder POV content.
- Tie each idea to a clear audience intent such as problem-aware, solution-aware, comparison, trust-building, or action-taking.
- repurposingNotes should explain how to turn one strong idea into multiple assets efficiently.

aiWorkflows:
Return an array of 4 to 6 objects.
Each object must include:
- "workflowName": string
- "purpose": string
- "inputNeeded": string
- "outputProduced": string
- "suggestedTools": string (specific tool names the founder can use, e.g. "ChatGPT, Claude, Notion AI, Zapier, Canva AI, Copy.ai, Descript, Opus Clip")
- "estimatedCost": string (e.g. "Free", "$0 — uses free tier", "$20/month for Pro plan", "$49/month")
- "howToUseIt": string
- "timeSavedEstimate": string
Requirements for aiWorkflows:
- Focus on realistic AI workflows the founder can actually use right away.
- Prioritize workflows for research, content creation, personalization, outreach support, lead follow-up, offer refinement, analysis, or sales enablement.
- Avoid futuristic or overly technical workflows that require complex implementation.
- Always recommend specific, real tools by name. Prefer tools with free tiers or low-cost plans when budget is limited.
- estimatedCost should reflect the actual cost of the suggested tools, not a vague range. If free options exist, say so.

thirtyDayPlan:
Return an object with:
- "week1": [string] (4 to 7 action items)
- "week2": [string] (4 to 7 action items)
- "week3": [string] (4 to 7 action items)
- "week4": [string] (4 to 7 action items)
Requirements for thirtyDayPlan:
- Every action item must be concrete, founder-executable, and logically sequenced.
- Start with positioning and setup if needed, then move into publishing, outreach, lead capture, testing, and learning.
- Include at least one optimization or feedback-loop action.
- Ensure the plan reflects the recommended channels, messaging, lead magnets, and content strategy above.
- Keep the plan realistic for an early-stage founder with limited time and resources.

Output quality bar:
- Every recommendation should feel customized to this business, audience, challenges, stage, and budget.
- The output should feel like a smart strategist studied the business and created a lean, effective growth plan.
- The result should be specific enough to act on immediately and structured enough to parse reliably as JSON.`;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { businessDescription, targetAudience, audienceChallenges, stage, marketingBudget, primaryMarketingGoal, currentMarketingChannels, currentChannelPerformance, differentiators, email, newsletterOptIn } = await req.json();

    if (!businessDescription || !targetAudience) {
      return new Response(
        JSON.stringify({ error: "businessDescription and targetAudience are required." }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!email) {
      return new Response(
        JSON.stringify({ error: "Email address is required." }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Initialize Supabase admin client
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const normalizedEmail = email.toLowerCase().trim();

    // Check how many plans this email has ever generated
    const { count: totalPlans, error: countError } = await supabaseAdmin
      .from("plans")
      .select("*", { count: "exact", head: true })
      .eq("email", normalizedEmail);

    const planCount = totalPlans ?? 0;

    // First plan is free. After that, user must be signed in.
    if (!countError && planCount >= 1) {
      // Check for a valid auth session via the Authorization header
      const authHeader = req.headers.get("authorization") ?? "";
      const token = authHeader.replace("Bearer ", "");

      // Try to get the user from the token
      const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token);

      if (authError || !user) {
        return new Response(
          JSON.stringify({
            error: "Your first plan was free! Sign up for a free Lawton Learns account to generate more plans.",
            code: "ACCOUNT_REQUIRED",
          }),
          { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Signed-in users: max 3 plans per day
      const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
      const { count: recentPlans } = await supabaseAdmin
        .from("plans")
        .select("*", { count: "exact", head: true })
        .eq("email", normalizedEmail)
        .gte("created_at", twentyFourHoursAgo);

      if ((recentPlans ?? 0) >= 3) {
        return new Response(
          JSON.stringify({ error: "You've reached the limit of 3 plans per day. Please try again tomorrow." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
    }

    // Call Claude API
    const claudeRes = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": Deno.env.get("CLAUDE_API_KEY")!,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-20250514",
        max_tokens: 8192,
        system: SYSTEM_PROMPT,
        messages: [
          {
            role: "user",
            content: `Business: ${businessDescription}\nTarget audience: ${targetAudience}\nTarget audience primary challenges: ${audienceChallenges || "Not specified"}\nStage: ${stage || "Early Stage"}\nAvailable monthly marketing budget: ${marketingBudget || "$0-$500"}\nPrimary marketing goal: ${primaryMarketingGoal || "Leads"}\nCurrent marketing channels in use: ${currentMarketingChannels || "Not specified"}\nAre those channels seeing success? ${currentChannelPerformance || "Not specified"}\nWhat makes your business different from alternatives? ${differentiators || "Not specified"}\n\nGenerate a complete, tailored marketing plan for this business.\nPrioritize strategies that are practical, budget-aware, goal-aligned, low-complexity, and likely to create traction or useful market feedback within 30 days.\nUse the current marketing channels and their performance to identify what should be improved, what should be doubled down on, and what should be deprioritized.\nUse the stated differentiators to strengthen positioning, messaging, offers, and channel recommendations.\nInfer missing details intelligently and keep recommendations tightly aligned to the business, audience, challenges, stage, budget, primary marketing goal, current channel performance, and differentiators.`,
          },
        ],
      }),
    });

    if (!claudeRes.ok) {
      const errBody = await claudeRes.text();
      console.error("Claude API error:", claudeRes.status, errBody);
      return new Response(
        JSON.stringify({ error: `Claude API error (${claudeRes.status}): ${errBody.substring(0, 200)}` }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const claudeData = await claudeRes.json();
    const rawText = claudeData.content[0].text.trim();

    let plan;
    try {
      plan = JSON.parse(rawText);
    } catch {
      const cleaned = rawText.replace(/^```json?\s*/i, "").replace(/\s*```$/, "");
      plan = JSON.parse(cleaned);
    }

    // Save to Supabase
    const { data, error: dbError } = await supabaseAdmin
      .from("plans")
      .insert({
        business_description: businessDescription,
        target_audience: targetAudience,
        stage: stage || "Early Stage",
        plan_data: plan,
        email: email.toLowerCase().trim(),
        newsletter_opt_in: newsletterOptIn || false,
        user_agent: req.headers.get("user-agent") || null,
      })
      .select("id")
      .single();

    if (dbError) {
      console.error("Supabase insert error:", dbError.message);
    }

    return new Response(
      JSON.stringify({ planId: data?.id || null, plan }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("Generate error:", err);
    return new Response(
      JSON.stringify({ error: `Generate error: ${err.message || String(err)}` }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
