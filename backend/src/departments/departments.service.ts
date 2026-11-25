import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { validate as isValidUUID } from 'uuid';
import { PrismaService } from '../prisma/prisma.service.js';
import { CreateDepartmentDto } from './dto/create-department.dto.js';
import { UpdateDepartmentDto } from './dto/update-department.dto.js';

@Injectable()
export class DepartmentsService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll() {
    return this.prisma.department.findMany({
      orderBy: {
        name: 'asc',
      },
    });
  }

  async findOne(id: string) {
    if (!isValidUUID(id)) {
      throw new BadRequestException(
        'Некорректный формат ID подразделения',
      );
    }

    const department = await this.prisma.department.findUnique({
      where: { id },
    });

    if (!department) {
      throw new NotFoundException(
        `Подразделение с ID ${id} не найдено`,
      );
    }

    return department;
  }

  async create(dto: CreateDepartmentDto) {
    const name = dto.name.trim();

    if (name.length < 2) {
      throw new BadRequestException(
        'Название подразделения должно содержать минимум 2 символа',
      );
    }

    if (dto.managerEmployeeId) {
      const employee = await this.prisma.employee.findUnique({
        where: {
          id: dto.managerEmployeeId,
        },
      });

      if (!employee) {
        throw new NotFoundException(
          'Сотрудник, указанный руководителем подразделения, не найден',
        );
      }
    }

    try {
      return await this.prisma.department.create({
        data: {
          name,
          description: dto.description?.trim(),
          managerEmployeeId: dto.managerEmployeeId,
          isActive: dto.isActive,
        },
      });
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002'
      ) {
        throw new ConflictException(
          'Подразделение с таким названием уже существует',
        );
      }

      throw error;
    }
  }

  async update(id: string, dto: UpdateDepartmentDto) {
    await this.findOne(id);

    if (Object.values(dto).every((value) => value === undefined)) {
      throw new BadRequestException(
        'Необходимо передать хотя бы одно поле для изменения',
      );
    }

    const data: Prisma.DepartmentUncheckedUpdateInput = {};

    if (dto.name !== undefined) {
      const name = dto.name.trim();

      if (name.length < 2) {
        throw new BadRequestException(
          'Название подразделения должно содержать минимум 2 символа',
        );
      }

      data.name = name;
    }

    if (dto.description !== undefined) {
      data.description =
        dto.description === null ? null : dto.description.trim();
    }

    if (dto.managerEmployeeId !== undefined) {
      if (dto.managerEmployeeId !== null) {
        const employee = await this.prisma.employee.findUnique({
          where: {
            id: dto.managerEmployeeId,
          },
        });

        if (!employee) {
          throw new NotFoundException(
            'Сотрудник, указанный руководителем подразделения, не найден',
          );
        }
      }

      data.managerEmployeeId = dto.managerEmployeeId;
    }

    if (dto.isActive !== undefined) {
      data.isActive = dto.isActive;
    }

    try {
      return await this.prisma.department.update({
        where: { id },
        data,
      });
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002'
      ) {
        throw new ConflictException(
          'Подразделение с таким названием уже существует',
        );
      }

      throw error;
    }
  }
}