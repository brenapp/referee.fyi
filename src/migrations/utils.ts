import { get, set } from "idb-keyval";

export type Migration = {
  name: string;
  run_order: number; // The higher run order will always run later
  dependencies: string[]; // List of names of migrations that should have successfully completed prior to running this migration
  apply: (
    prev?: MigrationResult
  ) => Promise<Omit<MigrationResult, "date" | "duration">>;
};

export type MigrationResult = {
  success: boolean;
  details?: string;
  date: Date;
  duration: number;
};

export async function hasAppliedMigration(name: string): Promise<boolean> {
  const result = await get<MigrationResult>(`migration_${name}`);

  if (!result) {
    return false;
  }

  return result.success;
}

export async function applyMigration(
  migration: Migration
): Promise<MigrationResult & { preapplied: boolean }> {
  const result = await get<MigrationResult>(`migration_${migration.name}`);

  if (result && result.success) {
    return { ...result, preapplied: true };
  }

  const start = performance.now();
  const output = await migration.apply(result);
  const end = performance.now();

  const newResult: MigrationResult = {
    ...output,
    date: new Date(),
    duration: end - start,
  };

  await set(`migration_${migration.name}`, newResult);

  return { ...newResult, preapplied: false };
}

export const MIGRATION_QUEUE: Migration[] = [];

export async function queueMigration(migration: Migration) {
  for (let i = 0; i < MIGRATION_QUEUE.length - 1; i++) {
    if (MIGRATION_QUEUE[i + 1].run_order < migration.run_order) {
      MIGRATION_QUEUE.splice(i, 0, migration);
    }
  }

  MIGRATION_QUEUE.push(migration);
}

export async function runMigrations(): Promise<
  Record<string, MigrationResult & { preapplied: boolean }>
> {
  const results: Record<string, MigrationResult & { preapplied: boolean }> = {};

  for (const migration of MIGRATION_QUEUE) {
    const dependenciesSucceed = migration.dependencies.every(
      (dep) => results[dep]?.success ?? false
    );

    if (!dependenciesSucceed) {
      results[migration.name] = {
        date: new Date(),
        success: false,
        details: "Uncompleted dependencies.",
        preapplied: false,
        duration: 0,
      };
      continue;
    }

    const result = await applyMigration(migration);
    results[migration.name] = result;
  }

  return results;
}
