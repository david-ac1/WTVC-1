import React from 'react';
import { Bot, Users, Code, Zap, ArrowRight, CheckCircle } from 'lucide-react';

export const AboutPage: React.FC = () => {
  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      {/* Hero Section */}
      <div className="text-center mb-16">
        <div className="inline-flex items-center justify-center w-20 h-20 bg-blue-500/20 rounded-full mb-6">
          <Bot className="h-10 w-10 text-blue-400" />
        </div>
        <h1 className="text-4xl md:text-5xl font-bold text-white mb-6">
          What is <span className="text-blue-400">"Vibe Coded"</span>?
        </h1>
        <p className="text-xl text-slate-300 max-w-3xl mx-auto leading-relaxed">
          In the age of AI-powered development tools, it's becoming increasingly difficult to tell 
          whether code was written by a human developer or generated with AI assistance. 
          "Vibe Coded" refers to that unmistakable feeling when code just feels... artificial.
        </p>
      </div>

      {/* What We Detect */}
      <div className="mb-16">
        <h2 className="text-2xl font-bold text-white mb-8 text-center">What We Detect</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-slate-800/30 border border-slate-700 rounded-lg p-6">
            <div className="flex items-center space-x-3 mb-4">
              <div className="p-2 bg-red-500/20 rounded-lg">
                <Code className="h-6 w-6 text-red-400" />
              </div>
              <h3 className="text-lg font-semibold text-white">AI Patterns</h3>
            </div>
            <ul className="space-y-2 text-slate-300 text-sm">
              <li className="flex items-start space-x-2">
                <CheckCircle className="h-4 w-4 text-red-400 mt-0.5 flex-shrink-0" />
                <span>Overly consistent code formatting</span>
              </li>
              <li className="flex items-start space-x-2">
                <CheckCircle className="h-4 w-4 text-red-400 mt-0.5 flex-shrink-0" />
                <span>Perfect documentation coverage</span>
              </li>
              <li className="flex items-start space-x-2">
                <CheckCircle className="h-4 w-4 text-red-400 mt-0.5 flex-shrink-0" />
                <span>Systematic error handling</span>
              </li>
              <li className="flex items-start space-x-2">
                <CheckCircle className="h-4 w-4 text-red-400 mt-0.5 flex-shrink-0" />
                <span>Templated commit messages</span>
              </li>
            </ul>
          </div>

          <div className="bg-slate-800/30 border border-slate-700 rounded-lg p-6">
            <div className="flex items-center space-x-3 mb-4">
              <div className="p-2 bg-green-500/20 rounded-lg">
                <Users className="h-6 w-6 text-green-400" />
              </div>
              <h3 className="text-lg font-semibold text-white">Human Patterns</h3>
            </div>
            <ul className="space-y-2 text-slate-300 text-sm">
              <li className="flex items-start space-x-2">
                <CheckCircle className="h-4 w-4 text-green-400 mt-0.5 flex-shrink-0" />
                <span>Inconsistent formatting styles</span>
              </li>
              <li className="flex items-start space-x-2">
                <CheckCircle className="h-4 w-4 text-green-400 mt-0.5 flex-shrink-0" />
                <span>Creative problem-solving approaches</span>
              </li>
              <li className="flex items-start space-x-2">
                <CheckCircle className="h-4 w-4 text-green-400 mt-0.5 flex-shrink-0" />
                <span>Organic code evolution</span>
              </li>
              <li className="flex items-start space-x-2">
                <CheckCircle className="h-4 w-4 text-green-400 mt-0.5 flex-shrink-0" />
                <span>Personal coding quirks</span>
              </li>
            </ul>
          </div>
        </div>
      </div>

      {/* How It Works */}
      <div className="mb-16">
        <h2 className="text-2xl font-bold text-white mb-8 text-center">How It Works</h2>
        <div className="space-y-8">
          <div className="flex items-start space-x-4">
            <div className="flex items-center justify-center w-8 h-8 bg-blue-500 text-white rounded-full font-bold text-sm flex-shrink-0">
              1
            </div>
            <div>
              <h3 className="text-lg font-semibold text-white mb-2">Submit a Repository</h3>
              <p className="text-slate-300">
                Share any public GitHub repository you want the community to analyze. 
                It could be your own project or something you've discovered.
              </p>
            </div>
          </div>

          <div className="flex items-start space-x-4">
            <div className="flex items-center justify-center w-8 h-8 bg-blue-500 text-white rounded-full font-bold text-sm flex-shrink-0">
              2
            </div>
            <div>
              <h3 className="text-lg font-semibold text-white mb-2">AI Analysis</h3>
              <p className="text-slate-300">
                Our AI examines code patterns, documentation quality, commit history, 
                and other signals to determine the likelihood of AI assistance.
              </p>
            </div>
          </div>

          <div className="flex items-start space-x-4">
            <div className="flex items-center justify-center w-8 h-8 bg-blue-500 text-white rounded-full font-bold text-sm flex-shrink-0">
              3
            </div>
            <div>
              <h3 className="text-lg font-semibnt text-white mb-2">Community Voting</h3>
              <p className="text-slate-300">
                Developers vote and discuss their observations, sharing insights about 
                what makes code feel human-written versus AI-generated.
              </p>
            </div>
          </div>

          <div className="flex items-start space-x-4">
            <div className="flex items-center justify-center w-8 h-8 bg-blue-500 text-white rounded-full font-bold text-sm flex-shrink-0">
              4
            </div>
            <div>
              <h3 className="text-lg font-semibold text-white mb-2">Get Your Score</h3>
              <p className="text-slate-300">
                Receive a comprehensive "AI Vibe Score" along with community feedback 
                and detailed analysis of the development patterns.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Why This Matters */}
      <div className="bg-slate-800/30 border border-slate-700 rounded-xl p-8 mb-16">
        <h2 className="text-2xl font-bold text-white mb-6">Why This Matters</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <div>
            <h3 className="text-lg font-semibold text-white mb-3">For Developers</h3>
            <ul className="space-y-2 text-slate-300 text-sm">
              <li>• Understand how AI tools affect your coding style</li>
              <li>• Learn to balance AI assistance with human creativity</li>
              <li>• Improve code review skills for the AI era</li>
              <li>• Stay aware of evolving development practices</li>
            </ul>
          </div>
          <div>
            <h3 className="text-lg font-semibold text-white mb-3">For the Industry</h3>
            <ul className="space-y-2 text-slate-300 text-sm">
              <li>• Track the evolution of AI-assisted development</li>
              <li>• Maintain transparency in open-source projects</li>
              <li>• Foster discussions about AI ethics in coding</li>
              <li>• Build better AI tools through community insights</li>
            </ul>
          </div>
        </div>
      </div>

      {/* CTA */}
      <div className="text-center bg-gradient-to-r from-blue-500/10 to-blue-600/10 border border-blue-500/20 rounded-xl p-8">
        <h2 className="text-2xl font-bold text-white mb-4">Ready to Analyze?</h2>
        <p className="text-slate-300 mb-6">
          Submit your first project and see how the community rates its AI influence.
        </p>
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <a
            href="/submit"
            className="inline-flex items-center px-6 py-3 bg-blue-500 hover:bg-blue-600 text-white font-medium rounded-lg transition-colors"
          >
            Submit a Project
            <ArrowRight className="ml-2 h-4 w-4" />
          </a>
          <a
            href="/"
            className="inline-flex items-center px-6 py-3 border border-slate-600 hover:border-slate-500 text-slate-300 font-medium rounded-lg transition-colors"
          >
            Browse Projects
          </a>
        </div>
      </div>
    </div>
  );
};