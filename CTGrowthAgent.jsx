import React, { useState, useRef, useEffect, useMemo } from "react";

// =============================================================
// CT Growth Agent — Your Degen Growth Partner
// Single-file React component. Tailwind CSS required.
// Uses the Anthropic API (claude-sonnet-4-20250514).
// =============================================================

const MODEL = "claude-sonnet-4-20250514";
const ANTHROPIC_URL = "https://api.anthropic.com/v1/messages";

// ---------- Hardcoded Growth Knowledge Base ----------
const GROWTH_KB = `
CT GROWTH KNOWLEDGE BASE (use this as the source of truth):

REPLY STRATEGY
- 30-50 quality replies per day is the sweet spot when starting out.
- Target accounts with 10k-100k followers (big enough for reach, small enough that you get noticed).
- Reply within the first 5 minutes of their tweet — early replies get the most impressions.
- Avoid "gm", "based", "this" one-liners. Add value: a contrarian take, a data point, a joke, a meme.
- Never ratio big accounts early. Build rapport first. Ratio farming only works once you're already known.

ORIGINAL TWEETS
- 3-5 original tweets per day minimum.
- Mix: alpha (calls, on-chain observations), opinions (spicy takes), memes (relatable CT humor).
- Avoid: pure shilling, generic motivation, hashtag spam.

THREADS
- 1-2 threads per week. Quality > quantity.
- Formats that work: educational breakdowns, storytelling (how I made/lost X), frameworks, post-mortems.
- First tweet = hook. Tease the outcome. Second tweet = context. Body = actionable content. Last tweet = CTA (follow, bookmark, RT).

ENGAGEMENT WINDOWS (UTC)
- 8-10 AM UTC  — EU morning + Asia afternoon
- 1-3 PM UTC   — EU afternoon + US morning
- 8-10 PM UTC  — US evening peak
- Post originals in these windows. Reply game can be 24/7.

PROFILE OPTIMIZATION
- Clear, high-contrast PFP (face or memorable logo; avoid anime unless that's the niche).
- Bio: niche keywords ("DeFi", "onchain analyst", "memecoin degen", etc.) + one hook.
- Pinned tweet = your single best piece of content (a thread, a viral tweet, a lead magnet).
- Header image should reinforce the niche.

GROWTH MILESTONES
- 0-500     : pure reply game. Zero ego tweets. Just value-packed replies under big accounts.
- 500-2k    : start threads, share opinions, build a POV. People should know what you stand for.
- 2k-10k    : collabs, Spaces, co-tweeting, community building. Your network compounds here.
- 10k+      : scale content, monetize, build products or a brand.

MEME USAGE
- Memes in replies = engagement cheat code, but only when contextually relevant.
- Original memes >>> reposted memes. Even a lazy template with your own spin beats a generic repost.
- Don't spam memes in every reply — 1 in 5 is a good ratio.

RATIO & ENGAGEMENT FARMING
- Engagement farming (EF) is fine, but "thoughtful EF" only. Hard questions, hot takes, polls.
- Don't do "agree?" / "am I wrong?" unless the take is actually spicy.
- Reply guys win by being first + funny + useful. Pick 2.

COMMON MISTAKES
- Following too many people too fast (triggers suspicion, kills ratio).
- Tweeting into the void without reply game to bootstrap reach.
- Inconsistency — going silent for a week undoes 2 weeks of momentum.
- Chasing every narrative instead of owning one niche.
`;

// ---------- Default Meme Library (used until user uploads one) ----------
const DEFAULT_MEMES = [
  {
    id: "default-1",
    name: "GM Chad",
    url: "https://placehold.co/600x400/0a0a0a/39ff14?text=GM+CHAD",
    tags: ["gm", "motivation", "grind", "bullish"],
    description: "Classic GM chad energy.",
  },
  {
    id: "default-2",
    name: "Reply Guy Grindset",
    url: "https://placehold.co/600x400/0a0a0a/39ff14?text=REPLY+GUY+GRINDSET",
    tags: ["reply guy", "grind", "engagement", "motivation"],
    description: "The eternal reply guy.",
  },
  {
    id: "default-3",
    name: "Cope Harder",
    url: "https://placehold.co/600x400/0a0a0a/00ffff?text=COPE+HARDER",
    tags: ["cope", "ratio", "bearish"],
    description: "For when they're coping.",
  },
  {
    id: "default-4",
    name: "Bullish AF",
    url: "https://placehold.co/600x400/0a0a0a/39ff14?text=BULLISH+AF",
    tags: ["bullish", "alpha", "motivation"],
    description: "Pure bullish energy.",
  },
  {
    id: "default-5",
    name: "Alpha Leak",
    url: "https://placehold.co/600x400/0a0a0a/00ffff?text=ALPHA+LEAK",
    tags: ["alpha", "bullish", "engagement"],
    description: "Dropping the alpha.",
  },
  {
    id: "default-6",
    name: "Ratio'd",
    url: "https://placehold.co/600x400/0a0a0a/ff3366?text=RATIO%27D",
    tags: ["ratio", "cope"],
    description: "The ratio heard round the TL.",
  },
];

// ---------- System Prompt Builder ----------
function buildSystemPrompt(memeLibrary) {
  const memeIndex = memeLibrary
    .map((m) => `- id=${m.id} | name="${m.name}" | tags=[${m.tags.join(", ")}] | desc="${m.description || ""}"`)
    .join("\n");

  return `You are CT Growth Agent — a Twitter/X growth advisor for the crypto (CT) degen community.

TONE & LANGUAGE
- Respond in Hinglish (natural mix of Hindi + English, Roman script). Match CT degen vibe — casual, punchy, a little unhinged.
- Keep it practical. No corporate speak. No hashtags. No emojis spam (1-2 max).
- Use specific numbers wherever possible.

STRUCTURE YOUR ANSWER
- 3-6 short bullet points OR a tight paragraph. No essays.
- Always include concrete numbers (replies/day, posting times, follower targets, etc.).
- End with a one-line TL;DR starting with "TL;DR:".

SOURCE OF TRUTH (use these facts)
${GROWTH_KB}

MEME LIBRARY (pick the best match for the user's question mood/topic)
${memeIndex || "(empty — skip meme selection)"}

Respond directly in Hinglish. No JSON. Just plain text answer ending with TL;DR.

RULES
- Hinglish, practical, with numbers, ending with a TL;DR line.
- meme_id must exactly match one id from the library above, or be null.
- caption must be 1 short line, Hinglish vibe.`;
}

// ---------- Anthropic API Call ----------
async function callClaude({ apiKey, system, messages }) {
  const res = await fetch(ANTHROPIC_URL, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
      "anthropic-dangerous-direct-browser-access": "true",
    },
    body: JSON.stringify({
      model: MODEL,
      max_tokens: 1024,
      system,
      messages,
    }),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Anthropic API ${res.status}: ${text}`);
  }
  const data = await res.json();
  const text = data.content?.map((b) => (b.type === "text" ? b.text : "")).join("") || "";
  return text;
}

function parseAgentJSON(raw) {
  const trimmed = raw.trim().replace(/^```json\s*/i, "").replace(/^```\s*/i, "").replace(/```$/i, "").trim();
  const start = trimmed.indexOf("{");
  const end = trimmed.lastIndexOf("}");
  if (start === -1 || end === -1) throw new Error("No JSON object found in model response");
  return JSON.parse(trimmed.slice(start, end + 1));
}

// ---------- Meme Upload Parsing ----------
function readFileAsText(file) {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(r.result);
    r.onerror = reject;
    r.readAsText(file);
  });
}
function readFileAsDataURL(file) {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(r.result);
    r.onerror = reject;
    r.readAsDataURL(file);
  });
}

async function parseMemeUpload(files) {
  const memes = [];
  for (const file of files) {
    if (file.type === "application/json" || file.name.endsWith(".json")) {
      const txt = await readFileAsText(file);
      const parsed = JSON.parse(txt);
      const arr = Array.isArray(parsed) ? parsed : parsed.memes || [];
      arr.forEach((m, i) => {
        memes.push({
          id: m.id || `json-${Date.now()}-${i}`,
          name: m.name || `Meme ${i + 1}`,
          url: m.url || m.image || "",
          tags: (m.tags || []).map((t) => String(t).toLowerCase()),
          description: m.description || "",
        });
      });
    } else if (file.type.startsWith("image/")) {
      const dataUrl = await readFileAsDataURL(file);
      const base = file.name.replace(/\.[^.]+$/, "");
      const guessedTags = base
        .toLowerCase()
        .split(/[^a-z0-9]+/)
        .filter(Boolean);
      memes.push({
        id: `img-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
        name: base,
        url: dataUrl,
        tags: guessedTags,
        description: "",
      });
    }
  }
  return memes;
}

// ---------- UI Primitives ----------
function Banner() {
  return (
    <div className="w-full border-b border-green-500/30 bg-gradient-to-r from-black via-zinc-950 to-black">
      <div className="mx-auto max-w-4xl px-4 py-4 flex items-center gap-3">
        <div className="text-2xl">🚀</div>
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-green-400 tracking-tight">
            CT Growth Agent
          </h1>
          <p className="text-xs sm:text-sm text-cyan-300/80">Your Degen Growth Partner</p>
        </div>
      </div>
    </div>
  );
}

function QuickButton({ label, onClick }) {
  return (
    <button
      onClick={onClick}
      className="px-3 py-1.5 text-xs sm:text-sm rounded-full border border-green-500/40 text-green-300 hover:bg-green-500/10 hover:border-green-400 transition"
    >
      {label}
    </button>
  );
}

function MemeCard({ meme, caption }) {
  if (!meme) return null;
  return (
    <div className="mt-3 rounded-xl border border-cyan-500/30 bg-zinc-950/80 overflow-hidden">
      <img
        src={meme.url}
        alt={meme.name}
        className="w-full max-h-80 object-contain bg-black"
        onError={(e) => {
          e.currentTarget.style.display = "none";
        }}
      />
      <div className="px-3 py-2 border-t border-cyan-500/20">
        <p className="text-sm text-cyan-200">{caption}</p>
        <p className="text-xs text-zinc-500 mt-0.5">
          {meme.name} · {meme.tags.slice(0, 4).join(", ")}
        </p>
      </div>
    </div>
  );
}

function MessageBubble({ role, children }) {
  const isUser = role === "user";
  return (
    <div className={`flex ${isUser ? "justify-end" : "justify-start"} mb-3`}>
      <div
        className={`max-w-[85%] rounded-2xl px-4 py-3 text-sm leading-relaxed whitespace-pre-wrap ${
          isUser
            ? "bg-green-500/15 border border-green-500/40 text-green-100"
            : "bg-zinc-900 border border-cyan-500/20 text-zinc-100"
        }`}
      >
        {children}
      </div>
    </div>
  );
}

// ---------- Main Component ----------
export default function CTGrowthAgent() {
  const [apiKey, setApiKey] = useState("");
  const [memeLibrary, setMemeLibrary] = useState(DEFAULT_MEMES);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const scrollRef = useRef(null);
  const memeInputRef = useRef(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, loading]);

  const system = useMemo(() => buildSystemPrompt(memeLibrary), [memeLibrary]);

  async function handleMemeUpload(e) {
    const files = Array.from(e.target.files || []);
    if (!files.length) return;
    try {
      const parsed = await parseMemeUpload(files);
      if (!parsed.length) {
        setError("No valid memes found in upload.");
        return;
      }
      setMemeLibrary((prev) => [...prev, ...parsed]);
      setError("");
    } catch (err) {
      setError(`Meme upload failed: ${err.message}`);
    } finally {
      e.target.value = "";
    }
  }

  async function send(text) {
    const question = (text ?? input).trim();
    if (!question) return;
    if (!apiKey) {
      setError("Bhai, Anthropic API key dal pehle (top-right).");
      return;
    }
    setError("");
    setInput("");

    const nextHistory = [...messages, { role: "user", content: question }];
    setMessages(nextHistory);
    setLoading(true);

    try {
      const apiMessages = nextHistory.map((m) => ({
        role: m.role,
        content: typeof m.content === "string" ? m.content : m.content.answer,
      }));

      const raw = await callClaude({ apiKey, system, messages: apiMessages });

      const meme = null;
      const caption = "";

      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: { answer: raw, meme, caption },
        },
      ]);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  const quickPrompts = [
    { label: "Reply Strategy", prompt: "Reply strategy kya honi chahiye for growth?" },
    { label: "Thread Tips", prompt: "Threads kaise likhu jo viral ho?" },
    { label: "Profile Optimization", prompt: "Apna X profile kaise optimize karu?" },
    { label: "Engagement Farming", prompt: "Engagement farming ka best tareeka kya hai?" },
    { label: "Best Posting Times", prompt: "Best time kya hai tweet karne ka?" },
  ];

  return (
    <div className="min-h-screen bg-black text-zinc-100 font-mono">
      <Banner />

      {/* Controls bar */}
      <div className="mx-auto max-w-4xl px-4 pt-3 flex flex-col sm:flex-row gap-2 sm:items-center sm:justify-between">
        <div className="flex gap-2 flex-1">
          <input
            type="password"
            placeholder="Anthropic API key (sk-ant-...)"
            value={apiKey}
            onChange={(e) => setApiKey(e.target.value)}
            className="flex-1 bg-zinc-950 border border-green-500/30 rounded-lg px-3 py-1.5 text-xs text-green-200 placeholder:text-zinc-600 focus:outline-none focus:border-green-400"
          />
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => memeInputRef.current?.click()}
            className="px-3 py-1.5 text-xs rounded-lg border border-cyan-500/40 text-cyan-300 hover:bg-cyan-500/10"
          >
            Upload Memes ({memeLibrary.length})
          </button>
          <input
            ref={memeInputRef}
            type="file"
            multiple
            accept="image/*,.json,application/json"
            className="hidden"
            onChange={handleMemeUpload}
          />
        </div>
      </div>

      {/* Quick prompts */}
      <div className="mx-auto max-w-4xl px-4 pt-3 flex flex-wrap gap-2">
        {quickPrompts.map((q) => (
          <QuickButton key={q.label} label={q.label} onClick={() => send(q.prompt)} />
        ))}
      </div>

      {/* Chat area */}
      <div
        ref={scrollRef}
        className="mx-auto max-w-4xl px-4 py-4 h-[60vh] overflow-y-auto"
      >
        {messages.length === 0 && (
          <div className="text-center text-zinc-500 text-sm mt-8">
            <p className="text-green-400/80 text-base mb-1">gm degen 👋</p>
            <p>Pooch kuch bhi about X growth — reply game, threads, timing, profile, sab kuch.</p>
          </div>
        )}

        {messages.map((m, i) => {
          if (m.role === "user") {
            return (
              <MessageBubble key={i} role="user">
                {m.content}
              </MessageBubble>
            );
          }
          const c = m.content;
          return (
            <MessageBubble key={i} role="assistant">
              <div>{c.answer}</div>
              <MemeCard meme={c.meme} caption={c.caption} />
            </MessageBubble>
          );
        })}

        {loading && (
          <div className="flex justify-start mb-3">
            <div className="rounded-2xl px-4 py-3 bg-zinc-900 border border-cyan-500/20 text-cyan-300 text-sm">
              <span className="inline-block animate-pulse">Agent soch raha hai...</span>
            </div>
          </div>
        )}

        {error && (
          <div className="mt-2 text-xs text-red-400 border border-red-500/40 bg-red-500/10 rounded-lg px-3 py-2">
            {error}
          </div>
        )}
      </div>

      {/* Input bar */}
      <div className="border-t border-green-500/20 bg-zinc-950/60">
        <div className="mx-auto max-w-4xl px-4 py-3 flex gap-2">
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                send();
              }
            }}
            placeholder="Pooch kuch bhi about X growth..."
            className="flex-1 bg-black border border-green-500/40 rounded-xl px-4 py-2.5 text-sm text-green-100 placeholder:text-zinc-600 focus:outline-none focus:border-green-400 focus:shadow-[0_0_0_2px_rgba(57,255,20,0.15)]"
          />
          <button
            onClick={() => send()}
            disabled={loading}
            className="px-4 py-2.5 rounded-xl bg-green-500 text-black text-sm font-semibold hover:bg-green-400 disabled:opacity-50 disabled:cursor-not-allowed transition"
          >
            Send
          </button>
        </div>
        <p className="text-center text-[10px] text-zinc-600 pb-2">
          Powered by Claude · {MODEL}
        </p>
      </div>
    </div>
  );
}
