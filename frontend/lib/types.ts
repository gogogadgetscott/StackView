export type StatPoint = {
  ts: number;
  cpu: number;
  mem: number;
};

export type ContainerRow = {
  id: string;
  name: string;
  stack: string;
  status: "running" | "exited" | "paused";
  ports: string[];
  note: string;
  tags: string[];
  spark: StatPoint[];
  cpu: number;
  mem: number;
};

export type ContainerDetail = {
  id: string;
  name: string;
  image: string;
  created: string;
  status: string;
  env: string[];
  mounts: { source: string; destination: string; mode: string }[];
  ports: { hostPort: number; containerPort: number; protocol: string }[];
  labels: Record<string, string>;
};

export type Stack = {
  name: string;
  path: string;
  services: string[];
  runningCount: number;
  stoppedCount: number;
  unhealthyCount: number;
  totalCpu: number;
  totalMem: number;
  containerIds: string[];
};

export type ContainerInfo = {
  id: string;
  name: string;
  service: string;
  status: string;
  health: string | null;
};

export type StackDetail = Stack & {
  containers: ContainerInfo[];
};

export type ComposeContent = {
  content: string;
  path: string;
};

export type StackDiff = {
  composeServices: string[];
  runningServices: string[];
  missingServices: string[];
  extraContainers: string[];
  containers: ContainerInfo[];
  hasDifferences: boolean;
};

export type LogEntry = {
  timestamp: string;
  service: string;
  containerId: string;
  message: string;
  stream: "stdout" | "stderr";
};

export type ControlResponse = {
  success: boolean;
  message: string;
  output?: string;
};
