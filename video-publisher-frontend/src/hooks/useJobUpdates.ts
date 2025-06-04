import { useEffect, useRef } from 'react';
import { useQueryClient } from '@tanstack/react-query';

export function useJobStatusUpdates() {
  const queryClient = useQueryClient();
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    // Simulate real-time updates by refetching jobs every 5 seconds
    // In a real application, this would be replaced with WebSocket connections
    intervalRef.current = setInterval(() => {
      queryClient.invalidateQueries({ queryKey: ['jobs'] });
    }, 5000);

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [queryClient]);

  const startUpdates = () => {
    if (!intervalRef.current) {
      intervalRef.current = setInterval(() => {
        queryClient.invalidateQueries({ queryKey: ['jobs'] });
      }, 5000);
    }
  };
  const stopUpdates = () => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  };

  return { startUpdates, stopUpdates };
}

export function useWebSocketConnection(url: string) {
  const queryClient = useQueryClient();
  const wsRef = useRef<WebSocket | null>(null);

  useEffect(() => {
    // This would be used in a real application with an actual WebSocket server
    // For now, we'll just simulate the connection
    console.log(`Would connect to WebSocket at: ${url}`);
    
    // Simulate connection
    const connect = () => {
      // wsRef.current = new WebSocket(url);
      
      // wsRef.current.onopen = () => {
      //   console.log('WebSocket connected');
      // };
      
      // wsRef.current.onmessage = (event) => {
      //   const data = JSON.parse(event.data);
      //   if (data.type === 'job_status_update') {
      //     queryClient.invalidateQueries({ queryKey: ['jobs'] });
      //   }
      // };
      
      // wsRef.current.onclose = () => {
      //   console.log('WebSocket disconnected');
      //   // Attempt to reconnect after 3 seconds
      //   setTimeout(connect, 3000);
      // };
    };

    // connect();

    return () => {
      if (wsRef.current) {
        wsRef.current.close();
      }
    };
  }, [url, queryClient]);

  return wsRef.current;
}
