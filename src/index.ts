import { App } from './app';
import { initDebugger } from './utils/debug';

// Initialize with debug mode in development
const isDevMode = process.env.NODE_ENV !== 'production';
initDebugger(isDevMode);

// Ensure the DOM is loaded before initializing the app
document.addEventListener('DOMContentLoaded', async () => {
  try {
    // Show loading indicator while initializing
    const loadingIndicator = document.getElementById('loading-indicator') as HTMLElement;
    loadingIndicator.classList.remove('hidden');
    
    // Initialize the application
    const app = new App();
    await app.initialize();
    
    // Hide loading indicator when done
    loadingIndicator.classList.add('hidden');
    
    console.log('Browser Video Editor initialized successfully');
  } catch (error) {
    console.error('Failed to initialize the application:', error);
    
    // Display error to user
    const errorNotification = document.getElementById('error-notification') as HTMLElement;
    const errorMessage = document.getElementById('error-message') as HTMLElement;
    
    // More user-friendly error message
    let errorMsg = error instanceof Error ? error.message : String(error);
    if (errorMsg.includes('FFmpeg')) {
      errorMsg = 'Could not load video processing library. Some features may be limited.';
    }
    
    errorMessage.textContent = `Failed to initialize: ${errorMsg}`;
    errorNotification.classList.remove('hidden');
    
    // Hide loading indicator on error
    const loadingIndicator = document.getElementById('loading-indicator') as HTMLElement;
    loadingIndicator.classList.add('hidden');
  }
});

// Error notification close button
document.addEventListener('click', (event) => {
  const target = event.target as HTMLElement;
  if (target.classList.contains('close-btn')) {
    const notification = target.closest('.notification');
    if (notification) {
      notification.classList.add('hidden');
    }
  }
});
