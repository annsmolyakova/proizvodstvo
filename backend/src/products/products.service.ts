import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { validate as isValidUUID } from 'uuid';
import { PrismaService } from '../prisma/prisma.service.js';
import { CreateProductDto } from './dto/create-product.dto.js';
import { UpdateProductDto } from './dto/update-product.dto.js';

@Injectable()
export class ProductsService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(isActive?: string, search?: string) {
    const where: Prisma.ProductWhereInput = {};

    if (isActive !== undefined) {
      if (isActive !== 'true' && isActive !== 'false') {
        throw new BadRequestException(
          'Параметр isActive должен иметь значение true или false',
        );
      }

      where.isActive = isActive === 'true';
    }

    if (search !== undefined && search.trim().length > 0) {
      const searchValue = search.trim();

      where.OR = [
        {
          sku: {
            contains: searchValue,
            mode: 'insensitive',
          },
        },
        {
          name: {
            contains: searchValue,
            mode: 'insensitive',
          },
        },
      ];
    }

    return this.prisma.product.findMany({
      where,
      include: {
        _count: {
          select: {
            operations: true,
            orders: true,
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
        'Некорректный формат ID продукции',
      );
    }

    const product = await this.prisma.product.findUnique({
      where: { id },
      include: {
        operations: {
          orderBy: {
            sequenceNumber: 'asc',
          },
        },
        _count: {
          select: {
            operations: true,
            orders: true,
          },
        },
      },
    });

    if (!product) {
      throw new NotFoundException(
        `Продукция с ID ${id} не найдена`,
      );
    }

    return product;
  }

  async create(dto: CreateProductDto) {
    const sku = dto.sku.trim();
    const name = dto.name.trim();
    const unit = dto.unit.trim();

    if (sku.length < 2) {
      throw new BadRequestException(
        'Код продукции должен содержать минимум 2 символа',
      );
    }

    if (name.length < 2) {
      throw new BadRequestException(
        'Название продукции должно содержать минимум 2 символа',
      );
    }

    if (unit.length < 1) {
      throw new BadRequestException(
        'Необходимо указать единицу измерения',
      );
    }

    try {
      return await this.prisma.product.create({
        data: {
          sku,
          name,
          unit,
          description: dto.description?.trim() || null,
          category: dto.category?.trim() || null,
        },
      });
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002'
      ) {
        throw new ConflictException(
          'Продукция с таким кодом уже существует',
        );
      }

      throw error;
    }
  }

  async update(id: string, dto: UpdateProductDto) {
    const product = await this.findOne(id);

    if (!product.isActive) {
      throw new ConflictException(
        'Нельзя изменять архивную продукцию',
      );
    }

    if (Object.values(dto).every((value) => value === undefined)) {
      throw new BadRequestException(
        'Необходимо передать хотя бы одно поле для изменения',
      );
    }

    const data: Prisma.ProductUpdateInput = {};

    if (dto.sku !== undefined) {
      const sku = dto.sku.trim();

      if (sku.length < 2) {
        throw new BadRequestException(
          'Код продукции должен содержать минимум 2 символа',
        );
      }

      data.sku = sku;
    }

    if (dto.name !== undefined) {
      const name = dto.name.trim();

      if (name.length < 2) {
        throw new BadRequestException(
          'Название продукции должно содержать минимум 2 символа',
        );
      }

      data.name = name;
    }

    if (dto.unit !== undefined) {
      const unit = dto.unit.trim();

      if (unit.length < 1) {
        throw new BadRequestException(
          'Необходимо указать единицу измерения',
        );
      }

      data.unit = unit;
    }

    if (dto.description !== undefined) {
      data.description = dto.description?.trim() || null;
    }

    if (dto.category !== undefined) {
      data.category = dto.category?.trim() || null;
    }

    try {
      return await this.prisma.product.update({
        where: { id },
        data,
      });
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002'
      ) {
        throw new ConflictException(
          'Продукция с таким кодом уже существует',
        );
      }

      throw error;
    }
  }

  async remove(id: string) {
    const product = await this.findOne(id);

    if (!product.isActive) {
      throw new ConflictException(
        'Продукция уже находится в архиве',
      );
    }

    if (product._count.orders > 0) {
      throw new ConflictException(
        'Нельзя архивировать продукцию, по которой уже созданы производственные заказы',
      );
    }

    return this.prisma.product.update({
      where: { id },
      data: {
        isActive: false,
      },
    });
  }
}