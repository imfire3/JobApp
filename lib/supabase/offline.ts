type OfflineError = {
  message: string;
  code: string;
};

const offlineResult = {
  data: null,
  error: {
    message:
      "Supabase is unreachable. Check NEXT_PUBLIC_SUPABASE_URL in .env.local (project paused, deleted, or wrong host), then restart the app.",
    code: "SUPABASE_UNREACHABLE",
  } satisfies OfflineError,
  count: null,
  status: 503,
  statusText: "Offline",
};

function createBuilder(): {
  then: (
    onFulfilled?: (value: typeof offlineResult) => unknown,
    onRejected?: (reason: unknown) => unknown
  ) => Promise<unknown>;
  catch: (onRejected?: (reason: unknown) => unknown) => Promise<unknown>;
  select: (...args: unknown[]) => ReturnType<typeof createBuilder>;
  insert: (...args: unknown[]) => ReturnType<typeof createBuilder>;
  update: (...args: unknown[]) => ReturnType<typeof createBuilder>;
  upsert: (...args: unknown[]) => ReturnType<typeof createBuilder>;
  delete: (...args: unknown[]) => ReturnType<typeof createBuilder>;
  eq: (...args: unknown[]) => ReturnType<typeof createBuilder>;
  order: (...args: unknown[]) => ReturnType<typeof createBuilder>;
  limit: (...args: unknown[]) => ReturnType<typeof createBuilder>;
  maybeSingle: (...args: unknown[]) => ReturnType<typeof createBuilder>;
  single: (...args: unknown[]) => ReturnType<typeof createBuilder>;
} {
  const builder = new Proxy(
    {},
    {
      get(_target, prop) {
        if (prop === "then") {
          return (
            onFulfilled?: (value: typeof offlineResult) => unknown,
            onRejected?: (reason: unknown) => unknown
          ) => Promise.resolve(offlineResult).then(onFulfilled, onRejected);
        }
        if (prop === "catch") {
          return (onRejected?: (reason: unknown) => unknown) =>
            Promise.resolve(offlineResult).catch(onRejected);
        }
        return (..._args: unknown[]) => createBuilder();
      },
    }
  );
  return builder as ReturnType<typeof createBuilder>;
}

export function createOfflineClient() {
  return {
    from: (_table: string) => createBuilder(),
    auth: {
      getUser: async () => ({ data: { user: null }, error: null }),
      signOut: async () => ({ error: null }),
    },
  };
}
