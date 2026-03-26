import React from "react";

interface ConnectionStatusProps {
  isConnected: boolean;
  isConnecting: boolean;
}

export const ConnectionStatus: React.FC<ConnectionStatusProps> = ({
  isConnected,
  isConnecting,
}) => {
  const isPending = isConnecting && !isConnected;

  return (
    <div className="flex items-center gap-2">
      <div
        className={`h-3 w-3 rounded-full ${
          isConnected
            ? "bg-success animate-pulse"
            : isPending
              ? "bg-warning animate-pulse"
              : "bg-danger"
        }`}
      />
      <span className="text-small font-medium">
        {isConnected ? "Connected" : isPending ? "Connecting" : "Disconnected"}
      </span>
    </div>
  );
};
