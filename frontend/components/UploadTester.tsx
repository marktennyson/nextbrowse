"use client";
import React, { useRef, useState } from 'react';
import { TusUploadManager } from '@/lib/tus-upload-manager';

export default function UploadTester() {
  const uploadManagerRef = useRef<TusUploadManager | null>(null);
  const [testMode] = useState(false); // TUS doesn't have test mode
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Initialize upload manager
  React.useEffect(() => {
    uploadManagerRef.current = new TusUploadManager();
    // TUS manager doesn't have test mode - it always does real uploads
  }, [testMode]);

  const handleFileSelect = async () => {
    if (fileInputRef.current?.files && uploadManagerRef.current) {
      const files = fileInputRef.current.files;
      console.log('Selected files:', files.length);
      
      await uploadManagerRef.current.addFiles(files, '/test-uploads');
      
      // Clear the input
      fileInputRef.current.value = '';
    }
  };

  const createTestFile = (name: string, sizeMB: number): File => {
    const size = sizeMB * 1024 * 1024;
    const content = new ArrayBuffer(size);
    return new File([content], name, { type: 'application/octet-stream' });
  };

  const testSmallFiles = async () => {
    if (!uploadManagerRef.current) return;
    
    const files = [
      createTestFile('small-file-1.txt', 0.1), // 100KB
      createTestFile('small-file-2.txt', 0.5), // 500KB
      createTestFile('small-file-3.txt', 1),   // 1MB
    ];
    
    await uploadManagerRef.current.addFiles(files, '/test-uploads');
  };

  const testLargeFiles = async () => {
    if (!uploadManagerRef.current) return;
    
    const files = [
      createTestFile('large-video-1.mp4', 100), // 100MB
      createTestFile('large-video-2.mp4', 500), // 500MB
      createTestFile('huge-movie.mkv', 2000),   // 2GB
    ];
    
    await uploadManagerRef.current.addFiles(files, '/test-uploads');
  };

  const testMixedFiles = async () => {
    if (!uploadManagerRef.current) return;
    
    const files = [
      createTestFile('document.pdf', 5),
      createTestFile('presentation.pptx', 25),
      createTestFile('video-sample.mp4', 150),
      createTestFile('audio-track.mp3', 8),
      createTestFile('dataset.csv', 45),
      createTestFile('backup.zip', 800),
    ];
    
    await uploadManagerRef.current.addFiles(files, '/test-uploads');
  };

  return (
    <div className="p-6 border rounded-lg bg-white dark:bg-gray-800">
      <h3 className="text-lg font-semibold mb-4">Upload System Tester</h3>
      
      <div className="space-y-4">
        <div className="flex items-center space-x-2">
          <span className="text-sm text-gray-600 dark:text-gray-400">
            TUS Upload Manager (Real uploads to backend)
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <h4 className="font-medium">File Selection</h4>
            <div className="flex items-center space-x-2">
              <input
                ref={fileInputRef}
                type="file"
                multiple
                className="flex-1"
                onChange={handleFileSelect}
              />
            </div>
          </div>

          <div className="space-y-2">
            <h4 className="font-medium">Test Scenarios</h4>
            <div className="space-y-2">
              <button
                onClick={testSmallFiles}
                className="w-full px-3 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
              >
                Test Small Files (100KB - 1MB)
              </button>
              
              <button
                onClick={testLargeFiles}
                className="w-full px-3 py-2 bg-green-500 text-white rounded hover:bg-green-600"
              >
                Test Large Files (100MB - 2GB)
              </button>
              
              <button
                onClick={testMixedFiles}
                className="w-full px-3 py-2 bg-purple-500 text-white rounded hover:bg-purple-600"
              >
                Test Mixed File Types
              </button>
            </div>
          </div>
        </div>

        <div className="mt-4 p-3 bg-gray-50 dark:bg-gray-700 rounded">
          <h5 className="font-medium mb-2">Instructions:</h5>
          <ul className="text-sm space-y-1">
            <li>• TUS uploads are always real - no simulation mode</li>
            <li>• Try pausing, resuming, and canceling uploads</li>
            <li>• Watch console logs for debugging information</li>
            <li>• Test with actual files by selecting them above</li>
            <li>• Large file tests create simulated files in memory</li>
          </ul>
        </div>
      </div>
    </div>
  );
}