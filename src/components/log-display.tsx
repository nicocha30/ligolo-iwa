import React from "react";
import {
  Button,
  Card,
  CardBody,
  CardFooter,
  CardHeader,
  Divider,
} from "@heroui/react";
import { Icon } from "@iconify/react";

interface LogDisplayProps {
  logs: Array<{
    id: number;
    message: string;
    timestamp: string;
    type: "info" | "error" | "success";
  }>;
  clearLogs: () => void;
}

export const LogDisplay: React.FC<LogDisplayProps> = ({ logs, clearLogs }) => {
  const logContainerRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    if (logContainerRef.current) {
      logContainerRef.current.scrollTop = logContainerRef.current.scrollHeight;
    }
  }, [logs]);

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
      <CardHeader className="flex items-center justify-between">
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
            <div className="flex h-full flex-col items-center justify-center text-foreground-400">
              <Icon className="mb-2 text-4xl" icon="lucide:file-text" />
              <p>No logs available</p>
            </div>
          ) : (
            logs.map((log) => (
              <div key={log.id} className="mb-2 flex items-start gap-2">
                <span className="shrink-0 text-foreground-400">
                  [{log.timestamp}]
                </span>
                <span className="mt-0.5 shrink-0">{getLogIcon(log.type)}</span>
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
                  `[${log.timestamp}] ${log.type.toUpperCase()}: ${log.message}`,
              )
              .join("\n");

            const blob = new Blob([logText], { type: "text/plain" });
            const url = URL.createObjectURL(blob);
            const anchor = document.createElement("a");

            anchor.href = url;
            anchor.download = `ligolo-logs-${new Date().toISOString().split("T")[0]}.txt`;
            document.body.appendChild(anchor);
            anchor.click();
            document.body.removeChild(anchor);
            URL.revokeObjectURL(url);
          }}
        >
          Export Logs
        </Button>
      </CardFooter>
    </Card>
  );
};
