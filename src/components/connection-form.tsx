import React from "react";
import { Input } from "@heroui/react";
import { Icon } from "@iconify/react";

interface ConnectionFormProps {
  connectionDetails: {
    websocketUrl: string;
    agentId: string;
  };
  setConnectionDetails: React.Dispatch<
    React.SetStateAction<{
      websocketUrl: string;
      agentId: string;
    }>
  >;
  isConnecting: boolean;
  isConnected: boolean;
}

export const ConnectionForm: React.FC<ConnectionFormProps> = ({
  connectionDetails,
  setConnectionDetails,
  isConnecting,
  isConnected,
}) => {
  const handleChange = (
    field: keyof ConnectionFormProps["connectionDetails"],
    value: string,
  ) => {
    setConnectionDetails((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  return (
    <div className="flex flex-col gap-4">
      <Input
        description="Example: ws://127.0.0.1:11601 or wss://example.com:11601"
        isDisabled={isConnecting || isConnected}
        label="WebSocket URL"
        placeholder="Enter WebSocket URL (ws:// or wss://)"
        startContent={
          <Icon className="text-default-400 text-lg" icon="lucide:link" />
        }
        value={connectionDetails.websocketUrl}
        onValueChange={(value) => handleChange("websocketUrl", value)}
      />

      <Input
        description="Specify a unique identifier for this agent connection"
        isDisabled={isConnecting || isConnected}
        label="Agent ID (Optional)"
        placeholder="Enter agent identifier"
        startContent={
          <Icon
            className="text-default-400 text-lg"
            icon="lucide:fingerprint"
          />
        }
        value={connectionDetails.agentId}
        onValueChange={(value) => handleChange("agentId", value)}
      />
    </div>
  );
};
