export interface AITool {
  name: string;
  category: 'coding' | 'design' | 'content' | 'testing' | 'deployment';
  usage: 'primary' | 'secondary' | 'minimal';
}

export interface Project {
  id: string;
  title: string;
  description: string;
  repoName?: string;
  githubUrl?: string;
  liveUrl?: string;
  screenshots: string[];
  technologies: string[];
  tags?: string[];
  aiTools: AITool[];
  vciScore: number; // Vibe Code Index 0-100
  communityVciScore?: number;
  submittedBy: string;
  submittedAt: Date;
  upvotes: number;
  downvotes: number;
  commentCount: number;
  isVerified: boolean;
  developmentProcess: {
    totalHours: number;
    aiAssistedHours: number;
    manualHours: number;
    challenges: string[];
    learnings: string[];
  };
  prompts?: {
    tool: string;
    prompt: string;
    result: string;
  }[];
  codeBreakdown: {
    aiGenerated: number; // percentage
    aiModified: number;
    humanWritten: number;
  };
  analysis?: string;
  confidence?: number;
  indicators?: {
    codePatterns: string[];
    commitPatterns: string[];
    documentationPatterns: string[];
  };
  aiVibeScore?: number; // For backward compatibility
}

export interface Comment {
  id: string;
  projectId: string;
  author: string;
  content: string;
  createdAt: Date;
  upvotes: number;
  downvotes: number;
  parentId?: string;
  replies?: Comment[];
  karma: number;
  vciVote?: number; // User's VCI score vote
  isOP?: boolean;
  depth?: number; // For nested display
}

export interface User {
  id: string;
  username: string;
  avatar?: string;
  karma: number;
  projectsSubmitted: number;
  joinedAt: Date;
  specialization?: string;
  aiToolsUsed: string[];
}

export interface GamePrediction {
  id: string;
  awayTeam: {
    city: string;
    name: string;
  };
  homeTeam: {
    city: string;
    name: string;
  };
  predictedAwayScore: number;
  predictedHomeScore: number;
  gameDate: Date;
  confidence: number;
  reasoning: string[];
  submittedBy: string;
  submittedAt: Date;
  upvotes: number;
  downvotes: number;
  commentCount: number;
  flair?: string;
}

// New interfaces for sidebar data
export interface CommunityStats {
  totalProjects: number;
  aiAssistedProjects: number;
  verifiedProjects: number;
  activeDevelopers: number;
}

export interface PopularAiTool {
  name: string;
  count: number;
  percentage: number;
}

export type SortType = 'trending' | 'recent' | 'vci-high' | 'vci-low' | 'controversial' | 'top' | 'new';
export type FilterType = 'all' | 'verified' | 'unverified' | 'high-ai' | 'low-ai';