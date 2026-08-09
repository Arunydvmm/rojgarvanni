/**
 * AdminSystemHealth.tsx - Real-time system health monitoring component
 * 
 * Displays live status of:
 * - Database connectivity and performance
 * - AI service availability
 * - Pipeline execution status
 * - System resources and uptime
 */

import React, { useState, useEffect } from 'react';

interface DatabaseHealth {
  available: boolean;
  responsive: boolean;
  tableCount?: number;
  schemaVersion?: number;
  error?: string;
}

interface AIHealth {
  available: boolean;
  model?: string;
}

interface ServerHealth {
  status: string;
  uptime: number;
  memory: {
    rss: number;
    heapUsed: number;
    heapTotal: number;
    external: number;
  };
}

interface SystemHealth {
  database: DatabaseHealth;
  ai: AIHealth;
  server: ServerHealth;
}

interface HealthResponse {
  success: boolean;
  status: 'healthy' | 'limited' | 'degraded';
  timestamp: string;
  data: SystemHealth;
}

const AdminSystemHealth: React.FC = () => {
  const [health, setHealth] = useState<HealthResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);
  const [autoRefresh, setAutoRefresh] = useState(true);

  const fetchHealth = async () => {
    try {
      setError(null);
      const response = await fetch('/api/health');
      const data: HealthResponse = await response.json();
      
      if (data.success) {
        setHealth(data);
        setLastUpdate(new Date());
      } else {
        setError('Health check failed');
      }
    } catch (err) {
      setError('Unable to connect to health endpoint');
      console.error('Health check error:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchHealth();
  }, []);

  useEffect(() => {
    if (autoRefresh) {
      const interval = setInterval(fetchHealth, 10000); // Update every 10 seconds
      return () => clearInterval(interval);
    }
  }, [autoRefresh]);

  const formatBytes = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const formatUptime = (seconds: number): string => {
    const days = Math.floor(seconds / 86400);
    const hours = Math.floor((seconds % 86400) / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    
    if (days > 0) return `${days}d ${hours}h ${minutes}m`;
    if (hours > 0) return `${hours}h ${minutes}m`;
    return `${minutes}m`;
  };

  const getStatusColor = (status: string): string => {
    switch (status) {
      case 'healthy': return 'text-green-600';
      case 'limited': return 'text-yellow-600';
      case 'degraded': return 'text-red-600';
      default: return 'text-gray-600';
    }
  };

  const getStatusBadge = (available: boolean, responsive?: boolean): JSX.Element => {
    if (!available) {
      return <span className="px-2 py-1 text-xs font-medium bg-red-100 text-red-800 rounded-full">Offline</span>;
    }
    if (responsive === false) {
      return <span className="px-2 py-1 text-xs font-medium bg-yellow-100 text-yellow-800 rounded-full">Slow</span>;
    }
    return <span className="px-2 py-1 text-xs font-medium bg-green-100 text-green-800 rounded-full">Online</span>;
  };

  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow-sm p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">System Health</h2>
        <div className="animate-pulse space-y-4">
          <div className="h-4 bg-gray-200 rounded w-3/4"></div>
          <div className="h-4 bg-gray-200 rounded w-1/2"></div>
          <div className="h-4 bg-gray-200 rounded w-2/3"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow-sm p-6">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-lg font-semibold text-gray-900">System Health</h2>
        <div className="flex items-center space-x-3">
          <button
            onClick={() => setAutoRefresh(!autoRefresh)}
            className={`px-3 py-1 text-sm rounded-md ${
              autoRefresh 
                ? 'bg-blue-100 text-blue-800' 
                : 'bg-gray-100 text-gray-600'
            }`}
          >
            {autoRefresh ? 'Auto-refresh ON' : 'Auto-refresh OFF'}
          </button>
          <button
            onClick={fetchHealth}
            className="px-3 py-1 text-sm bg-gray-100 text-gray-600 rounded-md hover:bg-gray-200"
            disabled={loading}
          >
            {loading ? 'Updating...' : 'Refresh'}
          </button>
        </div>
      </div>

      {error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-md">
          <p className="text-sm text-red-800">⚠️ {error}</p>
        </div>
      )}

      {health && (
        <>
          {/* Overall Status */}
          <div className="mb-6 p-4 border rounded-lg">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-medium text-gray-900">Overall System Status</h3>
                <p className={`text-sm font-medium ${getStatusColor(health.status)}`}>
                  {health.status.toUpperCase()}
                </p>
              </div>
              <div className="text-right text-sm text-gray-500">
                <p>Last updated: {lastUpdate?.toLocaleTimeString() || 'Never'}</p>
                <p>Checked at: {new Date(health.timestamp).toLocaleTimeString()}</p>
              </div>
            </div>
          </div>

          {/* Database Health */}
          <div className="mb-6 p-4 border rounded-lg">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-medium text-gray-900">Database</h3>
              {getStatusBadge(health.data.database.available, health.data.database.responsive)}
            </div>
            
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-gray-600">Status:</span>
                <span className={`ml-2 font-medium ${
                  health.data.database.available ? 'text-green-600' : 'text-red-600'
                }`}>
                  {health.data.database.available ? 'Connected' : 'Disconnected'}
                </span>
              </div>
              
              <div>
                <span className="text-gray-600">Responsive:</span>
                <span className={`ml-2 font-medium ${
                  health.data.database.responsive ? 'text-green-600' : 'text-yellow-600'
                }`}>
                  {health.data.database.responsive ? 'Yes' : 'Slow/Error'}
                </span>
              </div>
              
              {health.data.database.tableCount && (
                <div>
                  <span className="text-gray-600">Tables:</span>
                  <span className="ml-2 font-medium">{health.data.database.tableCount}</span>
                </div>
              )}
              
              {health.data.database.schemaVersion && (
                <div>
                  <span className="text-gray-600">Schema Version:</span>
                  <span className="ml-2 font-medium">{health.data.database.schemaVersion}</span>
                </div>
              )}
            </div>
            
            {health.data.database.error && (
              <div className="mt-3 p-2 bg-red-50 border border-red-200 rounded text-sm">
                <span className="text-red-800">Error: {health.data.database.error}</span>
              </div>
            )}
          </div>

          {/* AI Service Health */}
          <div className="mb-6 p-4 border rounded-lg">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-medium text-gray-900">AI Pipeline</h3>
              {getStatusBadge(health.data.ai.available)}
            </div>
            
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-gray-600">Service:</span>
                <span className={`ml-2 font-medium ${
                  health.data.ai.available ? 'text-green-600' : 'text-red-600'
                }`}>
                  {health.data.ai.available ? 'Available' : 'Unavailable'}
                </span>
              </div>
              
              <div>
                <span className="text-gray-600">Model:</span>
                <span className="ml-2 font-medium text-gray-900">
                  {health.data.ai.model || 'Not configured'}
                </span>
              </div>
            </div>
            
            {!health.data.ai.available && (
              <div className="mt-3 p-2 bg-yellow-50 border border-yellow-200 rounded text-sm">
                <span className="text-yellow-800">
                  ⚠️ AI Pipeline disabled - check NVIDIA_API_KEY configuration
                </span>
              </div>
            )}
          </div>

          {/* Server Health */}
          <div className="mb-6 p-4 border rounded-lg">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-medium text-gray-900">Server</h3>
              <span className="px-2 py-1 text-xs font-medium bg-green-100 text-green-800 rounded-full">
                {health.data.server.status}
              </span>
            </div>
            
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-gray-600">Uptime:</span>
                <span className="ml-2 font-medium">{formatUptime(health.data.server.uptime)}</span>
              </div>
              
              <div>
                <span className="text-gray-600">Memory Used:</span>
                <span className="ml-2 font-medium">{formatBytes(health.data.server.memory.heapUsed)}</span>
              </div>
              
              <div>
                <span className="text-gray-600">Memory Total:</span>
                <span className="ml-2 font-medium">{formatBytes(health.data.server.memory.heapTotal)}</span>
              </div>
              
              <div>
                <span className="text-gray-600">RSS:</span>
                <span className="ml-2 font-medium">{formatBytes(health.data.server.memory.rss)}</span>
              </div>
            </div>
          </div>

          {/* System Capabilities */}
          <div className="p-4 bg-gray-50 rounded-lg">
            <h3 className="font-medium text-gray-900 mb-3">System Capabilities</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
              <div className="flex items-center">
                <div className={`w-2 h-2 rounded-full mr-2 ${
                  health.data.database.available ? 'bg-green-500' : 'bg-red-500'
                }`}></div>
                <span>Job Storage & Retrieval</span>
              </div>
              
              <div className="flex items-center">
                <div className={`w-2 h-2 rounded-full mr-2 ${
                  health.data.ai.available ? 'bg-green-500' : 'bg-red-500'
                }`}></div>
                <span>AI Content Generation</span>
              </div>
              
              <div className="flex items-center">
                <div className={`w-2 h-2 rounded-full mr-2 ${
                  health.data.database.available && health.data.ai.available ? 'bg-green-500' : 'bg-yellow-500'
                }`}></div>
                <span>Full Pipeline Operations</span>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default AdminSystemHealth;