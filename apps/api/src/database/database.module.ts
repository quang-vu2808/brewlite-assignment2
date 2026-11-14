import { Module } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { TypeOrmModule } from "@nestjs/typeorm";
import { UserEntity } from "../users/user.entity";
import { OrderEntity } from "../orders/entities/order.entity";
import { OrderItemEntity } from "../orders/entities/order-item.entity";
import { PaymentEntity } from "../payments/payment.entity";
import { CreateOrders1710000000000 } from "./migrations/1710000000000-CreateOrders";
import { AddUsersAndOrderOwner1710000001000 } from "./migrations/1710000001000-AddUsersAndOrderOwner";
import { CreatePayments1710000002000 } from "./migrations/1710000002000-CreatePayments";
import { MvpPaymentIdempotency1710000003000 } from "./migrations/1710000003000-MvpPaymentIdempotency";

@Module({
  imports: [
    TypeOrmModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => {
        const port = Number(config.get("DB_PORT") ?? 5432);
        if (!Number.isInteger(port) || port < 1 || port > 65535)
          throw new Error("DB_PORT không hợp lệ");
        return {
          type: "postgres" as const,
          host: config.get<string>("DB_HOST") ?? "localhost",
          port,
          username: config.getOrThrow<string>("DB_USER"),
          password: config.getOrThrow<string>("DB_PASSWORD"),
          database: config.getOrThrow<string>("DB_NAME"),
          entities: [UserEntity, OrderEntity, OrderItemEntity, PaymentEntity],
          migrations: [
            CreateOrders1710000000000,
            AddUsersAndOrderOwner1710000001000,
            CreatePayments1710000002000,
            MvpPaymentIdempotency1710000003000,
          ],
          migrationsRun: true,
          synchronize: false,
        };
      },
    }),
  ],
})
export class DatabaseModule {}
