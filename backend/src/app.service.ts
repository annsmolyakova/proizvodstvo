import { Injectable } from '@nestjs/common';
import { PrismaService } from './prisma/prisma.service.js';

@Injectable()
export class AppService {
  constructor(private readonly prisma: PrismaService) {}

  async getHello(): Promise<object> {
    const usersCount = await this.prisma.user.count();

    return {
      application: 'ProdMaster API',
      status: 'running',
      database: 'connected',
      usersCount,
    };
  }
}