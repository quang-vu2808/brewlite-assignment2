import type { MigrationInterface, QueryRunner } from "typeorm";

// Scoped from Assignment 1 Task10BusinessRules: retain auth response compatibility
// and durable payment idempotency, without inventory/promotions/loyalty operations.
export class MvpPaymentIdempotency1710000003000 implements MigrationInterface {
  name = "MvpPaymentIdempotency1710000003000";
  async up(runner: QueryRunner): Promise<void> {
    await runner.query(`ALTER TABLE "users" ADD COLUMN "role" varchar(20) NOT NULL DEFAULT 'CUSTOMER',
      ADD CONSTRAINT "CHK_users_role" CHECK ("role" IN ('CUSTOMER', 'STAFF'))`);
    await runner.query(`ALTER TABLE "orders" ADD CONSTRAINT "CHK_orders_status"
      CHECK ("status" IN ('PENDING','PAYMENT_FAILED','PAID','PREPARING','READY','COMPLETED','CANCELLED'))`);
    await runner.query(`ALTER TABLE "payments"
      ADD COLUMN "user_id" uuid NULL,
      ADD COLUMN "idempotency_key" varchar(128) NULL,
      ADD COLUMN "request_hash" varchar(64) NULL,
      ADD COLUMN "result_snapshot" jsonb NULL`);
    await runner.query(
      `UPDATE "payments" AS p SET "user_id" = o."user_id" FROM "orders" AS o WHERE p."order_id" = o."id"`,
    );
    await runner.query(`ALTER TABLE "payments" ADD CONSTRAINT "FK_payments_user"
      FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE SET NULL`);
    await runner.query(`CREATE UNIQUE INDEX "UQ_payments_user_idempotency_key"
      ON "payments" ("user_id", "idempotency_key") WHERE "idempotency_key" IS NOT NULL`);
  }
  async down(runner: QueryRunner): Promise<void> {
    await runner.query('DROP INDEX "UQ_payments_user_idempotency_key"');
    await runner.query(`ALTER TABLE "payments" DROP CONSTRAINT "FK_payments_user", DROP COLUMN "user_id",
      DROP COLUMN "idempotency_key", DROP COLUMN "request_hash", DROP COLUMN "result_snapshot"`);
    await runner.query(
      'ALTER TABLE "orders" DROP CONSTRAINT "CHK_orders_status"',
    );
    await runner.query(
      'ALTER TABLE "users" DROP CONSTRAINT "CHK_users_role", DROP COLUMN "role"',
    );
  }
}
