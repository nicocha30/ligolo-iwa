import React from "react";

interface ConnectionStatusProps {
  isConnected: boolean;
}

export const ConnectionStatus: React.FC<ConnectionStatusProps> = ({
  isConnected,
}) => {
  return (
    <div className="flex items-center gap-2">
      <div
        className={`w-3 h-3 rounded-full ${isConnected ? "bg-success animate-pulse" : "bg-danger"}`}
      />
      <span className="text-small font-medium">
        {isConnected ? "Connected" : "Disconnected"}
      </span>
    </div>
  );
};
