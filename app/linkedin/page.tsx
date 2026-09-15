'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { supabaseBrowser } from '@/lib/supabase-browser';
import {
  Linkedin,
  Sparkles,
  RefreshCw,
  Send,
  Copy,
  Check,
  Globe,
  ExternalLink,
  Image as ImageIcon,
  Key,
  Share2,
  Newspaper,
  Wand2,
  Flame,
  Clock,
  AlertCircle,
  ThumbsUp,
  MessageSquare,
  Repeat2,
  User,
  Search,
  Filter,
  CheckCircle2,
  Cpu,
  Microscope,
  Code2,
  Building2,
  Layers,
  FolderGit2,
  Star,
  GitFork,
  Terminal,
  Bot,
  Zap,
  BookOpen,
} from 'lucide-react';
import { AgentRepo } from '@/lib/repo-fetcher';

interface Article {
  id: string;
  title: string;
  summary: string;
  sourceUrl: string;
  sourceName: string;
  publishedAt: string;
  category: 'AI & LLMs' | 'Research & Science' | 'Open Source & Dev' | 'Tech Industry';
}

interface LinkedInPost {
  id: string;
  topic: string;
  source_url?: string;
  source_title?: string;
  source_name?: string;
  post_content: string;
  image_url?: string | null;
  image_source?: 'news' | 'ai' | 'upload';
  status: 'draft' | 'approved' | 'posted' | 'failed';
  linkedin_post_url?: string;
  error_message?: string;
  created_at: string;
  visual_prompt?: string;
  news_image_url?: string | null;
  ai_image_url?: string | null;
}

export default function LinkedInStudioPage() {
  // Source Mode: 'repos' (Cool AI Agent Repos) or 'news' (Live Tech & AI News Radar)
  const [sourceMode, setSourceMode] = useState<'repos' | 'news'>('repos');

  // AI Agent Repos Discovery State
  const [repos, setRepos] = useState<AgentRepo[]>([]);
  const [selectedRepo, setSelectedRepo] = useState<AgentRepo | null>(null);
  const [activeRepoCategory, setActiveRepoCategory] = useState<string>('All');
  const [repoSearchQuery, setRepoSearchQuery] = useState('');
  const [repoSort, setRepoSort] = useState<'trending' | 'newest'>('trending');
  const [isFetchingRepos, setIsFetchingRepos] = useState(false);

  // News Explorer State
  const [articles, setArticles] = useState<Article[]>([]);
  const [selectedArticle, setSelectedArticle] = useState<Article | null>(null);
  const [activeCategory, setActiveCategory] = useState<string>('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [customTopic, setCustomTopic] = useState('');
  const [isFetchingNews, setIsFetchingNews] = useState(false);

  // Post Generation & Review State
  const [currentPost, setCurrentPost] = useState<LinkedInPost | null>(null);
  const [postContent, setPostContent] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [visualPrompt, setVisualPrompt] = useState('');
  const [newsPhotoUrl, setNewsPhotoUrl] = useState<string | null>(null);
  const [aiVisualUrl, setAiVisualUrl] = useState<string | null>(null);
  const [imageVariants, setImageVariants] = useState<{
    editorial?: string;
    isometric?: string;
    vector?: string;
  } | null>(null);
  const [selectedStyle, setSelectedStyle] = useState<'editorial' | 'isometric' | 'vector' | 'news'>('editorial');
  const [isRegeneratingVisual, setIsRegeneratingVisual] = useState(false);

  const [isGenerating, setIsGenerating] = useState(false);
  const [generationProgress, setGenerationProgress] = useState(0);
  const [generationStatusText, setGenerationStatusText] = useState('');
  const [isPublishing, setIsPublishing] = useState(false);
  const [publishedPostUrl, setPublishedPostUrl] = useState<string | null>(null);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [aiProvider, setAiProvider] = useState<'gemini' | 'groq' | 'claude'>('gemini');
  const [tone, setTone] = useState<'thought-leader' | 'technical' | 'conversational'>('thought-leader');
  const [preferNewsImage, setPreferNewsImage] = useState(false);

  // History & Account
  const [pastPosts, setPastPosts] = useState<LinkedInPost[]>([]);
  const [isConnected, setIsConnected] = useState(false);
  const [profileName, setProfileName] = useState<string | null>(null);

  // Authentication State
  const [authLoading, setAuthLoading] = useState(true);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const router = useRouter();

  // UI Feedback
  const [copied, setCopied] = useState(false);
  const [statusMessage, setStatusMessage] = useState<{ type: 'success' | 'error' | 'info'; text: string } | null>(null);
  const [showTokenModal, setShowTokenModal] = useState(false);
  const [tokenInput, setTokenInput] = useState('');
  const [isSavingToken, setIsSavingToken] = useState(false);

  // Initial Load: Enforce Authentication & Scoped Fetch
  useEffect(() => {
    async function initSession() {
      try {
        const { data: { session } } = await supabaseBrowser.auth.getSession();
        if (!session?.user) {
          router.push('/login?redirect=/linkedin');
          return;
        }

        const uid = session.user.id;
        const token = session.access_token;
        setCurrentUserId(uid);

        await Promise.all([
          fetchRepos(),
          fetchNews(),
          checkAuth(uid, token),
          loadPastPosts(uid, token),
        ]);
      } catch (err) {
        console.error('LinkedIn studio auth check failed:', err);
        router.push('/login?redirect=/linkedin');
      } finally {
        setAuthLoading(false);
      }
    }
    initSession();
  }, [router]);

  const showStatus = (type: 'success' | 'error' | 'info', text: string) => {
    setStatusMessage({ type, text });
    setTimeout(() => setStatusMessage(null), 6000);
  };

  const fetchRepos = async (query = '', sort = repoSort, category = activeRepoCategory) => {
    setIsFetchingRepos(true);
    try {
      const params = new URLSearchParams();
      if (query) params.set('query', query);
      if (sort) params.set('sort', sort);
      if (category && category !== 'All') params.set('category', category);

      const res = await fetch(`/api/linkedin/repos?${params.toString()}`);
      const data = await res.json();
      if (data.success && data.repos) {
        setRepos(data.repos);
        if (data.repos.length > 0) {
          if (!selectedRepo || !data.repos.some((r: AgentRepo) => r.id === selectedRepo.id)) {
            setSelectedRepo(data.repos[0]);
          }
        }
      }
    } catch (err) {
      console.warn('Could not fetch AI agent repos:', err);
    } finally {
      setIsFetchingRepos(false);
    }
  };

  const fetchNews = async () => {
    setIsFetchingNews(true);
    try {
      const res = await fetch('/api/linkedin/news');
      const data = await res.json();
      if (data.success && data.articles) {
        setArticles(data.articles);
        if (data.articles.length > 0 && !selectedArticle) {
          setSelectedArticle(data.articles[0]);
        }
      }
    } catch (err) {
      console.warn('Could not fetch trending news:', err);
    } finally {
      setIsFetchingNews(false);
    }
  };

  const checkAuth = async (uid?: string, token?: string) => {
    try {
      const userId = uid || currentUserId;
      if (!userId) return;
      const headers: Record<string, string> = { 'x-user-id': userId };
      if (token) headers['Authorization'] = `Bearer ${token}`;

      const res = await fetch(`/api/linkedin/auth?userId=${userId}`, { headers });
      const data = await res.json();
      setIsConnected(Boolean(data.isConnected));
      if (data.profileName) setProfileName(data.profileName);
    } catch {
      setIsConnected(false);
    }
  };

  const loadPastPosts = async (uid?: string, token?: string) => {
    try {
      const userId = uid || currentUserId;
      if (!userId) return;
      const headers: Record<string, string> = { 'x-user-id': userId };
      if (token) headers['Authorization'] = `Bearer ${token}`;

      const res = await fetch(`/api/linkedin/posts?userId=${userId}`, { headers });
      const data = await res.json();
      if (data.success && data.posts) {
        setPastPosts(data.posts);
      }
    } catch {
      // ignore
    }
  };

  // Filtered Articles based on Category & Search
  const filteredArticles = useMemo(() => {
    return articles.filter((art) => {
      const matchesCategory = activeCategory === 'All' || art.category === activeCategory;
      const matchesSearch =
        !searchQuery.trim() ||
        art.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        art.summary.toLowerCase().includes(searchQuery.toLowerCase()) ||
        art.sourceName.toLowerCase().includes(searchQuery.toLowerCase());
      return matchesCategory && matchesSearch;
    });
  }, [articles, activeCategory, searchQuery]);

  // Filtered Repos based on Category & Search
  const filteredRepos = useMemo(() => {
    return repos.filter((r) => {
      const matchesCategory = activeRepoCategory === 'All' || r.category === activeRepoCategory;
      const q = repoSearchQuery.toLowerCase().trim();
      const matchesSearch =
        !q ||
        r.name.toLowerCase().includes(q) ||
        r.fullName.toLowerCase().includes(q) ||
        r.description.toLowerCase().includes(q) ||
        r.whatItDoes.toLowerCase().includes(q) ||
        r.language.toLowerCase().includes(q) ||
        r.topics.some((t) => t.toLowerCase().includes(q));
      return matchesCategory && matchesSearch;
    });
  }, [repos, activeRepoCategory, repoSearchQuery]);

  // Generate Post & Context-Matched Image
  const handleGeneratePost = async (targetItem?: Article | AgentRepo) => {
    let topicToUse = '';
    let summaryToUse = '';
    let sourceUrlToUse = '';
    let sourceNameToUse = '';
    let postTypeToUse: 'news' | 'repo_spotlight' = 'news';
    let repoDataToUse: AgentRepo | undefined;

    const isTargetRepo = targetItem && 'repoUrl' in targetItem;
    const isTargetArticle = targetItem && 'sourceName' in targetItem && !('repoUrl' in targetItem);

    if (isTargetRepo || (!isTargetArticle && sourceMode === 'repos')) {
      const repo = (isTargetRepo ? targetItem : selectedRepo) as AgentRepo | null;
      if (!repo) {
        showStatus('error', 'Please select an open-source AI agent repository below.');
        return;
      }
      repoDataToUse = repo;
      postTypeToUse = 'repo_spotlight';
      topicToUse = repo.name;
      summaryToUse = repo.whatItDoes || repo.description;
      sourceUrlToUse = repo.repoUrl;
      sourceNameToUse = `GitHub (${repo.fullName})`;
    } else {
      const articleToUse = (isTargetArticle ? targetItem : selectedArticle) as Article | null;
      topicToUse = customTopic.trim() || articleToUse?.title || '';
      if (!topicToUse) {
        showStatus('error', 'Please select a news article below or type a custom topic.');
        return;
      }
      summaryToUse = articleToUse?.summary || topicToUse;
      sourceUrlToUse = articleToUse?.sourceUrl || '';
      sourceNameToUse = articleToUse?.sourceName || 'Tech News';
      postTypeToUse = 'news';
    }

    setIsGenerating(true);
    setGenerationProgress(15);
    setGenerationStatusText(
      postTypeToUse === 'repo_spotlight'
        ? `Analyzing AI agent repository ${topicToUse} & technical capabilities...`
        : 'Harvesting research article insights & technical context...'
    );

    const progressTimer = setInterval(() => {
      setGenerationProgress((prev) => {
        if (prev < 35) {
          setGenerationStatusText(
            postTypeToUse === 'repo_spotlight'
              ? 'Google Gemini writing high-impact developer hook, superpowers, & setup guide...'
              : 'Google Gemini (gemini-flash-latest) writing scroll-stopping hook & 4 takeaways...'
          );
          return prev + 10;
        }
        if (prev < 70) {
          setGenerationStatusText(
            postTypeToUse === 'repo_spotlight'
              ? 'Gemini Visual Director conceptualizing open-source tech architecture visual...'
              : 'Gemini Visual Director analyzing post lines to conceptualize matched imagery...'
          );
          return prev + 8;
        }
        if (prev < 92) {
          setGenerationStatusText('Synthesizing 3 high-resolution visual styles (Editorial, 3D Isometric, Tech Vector)...');
          return prev + 4;
        }
        return prev;
      });
    }, 700);

    try {
      const res = await fetch('/api/linkedin/generate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-user-id': currentUserId || '',
        },
        body: JSON.stringify({
          userId: currentUserId,
          topic: topicToUse,
          summary: summaryToUse,
          sourceUrl: sourceUrlToUse,
          sourceName: sourceNameToUse,
          tone,
          aiProvider,
          preferNewsImage,
          postType: postTypeToUse,
          repoData: repoDataToUse,
        }),
      });

      const data = await res.json();
      if (data.success && data.post) {
        setGenerationProgress(100);
        setGenerationStatusText('Post & visual generation complete!');
        setCurrentPost(data.post);
        setPostContent(data.post.post_content);
        setImageUrl(data.post.image_url || '');
        setVisualPrompt(data.visualPrompt || '');
        setNewsPhotoUrl(data.newsImageUrl || null);
        setAiVisualUrl(data.aiImageUrl || null);
        if (data.variants) {
          setImageVariants(data.variants);
          setSelectedStyle('editorial');
          if (data.variants.editorial) {
            setImageUrl(data.variants.editorial);
          }
        }

        showStatus(
          'success',
          postTypeToUse === 'repo_spotlight'
            ? `AI spotlight post for ${topicToUse} generated with project usage guide & GitHub link!`
            : 'AI post & matched visual generated based on your selected story!'
        );
        loadPastPosts();

        // Scroll smoothly to studio workspace
        const studioElement = document.getElementById('post-review-studio');
        if (studioElement) {
          studioElement.scrollIntoView({ behavior: 'smooth' });
        }
      } else {
        showStatus('error', data.error || 'Failed to generate post');
      }
    } catch (err: any) {
      showStatus('error', err.message || 'Error generating post');
    } finally {
      clearInterval(progressTimer);
      setIsGenerating(false);
    }
  };

  // Publish to LinkedIn
  const handlePublish = async () => {
    if (!postContent.trim()) {
      showStatus('error', 'Post content cannot be empty.');
      return;
    }

    setIsPublishing(true);
    try {
      const { data: { session } } = await supabaseBrowser.auth.getSession();
      const res = await fetch('/api/linkedin/publish', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session?.access_token || ''}`,
          'x-user-id': currentUserId || '',
        },
        body: JSON.stringify({
          userId: currentUserId,
          id: currentPost?.id,
          post_content: postContent,
          image_url: imageUrl || null,
          topic: currentPost?.topic || selectedArticle?.title || 'AI & Tech Research',
        }),
      });

      const data = await res.json();

      if (data.requiresAuth) {
        setShowTokenModal(true);
        showStatus('info', data.message);
      } else if (data.success) {
        setPublishedPostUrl(data.postUrl || null);
        setShowSuccessModal(true);
        showStatus('success', '🎉 Successfully published directly to your LinkedIn feed!');
        if (currentPost) {
          setCurrentPost({
            ...currentPost,
            status: 'posted',
            linkedin_post_url: data.postUrl,
          });
        }
        loadPastPosts();
      } else {
        showStatus('error', data.error || 'Failed to publish to LinkedIn');
      }
    } catch (err: any) {
      showStatus('error', err.message || 'Network error publishing post');
    } finally {
      setIsPublishing(false);
    }
  };

  // Copy to Clipboard
  const handleCopy = () => {
    if (!postContent) return;
    navigator.clipboard.writeText(postContent);
    setCopied(true);
    showStatus('success', 'Formatted LinkedIn post copied to clipboard!');
    setTimeout(() => setCopied(false), 3000);
  };

  // Regenerate Contextual Visual with Google Gemini
  const handleRegenerateVisualWithGemini = async () => {
    if (!postContent.trim()) {
      showStatus('error', 'Please generate or enter some post lines first.');
      return;
    }
    setIsRegeneratingVisual(true);
    try {
      const res = await fetch('/api/linkedin/visual', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-user-id': currentUserId || '' },
        body: JSON.stringify({
          userId: currentUserId,
          postContent,
          topic: currentPost?.topic || selectedArticle?.title || 'AI & Tech Research',
        }),
      });
      const data = await res.json();
      if (data.success) {
        setVisualPrompt(data.visualPrompt);
        if (data.variants) {
          setImageVariants(data.variants);
          setSelectedStyle('editorial');
          setImageUrl(data.variants.editorial || data.imageUrl);
        } else {
          setImageUrl(data.imageUrl);
        }
        setAiVisualUrl(data.imageUrl);
        showStatus('success', '✨ New visual crafted by Google Gemini matching your post lines!');
      } else {
        showStatus('error', data.error || 'Failed to regenerate visual');
      }
    } catch (err: any) {
      showStatus('error', err.message || 'Error generating visual');
    } finally {
      setIsRegeneratingVisual(false);
    }
  };

  // Save LinkedIn Token
  const handleSaveToken = async () => {
    if (!tokenInput.trim()) return;
    setIsSavingToken(true);
    try {
      const { data: { session } } = await supabaseBrowser.auth.getSession();
      const res = await fetch('/api/linkedin/auth', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session?.access_token || ''}`,
          'x-user-id': currentUserId || '',
        },
        body: JSON.stringify({
          userId: currentUserId,
          accessToken: tokenInput.trim(),
        }),
      });

      const data = await res.json();
      if (data.success) {
        setIsConnected(true);
        setProfileName(data.profile?.name || 'Connected');
        setShowTokenModal(false);
        setTokenInput('');
        showStatus('success', `Connected as ${data.profile?.name || 'LinkedIn User'}!`);
      } else {
        showStatus('error', data.error || 'Failed to verify token');
      }
    } catch (err: any) {
      showStatus('error', err.message || 'Error saving token');
    } finally {
      setIsSavingToken(false);
    }
  };

  // Disconnect LinkedIn Account
  const handleDisconnect = async () => {
    if (!confirm('Are you sure you want to disconnect your LinkedIn account?')) return;
    try {
      const { data: { session } } = await supabaseBrowser.auth.getSession();
      const res = await fetch(`/api/linkedin/auth?userId=${currentUserId || ''}`, {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${session?.access_token || ''}`,
          'x-user-id': currentUserId || '',
        },
      });
      if (res.ok) {
        setIsConnected(false);
        setProfileName(null);
        showStatus('info', 'LinkedIn account disconnected successfully.');
      } else {
        showStatus('error', 'Failed to disconnect account');
      }
    } catch {
      showStatus('error', 'Network error disconnecting account');
    }
  };

  if (authLoading) {
    return (
      <div className="min-h-[70vh] flex flex-col items-center justify-center space-y-4">
        <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-blue-600 via-indigo-600 to-cyan-500 flex items-center justify-center animate-pulse shadow-lg shadow-blue-500/25">
          <Linkedin className="w-6 h-6 text-white" />
        </div>
        <div className="text-center space-y-1">
          <p className="text-sm font-bold text-white">Verifying Secure Session...</p>
          <p className="text-xs text-slate-500">Loading your private LinkedIn Studio & credentials</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto space-y-8 pb-20">
      {/* Header Banner */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-6 border-b border-slate-200">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <div className="w-11 h-11 rounded-2xl bg-gradient-to-tr from-blue-600 via-indigo-600 to-cyan-500 flex items-center justify-center shadow-md shadow-blue-500/20">
              <Linkedin className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-black tracking-tight text-slate-900 flex items-center gap-2.5 flex-wrap">
                LinkedIn AI Thought Leadership Studio
                <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-cyan-50 text-cyan-700 border border-cyan-200 flex items-center gap-1.5">
                  <Sparkles className="w-3 h-3 text-cyan-600" />
                  Gemini Flash (3-Key Auto-Rotation Pool)
                </span>
              </h1>
              <p className="text-sm text-slate-500">
                Trending AI Agent Repositories & Tech News Radar: browse open-source agent tools and live stories, then generate single-repo breakdowns or industry insights with Gemini.
              </p>
            </div>
          </div>
        </div>

        {/* Account Connection Status */}
        <div className="flex items-center gap-2.5">
          <button
            onClick={() => setShowTokenModal(true)}
            className={`px-4 py-2 rounded-xl text-xs font-semibold flex items-center gap-2 transition-all border shadow-sm cursor-pointer ${
              isConnected
                ? 'bg-emerald-50 border-emerald-200 text-emerald-800 hover:bg-emerald-100'
                : 'bg-white border-slate-200 text-slate-700 hover:text-slate-900 hover:bg-slate-50 hover:border-slate-300'
            }`}
          >
            <span className={`w-2 h-2 rounded-full ${isConnected ? 'bg-emerald-500 animate-pulse' : 'bg-amber-500'}`}></span>
            {isConnected ? `Connected: ${profileName || 'LinkedIn'}` : 'Connect LinkedIn API'}
          </button>

          {isConnected && (
            <button
              onClick={handleDisconnect}
              className="px-3 py-2 rounded-xl bg-white hover:bg-red-50 hover:border-red-200 border border-slate-200 text-slate-500 hover:text-red-600 text-xs font-semibold transition-all shadow-sm cursor-pointer"
              title="Disconnect LinkedIn Account"
            >
              Disconnect
            </button>
          )}

          <button
            onClick={() => (sourceMode === 'repos' ? fetchRepos(repoSearchQuery, repoSort, activeRepoCategory) : fetchNews())}
            disabled={sourceMode === 'repos' ? isFetchingRepos : isFetchingNews}
            className="px-4 py-2 rounded-xl bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 text-xs font-semibold flex items-center gap-2 transition-colors disabled:opacity-50 shadow-sm cursor-pointer"
          >
            <RefreshCw
              className={`w-3.5 h-3.5 ${
                (sourceMode === 'repos' ? isFetchingRepos : isFetchingNews)
                  ? 'animate-spin text-blue-600'
                  : ''
              }`}
            />
            {sourceMode === 'repos' ? 'Refresh Repos' : 'Refresh News'}
          </button>
        </div>
      </div>

      {/* Toast Alert */}
      {statusMessage && (
        <div
          className={`p-4 rounded-xl text-sm flex items-center justify-between border shadow-sm transition-all animate-in fade-in slide-in-from-top-2 ${
            statusMessage.type === 'success'
              ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
              : statusMessage.type === 'error'
              ? 'bg-red-50 border-red-200 text-red-800'
              : 'bg-blue-50 border-blue-200 text-blue-800'
          }`}
        >
          <div className="flex items-center gap-2.5">
            {statusMessage.type === 'success' ? (
              <Check className="w-4 h-4 text-emerald-600 shrink-0" />
            ) : statusMessage.type === 'error' ? (
              <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
            ) : (
              <Sparkles className="w-4 h-4 text-cyan-600 shrink-0" />
            )}
            <span>{statusMessage.text}</span>
          </div>
          <button onClick={() => setStatusMessage(null)} className="text-xs text-slate-400 hover:text-slate-700">
            ✕
          </button>
        </div>
      )}

      {/* ========================================================================= */}
      {/* STEP 1: DISCOVERY & SELECTION (AI AGENT REPOS OR LIVE NEWS) */}
      {/* ========================================================================= */}
      <section className="p-6 rounded-3xl bg-white border border-slate-200 shadow-sm space-y-6">
        {/* Source Mode Switcher (AI Agent Repos vs Tech & AI News Radar) */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-100">
          <div className="inline-flex p-1 rounded-2xl bg-slate-100 border border-slate-200">
            <button
              onClick={() => setSourceMode('repos')}
              className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition-all cursor-pointer ${
                sourceMode === 'repos'
                  ? 'bg-white text-blue-700 shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <FolderGit2 className="w-3.5 h-3.5 text-blue-600" />
              <span>🚀 Cool AI Agent Repos</span>
              <span className="px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 text-[10px] font-extrabold border border-blue-200">
                ⭐ {repos.length} Repos
              </span>
            </button>

            <button
              onClick={() => setSourceMode('news')}
              className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition-all cursor-pointer ${
                sourceMode === 'news'
                  ? 'bg-white text-cyan-700 shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Newspaper className="w-3.5 h-3.5 text-cyan-600" />
              <span>⚡ Tech & AI News Radar</span>
              <span className="px-2 py-0.5 rounded-full bg-cyan-50 text-cyan-700 text-[10px] font-bold border border-cyan-200">
                {articles.length} Stories
              </span>
            </button>
          </div>

          <div className="text-xs text-slate-500 flex items-center gap-2">
            <Sparkles className="w-3.5 h-3.5 text-blue-600 shrink-0" />
            <span>
              {sourceMode === 'repos'
                ? 'Spotlight open-source AI agents that help developers build faster'
                : 'Curated breaking news from Google RSS, Hacker News, & ArXiv'}
            </span>
          </div>
        </div>

        {sourceMode === 'repos' ? (
          <div className="space-y-5">
            {/* Header & Search Bar */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <div className="flex items-center gap-2">
                  <span className="w-6 h-6 rounded-full bg-blue-50 text-blue-700 font-black text-xs flex items-center justify-center border border-blue-200">
                    1
                  </span>
                  <h2 className="text-base font-bold text-slate-900 flex items-center gap-2 flex-wrap">
                    <FolderGit2 className="w-4 h-4 text-blue-600" />
                    Cool & Trending Open-Source AI Agent Repos
                    <span className="flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-blue-50 text-blue-700 text-[10px] font-bold border border-blue-200">
                      <Star className="w-3 h-3 text-amber-500 fill-amber-500" />
                      {filteredRepos.length} AGENTS AVAILABLE
                    </span>
                  </h2>
                </div>
                <p className="text-xs text-slate-500 mt-1">
                  Discover newest agent frameworks, coding assistants, and browser automation agents that make developer work easy. Select any repo below to generate a single-repo breakdown explaining what it does, how to use it, and providing the GitHub link.
                </p>
              </div>

              {/* Search Bar & Sort Toggle */}
              <div className="flex flex-wrap items-center gap-2.5 w-full md:w-auto">
                <div className="relative w-full sm:w-64">
                  <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    placeholder="Search repos, tools, topics..."
                    value={repoSearchQuery}
                    onChange={(e) => setRepoSearchQuery(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-9 pr-3.5 py-2 text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-blue-500 focus:bg-white"
                  />
                </div>

                <div className="inline-flex p-1 rounded-xl bg-slate-50 border border-slate-200 text-xs">
                  <button
                    onClick={() => {
                      setRepoSort('trending');
                      fetchRepos(repoSearchQuery, 'trending', activeRepoCategory);
                    }}
                    className={`px-3 py-1 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer ${
                      repoSort === 'trending'
                        ? 'bg-white text-blue-700 shadow-sm font-bold'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    <Star className="w-3 h-3 text-amber-500 fill-amber-500" />
                    <span>Trending Stars</span>
                  </button>
                  <button
                    onClick={() => {
                      setRepoSort('newest');
                      fetchRepos(repoSearchQuery, 'newest', activeRepoCategory);
                    }}
                    className={`px-3 py-1 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer ${
                      repoSort === 'newest'
                        ? 'bg-white text-blue-700 shadow-sm font-bold'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    <Zap className="w-3 h-3 text-cyan-600" />
                    <span>Newest Updated</span>
                  </button>
                </div>

                <button
                  onClick={() => fetchRepos(repoSearchQuery, repoSort, activeRepoCategory)}
                  disabled={isFetchingRepos}
                  className="px-3.5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold flex items-center gap-1.5 transition-colors disabled:opacity-50 cursor-pointer"
                  title="Query GitHub live"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${isFetchingRepos ? 'animate-spin text-blue-600' : ''}`} />
                  <span className="hidden sm:inline">Live Scan</span>
                </button>
              </div>
            </div>

            {/* Category Filter Tabs */}
            <div className="flex flex-wrap gap-2 pt-1 border-t border-slate-100">
              {[
                { name: 'All', icon: Layers },
                { name: 'Coding & Dev Tools', icon: Terminal },
                { name: 'Automation & Browsing', icon: Globe },
                { name: 'Multi-Agent Frameworks', icon: Cpu },
                { name: 'Memory & Context', icon: Sparkles },
                { name: 'Workflow & Productivity', icon: Zap },
              ].map((cat) => {
                const Icon = cat.icon;
                const isActive = activeRepoCategory === cat.name;
                const count =
                  cat.name === 'All'
                    ? repos.length
                    : repos.filter((r) => r.category === cat.name).length;
                return (
                  <button
                    key={cat.name}
                    onClick={() => {
                      setActiveRepoCategory(cat.name);
                      fetchRepos(repoSearchQuery, repoSort, cat.name);
                    }}
                    className={`px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer ${
                      isActive
                        ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-sm font-bold'
                        : 'bg-slate-50 hover:bg-slate-100 text-slate-600 hover:text-slate-900 border border-slate-200'
                    }`}
                  >
                    <Icon className="w-3.5 h-3.5" />
                    <span>{cat.name}</span>
                    <span
                      className={`text-[10px] px-1.5 py-0.5 rounded-full font-mono ${
                        isActive ? 'bg-white/20 text-white' : 'bg-slate-200 text-slate-600'
                      }`}
                    >
                      {count}
                    </span>
                  </button>
                );
              })}
            </div>

            {/* Repos Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 max-h-[500px] overflow-y-auto pr-1">
              {filteredRepos.map((repo) => {
                const isSelected = selectedRepo?.id === repo.id;
                return (
                  <div
                    key={repo.id}
                    onClick={() => setSelectedRepo(repo)}
                    className={`p-4 rounded-2xl border transition-all cursor-pointer flex flex-col justify-between group relative ${
                      isSelected
                        ? 'bg-blue-50/70 border-blue-500 shadow-sm ring-1 ring-blue-500/50'
                        : 'bg-white hover:bg-slate-50 border-slate-200 hover:border-slate-300 shadow-sm'
                    }`}
                  >
                    <div className="space-y-2.5">
                      {/* Top Row: Language & Star Count */}
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-1.5 min-w-0">
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-slate-100 text-blue-700 truncate max-w-[140px] flex items-center gap-1">
                            <FolderGit2 className="w-3 h-3 text-blue-600 shrink-0" />
                            {repo.name}
                          </span>
                          <span className="text-[10px] font-mono px-1.5 py-0.5 rounded-md bg-slate-100 text-slate-600">
                            {repo.language}
                          </span>
                        </div>
                        <div className="flex items-center gap-1 shrink-0">
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-amber-50 text-amber-700 border border-amber-200 flex items-center gap-1">
                            <Star className="w-2.5 h-2.5 text-amber-500 fill-amber-500" />
                            {repo.stars ? repo.stars.toLocaleString() : 'Trending'}
                          </span>
                        </div>
                      </div>

                      {/* Full Name */}
                      <h3 className="text-xs font-bold text-slate-900 group-hover:text-blue-700 line-clamp-1">
                        {repo.fullName}
                      </h3>

                      {/* What it Does */}
                      <div className="space-y-1">
                        <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-500 flex items-center gap-1">
                          💡 What it does:
                        </span>
                        <p className="text-[11px] text-slate-600 line-clamp-2 leading-relaxed">
                          {repo.whatItDoes || repo.description}
                        </p>
                      </div>

                      {/* Key Capabilities Pills */}
                      {Array.isArray(repo.whatItCanDo) && repo.whatItCanDo.length > 0 && (
                        <div className="space-y-1 pt-1">
                          <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-500 flex items-center gap-1">
                            ⚡ Superpowers:
                          </span>
                          <div className="flex flex-col gap-1">
                            {repo.whatItCanDo.slice(0, 2).map((cap, idx) => (
                              <div key={idx} className="text-[10px] text-slate-600 flex items-start gap-1 line-clamp-1">
                                <span className="text-blue-500 font-bold shrink-0">•</span>
                                <span className="truncate">{cap}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* How to use snippet preview */}
                      {repo.howToUse && (
                        <div className="p-2 rounded-xl bg-slate-900 text-slate-200 font-mono text-[10px] truncate">
                          <code>{repo.howToUse.split('\n')[0] || repo.howToUse.slice(0, 45)}</code>
                        </div>
                      )}
                    </div>

                    {/* Card Footer Actions */}
                    <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between">
                      <a
                        href={repo.repoUrl}
                        target="_blank"
                        rel="noreferrer"
                        onClick={(e) => e.stopPropagation()}
                        className="text-[10px] text-slate-500 hover:text-blue-600 flex items-center gap-1 font-semibold"
                      >
                        GitHub Repo <ExternalLink className="w-2.5 h-2.5" />
                      </a>

                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedRepo(repo);
                          handleGeneratePost(repo);
                        }}
                        className={`text-[11px] font-bold px-3 py-1.5 rounded-xl transition-all flex items-center gap-1.5 cursor-pointer ${
                          isSelected
                            ? 'bg-blue-600 text-white shadow-sm'
                            : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                        }`}
                      >
                        {isSelected ? (
                          <>
                            <CheckCircle2 className="w-3.5 h-3.5" /> Selected
                          </>
                        ) : (
                          <>
                            <Wand2 className="w-3 h-3 text-blue-600" /> Draft Post
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Selected Repo Action Bar */}
            {selectedRepo && (
              <div className="p-4 rounded-2xl bg-blue-50/70 border border-blue-200 flex flex-col md:flex-row items-center justify-between gap-4">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-9 h-9 rounded-xl bg-blue-100 flex items-center justify-center text-blue-700 shrink-0">
                    <CheckCircle2 className="w-5 h-5" />
                  </div>
                  <div className="min-w-0">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-blue-800">
                      Ready to draft LinkedIn post for AI Agent:
                    </span>
                    <p className="text-xs font-bold text-slate-900 truncate max-w-xl flex items-center gap-1.5">
                      <span>{selectedRepo.name}</span>
                      <span className="text-[10px] font-normal text-slate-500 font-mono">({selectedRepo.fullName})</span>
                    </p>
                    <p className="text-[11px] text-slate-500 truncate flex items-center gap-2">
                      <span>⭐ {selectedRepo.stars ? selectedRepo.stars.toLocaleString() : 'Trending'} Stars</span>
                      <span>•</span>
                      <span>{selectedRepo.language}</span>
                      <span>•</span>
                      <span>{selectedRepo.category}</span>
                    </p>
                  </div>
                </div>

                {/* Controls & Generate CTA */}
                <div className="flex flex-wrap items-center gap-2.5 w-full md:w-auto shrink-0">
                  <select
                    value={tone}
                    onChange={(e: any) => setTone(e.target.value)}
                    className="bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-800 focus:outline-none"
                  >
                    <option value="thought-leader">Thought Leader Tone</option>
                    <option value="technical">Deep Technical Tone</option>
                    <option value="conversational">Conversational Tone</option>
                  </select>

                  <select
                    value={aiProvider}
                    onChange={(e: any) => setAiProvider(e.target.value)}
                    className="bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-800 focus:outline-none"
                  >
                    <option value="gemini">Google Gemini (gemini-flash-latest)</option>
                    <option value="groq">Groq (groq/compound)</option>
                    <option value="claude">Claude (Haiku 4.5)</option>
                  </select>

                  <button
                    onClick={() => handleGeneratePost(selectedRepo)}
                    disabled={isGenerating}
                    className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-black text-xs flex items-center justify-center gap-2 transition-all shadow-md shadow-blue-600/20 disabled:opacity-50 cursor-pointer shrink-0"
                  >
                    {isGenerating ? (
                      <>
                        <RefreshCw className="w-4 h-4 animate-spin text-white" />
                        Analyzing Repo & Crafting Post...
                      </>
                    ) : (
                      <>
                        <Sparkles className="w-4 h-4 text-blue-200" />
                        Generate Repo Spotlight Post & Visual
                      </>
                    )}
                  </button>
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="space-y-5">
            {/* News Header & Search Bar */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <div className="flex items-center gap-2">
                  <span className="w-6 h-6 rounded-full bg-cyan-50 text-cyan-700 font-black text-xs flex items-center justify-center border border-cyan-200">
                    1
                  </span>
                  <h2 className="text-base font-bold text-slate-900 flex items-center gap-2 flex-wrap">
                    <Newspaper className="w-4 h-4 text-cyan-600" />
                    Live Tech & AI News Feed
                    <span className="flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-red-50 text-red-600 text-[10px] font-bold border border-red-200">
                      <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-ping"></span>
                      LIVE STORIES ({filteredArticles.length})
                    </span>
                  </h2>
                </div>
                <p className="text-xs text-slate-500 mt-1">
                  Live breaking news gathered from Google News RSS, Hacker News, and AI Research. Pick any live story below to draft your LinkedIn post.
                </p>
              </div>

              {/* Search Bar */}
              <div className="relative w-full md:w-80">
                <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  placeholder="Filter stories by keyword..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-9 pr-3.5 py-2 text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-cyan-500 focus:bg-white"
                />
              </div>
            </div>

            {/* Category Filter Tabs */}
            <div className="flex flex-wrap gap-2 pt-1 border-t border-slate-100">
              {[
                { name: 'All', icon: Layers },
                { name: 'AI & LLMs', icon: Cpu },
                { name: 'Research & Science', icon: Microscope },
                { name: 'Open Source & Dev', icon: Code2 },
                { name: 'Tech Industry', icon: Building2 },
              ].map((cat) => {
                const Icon = cat.icon;
                const isActive = activeCategory === cat.name;
                const count =
                  cat.name === 'All'
                    ? articles.length
                    : articles.filter((a) => a.category === cat.name).length;
                return (
                  <button
                    key={cat.name}
                    onClick={() => setActiveCategory(cat.name)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer ${
                      isActive
                        ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-sm font-bold'
                        : 'bg-slate-50 hover:bg-slate-100 text-slate-600 hover:text-slate-900 border border-slate-200'
                    }`}
                  >
                    <Icon className="w-3.5 h-3.5" />
                    <span>{cat.name}</span>
                    <span
                      className={`text-[10px] px-1.5 py-0.5 rounded-full font-mono ${
                        isActive ? 'bg-white/20 text-white' : 'bg-slate-200 text-slate-600'
                      }`}
                    >
                      {count}
                    </span>
                  </button>
                );
              })}
            </div>

            {/* News Cards Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 max-h-[460px] overflow-y-auto pr-1">
              {filteredArticles.map((art) => {
                const isSelected = selectedArticle?.id === art.id;
                return (
                  <div
                    key={art.id}
                    onClick={() => {
                      setSelectedArticle(art);
                      setCustomTopic('');
                    }}
                    className={`p-4 rounded-2xl border transition-all cursor-pointer flex flex-col justify-between group relative ${
                      isSelected
                        ? 'bg-blue-50/70 border-cyan-500 shadow-sm ring-1 ring-cyan-500/50'
                        : 'bg-white hover:bg-slate-50 border-slate-200 hover:border-slate-300 shadow-sm'
                    }`}
                  >
                    <div>
                      {/* Category & Source Badges */}
                      <div className="flex items-center justify-between gap-2 mb-2.5">
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-slate-100 text-cyan-700 truncate max-w-[120px]">
                          {art.sourceName}
                        </span>
                        <span className="text-[10px] text-slate-400 shrink-0">
                          {art.category}
                        </span>
                      </div>

                      {/* Headline */}
                      <h3 className="text-xs font-bold text-slate-900 group-hover:text-cyan-700 line-clamp-2 leading-relaxed">
                        {art.title}
                      </h3>

                      {/* Full Summary */}
                      <p className="text-[11px] text-slate-500 mt-2 line-clamp-3 leading-relaxed">
                        {art.summary}
                      </p>
                    </div>

                    {/* Card Footer Actions */}
                    <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between">
                      <a
                        href={art.sourceUrl}
                        target="_blank"
                        rel="noreferrer"
                        onClick={(e) => e.stopPropagation()}
                        className="text-[10px] text-slate-400 hover:text-cyan-600 flex items-center gap-1"
                      >
                        Read article <ExternalLink className="w-2.5 h-2.5" />
                      </a>

                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedArticle(art);
                          handleGeneratePost(art);
                        }}
                        className={`text-[11px] font-bold px-3 py-1.5 rounded-xl transition-all flex items-center gap-1.5 cursor-pointer ${
                          isSelected
                            ? 'bg-cyan-500 text-white shadow-sm'
                            : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                        }`}
                      >
                        {isSelected ? (
                          <>
                            <CheckCircle2 className="w-3.5 h-3.5" /> Selected
                          </>
                        ) : (
                          <>
                            <Wand2 className="w-3 h-3 text-cyan-600" /> Draft Post
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Selected Story Action Bar */}
            {selectedArticle && (
              <div className="p-4 rounded-2xl bg-cyan-50/70 border border-cyan-200 flex flex-col md:flex-row items-center justify-between gap-4">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-9 h-9 rounded-xl bg-cyan-100 flex items-center justify-center text-cyan-700 shrink-0">
                    <CheckCircle2 className="w-5 h-5" />
                  </div>
                  <div className="min-w-0">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-cyan-800">
                      Ready to draft post for:
                    </span>
                    <p className="text-xs font-bold text-slate-900 truncate max-w-xl">
                      {selectedArticle.title}
                    </p>
                    <p className="text-[11px] text-slate-500 truncate">
                      Source: {selectedArticle.sourceName} • {selectedArticle.category}
                    </p>
                  </div>
                </div>

                {/* Controls & Generate CTA */}
                <div className="flex flex-wrap items-center gap-2.5 w-full md:w-auto shrink-0">
                  <select
                    value={tone}
                    onChange={(e: any) => setTone(e.target.value)}
                    className="bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-800 focus:outline-none"
                  >
                    <option value="thought-leader">Thought Leader Tone</option>
                    <option value="technical">Deep Technical Tone</option>
                    <option value="conversational">Conversational Tone</option>
                  </select>

                  <select
                    value={aiProvider}
                    onChange={(e: any) => setAiProvider(e.target.value)}
                    className="bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-800 focus:outline-none"
                  >
                    <option value="gemini">Google Gemini (gemini-flash-latest)</option>
                    <option value="groq">Groq (groq/compound)</option>
                    <option value="claude">Claude (Haiku 4.5)</option>
                  </select>

                  <button
                    onClick={() => handleGeneratePost()}
                    disabled={isGenerating}
                    className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white font-black text-xs flex items-center justify-center gap-2 transition-all shadow-md shadow-cyan-600/20 disabled:opacity-50 cursor-pointer shrink-0"
                  >
                    {isGenerating ? (
                      <>
                        <RefreshCw className="w-4 h-4 animate-spin text-white" />
                        Analyzing Story & Crafting Post...
                      </>
                    ) : (
                      <>
                        <Sparkles className="w-4 h-4 text-cyan-200" />
                        Generate Post & Matched Visual
                      </>
                    )}
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Live Generation Progress Bar & Model HUD */}
        {isGenerating && (
          <div className="p-5 rounded-3xl bg-gradient-to-r from-blue-50/70 via-indigo-50/50 to-cyan-50/70 border border-cyan-200 shadow-sm space-y-4 animate-in fade-in slide-in-from-top-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-cyan-100 border border-cyan-200 flex items-center justify-center text-cyan-600 shrink-0">
                  <Sparkles className="w-5 h-5 animate-spin" />
                </div>
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-xs font-bold text-slate-900">
                      AI Generation in Progress
                    </span>
                    <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-full bg-cyan-100 text-cyan-800 border border-cyan-200">
                      Model: {aiProvider === 'gemini' ? 'gemini-flash-latest' : aiProvider}
                    </span>
                    <span className="text-[10px] font-mono text-emerald-600 font-semibold flex items-center gap-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-ping"></span>
                      3-Key Pool Active
                    </span>
                  </div>
                  <p className="text-xs text-cyan-800 mt-1 font-medium flex items-center gap-1.5">
                    <RefreshCw className="w-3.5 h-3.5 animate-spin text-cyan-600 shrink-0" />
                    {generationStatusText || 'Harvesting research story & drafting post...'}
                  </p>
                </div>
              </div>

              <div className="text-right shrink-0">
                <span className="font-mono text-sm font-black text-cyan-700 bg-white px-2.5 py-1 rounded-lg border border-cyan-200 shadow-sm">
                  {generationProgress}%
                </span>
              </div>
            </div>

            {/* Animated Progress Bar */}
            <div className="w-full bg-slate-200 rounded-full h-3 overflow-hidden border border-slate-300 relative">
              <div
                className="bg-gradient-to-r from-cyan-500 via-blue-600 to-indigo-600 h-full rounded-full transition-all duration-500 relative"
                style={{ width: `${generationProgress}%` }}
              >
                <div className="absolute inset-0 bg-white/30 animate-pulse"></div>
              </div>
            </div>

            {/* Multi-Step Pipeline Indicator */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1 text-[11px] font-medium text-slate-500">
              <div className={`flex items-center gap-1.5 ${generationProgress >= 20 ? 'text-cyan-700 font-bold' : ''}`}>
                <span className={`w-2 h-2 rounded-full ${generationProgress >= 20 ? 'bg-cyan-600' : 'bg-slate-300'}`}></span>
                <span>1. News Scan</span>
              </div>
              <div className={`flex items-center gap-1.5 ${generationProgress >= 45 ? 'text-cyan-700 font-bold' : ''}`}>
                <span className={`w-2 h-2 rounded-full ${generationProgress >= 45 ? 'bg-cyan-600' : 'bg-slate-300'}`}></span>
                <span>2. Gemini Post Draft</span>
              </div>
              <div className={`flex items-center gap-1.5 ${generationProgress >= 75 ? 'text-cyan-700 font-bold' : ''}`}>
                <span className={`w-2 h-2 rounded-full ${generationProgress >= 75 ? 'bg-cyan-600' : 'bg-slate-300'}`}></span>
                <span>3. Visual Prompting</span>
              </div>
              <div className={`flex items-center gap-1.5 ${generationProgress >= 95 ? 'text-cyan-700 font-bold' : ''}`}>
                <span className={`w-2 h-2 rounded-full ${generationProgress >= 95 ? 'bg-cyan-600' : 'bg-slate-300'}`}></span>
                <span>4. 3 Styles Render</span>
              </div>
            </div>
          </div>
        )}
      </section>

      {/* ========================================================================= */}
      {/* STEP 2: POST REVIEW, MATCHED VISUAL & PUBLISHING STUDIO */}
      {/* ========================================================================= */}
      <div id="post-review-studio" className="space-y-4 pt-2">
        {/* Live Published Success Notification Bar */}
        {currentPost?.status === 'posted' && (
          <div className="p-4 sm:p-5 rounded-3xl bg-emerald-50 border border-emerald-300 shadow-md flex flex-col sm:flex-row items-center justify-between gap-4 animate-in fade-in slide-in-from-top-2">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-emerald-100 text-emerald-700 border border-emerald-300 flex items-center justify-center font-bold text-lg shrink-0">
                ✓
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="font-bold text-sm text-emerald-900">
                    🎉 Post Successfully Published to LinkedIn!
                  </h3>
                  <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-bold border border-emerald-300">
                    LIVE ON FEED
                  </span>
                </div>
                <p className="text-xs text-slate-600 mt-0.5">
                  Your post and matched image are now visible to your connections on LinkedIn ({profileName || 'LinkedIn User'}).
                </p>
              </div>
            </div>

            {currentPost.linkedin_post_url && (
              <div className="flex items-center gap-2 shrink-0">
                <a
                  href={currentPost.linkedin_post_url}
                  target="_blank"
                  rel="noreferrer"
                  className="px-4 py-2 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-bold text-xs flex items-center gap-2 shadow-sm transition-all"
                >
                  <ExternalLink className="w-3.5 h-3.5" /> View Live on LinkedIn
                </a>
              </div>
            )}
          </div>
        )}

        <div className="flex items-center gap-2">
          <span className="w-6 h-6 rounded-full bg-blue-50 text-blue-700 font-black text-xs flex items-center justify-center border border-blue-200">
            2
          </span>
          <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
            <Share2 className="w-4 h-4 text-blue-600" />
            Review Post & Matched Visual
          </h2>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          {/* Left Column: Post Copy & Image Controls (6 cols) */}
          <div className="lg:col-span-6 space-y-4">
            <div className="p-5 rounded-3xl bg-white border border-slate-200 space-y-4 shadow-sm">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-700">
                  Editable Post Content
                </span>
                <span className="text-xs text-slate-400 font-mono">{postContent.length} chars</span>
              </div>

              {/* Active AI Model Info Pill */}
              {postContent && (
                <div className="p-3 rounded-2xl bg-cyan-50/80 border border-cyan-200 flex flex-wrap items-center justify-between gap-2 text-xs">
                  <div className="flex items-center gap-2">
                    <Sparkles className="w-3.5 h-3.5 text-cyan-600 shrink-0" />
                    <span className="font-bold text-slate-900">Drafted by Google Gemini</span>
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded-md bg-cyan-100 text-cyan-800 border border-cyan-200">
                      gemini-flash-latest
                    </span>
                    <span className="text-[10px] text-emerald-600 font-mono flex items-center gap-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-ping"></span>
                      3-Key Pool
                    </span>
                  </div>
                  <span className="text-[11px] text-slate-500">
                    Tone: <strong className="text-slate-800 capitalize">{tone.replace('-', ' ')}</strong>
                  </span>
                </div>
              )}

              {/* Editable Text Area */}
              <div>
                <textarea
                  rows={14}
                  value={postContent}
                  onChange={(e) => setPostContent(e.target.value)}
                  placeholder="Select any story above and click 'Generate Post & Matched Visual' to generate your post..."
                  className="w-full bg-slate-50 border border-slate-200 rounded-2xl p-4 text-xs text-slate-900 leading-relaxed placeholder:text-slate-400 focus:outline-none focus:border-cyan-500 focus:bg-white font-sans"
                />
              </div>

              {/* Image Pipeline & Selection Bar */}
              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5 text-cyan-600" />
                    Gemini Image Generation:
                  </span>
                  <button
                    onClick={handleRegenerateVisualWithGemini}
                    disabled={isRegeneratingVisual || !postContent.trim()}
                    className="text-[11px] font-bold text-cyan-700 hover:text-cyan-800 flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-white border border-slate-200 shadow-sm transition-all disabled:opacity-50 cursor-pointer"
                  >
                    <RefreshCw className={`w-3 h-3 ${isRegeneratingVisual ? 'animate-spin text-cyan-600' : ''}`} />
                    {isRegeneratingVisual ? 'Gemini Designing...' : 'Regenerate with Gemini'}
                  </button>
                </div>

                {/* Gemini Style Switcher Tabs */}
                <div className="flex flex-wrap gap-2">
                  <button
                    onClick={() => {
                      setSelectedStyle('editorial');
                      if (imageVariants?.editorial) setImageUrl(imageVariants.editorial);
                      else if (aiVisualUrl) setImageUrl(aiVisualUrl);
                    }}
                    className={`px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all ${
                      selectedStyle === 'editorial'
                        ? 'bg-blue-600 text-white font-bold shadow-sm'
                        : 'bg-white text-slate-600 hover:text-slate-900 border border-slate-200 shadow-sm'
                    }`}
                  >
                    <Sparkles className="w-3 h-3 text-cyan-300" /> 📸 Gemini Photo-Editorial
                  </button>

                  {imageVariants?.isometric && (
                    <button
                      onClick={() => {
                        setSelectedStyle('isometric');
                        setImageUrl(imageVariants.isometric!);
                      }}
                      className={`px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all ${
                        selectedStyle === 'isometric'
                          ? 'bg-indigo-600 text-white font-bold shadow-sm'
                          : 'bg-white text-slate-600 hover:text-slate-900 border border-slate-200 shadow-sm'
                      }`}
                    >
                      <Cpu className="w-3 h-3 text-indigo-300" /> 🧊 Gemini 3D Isometric
                    </button>
                  )}

                  {imageVariants?.vector && (
                    <button
                      onClick={() => {
                        setSelectedStyle('vector');
                        setImageUrl(imageVariants.vector!);
                      }}
                      className={`px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all ${
                        selectedStyle === 'vector'
                          ? 'bg-cyan-600 text-white font-bold shadow-sm'
                          : 'bg-white text-slate-600 hover:text-slate-900 border border-slate-200 shadow-sm'
                      }`}
                    >
                      <Code2 className="w-3 h-3 text-cyan-300" /> 🎨 Gemini Tech Vector
                    </button>
                  )}

                  {newsPhotoUrl && (
                    <button
                      onClick={() => {
                        setSelectedStyle('news');
                        setImageUrl(newsPhotoUrl);
                      }}
                      className={`px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all ${
                        selectedStyle === 'news'
                          ? 'bg-amber-600 text-white font-bold shadow-sm'
                          : 'bg-white text-slate-600 hover:text-slate-900 border border-slate-200 shadow-sm'
                      }`}
                    >
                      <Newspaper className="w-3 h-3 text-amber-500" /> 📰 Original News Photo
                    </button>
                  )}
                </div>

                {/* Gemini Visual Direction Description */}
                {visualPrompt && (
                  <div className="p-3 rounded-xl bg-white border border-slate-200 text-[11px] text-slate-700 space-y-1 shadow-sm">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-cyan-700 flex items-center gap-1">
                        <Sparkles className="w-3 h-3 text-cyan-600" />
                        Gemini Visual Direction (Matched to Post Lines):
                      </span>
                      <span className="text-[10px] text-slate-400 font-mono">gemini-flash-latest</span>
                    </div>
                    <p className="text-slate-600 leading-relaxed italic">
                      "{visualPrompt}"
                    </p>
                  </div>
                )}
              </div>

              {/* Publish / Copy Buttons */}
              <div className="pt-2 flex flex-wrap gap-3">
                <button
                  onClick={handlePublish}
                  disabled={isPublishing || !postContent.trim()}
                  className="flex-1 py-3 px-4 rounded-2xl bg-gradient-to-r from-blue-600 via-indigo-600 to-cyan-500 hover:from-blue-500 hover:to-cyan-400 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-md shadow-blue-600/20 transition-all disabled:opacity-50 cursor-pointer"
                >
                  {isPublishing ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" /> Publishing to LinkedIn...
                    </>
                  ) : (
                    <>
                      <Send className="w-4 h-4" /> Approve & Post to LinkedIn
                    </>
                  )}
                </button>

                <button
                  onClick={handleCopy}
                  disabled={!postContent.trim()}
                  className="py-3 px-5 rounded-2xl bg-slate-100 hover:bg-slate-200 border border-slate-200 text-slate-700 font-semibold text-xs flex items-center justify-center gap-2 transition-colors disabled:opacity-50"
                >
                  {copied ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />}
                  {copied ? 'Copied!' : 'Copy Post'}
                </button>
              </div>
            </div>
          </div>

          {/* Right Column: Live LinkedIn Mockup Card (6 cols) */}
          <div className="lg:col-span-6 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
                Live LinkedIn Feed Mockup
              </span>
              <span className="text-[11px] text-slate-400">Real-time mobile/desktop preview</span>
            </div>

            {/* LinkedIn Card */}
            <div className="rounded-3xl bg-white text-slate-900 border border-slate-200 overflow-hidden shadow-sm">
              {/* Profile Bar */}
              <div className="p-4 flex items-center justify-between border-b border-slate-100">
                <div className="flex items-center gap-3">
                  <div className="w-11 h-11 rounded-full bg-gradient-to-tr from-blue-600 to-indigo-600 flex items-center justify-center text-white font-bold text-sm shadow-sm shrink-0">
                    {profileName ? profileName.slice(0, 2).toUpperCase() : <User className="w-5 h-5" />}
                  </div>
                  <div>
                    <div className="flex items-center gap-1.5">
                      <h4 className="font-bold text-sm leading-tight text-slate-900">
                        {profileName || 'Yuvam Kumar'}
                      </h4>
                      <span className="text-[11px] text-slate-500">• 1st</span>
                    </div>
                    <p className="text-[11px] text-slate-500 leading-tight truncate max-w-xs">
                      Software Engineer & AI Researcher
                    </p>
                    <div className="flex items-center gap-1 text-[10px] text-slate-400 mt-0.5">
                      <span>Just now</span>
                      <span>•</span>
                      <Globe className="w-3 h-3 text-slate-400" />
                    </div>
                  </div>
                </div>

                <div className="text-slate-400 hover:text-slate-600 cursor-pointer font-bold px-2">•••</div>
              </div>

              {/* Post Text */}
              <div className="p-4 text-xs leading-relaxed text-slate-800 whitespace-pre-wrap font-sans">
                {postContent || (
                  <span className="text-slate-400 italic">
                    Your post will appear here with dynamic hooks, concise paragraphs, technical takeaways, and hashtags...
                  </span>
                )}
              </div>

              {/* Matched Visual Image */}
              {imageUrl && (
                <div className="w-full bg-slate-100 relative group overflow-hidden border-y border-slate-200">
                  <img
                    src={imageUrl}
                    alt="Post Visual"
                    className="w-full h-72 object-cover object-center transition-transform duration-300 group-hover:scale-105"
                  />
                  <div className="absolute bottom-2 right-2 bg-slate-900/80 backdrop-blur-md px-2.5 py-1 rounded-lg text-[10px] text-white flex items-center gap-1.5 shadow-sm">
                    <ImageIcon className="w-3 h-3 text-cyan-300" />
                    <span>Visual Matched to Post</span>
                  </div>
                </div>
              )}

              {/* LinkedIn Interaction Mockup */}
              <div className="px-4 py-2.5 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
                <div className="flex items-center gap-1.5">
                  <span className="w-4 h-4 rounded-full bg-blue-500 text-white flex items-center justify-center text-[9px]">
                    👍
                  </span>
                  <span className="text-[11px]">You and 48 others</span>
                </div>
                <span className="text-[11px]">12 comments • 4 reposts</span>
              </div>

              <div className="px-4 py-2 border-t border-slate-100 flex items-center justify-around text-slate-600 text-xs font-semibold">
                <button className="flex items-center gap-1.5 hover:text-blue-600 transition-colors py-1 px-2 rounded">
                  <ThumbsUp className="w-4 h-4" /> Like
                </button>
                <button className="flex items-center gap-1.5 hover:text-blue-600 transition-colors py-1 px-2 rounded">
                  <MessageSquare className="w-4 h-4" /> Comment
                </button>
                <button className="flex items-center gap-1.5 hover:text-blue-600 transition-colors py-1 px-2 rounded">
                  <Repeat2 className="w-4 h-4" /> Repost
                </button>
                <button className="flex items-center gap-1.5 hover:text-blue-600 transition-colors py-1 px-2 rounded">
                  <Send className="w-4 h-4" /> Send
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* SECTION 3: RECENT POSTS ARCHIVE TABLE */}
      {/* ========================================================================= */}
      <div className="p-6 rounded-3xl bg-white border border-slate-200 space-y-4 shadow-sm">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <Clock className="w-4 h-4 text-cyan-600" />
              Past Thought Leadership Posts
            </h3>
            <p className="text-xs text-slate-500">All drafted, approved, and live posts on your account</p>
          </div>
          <span className="text-xs text-slate-400">{pastPosts.length} posts recorded</span>
        </div>

        {pastPosts.length === 0 ? (
          <div className="p-8 text-center text-slate-400 text-xs rounded-2xl bg-slate-50 border border-slate-200">
            No posts generated yet. Select any story above to draft your first post!
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-700">
              <thead className="bg-slate-50/80 border-b border-slate-200 text-slate-500 font-semibold uppercase tracking-wider">
                <tr>
                  <th className="p-3">Topic</th>
                  <th className="p-3">Attached Visual</th>
                  <th className="p-3 text-center">Status</th>
                  <th className="p-3">Created</th>
                  <th className="p-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {pastPosts.map((post) => (
                  <tr key={post.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="p-3 font-medium text-slate-900 max-w-sm">
                      <div className="truncate font-semibold text-slate-900">{post.topic}</div>
                      <div className="truncate text-slate-500 text-[11px]">{post.post_content.slice(0, 75)}...</div>
                    </td>
                    <td className="p-3">
                      {post.image_url ? (
                        <img
                          src={post.image_url}
                          alt="Thumbnail"
                          className="w-14 h-9 object-cover rounded-lg border border-slate-200 shadow-sm"
                        />
                      ) : (
                        <span className="text-slate-400 text-[10px]">No image</span>
                      )}
                    </td>
                    <td className="p-3 text-center">
                      <span
                        className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold ${
                          post.status === 'posted'
                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                            : post.status === 'failed'
                            ? 'bg-red-50 text-red-700 border border-red-200'
                            : 'bg-amber-50 text-amber-700 border border-amber-200'
                        }`}
                      >
                        {post.status.toUpperCase()}
                      </span>
                    </td>
                    <td className="p-3 text-slate-500 text-[11px]">
                      {new Date(post.created_at).toLocaleDateString()}
                    </td>
                    <td className="p-3 text-right space-x-2">
                      <button
                        onClick={() => {
                          setCurrentPost(post);
                          setPostContent(post.post_content);
                          setImageUrl(post.image_url || '');
                          const studioElement = document.getElementById('post-review-studio');
                          if (studioElement) studioElement.scrollIntoView({ behavior: 'smooth' });
                        }}
                        className="px-3 py-1 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-[11px] font-semibold transition-colors"
                      >
                        Edit / Review
                      </button>
                      {post.linkedin_post_url && (
                        <a
                          href={post.linkedin_post_url}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center gap-1 px-3 py-1 rounded-xl bg-blue-50 hover:bg-blue-100 text-blue-700 text-[11px] font-semibold transition-colors"
                        >
                          View <ExternalLink className="w-2.5 h-2.5" />
                        </a>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal: Connect LinkedIn Access Token */}
      {showTokenModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-3xl p-6 max-w-md w-full shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center text-white shadow-sm">
                  <Linkedin className="w-4 h-4" />
                </div>
                <h3 className="font-bold text-slate-900 text-base">LinkedIn Account Settings</h3>
              </div>
              <button
                onClick={() => setShowTokenModal(false)}
                className="text-slate-400 hover:text-slate-700 text-sm"
              >
                ✕
              </button>
            </div>

            <p className="text-xs text-slate-600 leading-relaxed">
              {isConnected ? (
                <>
                  Your personal profile <strong className="text-emerald-600">{profileName || 'LinkedIn User'}</strong> is connected with <code className="bg-slate-100 px-1.5 py-0.5 rounded text-cyan-700">w_member_social</code> scope. You can update your token below or disconnect.
                </>
              ) : (
                <>
                  Connect your personal LinkedIn profile to enable 1-click publishing. Enter your LinkedIn OAuth Access Token with <code className="bg-slate-100 px-1.5 py-0.5 rounded text-cyan-700">w_member_social</code> permission.
                </>
              )}
            </p>

            <div className="space-y-2">
              <label className="text-xs font-semibold text-slate-700">
                {isConnected ? 'Replace LinkedIn Access Token:' : 'LinkedIn Access Token:'}
              </label>
              <textarea
                rows={3}
                value={tokenInput}
                onChange={(e) => setTokenInput(e.target.value)}
                placeholder="AQX..."
                className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-xs text-slate-900 font-mono focus:outline-none focus:border-cyan-500 focus:bg-white"
              />
            </div>

            <div className="pt-2 flex flex-wrap gap-2">
              <button
                onClick={handleSaveToken}
                disabled={isSavingToken || !tokenInput.trim()}
                className="flex-1 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold flex items-center justify-center gap-2 transition-all disabled:opacity-50 shadow-sm"
              >
                {isSavingToken ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Key className="w-3.5 h-3.5" />}
                {isConnected ? 'Update Token' : 'Connect Account'}
              </button>
              {isConnected && (
                <button
                  onClick={() => {
                    setShowTokenModal(false);
                    handleDisconnect();
                  }}
                  className="py-2.5 px-3 rounded-xl bg-red-50 hover:bg-red-100 border border-red-200 text-red-700 text-xs font-semibold transition-colors"
                >
                  Disconnect
                </button>
              )}
              <button
                onClick={() => setShowTokenModal(false)}
                className="py-2.5 px-4 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Celebratory Post Successfully Published to LinkedIn */}
      {showSuccessModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-white border border-emerald-200 rounded-3xl p-6 sm:p-8 max-w-lg w-full shadow-2xl space-y-6 relative overflow-hidden">
            <div className="absolute -top-24 -right-24 w-48 h-48 bg-emerald-100 rounded-full blur-3xl pointer-events-none"></div>

            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3.5">
                <div className="w-12 h-12 rounded-2xl bg-emerald-100 border border-emerald-200 flex items-center justify-center text-emerald-600 text-2xl shadow-sm shrink-0">
                  🎉
                </div>
                <div>
                  <h3 className="font-black text-slate-900 text-lg sm:text-xl leading-tight">
                    Post Published to LinkedIn!
                  </h3>
                  <p className="text-xs text-emerald-700 font-medium mt-0.5">
                    Live on your profile and visible to your network
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowSuccessModal(false)}
                className="text-slate-400 hover:text-slate-700 text-sm"
              >
                ✕
              </button>
            </div>

            {/* Post Summary Details */}
            <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-2.5">
              <div className="flex items-center justify-between text-xs border-b border-slate-100 pb-2">
                <span className="text-slate-500">Author Account:</span>
                <span className="font-bold text-slate-900">{profileName || 'Your Profile'}</span>
              </div>
              <div className="flex items-center justify-between text-xs border-b border-slate-100 pb-2">
                <span className="text-slate-500">Story Topic:</span>
                <span className="font-bold text-cyan-700 truncate max-w-[240px]">{currentPost?.topic}</span>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-500">Feed Status:</span>
                <span className="px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 text-[10px] font-bold border border-emerald-200 flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-ping"></span>
                  LIVE ON LINKEDIN
                </span>
              </div>
            </div>

            {/* Direct Action Buttons */}
            <div className="flex flex-col sm:flex-row gap-3 pt-1">
              {publishedPostUrl && (
                <a
                  href={publishedPostUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="flex-1 py-3 px-4 rounded-xl bg-gradient-to-r from-blue-600 via-indigo-600 to-cyan-500 hover:from-blue-500 hover:to-cyan-400 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-sm transition-all"
                >
                  <ExternalLink className="w-4 h-4" /> View Live Post on LinkedIn
                </a>
              )}
              <button
                onClick={() => {
                  if (publishedPostUrl) {
                    navigator.clipboard.writeText(publishedPostUrl);
                    showStatus('success', 'LinkedIn post URL copied!');
                  }
                }}
                className="py-3 px-4 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-xs flex items-center justify-center gap-1.5 transition-colors"
              >
                <Copy className="w-3.5 h-3.5" /> Copy Post Link
              </button>
              <button
                onClick={() => setShowSuccessModal(false)}
                className="py-3 px-4 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-xs transition-colors"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
