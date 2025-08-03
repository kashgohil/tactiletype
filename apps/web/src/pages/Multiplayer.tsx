import React, { useState, useEffect } from 'react';
import { useNavigate } from '@tanstack/react-router';
import { RoomBrowser } from '../components/multiplayer/RoomBrowser';
import { CreateRoomModal } from '../components/multiplayer/CreateRoomModal';
import { useMultiplayer } from '../hooks/useMultiplayer';
import { multiplayerApi } from '../services/multiplayerApi';
import { useAuth } from '../contexts/context';

export const Multiplayer: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [multiplayerState, multiplayerActions] = useMultiplayer(user?.id);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [connecting, setConnecting] = useState(false);

  // Auto-connect to WebSocket when component mounts
  useEffect(() => {
    if (user && !multiplayerState.isConnected && !connecting) {
      const token = localStorage.getItem('authToken');
      if (token) {
        setConnecting(true);
        multiplayerActions.connect(token).finally(() => {
          setConnecting(false);
        });
      }
    }
  }, [user, multiplayerState.isConnected, connecting, multiplayerActions]);

  // Redirect to login if not authenticated
  useEffect(() => {
    if (!user) {
      navigate({ to: '/login' });
    }
  }, [user, navigate]);

  const handleJoinRoom = async (roomId: string) => {
    if (!user) return;

    try {
      // First join the room in the database
      await multiplayerApi.joinRoom(roomId);
      
      // Then join via WebSocket
      multiplayerActions.joinRoom(roomId, user.id, user.username);
      
      // Navigate to the room
      navigate({ to: `/multiplayer/room/${roomId}` });
    } catch (error) {
      console.error('Failed to join room:', error);
      // Handle error (could show a toast notification)
    }
  };

  const handleCreateRoom = () => {
    setShowCreateModal(true);
  };

  const handleRoomCreated = async (roomId: string) => {
    if (!user) return;

    try {
      // Join the newly created room
      await multiplayerApi.joinRoom(roomId);
      multiplayerActions.joinRoom(roomId, user.id, user.username);
      
      // Navigate to the room
      navigate({ to: `/multiplayer/room/${roomId}` });
    } catch (error) {
      console.error('Failed to join created room:', error);
    }
  };

  if (!user) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">Authentication Required</h2>
          <p className="text-gray-600 mb-6">Please log in to access multiplayer features.</p>
          <button
            onClick={() => navigate({ to: '/login' })}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
          >
            Go to Login
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Connection Status */}
        <div className="mb-6">
          <div className="flex items-center space-x-2">
            <div className={`w-3 h-3 rounded-full ${
              multiplayerState.connectionStatus === 'connected' ? 'bg-green-500' :
              multiplayerState.connectionStatus === 'connecting' || connecting ? 'bg-yellow-500' :
              'bg-red-500'
            }`} />
            <span className="text-sm text-gray-600">
              {multiplayerState.connectionStatus === 'connected' ? 'Connected to server' :
               multiplayerState.connectionStatus === 'connecting' || connecting ? 'Connecting to server...' :
               'Disconnected from server'}
            </span>
            {multiplayerState.connectionStatus === 'disconnected' && (
              <button
                onClick={() => {
                  const token = localStorage.getItem('authToken');
                  if (token) {
                    setConnecting(true);
                    multiplayerActions.connect(token).finally(() => {
                      setConnecting(false);
                    });
                  }
                }}
                disabled={connecting}
                className="ml-2 px-2 py-1 text-xs bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
              >
                {connecting ? 'Connecting...' : 'Reconnect'}
              </button>
            )}
          </div>
        </div>

        {/* Error Message */}
        {multiplayerState.error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-md">
            <div className="flex items-center justify-between">
              <p className="text-sm text-red-800">{multiplayerState.error}</p>
              <button
                onClick={multiplayerActions.clearError}
                className="text-red-600 hover:text-red-800"
              >
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          </div>
        )}

        {/* Main Content */}
        {multiplayerState.connectionStatus === 'connected' ? (
          <RoomBrowser
            onJoinRoom={handleJoinRoom}
            onCreateRoom={handleCreateRoom}
          />
        ) : (
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              {connecting ? 'Connecting to server...' : 'Connection required'}
            </h3>
            <p className="text-gray-600">
              {connecting ? 'Please wait while we establish a connection.' : 'Please connect to the server to view available rooms.'}
            </p>
          </div>
        )}

        {/* Create Room Modal */}
        <CreateRoomModal
          isOpen={showCreateModal}
          onClose={() => setShowCreateModal(false)}
          onRoomCreated={handleRoomCreated}
        />
      </div>
    </div>
  );
};