import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { resolve } from "node:path";
import { ProductsModule } from "./products/products.module";
import { DatabaseModule } from "./database/database.module";
import { AuthModule } from "./auth/auth.module";
import { OrdersModule } from "./orders/orders.module";
import { PaymentsModule } from "./payments/payments.module";

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: [
        resolve(process.cwd(), "../../.env"),
        resolve(process.cwd(), ".env"),
      ],
    }),
    ProductsModule,
    DatabaseModule,
    AuthModule,
    OrdersModule,
    PaymentsModule,
  ],
})
export class AppModule {}
