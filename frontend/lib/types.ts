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
  spark: StatPoint[];
  cpu: number;
  mem: number;
};
