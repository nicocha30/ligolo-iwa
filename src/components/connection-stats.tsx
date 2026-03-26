import React from "react";
import { Card, CardBody, CardHeader, Divider } from "@heroui/react";
import { Icon } from "@iconify/react";

function formatBytes(bytes: number): string {
  if (bytes === 0) return "0 B";

  const sizes = ["B", "KB", "MB", "GB", "TB"];
  const unitIndex = Math.floor(Math.log(bytes) / Math.log(1024));

  return `${parseFloat((bytes / 1024 ** unitIndex).toFixed(2))} ${sizes[unitIndex]}`;
}

interface ConnectionStatisticsProps {
  isConnected: boolean;
  stats: {
    activeConnections: number;
    totalConnections: number;
    bytesIn: number;
    bytesOut: number;
  };
}

export const ConnectionStatistics: React.FC<ConnectionStatisticsProps> = ({
  isConnected,
  stats,
}) => {
  return (
    <Card className="h-full">
      <CardHeader className="flex flex-col gap-1">
        <h2 className="text-lg font-medium">Connection Statistics</h2>
        <p className="text-small text-foreground-500">
          {isConnected ? "Live metrics" : "No active connection"}
        </p>
      </CardHeader>
      <Divider />
      <CardBody>
        <div className="grid grid-cols-2 gap-4">
          <div className="flex flex-col gap-1 rounded-medium bg-content2 p-3">
            <div className="flex items-center gap-2">
              <Icon className="text-primary" icon="lucide:activity" />
              <span className="text-small text-foreground-500">
                Active Connections
              </span>
            </div>
            <p className="text-2xl font-semibold">
              {isConnected ? stats.activeConnections : "—"}
            </p>
          </div>

          <div className="flex flex-col gap-1 rounded-medium bg-content2 p-3">
            <div className="flex items-center gap-2">
              <Icon className="text-primary" icon="lucide:history" />
              <span className="text-small text-foreground-500">
                Total Connections
              </span>
            </div>
            <p className="text-2xl font-semibold">{stats.totalConnections}</p>
          </div>

          <div className="flex flex-col gap-1 rounded-medium bg-content2 p-3">
            <div className="flex items-center gap-2">
              <Icon className="text-success" icon="lucide:download" />
              <span className="text-small text-foreground-500">
                Data Received
              </span>
            </div>
            <p className="text-2xl font-semibold">
              {formatBytes(stats.bytesIn)}
            </p>
          </div>

          <div className="flex flex-col gap-1 rounded-medium bg-content2 p-3">
            <div className="flex items-center gap-2">
              <Icon className="text-warning" icon="lucide:upload" />
              <span className="text-small text-foreground-500">Data Sent</span>
            </div>
            <p className="text-2xl font-semibold">
              {formatBytes(stats.bytesOut)}
            </p>
          </div>
        </div>
      </CardBody>
    </Card>
  );
};
