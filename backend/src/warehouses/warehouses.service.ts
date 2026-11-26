import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { validate as isValidUUID } from 'uuid';
import { PrismaService } from '../prisma/prisma.service.js';
import { CreateWarehouseDto } from './dto/create-warehouse.dto.js';
import { UpdateWarehouseDto } from './dto/update-warehouse.dto.js';

@Injectable()
export class WarehousesService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(isActive?: string) {
    const where: Prisma.WarehouseWhereInput = {};

    if (isActive !== undefined) {
      if (isActive !== 'true' && isActive !== 'false') {
        throw new BadRequestException(
          'Параметр isActive должен иметь значение true или false',
        );
      }

      where.isActive = isActive === 'true';
    }

    return this.prisma.warehouse.findMany({
      where,
      include: {
        _count: {
          select: {
            balances: true,
            transactions: true,
          },
        },
      },
      orderBy: {
        name: 'asc',
      },
    });
  }

  async findOne(id: string) {
    if (!isValidUUID(id)) {
      throw new BadRequestException(
        'Некорректный формат ID склада',
      );
    }

    const warehouse = await this.prisma.warehouse.findUnique({
      where: { id },
      include: {
        balances: {
          include: {
            material: true,
          },
        },
        _count: {
          select: {
            balances: true,
            transactions: true,
          },
        },
      },
    });

    if (!warehouse) {
      throw new NotFoundException(
        `Склад с ID ${id} не найден`,
      );
    }

    return warehouse;
  }

  async create(dto: CreateWarehouseDto) {
    const name = dto.name.trim();
    const location = dto.location?.trim() || null;

    if (name.length < 2) {
      throw new BadRequestException(
        'Название склада должно содержать минимум 2 символа',
      );
    }

    try {
      return await this.prisma.warehouse.create({
        data: {
          name,
          location,
        },
      });
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002'
      ) {
        throw new ConflictException(
          'Склад с такими уникальными данными уже существует',
        );
      }

      throw error;
    }
  }

  async update(id: string, dto: UpdateWarehouseDto) {
    const warehouse = await this.findOne(id);

    if (!warehouse.isActive) {
      throw new ConflictException(
        'Нельзя изменить архивированный склад',
      );
    }

    if (Object.values(dto).every((value) => value === undefined)) {
      throw new BadRequestException(
        'Необходимо передать хотя бы одно поле для изменения',
      );
    }

    const data: Prisma.WarehouseUpdateInput = {};

    if (dto.name !== undefined) {
      const name = dto.name.trim();

      if (name.length < 2) {
        throw new BadRequestException(
          'Название склада должно содержать минимум 2 символа',
        );
      }

      data.name = name;
    }

    if (dto.location !== undefined) {
      data.location = dto.location?.trim() || null;
    }

    return this.prisma.warehouse.update({
      where: { id },
      data,
    });
  }

  async remove(id: string) {
    const warehouse = await this.findOne(id);

    if (!warehouse.isActive) {
      throw new ConflictException(
        'Склад уже архивирован',
      );
    }

    return this.prisma.warehouse.update({
      where: { id },
      data: {
        isActive: false,
      },
    });
  }
}