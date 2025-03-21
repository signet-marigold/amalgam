interface ErrorNotificationProps {
}

const ErrorNotification: React.FC<ErrorNotificationProps> = ({ }) => {
  return (
    <div id="error-notification" className="notification error hidden">
      <span id="error-message"></span>
      <button className="close-btn">×</button>
    </div>
  );
}

export default ErrorNotification;
