import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { validate as isValidUUID } from 'uuid';
import { PrismaService } from '../prisma/prisma.service.js';
import { CreateProductOperationDto } from './dto/create-product-operation.dto.js';
import { UpdateProductOperationDto } from './dto/update-product-operation.dto.js';

@Injectable()
export class ProductOperationsService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(productId?: string) {
    const where: Prisma.ProductOperationWhereInput = {};

    if (productId !== undefined) {
      if (!isValidUUID(productId)) {
        throw new BadRequestException(
          'Некорректный формат ID продукции',
        );
      }

      const product = await this.prisma.product.findUnique({
        where: { id: productId },
        select: {
          id: true,
        },
      });

      if (!product) {
        throw new NotFoundException(
          `Продукция с ID ${productId} не найдена`,
        );
      }

      where.productId = productId;
    }

    return this.prisma.productOperation.findMany({
      where,
      include: {
        product: {
          select: {
            id: true,
            sku: true,
            name: true,
            isActive: true,
          },
        },
        _count: {
          select: {
            productionOperations: true,
          },
        },
      },
      orderBy: [
        {
          productId: 'asc',
        },
        {
          sequenceNumber: 'asc',
        },
      ],
    });
  }

  async findOne(id: string) {
    if (!isValidUUID(id)) {
      throw new BadRequestException(
        'Некорректный формат ID технологической операции',
      );
    }

    const operation =
      await this.prisma.productOperation.findUnique({
        where: { id },
        include: {
          product: {
            select: {
              id: true,
              sku: true,
              name: true,
              isActive: true,
            },
          },
          _count: {
            select: {
              productionOperations: true,
            },
          },
        },
      });

    if (!operation) {
      throw new NotFoundException(
        `Технологическая операция с ID ${id} не найдена`,
      );
    }

    return operation;
  }

  async create(dto: CreateProductOperationDto) {
    const product = await this.prisma.product.findUnique({
      where: {
        id: dto.productId,
      },
      select: {
        id: true,
        isActive: true,
      },
    });

    if (!product) {
      throw new NotFoundException(
        `Продукция с ID ${dto.productId} не найдена`,
      );
    }

    if (!product.isActive) {
      throw new ConflictException(
        'Нельзя добавлять операции к архивной продукции',
      );
    }

    const name = dto.name.trim();

    if (name.length < 2) {
      throw new BadRequestException(
        'Название операции должно содержать минимум 2 символа',
      );
    }

    try {
      return await this.prisma.productOperation.create({
        data: {
          productId: dto.productId,
          name,
          sequenceNumber: dto.sequenceNumber,
          plannedDurationMinutes:
            dto.plannedDurationMinutes ?? null,
          description: dto.description?.trim() || null,
        },
        include: {
          product: {
            select: {
              id: true,
              sku: true,
              name: true,
            },
          },
        },
      });
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002'
      ) {
        throw new ConflictException(
          'Операция с таким порядковым номером уже существует для этой продукции',
        );
      }

      throw error;
    }
  }

  async update(id: string, dto: UpdateProductOperationDto) {
    await this.findOne(id);

    if (Object.values(dto).every((value) => value === undefined)) {
      throw new BadRequestException(
        'Необходимо передать хотя бы одно поле для изменения',
      );
    }

    const data: Prisma.ProductOperationUpdateInput = {};

    if (dto.name !== undefined) {
      const name = dto.name.trim();

      if (name.length < 2) {
        throw new BadRequestException(
          'Название операции должно содержать минимум 2 символа',
        );
      }

      data.name = name;
    }

    if (dto.sequenceNumber !== undefined) {
      data.sequenceNumber = dto.sequenceNumber;
    }

    if (dto.plannedDurationMinutes !== undefined) {
      data.plannedDurationMinutes =
        dto.plannedDurationMinutes;
    }

    if (dto.description !== undefined) {
      data.description = dto.description?.trim() || null;
    }

    try {
      return await this.prisma.productOperation.update({
        where: { id },
        data,
        include: {
          product: {
            select: {
              id: true,
              sku: true,
              name: true,
            },
          },
        },
      });
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002'
      ) {
        throw new ConflictException(
          'Операция с таким порядковым номером уже существует для этой продукции',
        );
      }

      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2025'
      ) {
        throw new NotFoundException(
          'Технологическая операция не найдена',
        );
      }

      throw error;
    }
  }

  async remove(id: string) {
    const operation = await this.findOne(id);

    if (operation._count.productionOperations > 0) {
      throw new ConflictException(
        'Нельзя удалить операцию, которая уже используется в производственных заказах',
      );
    }

    await this.prisma.productOperation.delete({
      where: { id },
    });

    return {
      message: 'Технологическая операция успешно удалена',
      id,
    };
  }
}