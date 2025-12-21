import React, { useState } from 'react';
import { ValidationJob, ValidationJobStatus } from '../services/validation';
import { ChevronDown, ChevronUp } from 'lucide-react';

interface ValidationProgressProps {
  jobs: ValidationJob[];
  onClear?: () => void;
  onPause?: () => void;
  onResume?: () => void;
  onCancelAll?: () => void;
  isPaused: boolean;
}

export function ValidationProgress({ 
  jobs, 
  onClear, 
  onPause, 
  onResume, 
  onCancelAll,
  isPaused 
}: ValidationProgressProps) {
  const [isExpanded, setIsExpanded] = useState(true);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  // Allow other components to programmatically expand/collapse
  React.useEffect(() => {
    const open = () => setIsExpanded(true);
    const close = () => setIsExpanded(false);
    window.addEventListener('open-validation-progress', open as EventListener);
    window.addEventListener('close-validation-progress', close as EventListener);
    return () => {
      window.removeEventListener('open-validation-progress', open as EventListener);
      window.removeEventListener('close-validation-progress', close as EventListener);
    };
  }, []);
  
  if (jobs.length === 0) return null;
  
  const pendingCount = jobs.filter(j => j.status === 'pending').length;
  const processingCount = jobs.filter(j => j.status === 'processing').length;
  const completedCount = jobs.filter(j => j.status === 'completed').length;
  const failedCount = jobs.filter(j => j.status === 'failed').length;
  const totalCount = jobs.length;
  const progress = ((completedCount + failedCount) / totalCount) * 100;
  const failedJobs = jobs.filter(j => j.status === 'failed');
  const allNoProviders = failedJobs.length > 0 && failedJobs.every(j => (j.error || '').toLowerCase().includes('no api'));
  
  // Calculate estimated time remaining
  const getEstimatedTimeRemaining = (): string => {
    if (completedCount === 0) return "Calculating...";
    const remainingJobs = pendingCount + processingCount;
    if (remainingJobs === 0) return "Almost done";
    
    // Find earliest completed job to calculate rate
    const completedJobs = jobs.filter(j => j.status === 'completed');
    if (completedJobs.length === 0) return "Calculating...";
    
    const earliestCompleted = completedJobs.reduce((earliest, job) => 
      new Date(job.createdAt) < new Date(earliest.createdAt) ? job : earliest
    );
    
    const timeElapsed = (new Date().getTime() - new Date(earliestCompleted.createdAt).getTime()) / 1000;
    const ratePerSecond = completedCount / timeElapsed;
    
    if (ratePerSecond <= 0) return "Calculating...";
    
    const estimatedSeconds = remainingJobs / ratePerSecond;
    if (estimatedSeconds < 60) return `~${Math.ceil(estimatedSeconds)}s`;
    if (estimatedSeconds < 3600) return `~${Math.ceil(estimatedSeconds / 60)}m`;
    return `~${Math.ceil(estimatedSeconds / 3600)}h`;
  };
  
  // Group jobs by status for display
  const pendingJobs = jobs.filter(j => j.status === 'pending');
  const processingJobs = jobs.filter(j => j.status === 'processing');
  const recentlyCompletedJobs = jobs
    .filter(j => j.status === 'completed')
    .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
    .slice(0, 5);
  const recentlyFailedJobs = jobs
    .filter(j => j.status === 'failed')
    .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
    .slice(0, 5);
  
  // Get status color
  const getStatusColor = (status: ValidationJobStatus): string => {
    switch (status) {
      case 'pending': return 'bg-gray-200 dark:bg-gray-700';
      case 'processing': return 'bg-blue-200 dark:bg-blue-700';
      case 'completed': return 'bg-green-200 dark:bg-green-700';
      case 'failed': return 'bg-red-200 dark:bg-red-700';
      default: return 'bg-gray-200 dark:bg-gray-700';
    }
  };
  
  // Format time elapsed
  const formatTimeElapsed = (startDate: Date): string => {
    const elapsed = Math.floor((new Date().getTime() - new Date(startDate).getTime()) / 1000);
    if (elapsed < 60) return `${elapsed}s`;
    if (elapsed < 3600) return `${Math.floor(elapsed / 60)}m ${elapsed % 60}s`;
    return `${Math.floor(elapsed / 3600)}h ${Math.floor((elapsed % 3600) / 60)}m`;
  };

  return (
    <div className={`fixed bottom-20 right-4 ${isExpanded ? 'w-96' : 'w-56'} bg-white dark:bg-zinc-900 shadow-lg rounded-xl border border-violet-200 dark:border-violet-800/40 overflow-hidden z-40 transition-all duration-300`}>
      <div className="p-3">
        <div className="flex justify-between items-center">
          <h3 className="font-semibold text-sm flex items-center">
            <button 
              onClick={() => setIsExpanded(!isExpanded)}
              className="mr-1 p-0.5 rounded-md hover:bg-gray-100 dark:hover:bg-zinc-800 transition-colors"
            >
              {isExpanded ? 
                <ChevronUp className="size-3.5" /> : 
                <ChevronDown className="size-3.5" />
              }
            </button>
            Validation {Math.round(progress)}%
          </h3>
          <div className="flex items-center space-x-1">
            {!isExpanded && (
              <span className="text-xs">{completedCount + failedCount}/{totalCount}</span>
            )}
            {isExpanded && onPause && onResume && (
              <button 
                onClick={isPaused ? onResume : onPause}
                className="text-xs px-2 py-1 rounded-md bg-gray-100 dark:bg-zinc-800 hover:bg-gray-200 dark:hover:bg-zinc-700 transition-colors"
              >
                {isPaused ? 'Resume' : 'Pause'}
              </button>
            )}
            {isExpanded && onClear && (
              <button 
                onClick={onClear}
                className="text-xs px-2 py-1 rounded-md bg-gray-100 dark:bg-zinc-800 hover:bg-gray-200 dark:hover:bg-zinc-700 transition-colors"
              >
                Clear
              </button>
            )}
            {isExpanded && (
              <button 
                onClick={() => setShowDetailsModal(true)}
                className="text-xs px-2 py-1 rounded-md bg-blue-600 text-white hover:bg-blue-700 transition-colors"
              >
                Details
              </button>
            )}
            {isExpanded && onCancelAll && (
              <button 
                onClick={onCancelAll}
                className="text-xs px-2 py-1 rounded-md bg-red-600 text-white hover:bg-red-700 transition-colors"
              >
                Cancel All
              </button>
            )}
          </div>
        </div>
        
        <div className="mt-2">
          <div className="w-full h-1.5 bg-gray-200 dark:bg-zinc-800 rounded-full overflow-hidden">
            <div 
              className="h-full bg-violet-500 transition-all duration-300"
              style={{ width: `${progress}%` }}
            />
          </div>
          
          {isExpanded && (
            <>
              <div className="flex justify-between text-xs text-gray-600 dark:text-gray-400 mt-1">
                <span>{Math.round(progress)}% complete</span>
                <span>{completedCount + failedCount} / {totalCount}</span>
              </div>
              
              {pendingCount + processingCount > 0 && (
                <div className="text-center text-xs text-gray-500 dark:text-gray-400 mt-1">
                  ETA: {getEstimatedTimeRemaining()}
                </div>
              )}
              
              <div className="flex justify-between mt-2 px-1">
                <div className="text-center">
                  <span className="block text-sm font-semibold">{pendingCount}</span>
                  <span className="text-xs text-gray-600 dark:text-gray-400">Pending</span>
                </div>
                <div className="text-center">
                  <span className="block text-sm font-semibold">{processingCount}</span>
                  <span className="text-xs text-gray-600 dark:text-gray-400">Processing</span>
                </div>
                <div className="text-center">
                  <span className="block text-sm font-semibold">{completedCount}</span>
                  <span className="text-xs text-gray-600 dark:text-gray-400">Completed</span>
                </div>
                <div className="text-center">
                  <span className="block text-sm font-semibold">{failedCount}</span>
                  <span className="text-xs text-gray-600 dark:text-gray-400">Failed</span>
                </div>
              </div>
            
              {/* Collapsible job details */}
              {(processingJobs.length > 0 || pendingJobs.length > 0) && (
                <div className="mt-3">
                  <h4 className="font-medium mb-1 text-xs text-gray-600 dark:text-gray-400">In Progress</h4>
                  <div className="max-h-16 overflow-y-auto space-y-1 text-xs">
                    {processingJobs.map(job => (
                      <div key={job.id} className="flex items-center">
                        <div className={`w-1.5 h-1.5 rounded-full mr-1.5 ${getStatusColor(job.status)}`}></div>
                        <span className="truncate">{job.model.name}</span>
                        <span className="ml-auto text-xs opacity-70">{formatTimeElapsed(job.createdAt)}</span>
                      </div>
                    ))}
                    {processingJobs.length === 0 && pendingJobs.length > 0 && (
                      <div className="text-xs text-gray-500 dark:text-gray-400">
                        {pendingJobs.length} models waiting in queue
                      </div>
                    )}
                  </div>
                </div>
              )}
              
              {/* Recently completed jobs */}
              {recentlyCompletedJobs.length > 0 && (
                <div className="mt-2">
                  <h4 className="font-medium mb-1 text-xs text-gray-600 dark:text-gray-400">Recently Completed</h4>
                  <div className="max-h-16 overflow-y-auto space-y-1 text-xs">
                    {recentlyCompletedJobs.map(job => (
                      <div key={job.id} className="flex items-center">
                        <div className={`w-1.5 h-1.5 rounded-full mr-1.5 ${getStatusColor(job.status)}`}></div>
                        <span className="truncate">{job.model.name}</span>
                        <span className="ml-auto text-xs opacity-70">{formatTimeElapsed(job.updatedAt)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              
              {/* Recently failed jobs */}
              {recentlyFailedJobs.length > 0 && (
                <div className="mt-2">
                  <h4 className="font-medium mb-1 text-xs text-red-500">Failed</h4>
                  <div className="max-h-16 overflow-y-auto space-y-1 text-xs">
                    {recentlyFailedJobs.map(job => (
                      <div key={job.id} className="flex items-center">
                        <div className={`w-1.5 h-1.5 rounded-full mr-1.5 ${getStatusColor(job.status)}`}></div>
                        <span className="truncate">{job.model.name}</span>
                        <span className="ml-auto text-xs text-red-500" title={job.error || "Unknown error"}>
                          {job.error?.includes("No enabled LLM providers") ? "No API configured" : 
                           job.error?.includes("404") ? "API Not Found (404)" :
                           job.error?.includes("401") ? "API Unauthorized (401)" :
                           job.error?.includes("403") ? "API Forbidden (403)" :
                           job.error?.includes("429") ? "API Rate Limited (429)" :
                           job.error?.includes("500") ? "API Server Error (500)" :
                           job.error?.substring(0, 20) + (job.error && job.error.length > 20 ? "..." : "")}
                        </span>
                      </div>
                    ))}
                  </div>
                  {allNoProviders && (
                    <div className="mt-2 flex justify-end">
                      <button
                        onClick={() => window.dispatchEvent(new CustomEvent('open-sync'))}
                        className="text-xs px-2 py-1 rounded-md bg-violet-500 text-white hover:bg-violet-600 transition-colors"
                      >
                        Configure Providers
                      </button>
                    </div>
                  )}
                </div>
              )}
            </>
          )}
        </div>
      </div>
      
      {/* Details Modal */}
      {showDetailsModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-zinc-900 rounded-xl shadow-2xl max-w-4xl w-full mx-4 max-h-[80vh] overflow-hidden">
            <div className="p-4 border-b border-gray-200 dark:border-zinc-700">
              <div className="flex justify-between items-center">
                <h2 className="text-lg font-semibold">Validation Job Details</h2>
                <button
                  onClick={() => setShowDetailsModal(false)}
                  className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
                >
                  ✕
                </button>
              </div>
            </div>
            
            <div className="p-4 overflow-y-auto max-h-[60vh]">
              <div className="mb-4">
                <div className="grid grid-cols-4 gap-4 text-center">
                  <div className="bg-gray-100 dark:bg-zinc-800 rounded-lg p-3">
                    <div className="text-2xl font-bold">{pendingCount}</div>
                    <div className="text-sm text-gray-600 dark:text-gray-400">Pending</div>
                  </div>
                  <div className="bg-blue-100 dark:bg-blue-900/30 rounded-lg p-3">
                    <div className="text-2xl font-bold">{processingCount}</div>
                    <div className="text-sm text-gray-600 dark:text-gray-400">Processing</div>
                  </div>
                  <div className="bg-green-100 dark:bg-green-900/30 rounded-lg p-3">
                    <div className="text-2xl font-bold">{completedCount}</div>
                    <div className="text-sm text-gray-600 dark:text-gray-400">Completed</div>
                  </div>
                  <div className="bg-red-100 dark:bg-red-900/30 rounded-lg p-3">
                    <div className="text-2xl font-bold">{failedCount}</div>
                    <div className="text-sm text-gray-600 dark:text-gray-400">Failed</div>
                  </div>
                </div>
              </div>
              
              <div className="space-y-4">
                {['processing', 'pending', 'completed', 'failed'].map(status => {
                  const statusJobs = jobs.filter(j => j.status === status);
                  if (statusJobs.length === 0) return null;
                  
                  return (
                    <div key={status} className="border border-gray-200 dark:border-zinc-700 rounded-lg">
                      <div className={`p-3 font-medium text-sm capitalize ${getStatusColor(status as ValidationJobStatus)} rounded-t-lg`}>
                        {status} ({statusJobs.length})
                      </div>
                      <div className="p-3 space-y-2 max-h-48 overflow-y-auto">
                        {statusJobs.map(job => (
                          <div key={job.id} className="flex items-center justify-between text-sm border-b border-gray-100 dark:border-zinc-800 pb-2 last:border-b-0">
                            <div className="flex-1 min-w-0">
                              <div className="font-medium truncate">{job.model.name}</div>
                              <div className="text-xs text-gray-500 dark:text-gray-400">
                                Created: {formatTimeElapsed(job.createdAt)} ago
                                {job.updatedAt !== job.createdAt && (
                                  <span> • Updated: {formatTimeElapsed(job.updatedAt)} ago</span>
                                )}
                              </div>
                            </div>
                            {job.error && (
                              <div className="ml-2 text-xs text-red-600 dark:text-red-400 max-w-xs truncate" title={job.error}>
                                {job.error}
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
              
              {jobs.length === 0 && (
                <div className="text-center text-gray-500 dark:text-gray-400 py-8">
                  No validation jobs found
                </div>
              )}
            </div>
            
            <div className="p-4 border-t border-gray-200 dark:border-zinc-700 flex justify-between">
              <div className="text-sm text-gray-600 dark:text-gray-400">
                Progress: {Math.round(progress)}% • {completedCount + failedCount} of {totalCount} models
                {pendingCount + processingCount > 0 && (
                  <span> • ETA: {getEstimatedTimeRemaining()}</span>
                )}
              </div>
              <div className="flex gap-2">
                {onCancelAll && (pendingCount > 0 || processingCount > 0) && (
                  <button
                    onClick={() => {
                      onCancelAll();
                      setShowDetailsModal(false);
                    }}
                    className="px-3 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors text-sm"
                  >
                    Cancel All Jobs
                  </button>
                )}
                <button
                  onClick={() => setShowDetailsModal(false)}
                  className="px-3 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors text-sm"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
