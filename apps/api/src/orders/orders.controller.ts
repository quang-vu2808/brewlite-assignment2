import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Post,
  Req,
  UseGuards,
} from "@nestjs/common";
import {
  JwtAuthGuard,
  type AuthenticatedRequest,
} from "../auth/guards/jwt-auth.guard";
import { CreateOrderDto } from "./dto/create-order-item.dto";
import { OrdersService } from "./orders.service";

@Controller("orders")
@UseGuards(JwtAuthGuard)
export class OrdersController {
  constructor(private readonly ordersService: OrdersService) {}
  @Get("me")
  findMine(@Req() request: AuthenticatedRequest) {
    return this.ordersService.findMine(request.user.id);
  }
  @Get(":id")
  findOne(
    @Param("id", new ParseUUIDPipe()) id: string,
    @Req() request: AuthenticatedRequest,
  ) {
    return this.ordersService.findOneForUser(id, request.user.id);
  }
  @Post()
  create(@Body() dto: CreateOrderDto, @Req() request: AuthenticatedRequest) {
    return this.ordersService.create(dto, request.user.id);
  }
}
