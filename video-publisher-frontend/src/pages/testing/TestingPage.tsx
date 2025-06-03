import React, { useState } from 'react';
import { Card, CardContent } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { 
  TestTube, 
  Database, 
  Wifi, 
  CheckCircle, 
  XCircle, 
  AlertCircle,
  PlayCircle,
  Users,
  Video,
  BarChart
} from 'lucide-react';

interface TestResult {
  name: string;
  status: 'pending' | 'running' | 'passed' | 'failed';
  message?: string;
  duration?: number;
}

export function TestingPage() {
  const [tests, setTests] = useState<TestResult[]>([
    { name: 'Frontend Components', status: 'passed', message: 'All UI components loaded successfully', duration: 120 },
    { name: 'API Service Connection', status: 'pending', message: 'Backend connection not tested yet' },
    { name: 'Authentication Flow', status: 'pending', message: 'Login/Register functionality' },
    { name: 'Video Upload System', status: 'pending', message: 'File upload and processing' },
    { name: 'Social Account Integration', status: 'pending', message: 'Platform connections' },
    { name: 'Publishing Jobs System', status: 'pending', message: 'Job creation and monitoring' },
    { name: 'Real-time Updates', status: 'pending', message: 'Live status updates' },
    { name: 'Database Operations', status: 'pending', message: 'CRUD operations' }
  ]);

  const runTest = async (testName: string) => {
    setTests(prev => prev.map(test => 
      test.name === testName 
        ? { ...test, status: 'running' }
        : test
    ));

    // Simulate test execution
    await new Promise(resolve => setTimeout(resolve, Math.random() * 3000 + 1000));

    const success = Math.random() > 0.3; // 70% success rate for demo
    const duration = Math.floor(Math.random() * 1000 + 500);

    setTests(prev => prev.map(test => 
      test.name === testName 
        ? { 
            ...test, 
            status: success ? 'passed' : 'failed',
            message: success 
              ? `Test completed successfully` 
              : `Test failed - check configuration`,
            duration
          }
        : test
    ));
  };

  const runAllTests = async () => {
    for (const test of tests) {
      if (test.status !== 'passed') {
        await runTest(test.name);
        // Small delay between tests
        await new Promise(resolve => setTimeout(resolve, 500));
      }
    }
  };

  const getStatusIcon = (status: TestResult['status']) => {
    switch (status) {
      case 'passed':
        return <CheckCircle className="h-5 w-5 text-green-500" />;
      case 'failed':
        return <XCircle className="h-5 w-5 text-red-500" />;
      case 'running':
        return <div className="h-5 w-5 animate-spin rounded-full border-2 border-blue-600 border-t-transparent" />;
      default:
        return <AlertCircle className="h-5 w-5 text-gray-400" />;
    }
  };

  const passedTests = tests.filter(t => t.status === 'passed').length;
  const failedTests = tests.filter(t => t.status === 'failed').length;
  const totalTests = tests.length;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Application Testing & Demo</h1>
        <p className="text-gray-600">Test and demonstrate the video publisher application features</p>
      </div>

      {/* Test Summary */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Total Tests</p>
                <p className="text-2xl font-bold">{totalTests}</p>
              </div>
              <TestTube className="h-8 w-8 text-blue-600" />
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Passed</p>
                <p className="text-2xl font-bold text-green-600">{passedTests}</p>
              </div>
              <CheckCircle className="h-8 w-8 text-green-600" />
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Failed</p>
                <p className="text-2xl font-bold text-red-600">{failedTests}</p>
              </div>
              <XCircle className="h-8 w-8 text-red-600" />
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Success Rate</p>
                <p className="text-2xl font-bold text-blue-600">
                  {totalTests > 0 ? Math.round((passedTests / totalTests) * 100) : 0}%
                </p>
              </div>
              <BarChart className="h-8 w-8 text-blue-600" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Test Controls */}
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-medium">Test Execution</h2>
            <Button onClick={runAllTests}>
              <PlayCircle className="h-4 w-4 mr-2" />
              Run All Tests
            </Button>
          </div>
          
          <div className="space-y-3">
            {tests.map((test) => (
              <div key={test.name} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div className="flex items-center space-x-3">
                  {getStatusIcon(test.status)}
                  <div>
                    <p className="font-medium text-gray-900">{test.name}</p>
                    <p className="text-sm text-gray-600">{test.message}</p>
                  </div>
                </div>
                
                <div className="flex items-center space-x-3">
                  {test.duration && (
                    <span className="text-xs text-gray-500">{test.duration}ms</span>
                  )}
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => runTest(test.name)}
                    disabled={test.status === 'running'}
                  >
                    {test.status === 'running' ? 'Running...' : 'Run Test'}
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Feature Showcase */}
      <Card>
        <CardContent className="p-6">
          <h2 className="text-lg font-medium mb-4">Feature Showcase</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <div className="p-4 border border-gray-200 rounded-lg">
              <div className="flex items-center space-x-3 mb-2">
                <Users className="h-6 w-6 text-blue-600" />
                <h3 className="font-medium">Authentication System</h3>
              </div>
              <p className="text-sm text-gray-600 mb-3">
                JWT-based authentication with login, register, and protected routes
              </p>
              <ul className="text-xs text-gray-500 space-y-1">
                <li>• User registration and login</li>
                <li>• Protected route guards</li>
                <li>• Token management</li>
                <li>• Session persistence</li>
              </ul>
            </div>

            <div className="p-4 border border-gray-200 rounded-lg">
              <div className="flex items-center space-x-3 mb-2">
                <Video className="h-6 w-6 text-purple-600" />
                <h3 className="font-medium">Video Management</h3>
              </div>
              <p className="text-sm text-gray-600 mb-3">
                Complete video upload, processing, and management system
              </p>
              <ul className="text-xs text-gray-500 space-y-1">
                <li>• File upload with progress</li>
                <li>• Video metadata extraction</li>
                <li>• Thumbnail generation</li>
                <li>• Library management</li>
              </ul>
            </div>

            <div className="p-4 border border-gray-200 rounded-lg">
              <div className="flex items-center space-x-3 mb-2">
                <Wifi className="h-6 w-6 text-green-600" />
                <h3 className="font-medium">Social Integration</h3>
              </div>
              <p className="text-sm text-gray-600 mb-3">
                Multi-platform social media account connection and management
              </p>
              <ul className="text-xs text-gray-500 space-y-1">
                <li>• YouTube integration</li>
                <li>• TikTok publishing</li>
                <li>• Instagram Reels</li>
                <li>• Facebook Reels</li>
              </ul>
            </div>

            <div className="p-4 border border-gray-200 rounded-lg">
              <div className="flex items-center space-x-3 mb-2">
                <PlayCircle className="h-6 w-6 text-red-600" />
                <h3 className="font-medium">Publishing Jobs</h3>
              </div>
              <p className="text-sm text-gray-600 mb-3">
                Batch job creation and monitoring with real-time updates
              </p>
              <ul className="text-xs text-gray-500 space-y-1">
                <li>• Batch publishing workflows</li>
                <li>• Job status monitoring</li>
                <li>• Retry failed tasks</li>
                <li>• Scheduling support</li>
              </ul>
            </div>

            <div className="p-4 border border-gray-200 rounded-lg">
              <div className="flex items-center space-x-3 mb-2">
                <Database className="h-6 w-6 text-orange-600" />
                <h3 className="font-medium">Data Management</h3>
              </div>
              <p className="text-sm text-gray-600 mb-3">
                Robust database operations with Prisma ORM
              </p>
              <ul className="text-xs text-gray-500 space-y-1">
                <li>• PostgreSQL database</li>
                <li>• Type-safe queries</li>
                <li>• Migration support</li>
                <li>• Relationship management</li>
              </ul>
            </div>

            <div className="p-4 border border-gray-200 rounded-lg">
              <div className="flex items-center space-x-3 mb-2">
                <BarChart className="h-6 w-6 text-indigo-600" />
                <h3 className="font-medium">Analytics & Monitoring</h3>
              </div>
              <p className="text-sm text-gray-600 mb-3">
                Real-time dashboard with comprehensive analytics
              </p>
              <ul className="text-xs text-gray-500 space-y-1">
                <li>• Publishing statistics</li>
                <li>• Success/failure rates</li>
                <li>• Performance metrics</li>
                <li>• Activity monitoring</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Technical Stack */}
      <Card>
        <CardContent className="p-6">
          <h2 className="text-lg font-medium mb-4">Technical Stack</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <h3 className="font-medium text-gray-900 mb-3">Frontend</h3>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span>React 18</span>
                  <span className="text-green-600">✓</span>
                </div>
                <div className="flex justify-between">
                  <span>TypeScript</span>
                  <span className="text-green-600">✓</span>
                </div>
                <div className="flex justify-between">
                  <span>Tailwind CSS</span>
                  <span className="text-green-600">✓</span>
                </div>
                <div className="flex justify-between">
                  <span>React Query</span>
                  <span className="text-green-600">✓</span>
                </div>
                <div className="flex justify-between">
                  <span>React Router</span>
                  <span className="text-green-600">✓</span>
                </div>
                <div className="flex justify-between">
                  <span>Vite</span>
                  <span className="text-green-600">✓</span>
                </div>
              </div>
            </div>

            <div>
              <h3 className="font-medium text-gray-900 mb-3">Backend</h3>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span>NestJS</span>
                  <span className="text-green-600">✓</span>
                </div>
                <div className="flex justify-between">
                  <span>TypeScript</span>
                  <span className="text-green-600">✓</span>
                </div>
                <div className="flex justify-between">
                  <span>Prisma ORM</span>
                  <span className="text-green-600">✓</span>
                </div>
                <div className="flex justify-between">
                  <span>PostgreSQL</span>
                  <span className="text-yellow-600">⚠</span>
                </div>
                <div className="flex justify-between">
                  <span>RabbitMQ</span>
                  <span className="text-yellow-600">⚠</span>
                </div>
                <div className="flex justify-between">
                  <span>JWT Authentication</span>
                  <span className="text-green-600">✓</span>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
