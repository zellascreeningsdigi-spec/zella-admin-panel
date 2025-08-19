import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { FileText, CheckCircle, Clock, AlertCircle } from 'lucide-react';

const DashboardOverview: React.FC = () => {
  const stats = [
    {
      title: 'Total Cases',
      value: '156',
      description: 'All verification cases',
      icon: FileText,
      color: 'text-blue-600',
    },
    {
      title: 'Completed',
      value: '89',
      description: 'Successfully verified',
      icon: CheckCircle,
      color: 'text-green-600',
    },
    {
      title: 'Pending',
      value: '45',
      description: 'Awaiting verification',
      icon: Clock,
      color: 'text-yellow-600',
    },
    {
      title: 'Insufficiency',
      value: '22',
      description: 'Require additional info',
      icon: AlertCircle,
      color: 'text-red-600',
    },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Dashboard Overview</h1>
        <p className="text-gray-600 mt-1">
          Monitor your DigiLocker verification cases and system status
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {stats.map((stat) => {
          const Icon = stat.icon;
          return (
            <Card key={stat.title}>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  {stat.title}
                </CardTitle>
                <Icon className={`h-4 w-4 ${stat.color}`} />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stat.value}</div>
                <p className="text-xs text-muted-foreground">
                  {stat.description}
                </p>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Recent Activity</CardTitle>
            <CardDescription>
              Latest verification requests and updates
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {[
                { name: 'John Doe', action: 'DigiLocker verification completed', time: '2 hours ago', status: 'completed' },
                { name: 'Jane Smith', action: 'Verification link sent', time: '4 hours ago', status: 'pending' },
                { name: 'Mike Johnson', action: 'Additional documents required', time: '6 hours ago', status: 'insufficiency' },
              ].map((activity, index) => (
                <div key={index} className="flex items-center space-x-4">
                  <div className={`h-2 w-2 rounded-full ${
                    activity.status === 'completed' ? 'bg-green-500' :
                    activity.status === 'pending' ? 'bg-yellow-500' :
                    'bg-red-500'
                  }`} />
                  <div className="flex-1">
                    <p className="text-sm font-medium">{activity.name}</p>
                    <p className="text-xs text-gray-500">{activity.action}</p>
                  </div>
                  <div className="text-xs text-gray-400">{activity.time}</div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>System Status</CardTitle>
            <CardDescription>
              Current status of integrated services
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {[
                { service: 'DigiLocker API', status: 'operational', uptime: '99.9%' },
                { service: 'AWS S3 Storage', status: 'operational', uptime: '99.8%' },
                { service: 'Email Service', status: 'operational', uptime: '99.7%' },
                { service: 'SMS Service', status: 'degraded', uptime: '98.2%' },
              ].map((service, index) => (
                <div key={index} className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div className={`h-2 w-2 rounded-full ${
                      service.status === 'operational' ? 'bg-green-500' : 'bg-yellow-500'
                    }`} />
                    <span className="text-sm font-medium">{service.service}</span>
                  </div>
                  <div className="text-xs text-gray-500">{service.uptime}</div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default DashboardOverview;