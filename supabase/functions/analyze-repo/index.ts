import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { decode } from 'https://deno.land/std@0.168.0/encoding/base64.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

interface AnalysisRequest {
  githubUrl: string
  repoData?: {
    files: Array<{
      name: string
      content: string
      path: string
    }>
    commits: Array<{
      message: string
      author: string
      date: string
    }>
    readme?: string
  }
}

interface AnalysisResponse {
  vciScore: number
  analysis: string
  confidence: number
  indicators: {
    codePatterns: string[]
    commitPatterns: string[]
    documentationPatterns: string[]
  }
}

interface GitHubRepo {
  owner: string
  repo: string
}

// Exponential backoff helper function
async function fetchWithExponentialBackoff(
  url: string,
  options: RequestInit,
  maxRetries: number = 3,
  initialDelay: number = 1000
): Promise<Response> {
  let lastError: Error | null = null;
  
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      const response = await fetch(url, options);
      
      // If successful or client error (4xx except 429), return immediately
      if (response.ok || (response.status >= 400 && response.status < 500 && response.status !== 429)) {
        return response;
      }
      
      // If it's a rate limit (429) or server error (5xx), retry with backoff
      if (response.status === 429 || response.status >= 500) {
        if (attempt === maxRetries) {
          // Last attempt failed, return the response
          return response;
        }
        
        // Calculate exponential backoff delay
        const delay = initialDelay * Math.pow(2, attempt);
        const jitter = Math.random() * 0.1 * delay; // Add 10% jitter
        const totalDelay = delay + jitter;
        
        console.log(`Request failed with status ${response.status}, retrying in ${Math.round(totalDelay)}ms (attempt ${attempt + 1}/${maxRetries + 1})`);
        
        // Wait before retrying
        await new Promise(resolve => setTimeout(resolve, totalDelay));
        continue;
      }
      
      // For other status codes, return the response
      return response;
      
    } catch (error) {
      lastError = error as Error;
      
      if (attempt === maxRetries) {
        // Last attempt failed, throw the error
        throw lastError;
      }
      
      // Calculate exponential backoff delay for network errors
      const delay = initialDelay * Math.pow(2, attempt);
      const jitter = Math.random() * 0.1 * delay;
      const totalDelay = delay + jitter;
      
      console.log(`Network error occurred, retrying in ${Math.round(totalDelay)}ms (attempt ${attempt + 1}/${maxRetries + 1}):`, error.message);
      
      // Wait before retrying
      await new Promise(resolve => setTimeout(resolve, totalDelay));
    }
  }
  
  // This should never be reached, but just in case
  throw lastError || new Error('Max retries exceeded');
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Get API keys from environment variables
    const openaiApiKey = Deno.env.get('OPENAI_API_KEY')
    const githubPat = Deno.env.get('GITHUB_PAT')
    
    if (!openaiApiKey) {
      throw new Error('OpenAI API key not configured')
    }
    
    if (!githubPat) {
      throw new Error('GitHub PAT not configured')
    }

    // Parse the request body
    const { githubUrl }: AnalysisRequest = await req.json()

    if (!githubUrl) {
      return new Response(
        JSON.stringify({ error: 'GitHub URL is required' }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    // Parse GitHub URL to extract owner and repo
    const repoInfo = parseGitHubUrl(githubUrl)
    if (!repoInfo) {
      return new Response(
        JSON.stringify({ error: 'Invalid GitHub URL format' }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    // Fetch repository data from GitHub
    console.log(`Fetching data for ${repoInfo.owner}/${repoInfo.repo}`)
    
    const [readmeContent, packageJsonContent, commitsData] = await Promise.all([
      fetchGitHubReadme(repoInfo.owner, repoInfo.repo, githubPat),
      fetchGitHubFile(repoInfo.owner, repoInfo.repo, 'package.json', githubPat),
      fetchGitHubCommits(repoInfo.owner, repoInfo.repo, githubPat)
    ])

    // Construct repository data object
    const repoData = {
      readme: readmeContent,
      files: packageJsonContent ? [{
        name: 'package.json',
        content: packageJsonContent,
        path: 'package.json'
      }] : [],
      commits: commitsData
    }

    // Create detailed analysis prompt with fetched data
    const analysisPrompt = createDetailedAnalysisPrompt(githubUrl, repoData)

    // Call OpenAI API with exponential backoff
    console.log('Calling OpenAI API with exponential backoff...')
    const openaiResponse = await fetchWithExponentialBackoff(
      'https://api.openai.com/v1/chat/completions',
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${openaiApiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'gpt-3.5-turbo',
          messages: [
            {
              role: 'system',
              content: `You are an expert code analyst specializing in detecting AI-assisted development patterns. 
              You analyze repositories to determine the "Vibe Code Index" (VCI) - a score from 0-100 indicating how much AI assistance was likely used.

              Scoring guidelines:
              - 0-20: Clearly human-written code with personal style, inconsistencies, creative solutions
              - 21-40: Mostly human with minimal AI assistance
              - 41-60: Hybrid approach with moderate AI assistance
              - 61-80: Heavy AI assistance with human oversight
              - 81-100: Predominantly AI-generated with minimal human modification

              Key indicators to look for:
              
              AI-Generated Patterns:
              - Overly consistent code formatting
              - Perfect documentation coverage
              - Systematic error handling patterns
              - Generic variable and function names
              - Boilerplate-heavy structure
              - Templated commit messages
              - Large, infrequent commits
              - Perfect grammar in documentation
              
              Human-Written Patterns:
              - Inconsistent formatting styles
              - Personal coding quirks
              - Creative problem-solving approaches
              - Organic code evolution
              - Iterative development history
              - Casual commit messages
              - Frequent small commits

              Respond with a JSON object containing:
              - vciScore: number (0-100)
              - analysis: string (2-3 sentences explaining the assessment)
              - confidence: number (0-100, how confident you are in the assessment)
              - indicators: object with arrays of specific patterns found (codePatterns, commitPatterns, documentationPatterns)`
            },
            {
              role: 'user',
              content: analysisPrompt
            }
          ],
          temperature: 0.3,
          max_tokens: 1000
        })
      },
      3, // maxRetries
      1000 // initialDelay (1 second)
    )

    if (!openaiResponse.ok) {
      const errorData = await openaiResponse.text()
      console.error('OpenAI API error:', errorData)
      throw new Error(`OpenAI API error: ${openaiResponse.status} - ${errorData}`)
    }

    const openaiData = await openaiResponse.json()
    const aiResponse = openaiData.choices[0]?.message?.content

    if (!aiResponse) {
      throw new Error('No response from OpenAI')
    }

    // Parse the AI response
    let analysisResult: AnalysisResponse
    try {
      analysisResult = JSON.parse(aiResponse)
    } catch (parseError) {
      // Fallback if JSON parsing fails
      console.error('Failed to parse AI response as JSON:', aiResponse)
      analysisResult = {
        vciScore: 50,
        analysis: 'Unable to perform detailed analysis. This appears to be a standard repository.',
        confidence: 30,
        indicators: {
          codePatterns: [],
          commitPatterns: [],
          documentationPatterns: []
        }
      }
    }

    // Validate and sanitize the response
    analysisResult.vciScore = Math.max(0, Math.min(100, analysisResult.vciScore || 50))
    analysisResult.confidence = Math.max(0, Math.min(100, analysisResult.confidence || 50))

    console.log(`Analysis completed successfully. VCI Score: ${analysisResult.vciScore}`)

    return new Response(
      JSON.stringify(analysisResult),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )

  } catch (error) {
    console.error('Error in analyze-repo function:', error)
    
    return new Response(
      JSON.stringify({ 
        error: 'Internal server error',
        details: error.message 
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )
  }
})

// Helper function to parse GitHub URLs
function parseGitHubUrl(url: string): GitHubRepo | null {
  try {
    const githubRegex = /^https:\/\/github\.com\/([^\/]+)\/([^\/]+)\/?$/
    const match = url.match(githubRegex)
    
    if (!match) {
      return null
    }
    
    return {
      owner: match[1],
      repo: match[2].replace(/\.git$/, '') // Remove .git suffix if present
    }
  } catch (error) {
    console.error('Error parsing GitHub URL:', error)
    return null
  }
}

// Helper function to fetch individual GitHub files with retry logic
async function fetchGitHubFile(
  owner: string, 
  repo: string, 
  path: string, 
  token: string
): Promise<string | null> {
  try {
    const url = `https://api.github.com/repos/${owner}/${repo}/contents/${path}`
    
    const response = await fetchWithExponentialBackoff(url, {
      headers: {
        'Authorization': `token ${token}`,
        'User-Agent': 'VibeCoded-App',
        'Accept': 'application/vnd.github.v3+json'
      }
    }, 2, 500) // Fewer retries for GitHub API, shorter delay
    
    if (response.status === 404) {
      // File not found
      return null
    }
    
    if (!response.ok) {
      console.error(`GitHub API error for ${path}:`, response.status, await response.text())
      return null
    }
    
    const data = await response.json()
    
    if (data.content && data.encoding === 'base64') {
      const decodedBytes = decode(data.content.replace(/\n/g, ''))
      return new TextDecoder().decode(decodedBytes)
    }
    
    return null
  } catch (error) {
    console.error(`Error fetching GitHub file ${path}:`, error)
    return null
  }
}

// Helper function to fetch GitHub README with retry logic
async function fetchGitHubReadme(
  owner: string, 
  repo: string, 
  token: string
): Promise<string | null> {
  try {
    const url = `https://api.github.com/repos/${owner}/${repo}/readme`
    
    const response = await fetchWithExponentialBackoff(url, {
      headers: {
        'Authorization': `token ${token}`,
        'User-Agent': 'VibeCoded-App',
        'Accept': 'application/vnd.github.v3+json'
      }
    }, 2, 500) // Fewer retries for GitHub API, shorter delay
    
    if (response.status === 404) {
      // README not found
      return null
    }
    
    if (!response.ok) {
      console.error('GitHub API error for README:', response.status, await response.text())
      return null
    }
    
    const data = await response.json()
    
    if (data.content && data.encoding === 'base64') {
      const decodedBytes = decode(data.content.replace(/\n/g, ''))
      return new TextDecoder().decode(decodedBytes)
    }
    
    return null
  } catch (error) {
    console.error('Error fetching GitHub README:', error)
    return null
  }
}

// Helper function to fetch recent GitHub commits with retry logic
async function fetchGitHubCommits(
  owner: string, 
  repo: string, 
  token: string
): Promise<Array<{ message: string; author: string; date: string }>> {
  try {
    const url = `https://api.github.com/repos/${owner}/${repo}/commits?per_page=20`
    
    const response = await fetchWithExponentialBackoff(url, {
      headers: {
        'Authorization': `token ${token}`,
        'User-Agent': 'VibeCoded-App',
        'Accept': 'application/vnd.github.v3+json'
      }
    }, 2, 500) // Fewer retries for GitHub API, shorter delay
    
    if (!response.ok) {
      console.error('GitHub API error for commits:', response.status, await response.text())
      return []
    }
    
    const commits = await response.json()
    
    return commits.map((commit: any) => ({
      message: commit.commit.message,
      author: commit.commit.author.name,
      date: commit.commit.author.date
    }))
  } catch (error) {
    console.error('Error fetching GitHub commits:', error)
    return []
  }
}

function createDetailedAnalysisPrompt(githubUrl: string, repoData: any): string {
  const { files, commits, readme } = repoData
  
  let prompt = `Analyze this GitHub repository for AI development patterns: ${githubUrl}\n\n`
  
  if (readme) {
    prompt += `README Content (first 2000 chars):\n${readme.substring(0, 2000)}\n\n`
  } else {
    prompt += `No README file found.\n\n`
  }
  
  if (files && files.length > 0) {
    prompt += `Code Files Analysis:\n`
    files.slice(0, 5).forEach((file: any) => {
      prompt += `File: ${file.path}\n${file.content.substring(0, 1000)}\n\n`
    })
  } else {
    prompt += `No package.json or key files found.\n\n`
  }
  
  if (commits && commits.length > 0) {
    prompt += `Recent Commit Messages (last ${commits.length} commits):\n`
    commits.slice(0, 15).forEach((commit: any) => {
      prompt += `- "${commit.message}" by ${commit.author} on ${commit.date}\n`
    })
    prompt += '\n'
  } else {
    prompt += `No commit history available.\n\n`
  }
  
  prompt += `Based on the above repository data, analyze for AI assistance patterns:

Code Patterns to look for:
- Consistent formatting and style across all files
- Perfect documentation coverage and formatting
- Systematic error handling patterns
- Generic variable names and function structures
- Boilerplate-heavy code structure
- Overly comprehensive type definitions
- Perfect code organization

Commit Patterns to analyze:
- Templated or overly formal commit messages
- Large, infrequent commits vs. small iterative ones
- Perfect commit message formatting and grammar
- Lack of "work in progress" or experimental commits
- Commits that add complete features at once

Documentation Patterns:
- Overly comprehensive README with perfect formatting
- Perfect grammar and professional language throughout
- Generic project descriptions
- Complete API documentation from the start
- Lack of personal voice or informal language

Provide a detailed JSON response with:
- vciScore: 0-100 (likelihood of AI assistance)
- analysis: Clear explanation of your assessment
- confidence: How certain you are (0-100)
- indicators: Specific patterns found in each category

Be thorough but concise in your analysis.`

  return prompt
}