/// <reference types="vite/client" />

const rawModules = import.meta.glob("./convex/**/*.ts");

export const convexModules: Record<string, () => Promise<unknown>> = Object.fromEntries(
  Object.entries(rawModules).map(([path, loader]) => [
    path.replace("./convex", "."),
    loader,
  ]),
);
