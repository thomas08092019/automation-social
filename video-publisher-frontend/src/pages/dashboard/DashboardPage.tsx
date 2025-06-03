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
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
        Failed to load dashboard data. Please try again.
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
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
        <p className="text-gray-600">Overview of your video publishing activity</p>
      </div>

      {/* Main Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {statCards.map((stat) => (
          <Card key={stat.title}>
            <CardContent className="p-6">
              <div className="flex items-center">
                <div className={`p-2 rounded-lg ${stat.bgColor}`}>
                  <stat.icon className={`h-6 w-6 ${stat.color}`} />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">{stat.title}</p>
                  <p className="text-2xl font-bold text-gray-900">{stat.value}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Job Status Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {jobStatusCards.map((stat) => (
          <Card key={stat.title}>
            <CardContent className="p-6">
              <div className="flex items-center">
                <div className={`p-2 rounded-lg ${stat.bgColor}`}>
                  <stat.icon className={`h-6 w-6 ${stat.color}`} />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">{stat.title}</p>
                  <p className="text-2xl font-bold text-gray-900">{stat.value}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Recent Activity Chart */}
      {stats?.recentActivity && stats.recentActivity.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Recent Activity</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {stats.recentActivity.slice(0, 7).map((activity, index) => (
                <div key={index} className="flex items-center justify-between py-2 border-b border-gray-100 last:border-b-0">
                  <div>
                    <p className="font-medium text-gray-900">
                      {formatDate(activity.date)}
                    </p>
                  </div>
                  <div className="flex space-x-4 text-sm">
                    <span className="text-green-600">
                      {activity.jobsCompleted} completed
                    </span>
                    <span className="text-red-600">
                      {activity.jobsFailed} failed
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Quick Actions */}
      <Card>
        <CardHeader>
          <CardTitle>Quick Actions</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <a
              href="/videos"
              className="flex items-center p-4 border-2 border-dashed border-gray-300 rounded-lg hover:border-blue-500 hover:bg-blue-50 transition-colors"
            >
              <Video className="h-8 w-8 text-gray-400" />
              <div className="ml-3">
                <p className="font-medium text-gray-900">Upload Video</p>
                <p className="text-sm text-gray-500">Add new videos to your library</p>
              </div>
            </a>
            
            <a
              href="/social-accounts"
              className="flex items-center p-4 border-2 border-dashed border-gray-300 rounded-lg hover:border-blue-500 hover:bg-blue-50 transition-colors"
            >
              <Users className="h-8 w-8 text-gray-400" />
              <div className="ml-3">
                <p className="font-medium text-gray-900">Connect Account</p>
                <p className="text-sm text-gray-500">Link social media accounts</p>
              </div>
            </a>
            
            <a
              href="/jobs"
              className="flex items-center p-4 border-2 border-dashed border-gray-300 rounded-lg hover:border-blue-500 hover:bg-blue-50 transition-colors"
            >
              <BarChart3 className="h-8 w-8 text-gray-400" />
              <div className="ml-3">
                <p className="font-medium text-gray-900">Create Job</p>
                <p className="text-sm text-gray-500">Start publishing videos</p>
              </div>
            </a>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
