
import React from 'react';

interface CriteriaCardProps {
  label: string;
  score: number;
  explanation: string;
  color: string;
}

const CriteriaCard: React.FC<CriteriaCardProps> = ({ label, score, explanation, color }) => {
  return (
    <div className={`p-4 rounded-xl border-l-4 ${color} bg-white shadow-sm hover:shadow-md transition-shadow`}>
      <div className="flex justify-between items-center mb-2">
        <h3 className="font-bold text-slate-700">{label}</h3>
        <span className={`px-3 py-1 rounded-full text-white font-bold text-lg ${color.replace('border-', 'bg-')}`}>
          {score}
        </span>
      </div>
      <p className="text-sm text-slate-600 leading-relaxed italic">
        "{explanation}"
      </p>
    </div>
  );
};

export default CriteriaCard;
