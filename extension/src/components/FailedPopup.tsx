import React, { useState, useEffect } from 'react';
import { X, ChevronRight } from 'lucide-react';

interface FailedPopupProps {
  data: {
    question: any;
    submission: any;
    code?: string;
    lang?: string;
  };
  onClose: () => void;
}

const CATEGORIES = [
  'Wrong approach',
  'Missed edge case',
  'Time/Memory limit',
  'Silly bug'
];

const FailedPopup: React.FC<FailedPopupProps> = ({ data, onClose }) => {
  const [jwt, setJwt] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [customMistake, setCustomMistake] = useState<string>('');
  
  // Toast state
  const [isExpanded, setIsExpanded] = useState(false);
  const [isClosing, setIsClosing] = useState(false);

  useEffect(() => {
    let isMounted = true;
    
    const timeout = setTimeout(() => {
      if (isMounted && loading) {
        setLoading(false);
        onClose();
      }
    }, 2000);

    const checkJwt = (result: any) => {
      if (!isMounted) return;
      clearTimeout(timeout);
      if (result.jwt) {
        setJwt(result.jwt);
      } else {
        setJwt(null);
      }
      setLoading(false);
    };

    try {
      chrome.storage.local.get(['jwt'], checkJwt);
    } catch (e) {
      console.error('LC Companion: Error getting JWT', e);
      clearTimeout(timeout);
      if (isMounted) { setLoading(false); onClose(); }
    }

    const handleStorageChange = (changes: any, areaName: string) => {
      if (areaName === 'local' && changes.jwt && isMounted) {
        setJwt(changes.jwt.newValue || null);
      }
    };
    chrome.storage.onChanged.addListener(handleStorageChange);
    
    return () => {
      isMounted = false;
      clearTimeout(timeout);
      chrome.storage.onChanged.removeListener(handleStorageChange);
    };
  }, [loading, onClose]);

  // Auto-dismiss the toast after 10 seconds if not expanded
  useEffect(() => {
    if (loading || isExpanded) return;
    
    const dismissTimer = setTimeout(() => {
      handleClose();
    }, 10000);
    
    return () => clearTimeout(dismissTimer);
  }, [loading, isExpanded]);

  const handleClose = () => {
    setIsClosing(true);
    setTimeout(onClose, 300); // Wait for exit animation
  };

  const handleLogMistake = async (category: string | null) => {
    if (!jwt || !category) {
      handleClose();
      return;
    }
    
    setSaving(true);
    try {
      const payload = {
        leetcode_number: Number(data.question?.questionFrontendId),
        title: data.question?.title || 'Unknown',
        difficulty: data.question?.difficulty?.toLowerCase() || 'medium',
        status_msg: data.submission?.status_msg || 'Unknown Error',
        code_snippet: data.code,
        language: data.lang,
        mistake_category: category
      };

      await fetch(`${import.meta.env.VITE_API_URL}/submission-attempts`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${jwt}`
        },
        body: JSON.stringify(payload)
      });
      
    } catch (e) {
      console.error('Failed to log mistake:', e);
    } finally {
      setSaving(false);
      handleClose();
    }
  };

  if (loading) return null;
  
  if (!jwt) {
    if (!isExpanded) {
      return (
        <div className={`fixed top-24 right-6 z-50 transition-all duration-300 pointer-events-auto ${isClosing ? 'opacity-0 translate-x-8' : 'opacity-100 translate-x-0'}`}>
           <div 
             className="bg-red-50 dark:bg-red-950/80 rounded-xl shadow-2xl border border-red-200 dark:border-red-900/50 p-4 flex items-center gap-4 cursor-pointer hover:shadow-xl hover:bg-red-100 dark:hover:bg-red-900/50 transition-all"
             onClick={() => setIsExpanded(true)}
           >
              <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse"></div>
              <div>
                <p className="text-sm font-bold text-red-900 dark:text-white">Submission Failed</p>
                <p className="text-xs text-red-600 dark:text-red-300/80">Log in to track this mistake</p>
              </div>
           </div>
        </div>
      );
    }

    return (
      <div className={`fixed inset-0 flex items-center justify-center bg-black/40 backdrop-blur-sm z-50 pointer-events-auto transition-opacity duration-300 ${isClosing ? 'opacity-0' : 'opacity-100'}`}>
        <div className="bg-white dark:bg-gray-900 rounded-xl shadow-2xl p-5 text-center">
          <p className="text-sm text-gray-700 dark:text-gray-300 mb-4">Not logged in to Companion.</p>
          <a 
            href={import.meta.env.VITE_LOGIN_URL || 'http://localhost:3000/login'}
            target="_blank"
            rel="noreferrer"
            className="inline-block px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded transition-colors"
          >
            Log In
          </a>
          <button onClick={handleClose} className="mt-4 ml-3 px-4 py-2 bg-gray-200 text-gray-800 hover:bg-gray-300 dark:bg-gray-800 dark:text-gray-200 dark:hover:bg-gray-700 font-medium rounded transition-colors">Close</button>
        </div>
      </div>
    );
  }

  // TOAST VIEW
  if (!isExpanded) {
    return (
      <div className={`fixed top-24 right-6 z-50 transition-all duration-300 pointer-events-auto ${isClosing ? 'opacity-0 translate-x-8' : 'opacity-100 translate-x-0'}`}>
        <div 
          className="bg-red-50 dark:bg-red-950/80 rounded-xl shadow-2xl border border-red-200 dark:border-red-900/50 p-4 flex items-center gap-4 cursor-pointer hover:shadow-xl hover:bg-red-100 dark:hover:bg-red-900/50 transition-all group"
          onClick={() => setIsExpanded(true)}
        >
          <div className="w-3 h-3 rounded-full bg-red-500"></div>
          <div>
            <p className="text-sm font-bold text-red-900 dark:text-white">Submission Failed</p>
            <p className="text-xs text-red-600 dark:text-red-300/80 group-hover:text-red-700 dark:group-hover:text-red-200 transition-colors">Click to log mistake</p>
          </div>
          <button 
            onClick={(e) => { e.stopPropagation(); handleLogMistake(null); }}
            className="ml-2 p-1.5 text-red-400 hover:text-red-700 dark:hover:text-red-200 rounded-full hover:bg-red-200 dark:hover:bg-red-800/50 transition-colors"
          >
            <X size={16} />
          </button>
        </div>
      </div>
    );
  }

  // MODAL VIEW
  return (
    <div className={`fixed inset-0 flex items-center justify-center bg-black/40 backdrop-blur-sm z-50 pointer-events-auto transition-opacity duration-300 ${isClosing ? 'opacity-0' : 'opacity-100'}`}>
      <div className="bg-white dark:bg-gray-900 rounded-xl shadow-2xl w-full max-w-sm overflow-hidden border border-gray-100 dark:border-gray-800 p-5 transform transition-transform">
        <div className="flex justify-between items-start mb-4">
          <div>
            <h2 className="text-lg font-bold text-gray-900 dark:text-white flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-red-500"></span>
              {data.submission?.status_msg || 'Submission Failed'}
            </h2>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
              {data.question?.title}
            </p>
          </div>
          <button onClick={handleClose} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300">
            <X size={20} />
          </button>
        </div>

        <p className="text-sm text-gray-700 dark:text-gray-300 mb-3 font-medium">Why did this fail?</p>
        
        <div className="flex flex-wrap gap-2 mb-3">
          {CATEGORIES.map(category => (
            <button
              key={category}
              onClick={() => setCustomMistake(category)}
              className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${
                customMistake === category 
                  ? 'bg-red-50 border-red-200 text-red-700 dark:bg-red-900/30 dark:border-red-800 dark:text-red-300'
                  : 'bg-gray-50 border-gray-200 text-gray-700 hover:bg-gray-100 dark:bg-gray-800 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-gray-700'
              }`}
            >
              {category}
            </button>
          ))}
        </div>

        <textarea
          value={customMistake}
          onChange={(e) => setCustomMistake(e.target.value)}
          placeholder="Or describe the mistake..."
          rows={3}
          className="w-full px-3 py-2 border border-gray-200 dark:border-gray-700 rounded-lg text-sm bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-white outline-none focus:ring-2 focus:ring-red-500 resize-none mb-4"
        />

        <div className="flex gap-2">
          <button 
            onClick={() => handleLogMistake(null)}
            className="flex-1 px-3 py-2 text-xs font-medium text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 bg-gray-100 hover:bg-gray-200 dark:bg-gray-800 dark:hover:bg-gray-700 rounded-lg transition-colors"
          >
            Skip
          </button>
          <button 
            onClick={() => handleLogMistake(customMistake.trim())}
            disabled={saving || !customMistake.trim()}
            className="flex-[2] px-3 py-2 text-xs font-medium text-white bg-red-600 hover:bg-red-700 disabled:opacity-50 disabled:bg-gray-400 dark:disabled:bg-gray-700 rounded-lg transition-colors flex items-center justify-center gap-1"
          >
            {saving ? 'Saving...' : 'Log Mistake'}
            {!saving && <ChevronRight size={14} />}
          </button>
        </div>
      </div>
    </div>
  );
};

export default FailedPopup;
