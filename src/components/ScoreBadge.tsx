import React from 'react';
import { Bot } from 'lucide-react';

interface ScoreBadgeProps {
  score: number;
  size?: 'small' | 'large';
}

export const ScoreBadge: React.FC<ScoreBadgeProps> = ({ score, size = 'small' }) => {
  const getScoreColor = (score: number) => {
    if (score >= 80) return 'from-blue-500 to-blue-600';
    if (score >= 60) return 'from-blue-400 to-blue-500';
    if (score >= 40) return 'from-slate-400 to-slate-500';
    return 'from-green-400 to-green-500';
  };

  const getScoreLabel = (score: number) => {
    if (score >= 80) return 'Highly AI-Coded';
    if (score >= 60) return 'AI-Assisted';
    if (score >= 40) return 'Mixed Signals';
    return 'Human-Coded';
  };

  const sizeClasses = size === 'large' 
    ? 'px-4 py-2 text-sm' 
    : 'px-3 py-1 text-xs';

  return (
    <div className={`inline-flex items-center space-x-2 bg-gradient-to-r ${getScoreColor(score)} text-white font-medium rounded-full ${sizeClasses}`}>
      <Bot className={`${size === 'large' ? 'h-4 w-4' : 'h-3 w-3'}`} />
      <span>{score}%</span>
      {size === 'large' && (
        <span className="text-xs opacity-90">
          {getScoreLabel(score)}
        </span>
      )}
    </div>
  );
};