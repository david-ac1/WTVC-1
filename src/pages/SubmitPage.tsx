import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Bot, Plus, Trash2, AlertCircle, Github, ExternalLink, Loader2, Upload, X, Image } from 'lucide-react';
import { projectService } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../context/AuthContext';

// Predefined options
const PREDEFINED_TECHNOLOGIES = [
  'React', 'Vue.js', 'Angular', 'Svelte', 'Next.js', 'Nuxt.js',
  'TypeScript', 'JavaScript', 'Python', 'Java', 'C#', 'Go', 'Rust',
  'Node.js', 'Express', 'FastAPI', 'Django', 'Spring Boot',
  'PostgreSQL', 'MySQL', 'MongoDB', 'Redis', 'Supabase', 'Firebase',
  'AWS', 'Vercel', 'Netlify', 'Docker', 'Kubernetes',
  'Tailwind CSS', 'Bootstrap', 'Material-UI', 'Chakra UI'
];

const PREDEFINED_TAGS = [
  'Frontend', 'Backend', 'Full Stack', 'Mobile', 'AI/ML', 'Data Science',
  'E-commerce', 'Social Media', 'Productivity', 'Gaming', 'Education',
  'Healthcare', 'Finance', 'Portfolio', 'Dashboard', 'API', 'SaaS',
  'Open Source', 'Startup', 'Enterprise'
];

const PREDEFINED_AI_TOOLS = [
  'GitHub Copilot', 'ChatGPT', 'Claude', 'Cursor', 'v0.dev', 'Bolt.new',
  'Midjourney', 'DALL-E', 'Stable Diffusion', 'Vercel AI SDK',
  'OpenAI API', 'Anthropic API', 'Google Bard', 'Tabnine', 'CodeWhisperer'
];

interface AIAnalysisResult {
  vciScore: number;
  analysis: string;
  confidence: number;
  indicators: {
    codePatterns: string[];
    commitPatterns: string[];
    documentationPatterns: string[];
  };
}

interface ScreenshotFile {
  id: string;
  file: File;
  preview: string;
  uploaded: boolean;
  url?: string;
}

export const SubmitPage: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [loading, setLoading] = React.useState(false);
  const [analyzingRepo, setAnalyzingRepo] = React.useState(false);
  const [uploadingScreenshots, setUploadingScreenshots] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [aiAnalysis, setAiAnalysis] = React.useState<AIAnalysisResult | null>(null);
  
  const [formData, setFormData] = React.useState({
    title: '',
    description: '',
    githubUrl: '',
    liveUrl: '',
    technologies: [] as string[],
    tags: [] as string[],
    aiTools: [] as string[]
  });

  // Screenshot management
  const [screenshots, setScreenshots] = React.useState<ScreenshotFile[]>([]);
  const [dragActive, setDragActive] = React.useState(false);

  const [currentTech, setCurrentTech] = React.useState('');
  const [currentTag, setCurrentTag] = React.useState('');
  const [currentAiTool, setCurrentAiTool] = React.useState('');

  // Function to fetch AI analysis from Edge Function
  const fetchAiAnalysis = async (githubUrl: string): Promise<AIAnalysisResult> => {
    try {
      setAnalyzingRepo(true);
      setError(null);

      const { data, error } = await supabase.functions.invoke('analyze-repo', {
        body: { githubUrl }
      });

      if (error) {
        console.error('Edge Function error:', error);
        throw new Error(error.message || 'Failed to analyze repository');
      }

      if (!data) {
        throw new Error('No analysis data received');
      }

      // Validate the response structure
      const analysisResult: AIAnalysisResult = {
        vciScore: Math.max(0, Math.min(100, data.vciScore || 50)),
        analysis: data.analysis || 'Analysis completed successfully.',
        confidence: Math.max(0, Math.min(100, data.confidence || 50)),
        indicators: {
          codePatterns: data.indicators?.codePatterns || [],
          commitPatterns: data.indicators?.commitPatterns || [],
          documentationPatterns: data.indicators?.documentationPatterns || []
        }
      };

      return analysisResult;
    } catch (err) {
      console.error('Error fetching AI analysis:', err);
      throw new Error(err instanceof Error ? err.message : 'Failed to analyze repository');
    } finally {
      setAnalyzingRepo(false);
    }
  };

  // Function to trigger AI analysis when GitHub URL is provided
  const handleAnalyzeRepo = async () => {
    if (!formData.githubUrl.trim()) {
      setError('Please provide a GitHub URL first');
      return;
    }

    if (!isValidGitHubUrl(formData.githubUrl)) {
      setError('Please provide a valid GitHub repository URL');
      return;
    }

    try {
      const analysis = await fetchAiAnalysis(formData.githubUrl.trim());
      setAiAnalysis(analysis);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to analyze repository');
      setAiAnalysis(null);
    }
  };

  // Screenshot upload functions
  const handleFileSelect = (files: FileList | null) => {
    if (!files) return;

    const newScreenshots: ScreenshotFile[] = [];
    
    for (let i = 0; i < Math.min(files.length, 5 - screenshots.length); i++) {
      const file = files[i];
      
      // Validate file type
      if (!file.type.startsWith('image/')) {
        setError(`${file.name} is not an image file`);
        continue;
      }

      // Validate file size (max 10MB)
      if (file.size > 10 * 1024 * 1024) {
        setError(`${file.name} is too large (max 10MB)`);
        continue;
      }

      const screenshot: ScreenshotFile = {
        id: `${Date.now()}_${i}`,
        file,
        preview: URL.createObjectURL(file),
        uploaded: false
      };

      newScreenshots.push(screenshot);
    }

    setScreenshots(prev => [...prev, ...newScreenshots]);
    setError(null);
  };

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileSelect(e.dataTransfer.files);
    }
  };

  const removeScreenshot = (id: string) => {
    setScreenshots(prev => {
      const updated = prev.filter(s => s.id !== id);
      // Clean up preview URLs
      const removed = prev.find(s => s.id === id);
      if (removed) {
        URL.revokeObjectURL(removed.preview);
      }
      return updated;
    });
  };

  const uploadScreenshots = async (): Promise<string[]> => {
    if (screenshots.length === 0) return [];

    try {
      setUploadingScreenshots(true);
      const uploadedUrls: string[] = [];

      for (const screenshot of screenshots) {
        if (screenshot.uploaded && screenshot.url) {
          uploadedUrls.push(screenshot.url);
          continue;
        }

        // Generate unique file path
        const fileExt = screenshot.file.name.split('.').pop();
        const fileName = `${user?.id}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}.${fileExt}`;
        const filePath = `screenshots/${fileName}`;

        // Upload file to Supabase Storage
        const { data: uploadData, error: uploadError } = await supabase.storage
          .from('screenshots')
          .upload(filePath, screenshot.file, {
            cacheControl: '3600',
            upsert: false
          });

        if (uploadError) {
          console.error('Screenshot upload error:', uploadError);
          throw new Error(`Failed to upload ${screenshot.file.name}`);
        }

        // Get public URL
        const { data: urlData } = supabase.storage
          .from('screenshots')
          .getPublicUrl(filePath);

        if (!urlData.publicUrl) {
          throw new Error(`Failed to get URL for ${screenshot.file.name}`);
        }

        uploadedUrls.push(urlData.publicUrl);
        
        // Update screenshot status
        setScreenshots(prev => prev.map(s => 
          s.id === screenshot.id 
            ? { ...s, uploaded: true, url: urlData.publicUrl }
            : s
        ));
      }

      return uploadedUrls;
    } catch (err) {
      console.error('Error uploading screenshots:', err);
      throw err;
    } finally {
      setUploadingScreenshots(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!user) {
      setError('You must be logged in to submit a project');
      return;
    }

    // Validation
    if (!formData.title.trim()) {
      setError('Project title is required');
      return;
    }

    if (formData.title.length > 60) {
      setError('Project title must be 60 characters or less');
      return;
    }

    if (!formData.description.trim()) {
      setError('Project description is required');
      return;
    }

    const wordCount = formData.description.trim().split(/\s+/).length;
    if (wordCount < 20) {
      setError('Project description must be at least 20 words (100-300 words recommended)');
      return;
    }

    if (wordCount > 300) {
      setError('Project description must be 300 words or less');
      return;
    }

    if (!formData.githubUrl.trim()) {
      setError('GitHub repository URL is required');
      return;
    }

    if (!isValidGitHubUrl(formData.githubUrl)) {
      setError('Please provide a valid GitHub repository URL');
      return;
    }

    if (formData.liveUrl && !isValidHttpsUrl(formData.liveUrl)) {
      setError('Live demo URL must be a valid HTTPS URL');
      return;
    }

    if (formData.technologies.length === 0) {
      setError('At least one technology is required');
      return;
    }

    if (formData.technologies.length > 10) {
      setError('Maximum 10 technologies allowed');
      return;
    }

    if (formData.tags.length === 0) {
      setError('At least one tag is required');
      return;
    }

    if (formData.tags.length > 5) {
      setError('Maximum 5 tags allowed');
      return;
    }

    if (formData.aiTools.length > 5) {
      setError('Maximum 5 AI tools allowed');
      return;
    }

    try {
      setLoading(true);
      setError(null);

      // Upload screenshots first
      let screenshotUrls: string[] = [];
      if (screenshots.length > 0) {
        try {
          screenshotUrls = await uploadScreenshots();
        } catch (uploadError) {
          setError('Failed to upload screenshots. Please try again.');
          return;
        }
      }

      // Get AI analysis if not already done
      let finalAnalysis = aiAnalysis;
      if (!finalAnalysis) {
        try {
          finalAnalysis = await fetchAiAnalysis(formData.githubUrl.trim());
        } catch (analysisError) {
          // If AI analysis fails, use fallback values but still allow submission
          console.warn('AI analysis failed, using fallback values:', analysisError);
          finalAnalysis = {
            vciScore: calculateFallbackVCIScore(formData.aiTools),
            analysis: 'AI analysis was not available. Score based on declared AI tools usage.',
            confidence: 30,
            indicators: {
              codePatterns: [],
              commitPatterns: [],
              documentationPatterns: []
            }
          };
        }
      }

      // Extract repo name from GitHub URL
      const repoName = extractRepoName(formData.githubUrl);

      // Transform AI tools to the expected format
      const aiToolsFormatted = formData.aiTools.map(tool => ({
        name: tool,
        category: 'coding' as const,
        usage: 'primary' as const
      }));

      // Calculate code breakdown based on VCI score
      const codeBreakdown = calculateCodeBreakdown(finalAnalysis.vciScore);

      // Construct the new project object
      const newProject = {
        title: formData.title.trim(),
        description: formData.description.trim(),
        repoName,
        githubUrl: formData.githubUrl.trim(),
        liveUrl: formData.liveUrl.trim() || undefined,
        screenshots: screenshotUrls,
        technologies: formData.technologies,
        tags: formData.tags,
        aiTools: aiToolsFormatted,
        vciScore: finalAnalysis.vciScore,
        communityVciScore: undefined,
        submittedBy: user.email?.split('@')[0] || 'unknown',
        isVerified: false,
        analysis: finalAnalysis.analysis,
        confidence: finalAnalysis.confidence,
        indicators: finalAnalysis.indicators,
        developmentProcess: {
          totalHours: 0,
          aiAssistedHours: 0,
          manualHours: 0,
          challenges: [],
          learnings: []
        },
        prompts: [],
        codeBreakdown
      };

      // Submit to Supabase
      const createdProject = await projectService.createProject(newProject);
      
      // Navigate to the new project page
      navigate(`/project/${createdProject.id}`);
    } catch (err) {
      console.error('Error submitting project:', err);
      setError('Failed to submit project. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const isValidGitHubUrl = (url: string): boolean => {
    const githubRegex = /^https:\/\/github\.com\/[a-zA-Z0-9_.-]+\/[a-zA-Z0-9_.-]+\/?$/;
    return githubRegex.test(url);
  };

  const isValidHttpsUrl = (url: string): boolean => {
    try {
      const urlObj = new URL(url);
      return urlObj.protocol === 'https:';
    } catch {
      return false;
    }
  };

  const extractRepoName = (githubUrl: string): string => {
    const match = githubUrl.match(/github\.com\/[^\/]+\/([^\/]+)/);
    return match ? match[1].replace(/\.git$/, '') : '';
  };

  const calculateFallbackVCIScore = (aiTools: string[]): number => {
    if (aiTools.length === 0) return 10;
    if (aiTools.length === 1) return 30;
    if (aiTools.length === 2) return 50;
    if (aiTools.length === 3) return 70;
    return 85;
  };

  const calculateCodeBreakdown = (vciScore: number) => {
    // Convert VCI score to code breakdown percentages
    const aiGenerated = Math.round(vciScore * 0.6); // 60% of VCI score
    const aiModified = Math.round(vciScore * 0.3); // 30% of VCI score
    const humanWritten = Math.max(0, 100 - aiGenerated - aiModified);

    return {
      aiGenerated,
      aiModified,
      humanWritten
    };
  };

  const addItem = (
    type: 'technologies' | 'tags' | 'aiTools',
    value: string,
    currentValue: string,
    setCurrentValue: (value: string) => void,
    maxItems: number
  ) => {
    const trimmedValue = value || currentValue.trim();
    if (!trimmedValue) return;

    const currentItems = formData[type];
    if (currentItems.includes(trimmedValue)) {
      setError(`${trimmedValue} is already added`);
      return;
    }

    if (currentItems.length >= maxItems) {
      setError(`Maximum ${maxItems} ${type} allowed`);
      return;
    }

    setFormData(prev => ({
      ...prev,
      [type]: [...prev[type], trimmedValue]
    }));
    setCurrentValue('');
    setError(null);
  };

  const removeItem = (type: 'technologies' | 'tags' | 'aiTools', item: string) => {
    setFormData(prev => ({
      ...prev,
      [type]: prev[type].filter(i => i !== item)
    }));
  };

  const getWordCount = (text: string): number => {
    return text.trim() ? text.trim().split(/\s+/).length : 0;
  };

  const getVCIScoreColor = (score: number) => {
    if (score >= 80) return 'text-red-600 bg-red-50 border-red-200';
    if (score >= 60) return 'text-orange-600 bg-orange-50 border-orange-200';
    if (score >= 40) return 'text-yellow-600 bg-yellow-50 border-yellow-200';
    return 'text-green-600 bg-green-50 border-green-200';
  };

  const getVCIScoreLabel = (score: number) => {
    if (score >= 80) return 'Highly AI-Generated';
    if (score >= 60) return 'AI-Assisted';
    if (score >= 40) return 'Hybrid Approach';
    return 'Mostly Human-Coded';
  };

  return (
    <div className="max-w-4xl mx-auto">
      <div className="bg-white border border-gray-300 rounded-lg">
        {/* Header */}
        <div className="border-b border-gray-200 p-6">
          <div className="flex items-center space-x-3 mb-2">
            <Bot className="h-6 w-6 text-blue-500" />
            <h1 className="text-2xl font-bold text-gray-900">Submit Your Project</h1>
          </div>
          <p className="text-gray-600">
            Share your project with the community and get AI-powered insights on development patterns.
          </p>
        </div>

        {/* Error Message */}
        {error && (
          <div className="mx-6 mt-6 p-4 bg-red-50 border border-red-200 rounded-lg">
            <div className="flex items-center space-x-3">
              <AlertCircle className="h-5 w-5 text-red-500" />
              <p className="text-sm text-red-600">{error}</p>
            </div>
          </div>
        )}

        {/* AI Analysis Results */}
        {aiAnalysis && (
          <div className="mx-6 mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-lg font-semibold text-blue-900">AI Analysis Complete</h3>
              <div className={`px-3 py-1 rounded-full text-sm font-medium border ${getVCIScoreColor(aiAnalysis.vciScore)}`}>
                VCI Score: {aiAnalysis.vciScore}% - {getVCIScoreLabel(aiAnalysis.vciScore)}
              </div>
            </div>
            <p className="text-blue-800 mb-3">{aiAnalysis.analysis}</p>
            <div className="text-sm text-blue-700">
              <strong>Confidence:</strong> {aiAnalysis.confidence}%
            </div>
            {aiAnalysis.indicators.codePatterns.length > 0 && (
              <div className="mt-2 text-sm text-blue-700">
                <strong>Key Indicators:</strong> {aiAnalysis.indicators.codePatterns.slice(0, 3).join(', ')}
              </div>
            )}
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-8">
          {/* Basic Information Section */}
          <div className="space-y-6">
            <h2 className="text-xl font-semibold text-gray-900 border-b border-gray-200 pb-2">
              Basic Information
            </h2>

            {/* Project Title */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Project Title <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={formData.title}
                onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="My Awesome Project"
                maxLength={60}
                required
              />
              <p className="text-xs text-gray-500 mt-1">
                {formData.title.length}/60 characters
              </p>
            </div>

            {/* Project Description */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Project Description <span className="text-red-500">*</span>
              </label>
              <textarea
                value={formData.description}
                onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                rows={6}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Briefly explain your project's purpose and functionality. Focus on key features and benefits..."
                required
              />
              <p className="text-xs text-gray-500 mt-1">
                {getWordCount(formData.description)} words (100-300 recommended)
              </p>
            </div>

            {/* GitHub Repository URL */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                GitHub Repository URL <span className="text-red-500">*</span>
              </label>
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <Github className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <input
                    type="url"
                    value={formData.githubUrl}
                    onChange={(e) => setFormData(prev => ({ ...prev, githubUrl: e.target.value }))}
                    className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="https://github.com/username/repository"
                    required
                  />
                </div>
                <button
                  type="button"
                  onClick={handleAnalyzeRepo}
                  disabled={analyzingRepo || !formData.githubUrl.trim()}
                  className="px-4 py-2 bg-blue-500 hover:bg-blue-600 disabled:bg-blue-300 text-white rounded-lg transition-colors flex items-center space-x-2"
                >
                  {analyzingRepo ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      <span>Analyzing...</span>
                    </>
                  ) : (
                    <>
                      <Bot className="h-4 w-4" />
                      <span>Analyze</span>
                    </>
                  )}
                </button>
              </div>
              <p className="text-xs text-gray-500 mt-1">
                Provide the full URL to your project repository. Click "Analyze" to get AI insights.
              </p>
            </div>

            {/* Live Demo URL */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Live Demo URL <span className="text-gray-400">(optional)</span>
              </label>
              <div className="relative">
                <ExternalLink className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <input
                  type="url"
                  value={formData.liveUrl}
                  onChange={(e) => setFormData(prev => ({ ...prev, liveUrl: e.target.value }))}
                  className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="https://myproject.vercel.app"
                />
              </div>
              <p className="text-xs text-gray-500 mt-1">
                Link to your deployed project (must be HTTPS)
              </p>
            </div>
          </div>

          {/* Screenshots Section */}
          <div className="space-y-6">
            <h2 className="text-xl font-semibold text-gray-900 border-b border-gray-200 pb-2">
              Project Screenshots
            </h2>

            {/* Screenshot Upload Area */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Screenshots <span className="text-gray-400">(optional, max 5)</span>
              </label>
              
              {/* Drag and Drop Area */}
              <div
                className={`relative border-2 border-dashed rounded-lg p-6 text-center transition-colors ${
                  dragActive 
                    ? 'border-blue-400 bg-blue-50' 
                    : 'border-gray-300 hover:border-gray-400'
                }`}
                onDragEnter={handleDrag}
                onDragLeave={handleDrag}
                onDragOver={handleDrag}
                onDrop={handleDrop}
              >
                <input
                  type="file"
                  multiple
                  accept="image/*"
                  onChange={(e) => handleFileSelect(e.target.files)}
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                  disabled={screenshots.length >= 5}
                />
                <div className="space-y-2">
                  <Image className="h-8 w-8 text-gray-400 mx-auto" />
                  <div className="text-sm text-gray-600">
                    <span className="font-medium text-blue-600">Click to upload</span> or drag and drop
                  </div>
                  <p className="text-xs text-gray-500">
                    PNG, JPG, GIF up to 10MB each (max 5 images)
                  </p>
                </div>
              </div>

              {/* Screenshot Previews */}
              {screenshots.length > 0 && (
                <div className="mt-4 grid grid-cols-2 md:grid-cols-3 gap-4">
                  {screenshots.map((screenshot) => (
                    <div key={screenshot.id} className="relative group">
                      <img
                        src={screenshot.preview}
                        alt="Screenshot preview"
                        className="w-full h-32 object-cover rounded-lg border border-gray-200"
                      />
                      <button
                        type="button"
                        onClick={() => removeScreenshot(screenshot.id)}
                        className="absolute top-2 right-2 p-1 bg-red-500 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        <X className="h-3 w-3" />
                      </button>
                      {screenshot.uploaded && (
                        <div className="absolute bottom-2 left-2 px-2 py-1 bg-green-500 text-white text-xs rounded">
                          Uploaded
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Technologies and Tools Section */}
          <div className="space-y-6">
            <h2 className="text-xl font-semibold text-gray-900 border-b border-gray-200 pb-2">
              Technologies & Tools
            </h2>

            {/* Technologies Used */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Technologies Used <span className="text-red-500">*</span>
              </label>
              
              {/* Predefined Technologies */}
              <div className="mb-3">
                <p className="text-xs text-gray-600 mb-2">Select from common technologies:</p>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                  {PREDEFINED_TECHNOLOGIES.map((tech) => (
                    <button
                      key={tech}
                      type="button"
                      onClick={() => addItem('technologies', tech, '', () => {}, 10)}
                      disabled={formData.technologies.includes(tech)}
                      className={`p-2 text-sm border rounded transition-colors ${
                        formData.technologies.includes(tech)
                          ? 'bg-blue-50 border-blue-200 text-blue-800 cursor-not-allowed'
                          : 'border-gray-300 hover:border-blue-300 hover:bg-blue-50'
                      }`}
                    >
                      {tech}
                    </button>
                  ))}
                </div>
              </div>

              {/* Custom Technology Input */}
              <div className="flex gap-2 mb-3">
                <input
                  type="text"
                  value={currentTech}
                  onChange={(e) => setCurrentTech(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addItem('technologies', '', currentTech, setCurrentTech, 10))}
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Add custom technology"
                />
                <button
                  type="button"
                  onClick={() => addItem('technologies', '', currentTech, setCurrentTech, 10)}
                  className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600"
                >
                  Add
                </button>
              </div>

              {/* Selected Technologies */}
              <div className="flex flex-wrap gap-2">
                {formData.technologies.map((tech) => (
                  <span
                    key={tech}
                    className="inline-flex items-center px-3 py-1 bg-gray-100 text-gray-800 rounded-full text-sm"
                  >
                    {tech}
                    <button
                      type="button"
                      onClick={() => removeItem('technologies', tech)}
                      className="ml-2 text-gray-500 hover:text-red-500"
                    >
                      ×
                    </button>
                  </span>
                ))}
              </div>
              <p className="text-xs text-gray-500 mt-1">
                {formData.technologies.length}/10 technologies
              </p>
            </div>

            {/* Project Tags */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Project Tags <span className="text-red-500">*</span>
              </label>
              
              {/* Predefined Tags */}
              <div className="mb-3">
                <p className="text-xs text-gray-600 mb-2">Select relevant categories:</p>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                  {PREDEFINED_TAGS.map((tag) => (
                    <button
                      key={tag}
                      type="button"
                      onClick={() => addItem('tags', tag, '', () => {}, 5)}
                      disabled={formData.tags.includes(tag)}
                      className={`p-2 text-sm border rounded transition-colors ${
                        formData.tags.includes(tag)
                          ? 'bg-green-50 border-green-200 text-green-800 cursor-not-allowed'
                          : 'border-gray-300 hover:border-green-300 hover:bg-green-50'
                      }`}
                    >
                      {tag}
                    </button>
                  ))}
                </div>
              </div>

              {/* Custom Tag Input */}
              <div className="flex gap-2 mb-3">
                <input
                  type="text"
                  value={currentTag}
                  onChange={(e) => setCurrentTag(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addItem('tags', '', currentTag, setCurrentTag, 5))}
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Add custom tag"
                />
                <button
                  type="button"
                  onClick={() => addItem('tags', '', currentTag, setCurrentTag, 5)}
                  className="px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600"
                >
                  Add
                </button>
              </div>

              {/* Selected Tags */}
              <div className="flex flex-wrap gap-2">
                {formData.tags.map((tag) => (
                  <span
                    key={tag}
                    className="inline-flex items-center px-3 py-1 bg-green-100 text-green-800 rounded-full text-sm"
                  >
                    {tag}
                    <button
                      type="button"
                      onClick={() => removeItem('tags', tag)}
                      className="ml-2 text-green-500 hover:text-red-500"
                    >
                      ×
                    </button>
                  </span>
                ))}
              </div>
              <p className="text-xs text-gray-500 mt-1">
                {formData.tags.length}/5 tags
              </p>
            </div>

            {/* AI Tools Used */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                AI Tools Used <span className="text-gray-400">(optional)</span>
              </label>
              
              {/* Predefined AI Tools */}
              <div className="mb-3">
                <p className="text-xs text-gray-600 mb-2">Select AI tools or services utilized:</p>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                  {PREDEFINED_AI_TOOLS.map((tool) => (
                    <button
                      key={tool}
                      type="button"
                      onClick={() => addItem('aiTools', tool, '', () => {}, 5)}
                      disabled={formData.aiTools.includes(tool)}
                      className={`p-2 text-sm border rounded transition-colors ${
                        formData.aiTools.includes(tool)
                          ? 'bg-purple-50 border-purple-200 text-purple-800 cursor-not-allowed'
                          : 'border-gray-300 hover:border-purple-300 hover:bg-purple-50'
                      }`}
                    >
                      {tool}
                    </button>
                  ))}
                </div>
              </div>

              {/* Custom AI Tool Input */}
              <div className="flex gap-2 mb-3">
                <input
                  type="text"
                  value={currentAiTool}
                  onChange={(e) => setCurrentAiTool(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addItem('aiTools', '', currentAiTool, setCurrentAiTool, 5))}
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Add custom AI tool"
                />
                <button
                  type="button"
                  onClick={() => addItem('aiTools', '', currentAiTool, setCurrentAiTool, 5)}
                  className="px-4 py-2 bg-purple-500 text-white rounded-lg hover:bg-purple-600"
                >
                  Add
                </button>
              </div>

              {/* Selected AI Tools */}
              <div className="flex flex-wrap gap-2">
                {formData.aiTools.map((tool) => (
                  <span
                    key={tool}
                    className="inline-flex items-center px-3 py-1 bg-purple-100 text-purple-800 rounded-full text-sm"
                  >
                    {tool}
                    <button
                      type="button"
                      onClick={() => removeItem('aiTools', tool)}
                      className="ml-2 text-purple-500 hover:text-red-500"
                    >
                      ×
                    </button>
                  </span>
                ))}
              </div>
              <p className="text-xs text-gray-500 mt-1">
                {formData.aiTools.length}/5 AI tools
              </p>
            </div>
          </div>

          {/* Submit */}
          <div className="flex justify-end space-x-4 pt-6 border-t border-gray-200">
            <button
              type="button"
              onClick={() => navigate('/')}
              className="px-6 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
              disabled={loading || analyzingRepo || uploadingScreenshots}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading || analyzingRepo || uploadingScreenshots}
              className="px-6 py-2 bg-blue-500 hover:bg-blue-600 disabled:bg-blue-300 text-white rounded-lg transition-colors flex items-center space-x-2"
            >
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span>Submitting...</span>
                </>
              ) : uploadingScreenshots ? (
                <>
                  <Upload className="h-4 w-4" />
                  <span>Uploading Screenshots...</span>
                </>
              ) : (
                <>
                  <Plus className="h-4 w-4" />
                  <span>Submit Project</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};