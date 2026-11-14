import "reflect-metadata";
import { DataSource, MigrationExecutor } from "typeorm";
import { databaseOptions } from "./database-options";

async function migrate() {
  if (!process.env.DB_HOST || process.env.DB_MIGRATIONS_RUN !== "false") {
    throw new Error("Explicit database target required");
  }
  const database = new DataSource(databaseOptions((name) => process.env[name], false));
  await database.initialize();
  try {
    const runner = database.createQueryRunner();
    try {
      await runner.connect();
      const result = await runner.query(
        "SELECT pg_try_advisory_lock(35117, 53003) AS locked",
        [],
        true,
      );
      if (result.records[0]?.locked !== true) throw new Error("Migration already running");
      try {
        const executor = new MigrationExecutor(database, runner);
        executor.transaction = "all";
        const applied = await executor.executePendingMigrations();
        console.log(`Migrations applied: ${applied.length}`);
      } finally {
        await runner.query("SELECT pg_advisory_unlock(35117, 53003)");
      }
    } finally {
      await runner.release();
    }
  } finally {
    await database.destroy();
  }
}

void migrate().catch(() => {
  console.error("Migration failed. Verify target, TLS, permissions and migration lock.");
  process.exitCode = 1;
});
