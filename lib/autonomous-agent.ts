/**
 * Autonomous AI Agent Launch Radar & Auto-Poster
 * Scans newly launched repos, picks the #1 most useful tool for developers,
 * generates a viral breakdown post, and posts to LinkedIn or prepares a draft.
 */

import { fetchAgentRepositories, AgentRepo } from '@/lib/repo-fetcher';
import { generateLinkedInPost, LinkedInPostOutput } from '@/lib/linkedin-ai';
import { publishToLinkedIn, getLinkedInProfile } from '@/lib/linkedin-publisher';
import { createAdminClient } from '@/lib/supabase-server';
import { getUserCredentials, UserDynamicCredentials } from '@/lib/user-credentials';
import { executeWithGeminiRotation } from '@/lib/gemini-keys';
import { getAvailableGroqKeys } from '@/lib/ai';
import Groq from 'groq-sdk';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { sendPlatformEmail } from '@/lib/email-service';
import { assertActiveSubscription } from '@/lib/subscription';

export interface AutonomousDecision {
  selectedRepo: AgentRepo;
  reasoning: string;
  utilityScore: number; // 1-100
  superpowerHighlight: string;
  verdict: string;
  candidateCount: number;
}

export interface AutonomousCycleResult {
  success: boolean;
  executed: boolean;
  mode: 'auto_post' | 'auto_draft';
  reason?: string;
  decision?: AutonomousDecision;
  postRecordId?: string;
  linkedinPostUrl?: string;
  postContent?: string;
  error?: string;
}

/**
 * Principal AI Evaluator: Evaluates candidate repositories and selects the #1 most useful.
 */
export async function evaluateAndSelectBestRepo(
  candidates: AgentRepo[],
  creds: UserDynamicCredentials
): Promise<AutonomousDecision> {
  if (candidates.length === 0) {
    throw new Error('No candidate repositories provided for autonomous evaluation.');
  }

  if (candidates.length === 1) {
    return {
      selectedRepo: candidates[0],
      reasoning: `Only candidate repo detected in this launch window: ${candidates[0].name}. Highly focused on ${candidates[0].category}.`,
      utilityScore: 92,
      superpowerHighlight: candidates[0].whatItDoes,
      verdict: `Selected ${candidates[0].name} as the standout AI agent launch.`,
      candidateCount: 1,
    };
  }

  // Build candidate summary for LLM analysis
  const candidateSummaries = candidates.slice(0, 10).map((r, idx) => ({
    index: idx + 1,
    id: r.id,
    name: r.name,
    fullName: r.fullName,
    repoUrl: r.repoUrl,
    stars: r.stars,
    category: r.category,
    launchAgeText: r.launchAgeText || 'Recent',
    description: r.description,
    whatItDoes: r.whatItDoes,
    language: r.language,
  }));

  const systemInstruction = `You are a Principal AI Agent Architect & Tech Editor.
Your job is to evaluate newly launched open-source AI agent repositories and pick the SINGLE #1 MOST USEFUL project for software developers, AI engineers, and tech builders.

EVALUATION CRITERIA:
1. PRACTICAL BUILDER UTILITY: Does this solve a genuine developer pain point (e.g. debugging, web agents, coding harnesses, persistent memory, multi-agent coordination) rather than being a toy or empty wrapper?
2. INSTANT IMPLEMENTATION: Can a developer install this, integrate it into a project, and see immediate value?
3. TECHNICAL INNOVATION: Is there architectural depth or novel capability?
4. COMMUNITY RECEPTION: High star growth and active enthusiasm.

OUTPUT REQUIREMENTS:
You MUST return STRICT JSON ONLY with NO markdown formatting outside JSON. Format:
{
  "selectedFullName": "owner/repo",
  "utilityScore": 95,
  "reasoning": "Clear, objective explanation of why this repo is the #1 most useful for builders right now...",
  "superpowerHighlight": "The single killer capability that makes this tool indispensable...",
  "verdict": "Brief 1-sentence editorial verdict."
}`;

  const userPrompt = `Here are the latest candidate AI agent repositories just launched on GitHub:
${JSON.stringify(candidateSummaries, null, 2)}

Analyze each candidate and decide which single repository provides the highest practical value to software builders today. Return your decision as JSON.`;

  let decisionJson: any = null;

  // 1. Attempt with Gemini using rotation
  try {
    const geminiRes = await executeWithGeminiRotation(async (apiKey) => {
      const ai = new GoogleGenerativeAI(apiKey);
      const model = ai.getGenerativeModel({
        model: 'gemini-2.0-flash',
        generationConfig: {
          temperature: 0.2,
          responseMimeType: 'application/json',
        },
        systemInstruction,
      });
      const result = await model.generateContent(userPrompt);
      return result.response.text();
    });

    decisionJson = JSON.parse(geminiRes.result);
  } catch (geminiErr) {
    console.warn('[Autonomous Evaluator] Gemini error, attempting Groq fallback:', geminiErr);

    const groqKeys = getAvailableGroqKeys(creds.groqApiKey, creds.allowPlatformKeys);
    if (groqKeys.length > 0) {
      try {
        const groq = new Groq({ apiKey: groqKeys[0] });
        const chat = await groq.chat.completions.create({
          messages: [
            { role: 'system', content: systemInstruction },
            { role: 'user', content: userPrompt },
          ],
          model: 'llama-3.3-70b-versatile',
          temperature: 0.2,
          response_format: { type: 'json_object' },
        });
        const content = chat.choices[0]?.message?.content || '{}';
        decisionJson = JSON.parse(content);
      } catch (groqErr) {
        console.error('[Autonomous Evaluator] Groq fallback failed:', groqErr);
      }
    }
  }

  // Find the selected repository from candidates
  let selected = candidates.find(
    (c) =>
      c.fullName.toLowerCase() === decisionJson?.selectedFullName?.toLowerCase() ||
      c.name.toLowerCase() === decisionJson?.selectedFullName?.toLowerCase()
  );

  // Fallback to top-ranked candidate if match failed
  if (!selected) {
    selected = candidates[0];
  }

  return {
    selectedRepo: selected,
    reasoning: decisionJson?.reasoning || `Selected ${selected.name} for its high builder utility in ${selected.category}.`,
    utilityScore: decisionJson?.utilityScore || 90,
    superpowerHighlight: decisionJson?.superpowerHighlight || selected.whatItDoes,
    verdict: decisionJson?.verdict || `Top-rated fresh drop: ${selected.fullName}`,
    candidateCount: candidates.length,
  };
}

/**
 * Runs a complete autonomous radar cycle for a specific user.
 */
export async function runAutonomousRadarCycle(
  userId: string,
  options?: { force?: boolean }
): Promise<AutonomousCycleResult> {
  try {
    const supabase = createAdminClient();
    const creds = await getUserCredentials(userId);

    // 1. Check if user enabled auto-radar (unless forced manually)
    if (!options?.force && !creds.autoRadarEnabled) {
      return {
        success: true,
        executed: false,
        mode: creds.autoRadarMode,
        reason: 'Auto-radar is currently turned OFF by user. Enable it in LinkedIn Studio or Settings.',
      };
    }

    // 2. Assert active subscription
    const subCheck = await assertActiveSubscription(userId);
    if (!subCheck.allowed) {
      return {
        success: false,
        executed: false,
        mode: creds.autoRadarMode,
        error: `Subscription required: ${subCheck.error}`,
      };
    }

    // 3. Fetch newly launched repositories
    const liveLaunches = await fetchAgentRepositories({ sort: 'launches' });

    // 4. Retrieve previously posted/drafted repositories to prevent duplicates
    const { data: userSettings } = await supabase
      .from('user_settings')
      .select('auto_radar_posted_repos')
      .eq('user_id', userId)
      .maybeSingle();

    const postedUrls = new Set<string>(
      Array.isArray(userSettings?.auto_radar_posted_repos)
        ? userSettings.auto_radar_posted_repos
        : []
    );

    // Also check past linkedin_posts source_url
    const { data: existingPosts } = await supabase
      .from('linkedin_posts')
      .select('source_url')
      .eq('user_id', userId);

    if (existingPosts) {
      for (const p of existingPosts) {
        if (p.source_url) postedUrls.add(p.source_url.toLowerCase().trim());
      }
    }

    // Filter candidates that haven't been posted yet
    const minStars = creds.autoRadarMinStars || 0;
    const candidates = liveLaunches.filter((repo) => {
      const isDuplicate = postedUrls.has(repo.repoUrl.toLowerCase().trim());
      const meetsStars = repo.stars >= minStars;
      return !isDuplicate && meetsStars;
    });

    if (candidates.length === 0) {
      return {
        success: true,
        executed: false,
        mode: creds.autoRadarMode,
        reason: 'No newly launched repositories found that have not already been posted.',
      };
    }

    // 5. Autonomous Agent Evaluator chooses the best repository
    const decision = await evaluateAndSelectBestRepo(candidates, creds);
    const chosenRepo = decision.selectedRepo;

    // 6. Generate the LinkedIn breakdown post using AI
    const postOutput: LinkedInPostOutput = await generateLinkedInPost(
      {
        topic: `Autonomous Spotlight: ${chosenRepo.name}`,
        postType: 'repo_spotlight',
        repoData: chosenRepo,
        tone: 'technical',
        authorName: creds.candidateName || 'AI & Tech Researcher',
      },
      creds
    );

    const postContent = postOutput.postContent;
    let publishStatus: 'draft' | 'posted' = 'draft';
    let linkedinPostUrn: string | null = null;
    let linkedinPostUrl: string | null = null;
    let publishError: string | null = null;

    // 7. Auto-Post vs Auto-Draft
    if (creds.autoRadarMode === 'auto_post') {
      // Resolve personal LinkedIn credentials
      let accessToken = creds.linkedinAccessToken;
      let personUrn = creds.linkedinPersonUrn;

      if (!accessToken) {
        const { data: account } = await supabase
          .from('linkedin_accounts')
          .select('*')
          .eq('user_id', userId)
          .maybeSingle();
        if (account?.access_token) {
          accessToken = account.access_token;
          personUrn = account.linkedin_person_urn;
        }
      }

      if (accessToken) {
        if (!personUrn) {
          try {
            const profile = await getLinkedInProfile(accessToken);
            personUrn = `urn:li:person:${profile.sub}`;
          } catch {
            // ignore
          }
        }

        if (personUrn) {
          const pubResult = await publishToLinkedIn(
            accessToken,
            personUrn,
            postContent,
            undefined,
            chosenRepo.name
          );

          if (pubResult.success) {
            publishStatus = 'posted';
            linkedinPostUrn = pubResult.postUrn || null;
            linkedinPostUrl = pubResult.postUrl || null;
          } else {
            publishError = pubResult.error || 'Failed to auto-post to LinkedIn';
          }
        } else {
          publishError = 'Could not resolve LinkedIn Person URN';
        }
      } else {
        publishError = 'LinkedIn access token not found. Saved as draft instead.';
      }
    }

    // 8. Insert record in linkedin_posts
    const { data: newPost, error: insertErr } = await supabase
      .from('linkedin_posts')
      .insert({
        user_id: userId,
        topic: `⚡ [Auto-Pilot] ${chosenRepo.name}: ${chosenRepo.description.slice(0, 80)}`,
        source_url: chosenRepo.repoUrl,
        source_title: chosenRepo.fullName,
        source_name: 'GitHub Launch Radar',
        post_content: postContent,
        status: publishStatus,
        linkedin_post_urn: linkedinPostUrn,
        linkedin_post_url: linkedinPostUrl,
        error_message: publishError,
        ai_provider: postOutput.provider,
        model_name: postOutput.modelUsed,
        posted_at: publishStatus === 'posted' ? new Date().toISOString() : null,
      })
      .select('id')
      .single();

    if (insertErr) {
      console.warn('Could not insert into linkedin_posts:', insertErr);
    }

    // 9. Update user_settings tracking
    const updatedPostedRepos = Array.from(new Set([...Array.from(postedUrls), chosenRepo.repoUrl.toLowerCase().trim()]));
    const decisionLog = {
      repoName: chosenRepo.name,
      fullName: chosenRepo.fullName,
      repoUrl: chosenRepo.repoUrl,
      utilityScore: decision.utilityScore,
      reasoning: decision.reasoning,
      superpowerHighlight: decision.superpowerHighlight,
      status: publishStatus,
      timestamp: new Date().toISOString(),
      mode: creds.autoRadarMode,
    };

    await supabase
      .from('user_settings')
      .update({
        auto_radar_last_run: new Date().toISOString(),
        auto_radar_posted_repos: updatedPostedRepos,
        auto_radar_last_decision: decisionLog,
      })
      .eq('user_id', userId);

    // 10. Send notification email via SMTP if user has email configured
    const userEmail = creds.smtpFromEmail || (await getUserEmail(userId));
    if (userEmail) {
      const emailSubject =
        publishStatus === 'posted'
          ? `🚀 Auto-Pilot Published: ${chosenRepo.name} on LinkedIn!`
          : `✨ Auto-Pilot Draft Ready: ${chosenRepo.name}`;

      const emailHtml = `
        <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; padding: 24px; color: #1e293b; background: #ffffff; border: 1px solid #e2e8f0; border-radius: 12px;">
          <div style="display: flex; align-items: center; margin-bottom: 20px;">
            <div style="background: #eff6ff; padding: 10px 14px; border-radius: 8px; font-weight: 700; color: #2563eb; font-size: 16px;">
              🤖 AI Launch Radar Auto-Pilot
            </div>
          </div>
          <h2 style="margin: 0 0 12px 0; color: #0f172a; font-size: 20px;">
            ${publishStatus === 'posted' ? 'New Post Published to LinkedIn' : 'New Post Draft Prepared For You'}
          </h2>
          <p style="margin: 0 0 16px 0; font-size: 15px; line-height: 1.5; color: #475569;">
            Your autonomous agent analyzed the latest open-source launches on GitHub and selected <strong>${chosenRepo.fullName}</strong> as the #1 most useful tool for developers.
          </p>
          <div style="background: #f8fafc; border-left: 4px solid #3b82f6; padding: 14px 16px; margin-bottom: 20px; border-radius: 0 8px 8px 0;">
            <div style="font-size: 13px; font-weight: 600; color: #3b82f6; text-transform: uppercase; margin-bottom: 4px;">Agent Decision Reasoning</div>
            <div style="font-size: 14px; color: #334155; line-height: 1.4;">${decision.reasoning}</div>
          </div>
          <div style="background: #ffffff; border: 1px solid #e2e8f0; border-radius: 8px; padding: 14px 16px; margin-bottom: 20px;">
            <div style="font-weight: 600; font-size: 15px; margin-bottom: 6px;">⭐ ${chosenRepo.fullName} (${chosenRepo.stars.toLocaleString()} stars)</div>
            <div style="font-size: 13px; color: #64748b; margin-bottom: 8px;">${chosenRepo.description}</div>
            <a href="${chosenRepo.repoUrl}" style="color: #2563eb; font-size: 13px; text-decoration: none; font-weight: 500;">View Repository on GitHub &rarr;</a>
          </div>
          ${
            publishStatus === 'posted' && linkedinPostUrl
              ? `<a href="${linkedinPostUrl}" style="display: inline-block; background: #0a66c2; color: #ffffff; padding: 10px 20px; border-radius: 8px; text-decoration: none; font-weight: 600; font-size: 14px;">View Live LinkedIn Post</a>`
              : `<a href="${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/linkedin" style="display: inline-block; background: #2563eb; color: #ffffff; padding: 10px 20px; border-radius: 8px; text-decoration: none; font-weight: 600; font-size: 14px;">Review & Publish in LinkedIn Studio</a>`
          }
        </div>
      `;

      sendPlatformEmail({
        to: userEmail,
        subject: emailSubject,
        html: emailHtml,
      }).catch((e) => console.warn('Could not send auto-pilot notification email:', e));
    }

    return {
      success: true,
      executed: true,
      mode: creds.autoRadarMode,
      decision,
      postRecordId: newPost?.id,
      linkedinPostUrl: linkedinPostUrl || undefined,
      postContent,
    };
  } catch (err: any) {
    console.error('runAutonomousRadarCycle error:', err);
    return {
      success: false,
      executed: false,
      mode: 'auto_draft',
      error: err.message || 'Unknown error occurred in autonomous radar cycle',
    };
  }
}

async function getUserEmail(userId: string): Promise<string | null> {
  try {
    const supabase = createAdminClient();
    const { data } = await supabase.auth.admin.getUserById(userId);
    return data?.user?.email || null;
  } catch {
    return null;
  }
}
