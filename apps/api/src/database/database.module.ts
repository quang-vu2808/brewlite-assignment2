import { Module } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { TypeOrmModule } from "@nestjs/typeorm";
import { databaseOptions } from "./database-options";

@Module({
  imports: [
    TypeOrmModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => databaseOptions(
        (name) => config.get<string>(name),
        config.get<string>("DB_MIGRATIONS_RUN") !== "false",
      ),
    }),
  ],
})
export class DatabaseModule {}
