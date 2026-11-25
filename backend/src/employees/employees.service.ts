
import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { validate as isValidUUID } from 'uuid';
import { PrismaService } from '../prisma/prisma.service.js';
import { CreateEmployeeDto } from './dto/create-employee.dto.js';
import { UpdateEmployeeDto } from './dto/update-employee.dto.js';

@Injectable()
export class EmployeesService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(departmentId?: string, isActive?: string) {
    const where: Prisma.EmployeeWhereInput = {};

    if (departmentId !== undefined) {
      if (!isValidUUID(departmentId)) {
        throw new BadRequestException(
          'Некорректный формат ID подразделения',
        );
      }

      where.departmentId = departmentId;
    }

    if (isActive !== undefined) {
      if (isActive !== 'true' && isActive !== 'false') {
        throw new BadRequestException(
          'Параметр isActive должен иметь значение true или false',
        );
      }

      where.isActive = isActive === 'true';
    }

    return this.prisma.employee.findMany({
      where,
      include: {
        department: true,
        user: {
          select: {
            id: true,
            email: true,
            fullName: true,
            isActive: true,
          },
        },
      },
      orderBy: {
        fullName: 'asc',
      },
    });
  }

  async findOne(id: string) {
    if (!isValidUUID(id)) {
      throw new BadRequestException(
        'Некорректный формат ID сотрудника',
      );
    }

    const employee = await this.prisma.employee.findUnique({
      where: { id },
      include: {
        department: true,
        user: {
          select: {
            id: true,
            email: true,
            fullName: true,
            isActive: true,
          },
        },
      },
    });

    if (!employee) {
      throw new NotFoundException(
        `Сотрудник с ID ${id} не найден`,
      );
    }

    return employee;
  }

  private async validateDepartment(departmentId: string) {
    const department = await this.prisma.department.findUnique({
      where: { id: departmentId },
    });

    if (!department) {
      throw new NotFoundException(
        'Подразделение, указанное для сотрудника, не найдено',
      );
    }

    if (!department.isActive) {
      throw new BadRequestException(
        'Нельзя назначить сотрудника в неактивное подразделение',
      );
    }
  }

  private async validateUser(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new NotFoundException(
        'Указанная учётная запись не найдена',
      );
    }

    if (!user.isActive) {
      throw new BadRequestException(
        'Нельзя привязать неактивную учётную запись',
      );
    }
  }

  async create(dto: CreateEmployeeDto) {
    const personnelNumber = dto.personnelNumber.trim();
    const fullName = dto.fullName.trim();
    const position = dto.position.trim();

    if (personnelNumber.length < 2) {
      throw new BadRequestException(
        'Табельный номер должен содержать минимум 2 символа',
      );
    }

    if (fullName.length < 2) {
      throw new BadRequestException(
        'ФИО должно содержать минимум 2 символа',
      );
    }

    if (position.length < 2) {
      throw new BadRequestException(
        'Название должности должно содержать минимум 2 символа',
      );
    }

    await this.validateDepartment(dto.departmentId);

    if (dto.userId) {
      await this.validateUser(dto.userId);
    }

    try {
      return await this.prisma.employee.create({
        data: {
          personnelNumber,
          fullName,
          position,
          departmentId: dto.departmentId,
          userId: dto.userId,
          isActive: dto.isActive,
        },
        include: {
          department: true,
          user: {
            select: {
              id: true,
              email: true,
              fullName: true,
              isActive: true,
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
          'Сотрудник с таким табельным номером или привязанной учётной записью уже существует',
        );
      }

      throw error;
    }
  }

  async update(id: string, dto: UpdateEmployeeDto) {
    await this.findOne(id);

    if (Object.values(dto).every((value) => value === undefined)) {
      throw new BadRequestException(
        'Необходимо передать хотя бы одно поле для изменения',
      );
    }

    const data: Prisma.EmployeeUncheckedUpdateInput = {};

    if (dto.personnelNumber !== undefined) {
      const personnelNumber = dto.personnelNumber.trim();

      if (personnelNumber.length < 2) {
        throw new BadRequestException(
          'Табельный номер должен содержать минимум 2 символа',
        );
      }

      data.personnelNumber = personnelNumber;
    }

    if (dto.fullName !== undefined) {
      const fullName = dto.fullName.trim();

      if (fullName.length < 2) {
        throw new BadRequestException(
          'ФИО должно содержать минимум 2 символа',
        );
      }

      data.fullName = fullName;
    }

    if (dto.position !== undefined) {
      const position = dto.position.trim();

      if (position.length < 2) {
        throw new BadRequestException(
          'Название должности должно содержать минимум 2 символа',
        );
      }

      data.position = position;
    }

    if (dto.departmentId !== undefined) {
      await this.validateDepartment(dto.departmentId);
      data.departmentId = dto.departmentId;
    }

    if (dto.userId !== undefined) {
      if (dto.userId !== null) {
        await this.validateUser(dto.userId);
      }

      data.userId = dto.userId;
    }

    if (dto.isActive !== undefined) {
      data.isActive = dto.isActive;
    }

    try {
      return await this.prisma.employee.update({
        where: { id },
        data,
        include: {
          department: true,
          user: {
            select: {
              id: true,
              email: true,
              fullName: true,
              isActive: true,
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
          'Сотрудник с таким табельным номером или привязанной учётной записью уже существует',
        );
      }

      throw error;
    }
  }

  async remove(id: string) {
    const employee = await this.findOne(id);

    if (!employee.isActive) {
      throw new ConflictException(
        'Сотрудник уже находится в архиве',
      );
    }

    return this.prisma.employee.update({
      where: { id },
      data: {
        isActive: false,
      },
      include: {
        department: true,
      },
    });
  }
}
