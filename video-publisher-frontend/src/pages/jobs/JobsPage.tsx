import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Pause, RotateCcw, Calendar, Clock, CheckCircle, XCircle, RefreshCw } from 'lucide-react';
import apiService from '../../services/api';
import { Button, Card, CardContent } from '../../components/ui';
import { BatchJob, PublishingTask } from '../../types';
import { formatDate, getStatusColor, getStatusBgColor, capitalizeFirst, getPlatformIcon } from '../../utils';
import { useJobStatusUpdates } from '../../hooks/useJobUpdates';

export function JobsPage() {
  const [currentPage, setCurrentPage] = useState(1);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [autoRefresh, setAutoRefresh] = useState(true);
  const queryClient = useQueryClient();
  const { startUpdates, stopUpdates } = useJobStatusUpdates();

  const { data: jobsData, isLoading, error, isFetching } = useQuery({
    queryKey: ['jobs', currentPage],
    queryFn: () => apiService.getJobs(currentPage, 10),
  });

  useEffect(() => {
    if (autoRefresh) {
      startUpdates();
    } else {
      stopUpdates();
    }

    return () => {
      stopUpdates();
    };
  }, [autoRefresh, startUpdates, stopUpdates]);

  const manualRefresh = () => {
    queryClient.invalidateQueries({ queryKey: ['jobs'] });
  };

  const cancelJobMutation = useMutation({
    mutationFn: (jobId: string) => apiService.cancelJob(jobId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['jobs'] });
    },
  });

  const retryJobMutation = useMutation({
    mutationFn: (jobId: string) => apiService.retryJob(jobId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['jobs'] });
    },
  });

  const handleCancelJob = async (jobId: string) => {
    if (window.confirm('Are you sure you want to cancel this job?')) {
      try {
        await cancelJobMutation.mutateAsync(jobId);
      } catch (error) {
        console.error('Failed to cancel job:', error);
      }
    }
  };

  const handleRetryJob = async (jobId: string) => {
    try {
      await retryJobMutation.mutateAsync(jobId);
    } catch (error) {
      console.error('Failed to retry job:', error);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
        Failed to load jobs. Please try again.
      </div>
    );
  }

  const jobs = jobsData?.data || [];
  const totalPages = jobsData?.totalPages || 1;
  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Publishing Jobs</h1>
          <p className="text-gray-600">Monitor and manage your video publishing jobs</p>
        </div>
        <div className="flex items-center space-x-3">
          <div className="flex items-center space-x-2">
            <label className="flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={autoRefresh}
                onChange={(e) => setAutoRefresh(e.target.checked)}
                className="h-4 w-4 text-blue-600 rounded"
              />
              <span className="ml-2 text-sm text-gray-600">Auto-refresh</span>
            </label>
          </div>
          
          <Button
            variant="outline"
            onClick={manualRefresh}
            disabled={isFetching}
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${isFetching ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
          
          <Button onClick={() => setShowCreateModal(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Create Job
          </Button>
        </div>
      </div>

      {/* Status Bar */}
      {isFetching && !isLoading && (
        <div className="bg-blue-50 border border-blue-200 text-blue-700 px-4 py-2 rounded-md">
          <div className="flex items-center">
            <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
            Updating job status...
          </div>
        </div>
      )}

      {/* Job Statistics */}
      {jobs.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Total Jobs</p>
                  <p className="text-2xl font-bold">{jobs.length}</p>
                </div>
                <Calendar className="h-8 w-8 text-blue-600" />
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Completed</p>
                  <p className="text-2xl font-bold text-green-600">
                    {jobs.filter(job => job.status === 'completed').length}
                  </p>
                </div>
                <CheckCircle className="h-8 w-8 text-green-600" />
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Processing</p>
                  <p className="text-2xl font-bold text-blue-600">
                    {jobs.filter(job => job.status === 'processing').length}
                  </p>
                </div>
                <Clock className="h-8 w-8 text-blue-600" />
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Failed</p>
                  <p className="text-2xl font-bold text-red-600">
                    {jobs.filter(job => job.status === 'failed').length}
                  </p>
                </div>
                <XCircle className="h-8 w-8 text-red-600" />
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Jobs List */}
      {jobs.length === 0 ? (
        <Card>
          <CardContent className="p-12 text-center">
            <Calendar className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No jobs yet</h3>
            <p className="text-gray-500 mb-4">Create your first publishing job to get started.</p>
            <Button onClick={() => setShowCreateModal(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Create Job
            </Button>
          </CardContent>
        </Card>
      ) : (
        <>
          <div className="space-y-4">
            {jobs.map((job) => (
              <JobCard
                key={job.id}
                job={job}
                onCancel={() => handleCancelJob(job.id)}
                onRetry={() => handleRetryJob(job.id)}
                isCancelling={cancelJobMutation.isPending}
                isRetrying={retryJobMutation.isPending}
              />
            ))}
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex justify-center space-x-2">
              <Button
                variant="outline"
                onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                disabled={currentPage === 1}
              >
                Previous
              </Button>
              
              {Array.from({ length: totalPages }, (_, i) => i + 1).map(page => (
                <Button
                  key={page}
                  variant={page === currentPage ? 'primary' : 'outline'}
                  onClick={() => setCurrentPage(page)}
                  className="w-10"
                >
                  {page}
                </Button>
              ))}
              
              <Button
                variant="outline"
                onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                disabled={currentPage === totalPages}
              >
                Next
              </Button>
            </div>
          )}
        </>
      )}

      {/* Create Job Modal */}
      {showCreateModal && (
        <CreateJobModal onClose={() => setShowCreateModal(false)} />
      )}
    </div>
  );
}

interface JobCardProps {
  job: BatchJob;
  onCancel: () => void;
  onRetry: () => void;
  isCancelling: boolean;
  isRetrying: boolean;
}

function JobCard({ job, onCancel, onRetry, isCancelling, isRetrying }: JobCardProps) {
  const [expanded, setExpanded] = useState(false);
  
  const canCancel = ['pending', 'processing'].includes(job.status);
  const canRetry = job.status === 'failed';

  const progressPercentage = job.totalTasks > 0 
    ? Math.round((job.completedTasks / job.totalTasks) * 100) 
    : 0;

  return (
    <Card>
      <CardContent className="p-6">
        <div className="flex items-start justify-between mb-4">
          <div className="flex-1">
            <div className="flex items-center space-x-3 mb-2">
              <h3 className="text-lg font-medium text-gray-900">{job.name}</h3>
              <span className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusBgColor(job.status)} ${getStatusColor(job.status)}`}>
                {capitalizeFirst(job.status)}
              </span>
            </div>
            
            {job.description && (
              <p className="text-gray-600 mb-2">{job.description}</p>
            )}
            
            <div className="flex items-center space-x-6 text-sm text-gray-500">
              <span>Created: {formatDate(job.createdAt)}</span>
              <span>Tasks: {job.completedTasks}/{job.totalTasks}</span>
              {job.failedTasks > 0 && (
                <span className="text-red-600">Failed: {job.failedTasks}</span>
              )}
            </div>
          </div>

          <div className="flex items-center space-x-2">
            {canRetry && (
              <Button
                variant="outline"
                size="sm"
                onClick={onRetry}
                disabled={isRetrying}
              >
                {isRetrying ? (
                  <div className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                ) : (
                  <RotateCcw className="h-4 w-4" />
                )}
              </Button>
            )}
            
            {canCancel && (
              <Button
                variant="destructive"
                size="sm"
                onClick={onCancel}
                disabled={isCancelling}
              >
                {isCancelling ? (
                  <div className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                ) : (
                  <Pause className="h-4 w-4" />
                )}
              </Button>
            )}
            
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setExpanded(!expanded)}
            >
              {expanded ? 'Less' : 'More'}
            </Button>
          </div>
        </div>

        {/* Progress Bar */}
        <div className="mb-4">
          <div className="flex justify-between items-center mb-1">
            <span className="text-sm text-gray-600">Progress</span>
            <span className="text-sm text-gray-900">{progressPercentage}%</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div
              className="bg-blue-600 h-2 rounded-full transition-all duration-300"
              style={{ width: `${progressPercentage}%` }}
            />
          </div>
        </div>

        {/* Task Details */}
        {expanded && job.tasks && job.tasks.length > 0 && (
          <div className="border-t pt-4">
            <h4 className="font-medium text-gray-900 mb-3">Tasks</h4>
            <div className="space-y-2">
              {job.tasks.map((task) => (
                <TaskRow key={task.id} task={task} />
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

interface TaskRowProps {
  task: PublishingTask;
}

function TaskRow({ task }: TaskRowProps) {
  return (
    <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
      <div className="flex items-center space-x-3">
        <div className="text-lg">{getPlatformIcon(task.platform)}</div>
        <div>
          <p className="font-medium text-gray-900">
            {task.video?.title || 'Video'}
          </p>
          <p className="text-sm text-gray-500">
            {capitalizeFirst(task.platform)} • {task.socialAccount?.platformUsername}
          </p>
        </div>
      </div>
      
      <div className="flex items-center space-x-3">
        <span className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusBgColor(task.status)} ${getStatusColor(task.status)}`}>
          {capitalizeFirst(task.status)}
        </span>
        
        {task.status === 'completed' && (
          <CheckCircle className="h-5 w-5 text-green-500" />
        )}
        
        {task.status === 'failed' && (
          <XCircle className="h-5 w-5 text-red-500" />
        )}
        
        {task.status === 'processing' && (
          <div className="h-4 w-4 animate-spin rounded-full border-2 border-blue-600 border-t-transparent" />
        )}
      </div>
    </div>
  );
}

interface CreateJobModalProps {
  onClose: () => void;
}

function CreateJobModal({ onClose }: CreateJobModalProps) {
  const [step, setStep] = useState<'videos' | 'accounts' | 'schedule' | 'review'>('videos');
  const [selectedVideos, setSelectedVideos] = useState<string[]>([]);
  const [selectedAccounts, setSelectedAccounts] = useState<string[]>([]);
  const [jobName, setJobName] = useState('');
  const [jobDescription, setJobDescription] = useState('');
  const [scheduleType, setScheduleType] = useState<'now' | 'scheduled'>('now');
  const [scheduledTime, setScheduledTime] = useState('');
  const [isCreating, setIsCreating] = useState(false);

  const queryClient = useQueryClient();

  const { data: videosData } = useQuery({
    queryKey: ['videos', 1],
    queryFn: () => apiService.getVideos(),
  });

  const { data: accountsData } = useQuery({
    queryKey: ['social-accounts'],
    queryFn: () => apiService.getSocialAccounts(),
  });  const createJobMutation = useMutation({
    mutationFn: (jobData: {
      name: string;
      description: string;
      videoIds: string[];
      socialAccountIds: string[];
      scheduledTime?: string;
    }) => apiService.createBatchJob(jobData),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['jobs'] });
      onClose();
    },
  });

  const handleCreateJob = async () => {
    setIsCreating(true);
    try {
      const jobData = {
        name: jobName,
        description: jobDescription,
        videoIds: selectedVideos,
        socialAccountIds: selectedAccounts,
        scheduledTime: scheduleType === 'scheduled' ? scheduledTime : undefined,
      };
      
      await createJobMutation.mutateAsync(jobData);
    } catch (error) {
      console.error('Failed to create job:', error);
    } finally {
      setIsCreating(false);
    }
  };

  const videos = videosData?.data || [];
  const accounts = accountsData?.data || [];

  const canProceed = () => {
    switch (step) {
      case 'videos':
        return selectedVideos.length > 0;
      case 'accounts':
        return selectedAccounts.length > 0;
      case 'schedule':
        return jobName.trim() !== '';
      case 'review':
        return true;
      default:
        return false;
    }
  };

  const nextStep = () => {
    const steps = ['videos', 'accounts', 'schedule', 'review'] as const;
    const currentIndex = steps.indexOf(step);
    if (currentIndex < steps.length - 1) {
      setStep(steps[currentIndex + 1]);
    }
  };

  const prevStep = () => {
    const steps = ['videos', 'accounts', 'schedule', 'review'] as const;
    const currentIndex = steps.indexOf(step);
    if (currentIndex > 0) {
      setStep(steps[currentIndex - 1]);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg w-full max-w-4xl mx-4 max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="border-b px-6 py-4">
          <h2 className="text-xl font-bold">Create Publishing Job</h2>
          <div className="flex items-center mt-4 space-x-4">
            {['videos', 'accounts', 'schedule', 'review'].map((stepName, index) => (
              <div key={stepName} className="flex items-center">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                  step === stepName 
                    ? 'bg-blue-600 text-white' 
                    : ['videos', 'accounts', 'schedule', 'review'].indexOf(step) > index
                    ? 'bg-green-500 text-white'
                    : 'bg-gray-200 text-gray-600'
                }`}>
                  {index + 1}
                </div>
                <span className={`ml-2 text-sm font-medium ${
                  step === stepName ? 'text-blue-600' : 'text-gray-500'
                }`}>
                  {stepName.charAt(0).toUpperCase() + stepName.slice(1)}
                </span>
                {index < 3 && <div className="w-8 h-px bg-gray-300 mx-4" />}
              </div>
            ))}
          </div>
        </div>

        {/* Content */}
        <div className="p-6 max-h-96 overflow-y-auto">
          {step === 'videos' && (
            <div>
              <h3 className="text-lg font-medium mb-4">Select Videos</h3>
              <p className="text-gray-600 mb-4">Choose the videos you want to publish</p>
              
              {videos.length === 0 ? (
                <div className="text-center py-8">
                  <p className="text-gray-500">No videos available. Upload some videos first.</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {videos.map((video) => (
                    <div
                      key={video.id}
                      className={`border rounded-lg p-4 cursor-pointer transition-colors ${
                        selectedVideos.includes(video.id)
                          ? 'border-blue-500 bg-blue-50'
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                      onClick={() => {
                        setSelectedVideos(prev =>
                          prev.includes(video.id)
                            ? prev.filter(id => id !== video.id)
                            : [...prev, video.id]
                        );
                      }}
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <h4 className="font-medium">{video.title}</h4>
                          <p className="text-sm text-gray-600">{video.filename}</p>
                          <p className="text-xs text-gray-500">
                            Duration: {Math.round(video.duration)}s • {(video.fileSize / (1024 * 1024)).toFixed(1)}MB
                          </p>
                        </div>
                        <input
                          type="checkbox"
                          checked={selectedVideos.includes(video.id)}
                          onChange={() => {}}
                          className="h-4 w-4 text-blue-600 rounded"
                        />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {step === 'accounts' && (
            <div>
              <h3 className="text-lg font-medium mb-4">Select Social Accounts</h3>
              <p className="text-gray-600 mb-4">Choose where to publish your videos</p>
              
              {accounts.length === 0 ? (
                <div className="text-center py-8">
                  <p className="text-gray-500">No social accounts connected. Connect some accounts first.</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {accounts.map((account) => (
                    <div
                      key={account.id}
                      className={`border rounded-lg p-4 cursor-pointer transition-colors ${
                        selectedAccounts.includes(account.id)
                          ? 'border-blue-500 bg-blue-50'
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                      onClick={() => {
                        setSelectedAccounts(prev =>
                          prev.includes(account.id)
                            ? prev.filter(id => id !== account.id)
                            : [...prev, account.id]
                        );
                      }}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-3">
                          <div className="text-2xl">{getPlatformIcon(account.platform)}</div>
                          <div>
                            <h4 className="font-medium">{account.platformUsername}</h4>
                            <p className="text-sm text-gray-600">
                              {capitalizeFirst(account.platform)} • {capitalizeFirst(account.status)}
                            </p>
                          </div>
                        </div>
                        <input
                          type="checkbox"
                          checked={selectedAccounts.includes(account.id)}
                          onChange={() => {}}
                          className="h-4 w-4 text-blue-600 rounded"
                        />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {step === 'schedule' && (
            <div>
              <h3 className="text-lg font-medium mb-4">Job Details & Schedule</h3>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Job Name *
                  </label>
                  <input
                    type="text"
                    value={jobName}
                    onChange={(e) => setJobName(e.target.value)}
                    placeholder="Enter job name"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Description
                  </label>
                  <textarea
                    value={jobDescription}
                    onChange={(e) => setJobDescription(e.target.value)}
                    placeholder="Enter job description (optional)"
                    rows={3}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-3">
                    When to publish
                  </label>
                  <div className="space-y-3">
                    <label className="flex items-center">
                      <input
                        type="radio"
                        value="now"
                        checked={scheduleType === 'now'}
                        onChange={(e) => setScheduleType(e.target.value as 'now' | 'scheduled')}
                        className="h-4 w-4 text-blue-600"
                      />
                      <span className="ml-2">Publish now</span>
                    </label>
                    
                    <label className="flex items-center">
                      <input
                        type="radio"
                        value="scheduled"
                        checked={scheduleType === 'scheduled'}
                        onChange={(e) => setScheduleType(e.target.value as 'now' | 'scheduled')}
                        className="h-4 w-4 text-blue-600"
                      />
                      <span className="ml-2">Schedule for later</span>
                    </label>
                  </div>

                  {scheduleType === 'scheduled' && (
                    <div className="mt-3">
                      <input
                        type="datetime-local"
                        value={scheduledTime}
                        onChange={(e) => setScheduledTime(e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        min={new Date().toISOString().slice(0, 16)}
                      />
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {step === 'review' && (
            <div>
              <h3 className="text-lg font-medium mb-4">Review & Create</h3>
              
              <div className="space-y-6">
                <div>
                  <h4 className="font-medium text-gray-900 mb-2">Job Details</h4>
                  <div className="bg-gray-50 rounded-lg p-4">
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <span className="text-gray-600">Name:</span>
                        <span className="ml-2 font-medium">{jobName}</span>
                      </div>
                      <div>
                        <span className="text-gray-600">Schedule:</span>
                        <span className="ml-2 font-medium">
                          {scheduleType === 'now' ? 'Publish now' : `Scheduled for ${scheduledTime}`}
                        </span>
                      </div>
                    </div>
                    {jobDescription && (
                      <div className="mt-2 text-sm">
                        <span className="text-gray-600">Description:</span>
                        <p className="mt-1">{jobDescription}</p>
                      </div>
                    )}
                  </div>
                </div>

                <div>
                  <h4 className="font-medium text-gray-900 mb-2">Videos ({selectedVideos.length})</h4>
                  <div className="bg-gray-50 rounded-lg p-4">
                    {videos.filter(v => selectedVideos.includes(v.id)).map(video => (
                      <div key={video.id} className="text-sm py-1">
                        • {video.title}
                      </div>
                    ))}
                  </div>
                </div>

                <div>
                  <h4 className="font-medium text-gray-900 mb-2">Social Accounts ({selectedAccounts.length})</h4>
                  <div className="bg-gray-50 rounded-lg p-4">
                    {accounts.filter(a => selectedAccounts.includes(a.id)).map(account => (
                      <div key={account.id} className="text-sm py-1 flex items-center">
                        <span className="mr-2">{getPlatformIcon(account.platform)}</span>
                        {account.platformUsername} ({capitalizeFirst(account.platform)})
                      </div>
                    ))}
                  </div>
                </div>

                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <h5 className="font-medium text-blue-900 mb-1">Summary</h5>
                  <p className="text-blue-800 text-sm">
                    This will create {selectedVideos.length * selectedAccounts.length} publishing tasks 
                    ({selectedVideos.length} videos × {selectedAccounts.length} accounts)
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="border-t px-6 py-4 flex justify-between">
          <div>
            {step !== 'videos' && (
              <Button variant="outline" onClick={prevStep}>
                Previous
              </Button>
            )}
          </div>
          
          <div className="flex space-x-3">
            <Button variant="outline" onClick={onClose}>
              Cancel
            </Button>
            
            {step === 'review' ? (
              <Button
                onClick={handleCreateJob}
                disabled={isCreating || !canProceed()}
              >
                {isCreating ? (
                  <>
                    <div className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent mr-2" />
                    Creating...
                  </>
                ) : (
                  'Create Job'
                )}
              </Button>
            ) : (
              <Button
                onClick={nextStep}
                disabled={!canProceed()}
              >
                Next
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
