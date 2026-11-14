import type { DataSourceOptions } from "typeorm";
import { UserEntity } from "../users/user.entity";
import { OrderEntity } from "../orders/entities/order.entity";
import { OrderItemEntity } from "../orders/entities/order-item.entity";
import { PaymentEntity } from "../payments/payment.entity";
import { CreateOrders1710000000000 } from "./migrations/1710000000000-CreateOrders";
import { AddUsersAndOrderOwner1710000001000 } from "./migrations/1710000001000-AddUsersAndOrderOwner";
import { CreatePayments1710000002000 } from "./migrations/1710000002000-CreatePayments";
import { MvpPaymentIdempotency1710000003000 } from "./migrations/1710000003000-MvpPaymentIdempotency";

export function databaseOptions(
  read: (name: string) => string | undefined,
  migrationsRun: boolean,
): DataSourceOptions {
  function required(name: string): string {
    const value = read(name);
    if (!value) throw new Error(`Missing ${name}`);
    return value;
  }

  const host = read("DB_HOST") ?? "localhost";
  const port = Number(read("DB_PORT") ?? 5432);
  if (!Number.isInteger(port) || port < 1 || port > 65535) {
    throw new Error("DB_PORT không hợp lệ");
  }
  const tls = read("DB_SSL") === "true";
  if (host.toLowerCase().endsWith(".neon.tech") && (!tls || migrationsRun)) {
    throw new Error("Neon requires DB_SSL=true and separate migrations");
  }

  return {
    type: "postgres",
    host,
    port,
    username: required("DB_USER"),
    password: required("DB_PASSWORD"),
    database: required("DB_NAME"),
    ssl: tls ? { rejectUnauthorized: true } : false,
    installExtensions: false,
    entities: [UserEntity, OrderEntity, OrderItemEntity, PaymentEntity],
    migrations: [
      CreateOrders1710000000000,
      AddUsersAndOrderOwner1710000001000,
      CreatePayments1710000002000,
      MvpPaymentIdempotency1710000003000,
    ],
    migrationsRun,
    synchronize: false,
  };
}
