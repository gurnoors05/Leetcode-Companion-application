import React, { useEffect, useState, useRef } from 'react';
import { X, Save, AlertCircle } from 'lucide-react';

interface PopupProps {
  data: {
    question: any;
    submission: any;
    code?: string;
    lang?: string;
  };
  onClose: () => void;
}

const Popup: React.FC<PopupProps> = ({ data, onClose }) => {
  const [jwt, setJwt] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [customTag, setCustomTag] = useState('');
  const [notes, setNotes] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  
  const interactedRef = useRef(false); // Tracks if user has made a manual selection

  // History State
  const [failedAttempts, setFailedAttempts] = useState<number>(0);

  useEffect(() => {
    const checkJwt = (result: any) => {
      if (result.jwt) {
        setJwt(result.jwt);
        // Do NOT prefill selected tags with topic tags to ensure only user clicks are saved
        setSelectedTags([]);
        
        if (data.question?.questionFrontendId) {
          fetchAttemptHistory(result.jwt, data.question.questionFrontendId);
        }
      } else {
        setJwt(null);
      }
      setLoading(false);
    };

    chrome.storage.local.get(['jwt'], checkJwt);

    const handleStorageChange = (changes: any, areaName: string) => {
      if (areaName === 'local' && changes.jwt) {
        if (changes.jwt.newValue) {
          checkJwt({ jwt: changes.jwt.newValue });
        } else {
          setJwt(null);
        }
      }
    };

    chrome.storage.onChanged.addListener(handleStorageChange);
    return () => {
      chrome.storage.onChanged.removeListener(handleStorageChange);
    };
  }, [data]);


  const fetchAttemptHistory = async (token: string, leetcodeNumber: string | number) => {
    try {
      const response = await fetch(`${import.meta.env.VITE_API_URL}/submission-attempts?leetcodeNumber=${leetcodeNumber}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      if (response.ok) {
        const data = await response.json();
        if (data.attempts && Array.isArray(data.attempts)) {
          setFailedAttempts(data.attempts.length);
        }
      }
    } catch (e) {
      console.error("Failed to fetch attempt history", e);
    }
  };

  const handleToggleTag = (tag: string) => {
    interactedRef.current = true;
    setSelectedTags(prev => 
      prev.includes(tag) ? prev.filter(t => t !== tag) : [...prev, tag]
    );
  };

  const handleAddCustomTag = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && customTag.trim()) {
      interactedRef.current = true;
      const tag = customTag.trim();
      if (!selectedTags.includes(tag)) {
        setSelectedTags([...selectedTags, tag]);
      }
      setCustomTag('');
    }
  };

  const handleSave = async () => {
    if (!jwt) return;
    setSaving(true);
    setError('');

    const finalTags = [...selectedTags];
    const pendingTag = customTag.trim();
    if (pendingTag && !finalTags.includes(pendingTag)) {
      finalTags.push(pendingTag);
    }

    const payload = {
      title: data.question?.title || 'Unknown',
      leetcode_url: `https://leetcode.com/problems/${data.question?.titleSlug}/`,
      leetcode_number: Number(data.question?.questionFrontendId),
      difficulty: data.question?.difficulty?.toLowerCase() || 'medium',
      status: 'solved',
      patterns: finalTags.map(tag => ({
        pattern_name: tag,
        approach_notes: notes,
        code_snippet: data.code,
        language: data.lang,
        time_complexity: null,
        space_complexity: null
      })),
      topic_tags: data.question?.topicTags?.map((t: any) => t.name) || [],
    };

    try {
      const response = await fetch(`${import.meta.env.VITE_API_URL}/problems`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${jwt}`
        },
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to save');
      }

      setSuccess(true);
      setTimeout(() => {
        onClose();
      }, 2000);
    } catch (err: any) {
      setError(err.message || 'An error occurred');
    } finally {
      setSaving(false);
    }
  };

  if (loading) return null;

  return (
    <div className="fixed inset-0 flex items-center justify-center bg-black/50 backdrop-blur-sm z-50 pointer-events-auto">
      <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl w-full max-w-md overflow-hidden transform transition-all p-6 border border-gray-100 dark:border-gray-800">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold bg-gradient-to-r from-emerald-500 to-teal-400 bg-clip-text text-transparent">
            Submission Accepted!
          </h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors">
            <X size={24} />
          </button>
        </div>

        {!jwt ? (
          <div className="text-center py-8">
            <AlertCircle className="w-16 h-16 text-amber-500 mx-auto mb-4" />
            <p className="text-gray-600 dark:text-gray-400 mb-6">Log in to save this approach and track your progress.</p>
            <a 
              href={import.meta.env.VITE_LOGIN_URL || 'http://localhost:3000/login'}
              target="_blank"
              rel="noreferrer"
              className="inline-block bg-blue-600 hover:bg-blue-700 text-white font-medium px-6 py-2 rounded-lg transition-colors"
            >
              Log In
            </a>
          </div>
        ) : success ? (
          <div className="text-center py-8 text-green-500 font-medium">
            Successfully saved!
          </div>
        ) : (
          <div className="space-y-5">
            <div>
              <h3 className="text-lg font-semibold text-gray-800 dark:text-white">{data.question?.title}</h3>
              <div className="flex items-center space-x-2 mt-1">
                <span className={`px-2 py-0.5 text-xs rounded-full font-medium ${
                  data.question?.difficulty === 'Easy' ? 'bg-green-100 text-green-700' :
                  data.question?.difficulty === 'Medium' ? 'bg-yellow-100 text-yellow-700' :
                  'bg-red-100 text-red-700'
                }`}>
                  {data.question?.difficulty}
                </span>
                <span className="text-sm text-gray-500 dark:text-gray-400">#{data.question?.questionFrontendId}</span>
              </div>
              
              {failedAttempts > 0 && (
                <div className="mt-3 p-2 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800/50 rounded flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 text-amber-500" />
                  <span className="text-xs font-medium text-amber-700 dark:text-amber-400">
                    You had {failedAttempts} failed attempt{failedAttempts !== 1 ? 's' : ''} before this success!
                  </span>
                </div>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Patterns & Topic Tags</label>
              <div className="flex flex-wrap gap-2 mb-2">
                {data.question?.topicTags?.map((tag: any) => (
                  <button
                    key={tag.name}
                    onClick={() => handleToggleTag(tag.name)}
                    className={`px-3 py-1 rounded-full text-sm font-medium transition-colors border ${
                      selectedTags.includes(tag.name)
                        ? 'bg-blue-100 border-blue-300 text-blue-700 dark:bg-blue-900 dark:border-blue-700 dark:text-blue-300'
                        : 'bg-gray-50 border-gray-200 text-gray-600 hover:bg-gray-100 dark:bg-gray-800 dark:border-gray-700 dark:text-gray-400'
                    }`}
                  >
                    {tag.name}
                  </button>
                ))}
              </div>
              <input
                type="text"
                placeholder="Add custom pattern... (Press Enter)"
                value={customTag}
                onChange={e => setCustomTag(e.target.value)}
                onKeyDown={handleAddCustomTag}
                className="w-full px-3 py-2 border border-gray-200 dark:border-gray-700 rounded-lg text-sm bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-white outline-none focus:ring-2 focus:ring-blue-500"
              />
              <div className="flex flex-wrap gap-2 mt-2">
                 {selectedTags.filter(t => !data.question?.topicTags?.find((qt:any) => qt.name === t)).map(tag => (
                   <span key={tag} className="px-3 py-1 bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300 text-sm rounded-full flex items-center gap-1">
                     {tag}
                     <button onClick={() => handleToggleTag(tag)} className="hover:text-blue-900 dark:hover:text-blue-100"><X size={14}/></button>
                   </span>
                 ))}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Approach Notes (Optional)</label>
              <textarea
                value={notes}
                onChange={e => setNotes(e.target.value)}
                rows={3}
                placeholder="What was your thought process?"
                className="w-full px-3 py-2 border border-gray-200 dark:border-gray-700 rounded-lg text-sm bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-white outline-none focus:ring-2 focus:ring-blue-500 resize-none"
              />
            </div>

            {error && <div className="text-red-500 text-sm font-medium">{error}</div>}

            <div className="flex gap-3 pt-2">
              <button 
                onClick={onClose}
                className="flex-1 px-4 py-2 text-gray-700 dark:text-gray-300 bg-gray-100 hover:bg-gray-200 dark:bg-gray-800 dark:hover:bg-gray-700 rounded-lg font-medium transition-colors"
              >
                Dismiss
              </button>
              <button
                onClick={handleSave}
                disabled={saving || selectedTags.length === 0}
                className="flex-1 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {saving ? 'Saving...' : (
                  <>
                    <Save size={18} />
                    Save Approach
                  </>
                )}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Popup;
