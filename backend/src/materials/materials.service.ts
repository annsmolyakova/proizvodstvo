import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { validate as isValidUUID } from 'uuid';
import { PrismaService } from '../prisma/prisma.service.js';
import { CreateMaterialDto } from './dto/create-material.dto.js';
import { UpdateMaterialDto } from './dto/update-material.dto.js';

@Injectable()
export class MaterialsService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(isActive?: string, search?: string) {
    const where: Prisma.MaterialWhereInput = {};

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

    return this.prisma.material.findMany({
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
        'Некорректный формат ID материала',
      );
    }

    const material = await this.prisma.material.findUnique({
      where: { id },
      include: {
        balances: {
          include: {
            warehouse: true,
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

    if (!material) {
      throw new NotFoundException(
        `Материал с ID ${id} не найден`,
      );
    }

    return material;
  }

  async create(dto: CreateMaterialDto) {
    const sku = dto.sku.trim();
    const name = dto.name.trim();
    const unit = dto.unit.trim();

    if (sku.length < 2) {
      throw new BadRequestException(
        'Код материала должен содержать минимум 2 символа',
      );
    }

    if (name.length < 2) {
      throw new BadRequestException(
        'Название материала должно содержать минимум 2 символа',
      );
    }

    if (unit.length < 1) {
      throw new BadRequestException(
        'Необходимо указать единицу измерения',
      );
    }

    try {
      return await this.prisma.material.create({
        data: {
          sku,
          name,
          unit,
          description: dto.description?.trim() || null,
          minimumStock: dto.minimumStock ?? 0,
        },
      });
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002'
      ) {
        throw new ConflictException(
          'Материал с таким кодом уже существует',
        );
      }

      throw error;
    }
  }

  async update(id: string, dto: UpdateMaterialDto) {
    const material = await this.findOne(id);

    if (!material.isActive) {
      throw new ConflictException(
        'Нельзя изменить архивированный материал',
      );
    }

    if (Object.values(dto).every((value) => value === undefined)) {
      throw new BadRequestException(
        'Необходимо передать хотя бы одно поле для изменения',
      );
    }

    const data: Prisma.MaterialUpdateInput = {};

    if (dto.sku !== undefined) {
      const sku = dto.sku.trim();

      if (sku.length < 2) {
        throw new BadRequestException(
          'Код материала должен содержать минимум 2 символа',
        );
      }

      data.sku = sku;
    }

    if (dto.name !== undefined) {
      const name = dto.name.trim();

      if (name.length < 2) {
        throw new BadRequestException(
          'Название материала должно содержать минимум 2 символа',
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

    if (dto.minimumStock !== undefined) {
      data.minimumStock = new Prisma.Decimal(dto.minimumStock);
    }

    try {
      return await this.prisma.material.update({
        where: { id },
        data,
      });
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002'
      ) {
        throw new ConflictException(
          'Материал с таким кодом уже существует',
        );
      }

      throw error;
    }
  }

  async remove(id: string) {
    const material = await this.findOne(id);

    if (!material.isActive) {
      throw new ConflictException(
        'Материал уже архивирован',
      );
    }

    return this.prisma.material.update({
      where: { id },
      data: {
        isActive: false,
      },
    });
  }
}