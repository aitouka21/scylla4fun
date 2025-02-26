export type RoundRobinEndpointProviderConfig = Partial<{
  hostname?: string;
  ports?: [number, ...number[]];
}>;

export function RoundRobinEndpointProvider(
  config?: RoundRobinEndpointProviderConfig,
) {
  const hostname = config?.hostname ?? "localhost";
  const ports = config?.ports ?? [8000, 8001, 8002];
  let counter = 0;
  return async () => {
    return {
      hostname,
      path: "/",
      protocol: "http:",
      port: ports[counter++ % ports.length]!,
    };
  };
}
