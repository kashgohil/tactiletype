import React, { useState, useEffect } from 'react';
import { multiplayerApi } from '../../services/multiplayerApi';
import type { TestText } from '@tactile/types';

interface CreateRoomModalProps {
  isOpen: boolean;
  onClose: () => void;
  onRoomCreated: (roomId: string) => void;
}

export const CreateRoomModal: React.FC<CreateRoomModalProps> = ({
  isOpen,
  onClose,
  onRoomCreated,
}) => {
  const [formData, setFormData] = useState({
    name: '',
    testTextId: '',
    maxPlayers: 10,
  });
  const [testTexts, setTestTexts] = useState<TestText[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingTexts, setLoadingTexts] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Load test texts when modal opens
  useEffect(() => {
    if (isOpen && testTexts.length === 0) {
      loadTestTexts();
    }
  }, [isOpen, testTexts.length]);

  const loadTestTexts = async () => {
    try {
      setLoadingTexts(true);
      const texts = await multiplayerApi.getTestTexts();
      setTestTexts(texts);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load test texts');
    } finally {
      setLoadingTexts(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.name.trim()) {
      setError('Room name is required');
      return;
    }
    
    if (!formData.testTextId) {
      setError('Please select a test text');
      return;
    }

    try {
      setLoading(true);
      setError(null);
      
      const response = await multiplayerApi.createRoom({
        name: formData.name.trim(),
        testTextId: formData.testTextId,
        maxPlayers: formData.maxPlayers,
      });

      onRoomCreated(response.room.id);
      handleClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create room');
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setFormData({ name: '', testTextId: '', maxPlayers: 10 });
    setError(null);
    onClose();
  };

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case 'easy': return 'text-green-600';
      case 'medium': return 'text-yellow-600';
      case 'hard': return 'text-red-600';
      default: return 'text-gray-600';
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex items-center justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
        {/* Background overlay */}
        <div
          className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity"
          onClick={handleClose}
        />

        {/* Modal */}
        <div className="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full">
          <form onSubmit={handleSubmit}>
            <div className="bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
              <div className="sm:flex sm:items-start">
                <div className="w-full">
                  <h3 className="text-lg leading-6 font-medium text-gray-900 mb-4">
                    Create New Room
                  </h3>

                  {/* Error Message */}
                  {error && (
                    <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-md">
                      <p className="text-sm text-red-800">{error}</p>
                    </div>
                  )}

                  {/* Room Name */}
                  <div className="mb-4">
                    <label htmlFor="roomName" className="block text-sm font-medium text-gray-700 mb-2">
                      Room Name
                    </label>
                    <input
                      type="text"
                      id="roomName"
                      value={formData.name}
                      onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                      placeholder="Enter room name..."
                      maxLength={100}
                      required
                    />
                  </div>

                  {/* Test Text Selection */}
                  <div className="mb-4">
                    <label htmlFor="testText" className="block text-sm font-medium text-gray-700 mb-2">
                      Test Text
                    </label>
                    {loadingTexts ? (
                      <div className="flex items-center justify-center py-4">
                        <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-600"></div>
                        <span className="ml-2 text-sm text-gray-600">Loading texts...</span>
                      </div>
                    ) : (
                      <select
                        id="testText"
                        value={formData.testTextId}
                        onChange={(e) => setFormData(prev => ({ ...prev, testTextId: e.target.value }))}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                        required
                      >
                        <option value="">Select a test text...</option>
                        {testTexts.map((text) => (
                          <option key={text.id} value={text.id}>
                            {text.title} ({text.wordCount} words) - {text.difficulty}
                          </option>
                        ))}
                      </select>
                    )}
                    
                    {/* Selected text preview */}
                    {formData.testTextId && (
                      <div className="mt-2 p-3 bg-gray-50 rounded-md">
                        {(() => {
                          const selectedText = testTexts.find(t => t.id === formData.testTextId);
                          if (!selectedText) return null;
                          
                          return (
                            <div>
                              <div className="flex items-center justify-between mb-2">
                                <h4 className="font-medium text-gray-900">{selectedText.title}</h4>
                                <span className={`text-sm font-medium ${getDifficultyColor(selectedText.difficulty)}`}>
                                  {selectedText.difficulty}
                                </span>
                              </div>
                              <p className="text-sm text-gray-600 line-clamp-3">
                                {selectedText.content.substring(0, 150)}...
                              </p>
                              <p className="text-xs text-gray-500 mt-1">
                                {selectedText.wordCount} words
                              </p>
                            </div>
                          );
                        })()}
                      </div>
                    )}
                  </div>

                  {/* Max Players */}
                  <div className="mb-4">
                    <label htmlFor="maxPlayers" className="block text-sm font-medium text-gray-700 mb-2">
                      Maximum Players
                    </label>
                    <select
                      id="maxPlayers"
                      value={formData.maxPlayers}
                      onChange={(e) => setFormData(prev => ({ ...prev, maxPlayers: parseInt(e.target.value) }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                    >
                      {[2, 3, 4, 5, 6, 7, 8, 9, 10].map(num => (
                        <option key={num} value={num}>{num} players</option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>
            </div>

            {/* Modal Actions */}
            <div className="bg-gray-50 px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse">
              <button
                type="submit"
                disabled={loading || loadingTexts}
                className="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-blue-600 text-base font-medium text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 sm:ml-3 sm:w-auto sm:text-sm disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    Creating...
                  </>
                ) : (
                  'Create Room'
                )}
              </button>
              <button
                type="button"
                onClick={handleClose}
                disabled={loading}
                className="mt-3 w-full inline-flex justify-center rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 sm:mt-0 sm:ml-3 sm:w-auto sm:text-sm disabled:opacity-50"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};