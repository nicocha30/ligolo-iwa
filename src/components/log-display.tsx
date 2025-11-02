import React from "react";
import {
  Card,
  CardBody,
  CardHeader,
  CardFooter,
  Button,
  Divider,
} from "@heroui/react";
import { Icon } from "@iconify/react";

interface LogDisplayProps {
  logs: Array<{
    timestamp: Date;
    message: string;
    type: "info" | "error" | "success";
  }>;
  clearLogs: () => void;
}

export const LogDisplay: React.FC<LogDisplayProps> = ({ logs, clearLogs }) => {
  const logContainerRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    // Auto-scroll to bottom when new logs are added
    if (logContainerRef.current) {
      logContainerRef.current.scrollTop = logContainerRef.current.scrollHeight;
    }
  }, [logs]);

  const formatTimestamp = (date: Date) => {
    return date.toLocaleTimeString("en-US", {
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hour12: false,
    });
  };

  const getLogIcon = (type: "info" | "error" | "success") => {
    switch (type) {
      case "error":
        return <Icon className="text-danger" icon="lucide:alert-circle" />;
      case "success":
        return <Icon className="text-success" icon="lucide:check-circle" />;
      case "info":
      default:
        return <Icon className="text-primary" icon="lucide:info" />;
    }
  };

  const getLogClass = (type: "info" | "error" | "success") => {
    switch (type) {
      case "error":
        return "text-danger";
      case "success":
        return "text-success";
      case "info":
      default:
        return "text-foreground";
    }
  };

  return (
    <Card className="h-full">
      <CardHeader className="flex justify-between items-center">
        <div>
          <h2 className="text-lg font-medium">Connection Logs</h2>
          <p className="text-small text-foreground-500">
            {logs.length} entries
          </p>
        </div>
        <Button
          color="default"
          size="sm"
          startContent={<Icon icon="lucide:trash-2" />}
          variant="flat"
          onPress={clearLogs}
        >
          Clear Logs
        </Button>
      </CardHeader>
      <Divider />
      <CardBody className="p-0">
        <div
          ref={logContainerRef}
          className="h-[400px] overflow-y-auto p-4 font-mono text-small"
        >
          {logs.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-foreground-400">
              <Icon className="text-4xl mb-2" icon="lucide:file-text" />
              <p>No logs available</p>
            </div>
          ) : (
            logs.map((log, index) => (
              <div key={index} className="mb-2 flex items-start gap-2">
                <span className="text-foreground-400 shrink-0">
                  [{formatTimestamp(log.timestamp)}]
                </span>
                <span className="shrink-0 mt-0.5">{getLogIcon(log.type)}</span>
                <span className={getLogClass(log.type)}>{log.message}</span>
              </div>
            ))
          )}
        </div>
      </CardBody>
      <Divider />
      <CardFooter className="flex justify-between">
        <div className="text-small text-foreground-500">
          <span className="font-medium">Auto-scrolling enabled</span> • Showing
          all logs
        </div>
        <Button
          color="primary"
          size="sm"
          startContent={<Icon icon="lucide:download" />}
          variant="light"
          onPress={() => {
            const logText = logs
              .map(
                (log) =>
                  `[${formatTimestamp(log.timestamp)}] ${log.type.toUpperCase()}: ${log.message}`,
              )
              .join("\n");

            const blob = new Blob([logText], { type: "text/plain" });
            const url = URL.createObjectURL(blob);
            const a = document.createElement("a");

            a.href = url;
            a.download = `ligolo-logs-${new Date().toISOString().split("T")[0]}.txt`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
          }}
        >
          Export Logs
        </Button>
      </CardFooter>
    </Card>
  );
};
