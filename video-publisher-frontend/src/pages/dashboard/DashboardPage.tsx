import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { Video, Users, BarChart3, CheckCircle, XCircle, Clock } from 'lucide-react';
import apiService from '../../services/api';
import { Card, CardHeader, CardTitle, CardContent } from '../../components/ui';
import { formatDate } from '../../utils';

export function DashboardPage() {
  const { data: stats, isLoading, error } = useQuery({
    queryKey: ['dashboard-stats'],
    queryFn: () => apiService.getDashboardStats(),
  });
  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-4 border-blue-200 border-t-blue-600 mx-auto mb-4"></div>
          <div className="text-gray-600 font-medium">Loading dashboard data...</div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-md mx-auto mt-8">
        <div className="error-state text-center p-8 rounded-xl">
          <XCircle className="h-16 w-16 mx-auto mb-4 text-white" />
          <h3 className="text-xl font-semibold text-white mb-2">Unable to load dashboard</h3>
          <p className="text-white/90 mb-4">Failed to load dashboard data. Please try again.</p>
          <button 
            onClick={() => window.location.reload()} 
            className="btn-gradient px-6 py-2 rounded-lg font-medium"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  const statCards = [
    {
      title: 'Total Videos',
      value: stats?.totalVideos || 0,
      icon: Video,
      color: 'text-blue-600',
      bgColor: 'bg-blue-100',
    },
    {
      title: 'Social Accounts',
      value: stats?.totalSocialAccounts || 0,
      icon: Users,
      color: 'text-green-600',
      bgColor: 'bg-green-100',
    },
    {
      title: 'Total Jobs',
      value: stats?.totalJobs || 0,
      icon: BarChart3,
      color: 'text-purple-600',
      bgColor: 'bg-purple-100',
    },
    {
      title: 'Active Jobs',
      value: stats?.activeJobs || 0,
      icon: Clock,
      color: 'text-yellow-600',
      bgColor: 'bg-yellow-100',
    },
  ];

  const jobStatusCards = [
    {
      title: 'Completed Jobs',
      value: stats?.completedJobs || 0,
      icon: CheckCircle,
      color: 'text-green-600',
      bgColor: 'bg-green-100',
    },
    {
      title: 'Failed Jobs',
      value: stats?.failedJobs || 0,
      icon: XCircle,
      color: 'text-red-600',
      bgColor: 'bg-red-100',
    },
  ];
  return (
    <div className="space-y-8 animate-fadeInUp">
      <div className="text-center lg:text-left">
        <h1 className="text-4xl font-bold bg-gradient-to-r from-purple-600 to-blue-600 bg-clip-text text-transparent mb-2">
          Dashboard
        </h1>
        <p className="text-gray-600 text-lg">Overview of your video publishing activity</p>
      </div>      {/* Main Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {statCards.map((stat, index) => (
          <div key={stat.title} className="animate-slideInRight" style={{ animationDelay: `${index * 0.1}s` }}>
            <Card className="modern-card card-hover group">
              <CardContent className="p-6">
                <div className="flex items-center">
                  <div className={`p-3 rounded-xl ${stat.bgColor} group-hover:scale-110 transition-transform duration-300`}>
                    <stat.icon className={`h-8 w-8 ${stat.color}`} />
                  </div>
                  <div className="ml-4">
                    <p className="text-sm font-medium text-gray-600 mb-1">{stat.title}</p>
                    <p className="text-3xl font-bold bg-gradient-to-r from-gray-900 to-gray-600 bg-clip-text text-transparent">
                      {stat.value}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        ))}
      </div>      {/* Job Status Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {jobStatusCards.map((stat, index) => (
          <div key={stat.title} className="animate-slideInRight" style={{ animationDelay: `${(index + 4) * 0.1}s` }}>
            <Card className="modern-card card-hover group">
              <CardContent className="p-6">
                <div className="flex items-center">
                  <div className={`p-3 rounded-xl ${stat.bgColor} group-hover:scale-110 transition-transform duration-300`}>
                    <stat.icon className={`h-8 w-8 ${stat.color}`} />
                  </div>
                  <div className="ml-4">
                    <p className="text-sm font-medium text-gray-600 mb-1">{stat.title}</p>
                    <p className="text-3xl font-bold bg-gradient-to-r from-gray-900 to-gray-600 bg-clip-text text-transparent">
                      {stat.value}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        ))}
      </div>      {/* Recent Activity Chart */}
      {stats?.recentActivity && stats.recentActivity.length > 0 && (
        <Card className="modern-card animate-fadeInUp" style={{ animationDelay: '0.6s' }}>
          <CardHeader className="pb-4">
            <CardTitle className="text-xl font-semibold bg-gradient-to-r from-purple-600 to-blue-600 bg-clip-text text-transparent">
              Recent Activity
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {stats.recentActivity.slice(0, 7).map((activity, index) => (
                <div 
                  key={index} 
                  className="flex items-center justify-between py-3 px-4 bg-gradient-to-r from-gray-50 to-white rounded-lg border border-gray-100 hover:shadow-md transition-all duration-300"
                >
                  <div>
                    <p className="font-semibold text-gray-900 mb-1">
                      {formatDate(activity.date)}
                    </p>
                  </div>
                  <div className="flex space-x-6 text-sm">
                    <div className="flex items-center space-x-2">
                      <div className="w-3 h-3 bg-gradient-to-r from-green-400 to-green-600 rounded-full"></div>
                      <span className="text-green-700 font-medium">
                        {activity.jobsCompleted} completed
                      </span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <div className="w-3 h-3 bg-gradient-to-r from-red-400 to-red-600 rounded-full"></div>
                      <span className="text-red-700 font-medium">
                        {activity.jobsFailed} failed
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}      {/* Quick Actions */}
      <Card className="modern-card animate-fadeInUp" style={{ animationDelay: '0.7s' }}>
        <CardHeader className="pb-4">
          <CardTitle className="text-xl font-semibold bg-gradient-to-r from-purple-600 to-blue-600 bg-clip-text text-transparent">
            Quick Actions
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <a
              href="/videos"
              className="group flex items-center p-6 border-2 border-dashed border-gray-300 rounded-xl hover:border-blue-500 hover:bg-gradient-to-br hover:from-blue-50 hover:to-purple-50 transition-all duration-300 transform hover:scale-105"
            >
              <div className="p-3 bg-gradient-to-br from-blue-100 to-blue-200 rounded-xl group-hover:from-blue-200 group-hover:to-blue-300 transition-all duration-300">
                <Video className="h-8 w-8 text-blue-600" />
              </div>
              <div className="ml-4">
                <p className="font-semibold text-gray-900 mb-1">Upload Video</p>
                <p className="text-sm text-gray-600">Add new videos to your library</p>
              </div>
            </a>
            
            <a
              href="/social-accounts"
              className="group flex items-center p-6 border-2 border-dashed border-gray-300 rounded-xl hover:border-green-500 hover:bg-gradient-to-br hover:from-green-50 hover:to-emerald-50 transition-all duration-300 transform hover:scale-105"
            >
              <div className="p-3 bg-gradient-to-br from-green-100 to-green-200 rounded-xl group-hover:from-green-200 group-hover:to-green-300 transition-all duration-300">
                <Users className="h-8 w-8 text-green-600" />
              </div>
              <div className="ml-4">
                <p className="font-semibold text-gray-900 mb-1">Connect Account</p>
                <p className="text-sm text-gray-600">Link social media accounts</p>
              </div>
            </a>
            
            <a
              href="/jobs"
              className="group flex items-center p-6 border-2 border-dashed border-gray-300 rounded-xl hover:border-purple-500 hover:bg-gradient-to-br hover:from-purple-50 hover:to-pink-50 transition-all duration-300 transform hover:scale-105"
            >
              <div className="p-3 bg-gradient-to-br from-purple-100 to-purple-200 rounded-xl group-hover:from-purple-200 group-hover:to-purple-300 transition-all duration-300">
                <BarChart3 className="h-8 w-8 text-purple-600" />
              </div>
              <div className="ml-4">
                <p className="font-semibold text-gray-900 mb-1">Create Job</p>
                <p className="text-sm text-gray-600">Start publishing videos</p>
              </div>
            </a>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
