// Simple notification utility matching webdesign.html implementation
export function showNotification(message: string, type: 'success' | 'info' | 'error' = 'info') {
  // Create notification element
  const notification = document.createElement('div');
  notification.className = `notification notification-${type}`;
  notification.textContent = message;
  
  // Add styles matching webdesign.html
  notification.style.cssText = `
    position: fixed;
    top: 20px;
    right: 20px;
    padding: 12px 20px;
    background: ${type === 'success' ? '#10b981' : type === 'error' ? '#ef4444' : '#3b82f6'};
    color: white;
    border-radius: 8px;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
    z-index: 10000;
    font-weight: 500;
    transform: translateX(100%);
    transition: transform 0.3s ease;
    font-family: inherit;
    max-width: 350px;
    word-wrap: break-word;
    cursor: pointer;
  `;
  
  // Function to remove notification
  const removeNotification = () => {
    notification.style.transform = 'translateX(100%)';
    setTimeout(() => {
      if (document.body.contains(notification)) {
        document.body.removeChild(notification);
      }
    }, 300);
  };
  
  // Add click-to-dismiss functionality
  notification.addEventListener('click', removeNotification);
  
  document.body.appendChild(notification);
  
  // Animate in
  setTimeout(() => {
    notification.style.transform = 'translateX(0)';
  }, 100);
  
  // Auto-remove after 3 seconds
  const autoRemoveTimer = setTimeout(() => {
    removeNotification();
  }, 3000);
  
  // Clear auto-remove timer if manually dismissed
  notification.addEventListener('click', () => {
    clearTimeout(autoRemoveTimer);
  });
}
