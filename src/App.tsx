import React from "react";
import {
  Button,
  Card,
  CardBody,
  CardFooter,
  CardHeader,
  Divider,
  Spinner,
} from "@heroui/react";
import { Icon } from "@iconify/react";
import { v4 as uuidv4 } from "uuid";

import { ConnectionForm } from "./components/connection-form";
import { ConnectionStatistics } from "./components/connection-stats";
import { ConnectionStatus } from "./components/connection-status";
import { LogDisplay } from "./components/log-display";
import { ThemeSwitcher } from "./components/theme-switcher";

type LogType = "info" | "error" | "success";

interface ConnectionDetails {
  agentId: string;
  websocketUrl: string;
}

interface ConnectionStats {
  activeConnections: number;
  bytesIn: number;
  bytesOut: number;
  totalConnections: number;
}

interface LogEntry {
  id: number;
  message: string;
  timestamp: string;
  type: LogType;
}

const MAX_LOG_ENTRIES = 500;
const STORAGE_KEYS = {
  agentId: "agentId",
  websocketUrl: "websocketUrl",
} as const;
const INITIAL_STATS: ConnectionStats = {
  activeConnections: 0,
  totalConnections: 0,
  bytesIn: 0,
  bytesOut: 0,
};

function formatTimestamp(date = new Date()): string {
  return date.toLocaleTimeString("en-US", {
    hour: "2-digit",
    hour12: false,
    minute: "2-digit",
    second: "2-digit",
  });
}

function createLogEntry(
  id: number,
  message: string,
  type: LogType = "info",
): LogEntry {
  return {
    id,
    message,
    timestamp: formatTimestamp(),
    type,
  };
}

function getInitialConnectionDetails(): ConnectionDetails {
  return {
    websocketUrl:
      window.localStorage.getItem(STORAGE_KEYS.websocketUrl) ??
      "ws://localhost:11601",
    agentId: window.localStorage.getItem(STORAGE_KEYS.agentId) ?? uuidv4(),
  };
}

export default function App() {
  const nextLogIdRef = React.useRef(2);
  const pendingTrafficRef = React.useRef({ bytesIn: 0, bytesOut: 0 });
  const trafficFrameRef = React.useRef<number | null>(null);
  const sessionRef = React.useRef<{
    close(): Promise<void>;
    done: Promise<void>;
  } | null>(null);
  const disconnectRequestedRef = React.useRef(false);

  const [isConnected, setIsConnected] = React.useState(false);
  const [isConnecting, setIsConnecting] = React.useState(false);
  const [logs, setLogs] = React.useState<LogEntry[]>(() => [
    createLogEntry(0, "Ligolo-ng agent initialized"),
    createLogEntry(1, "Ready to connect to Ligolo-ng Server"),
  ]);
  const [connectionDetails, setConnectionDetails] =
    React.useState<ConnectionDetails>(getInitialConnectionDetails);
  const [stats, setStats] = React.useState(INITIAL_STATS);

  const flushPendingTraffic = () => {
    trafficFrameRef.current = null;

    if (
      pendingTrafficRef.current.bytesIn === 0 &&
      pendingTrafficRef.current.bytesOut === 0
    ) {
      return;
    }

    const nextTraffic = pendingTrafficRef.current;

    pendingTrafficRef.current = { bytesIn: 0, bytesOut: 0 };

    setStats((previousStats) => ({
      ...previousStats,
      bytesIn: previousStats.bytesIn + nextTraffic.bytesIn,
      bytesOut: previousStats.bytesOut + nextTraffic.bytesOut,
    }));
  };

  const queueTrafficUpdate = (
    direction: "bytesIn" | "bytesOut",
    bytes: number,
  ) => {
    pendingTrafficRef.current[direction] += bytes;

    if (trafficFrameRef.current == null) {
      trafficFrameRef.current =
        window.requestAnimationFrame(flushPendingTraffic);
    }
  };

  const addLog = (message: string, type: LogType = "info") => {
    const logEntry = createLogEntry(nextLogIdRef.current, message, type);

    nextLogIdRef.current += 1;

    React.startTransition(() => {
      setLogs((previousLogs) =>
        [...previousLogs, logEntry].slice(-MAX_LOG_ENTRIES),
      );
    });
  };

  const clearLogs = () => {
    const clearedEntry = createLogEntry(nextLogIdRef.current, "Logs cleared");

    nextLogIdRef.current += 1;
    setLogs([clearedEntry]);
  };

  const handleDisconnect = async () => {
    if (sessionRef.current == null) {
      return;
    }

    disconnectRequestedRef.current = true;
    setIsConnecting(true);
    addLog("Disconnecting from agent...");
    await sessionRef.current.close();
  };

  const handleConnect = async () => {
    window.localStorage.setItem(
      STORAGE_KEYS.websocketUrl,
      connectionDetails.websocketUrl,
    );
    window.localStorage.setItem(
      STORAGE_KEYS.agentId,
      connectionDetails.agentId,
    );

    if (sessionRef.current != null) {
      await handleDisconnect();

      return;
    }

    if (!connectionDetails.websocketUrl.trim()) {
      addLog("WebSocket URL is required", "error");

      return;
    }

    setIsConnecting(true);
    setStats(INITIAL_STATS);
    pendingTrafficRef.current = { bytesIn: 0, bytesOut: 0 };

    try {
      const { createLigoloSession } = await import("./ligolo/session");
      let didReachConnectedState = false;

      const session = await createLigoloSession({
        agentId: connectionDetails.agentId,
        websocketUrl: connectionDetails.websocketUrl,
        onActiveConnectionsChange: (delta) => {
          setStats((previousStats) => ({
            ...previousStats,
            activeConnections: Math.max(
              previousStats.activeConnections + delta,
              0,
            ),
          }));
        },
        onBytesIn: (bytes) => {
          queueTrafficUpdate("bytesIn", bytes);
        },
        onBytesOut: (bytes) => {
          queueTrafficUpdate("bytesOut", bytes);
        },
        onConnected: () => {
          if (didReachConnectedState) {
            return;
          }

          didReachConnectedState = true;
          setIsConnected(true);
          setIsConnecting(false);
          addLog("Ligolo session established", "success");
        },
        onLog: addLog,
        onTotalConnectionsChange: (delta) => {
          setStats((previousStats) => ({
            ...previousStats,
            totalConnections: Math.max(
              previousStats.totalConnections + delta,
              0,
            ),
          }));
        },
      });

      sessionRef.current = session;

      void session.done.finally(() => {
        if (trafficFrameRef.current != null) {
          window.cancelAnimationFrame(trafficFrameRef.current);
        }

        flushPendingTraffic();
        sessionRef.current = null;
        setIsConnected(false);
        setIsConnecting(false);
        setStats((previousStats) => ({
          ...previousStats,
          activeConnections: 0,
        }));

        const disconnectRequested = disconnectRequestedRef.current;

        disconnectRequestedRef.current = false;

        if (disconnectRequested) {
          addLog("Disconnected from agent");

          return;
        }

        addLog(
          didReachConnectedState
            ? "Connection closed"
            : "Connection attempt ended before the session was ready",
          didReachConnectedState ? "info" : "error",
        );
      });
    } catch (error) {
      setIsConnected(false);
      setIsConnecting(false);
      addLog(
        `Unable to start Ligolo session: ${error instanceof Error ? error.message : String(error)}`,
        "error",
      );
    }
  };

  React.useEffect(() => {
    return () => {
      if (trafficFrameRef.current != null) {
        window.cancelAnimationFrame(trafficFrameRef.current);
      }

      void sessionRef.current?.close();
    };
  }, []);

  return (
    <div className="flex min-h-screen flex-col bg-background p-4 md:p-8">
      <header className="mb-6">
        <div className="mb-2 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Icon className="text-2xl text-primary" icon="lucide:link" />
            <h1 className="text-2xl font-semibold text-foreground">
              Ligolo-ng Agent Connection
            </h1>
          </div>
          <ThemeSwitcher />
        </div>
        <p className="text-foreground-500">
          Connect to and manage your Ligolo-ng JavaScript agent
        </p>
      </header>

      <div className="grid flex-grow grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="flex flex-col gap-6 lg:col-span-1">
          <Card className="h-auto overflow-visible">
            <CardHeader className="flex flex-col gap-1">
              <h2 className="text-lg font-medium">Connection Settings</h2>
              <p className="text-small text-foreground-500">
                Configure your agent connection
              </p>
            </CardHeader>
            <Divider />
            <CardBody>
              <ConnectionForm
                connectionDetails={connectionDetails}
                isConnected={isConnected}
                isConnecting={isConnecting}
                setConnectionDetails={setConnectionDetails}
              />
            </CardBody>
            <Divider />
            <CardFooter className="flex items-center justify-between">
              <ConnectionStatus
                isConnected={isConnected}
                isConnecting={isConnecting}
              />
              <Button
                color={isConnected ? "danger" : "primary"}
                isDisabled={isConnecting}
                startContent={isConnecting ? <Spinner size="sm" /> : null}
                onPress={handleConnect}
              >
                {isConnecting
                  ? isConnected
                    ? "Disconnecting..."
                    : "Connecting..."
                  : isConnected
                    ? "Disconnect"
                    : "Connect"}
              </Button>
            </CardFooter>
          </Card>

          <ConnectionStatistics isConnected={isConnected} stats={stats} />
        </div>

        <div className="lg:col-span-2">
          <LogDisplay clearLogs={clearLogs} logs={logs} />
        </div>
      </div>
    </div>
  );
}
