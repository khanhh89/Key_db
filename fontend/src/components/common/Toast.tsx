interface ToastProps {
  message: string;
}

export function Toast({ message }: ToastProps) {
  return (
    <div className="toast-msg">
      <div className="toast-content">
        <span className="toast-text">{message}</span>
      </div>
    </div>
  );
}
