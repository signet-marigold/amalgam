interface ErrorNotificationProps {
}

const ErrorNotification: React.FC<ErrorNotificationProps> = ({ }) => {
  return (
    <div id="error-notification" className="">
      <span id="error-message"></span>
      <button className="">×</button>
    </div>
  );
}

export default ErrorNotification;
