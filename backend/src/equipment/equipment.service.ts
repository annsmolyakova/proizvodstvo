import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import { EquipmentStatus, Prisma } from '@prisma/client';
import { validate as isValidUUID } from 'uuid';
import { PrismaService } from '../prisma/prisma.service.js';
import { CreateEquipmentDto } from './dto/create-equipment.dto.js';
import { UpdateEquipmentDto } from './dto/update-equipment.dto.js';

@Injectable()
export class EquipmentService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(departmentId?: string, status?: string) {
    const where: Prisma.EquipmentWhereInput = {};

    if (departmentId !== undefined) {
      if (!isValidUUID(departmentId)) {
        throw new BadRequestException(
          'Некорректный формат ID подразделения',
        );
      }

      where.departmentId = departmentId;
    }

    if (status !== undefined) {
      if (
        !Object.values(EquipmentStatus).includes(
          status as EquipmentStatus,
        )
      ) {
        throw new BadRequestException(
          'Указан недопустимый статус оборудования',
        );
      }

      where.status = status as EquipmentStatus;
    }

    return this.prisma.equipment.findMany({
      where,
      include: {
        department: true,
        _count: {
          select: {
            productionOperations: true,
            maintenance: true,
          },
        },
      },
      orderBy: {
        inventoryNumber: 'asc',
      },
    });
  }

  async findOne(id: string) {
    if (!isValidUUID(id)) {
      throw new BadRequestException(
        'Некорректный формат ID оборудования',
      );
    }

    const equipment = await this.prisma.equipment.findUnique({
      where: { id },
      include: {
        department: true,
        maintenance: {
          orderBy: {
            scheduledAt: 'desc',
          },
        },
        _count: {
          select: {
            productionOperations: true,
            maintenance: true,
          },
        },
      },
    });

    if (!equipment) {
      throw new NotFoundException(
        `Оборудование с ID ${id} не найдено`,
      );
    }

    return equipment;
  }

  private async validateDepartment(departmentId: string) {
    const department = await this.prisma.department.findUnique({
      where: { id: departmentId },
    });

    if (!department) {
      throw new NotFoundException(
        'Подразделение для оборудования не найдено',
      );
    }

    if (!department.isActive) {
      throw new BadRequestException(
        'Нельзя привязать оборудование к неактивному подразделению',
      );
    }
  }

  private async validateDecommissioning(
    id: string,
    status: EquipmentStatus,
  ) {
    if (status !== EquipmentStatus.DECOMMISSIONED) {
      return;
    }

    const activeOperation =
      await this.prisma.productionOperation.findFirst({
        where: {
          equipmentId: id,
          status: 'IN_PROGRESS',
        },
      });

    if (activeOperation) {
      throw new ConflictException(
        'Нельзя вывести оборудование из эксплуатации: на нём выполняется производственная операция',
      );
    }
  }

  async create(dto: CreateEquipmentDto) {
    const inventoryNumber = dto.inventoryNumber.trim();
    const name = dto.name.trim();
    const type = dto.type.trim();

    if (inventoryNumber.length < 2) {
      throw new BadRequestException(
        'Инвентарный номер должен содержать минимум 2 символа',
      );
    }

    if (name.length < 2) {
      throw new BadRequestException(
        'Название оборудования должно содержать минимум 2 символа',
      );
    }

    if (type.length < 2) {
      throw new BadRequestException(
        'Тип оборудования должен содержать минимум 2 символа',
      );
    }

    await this.validateDepartment(dto.departmentId);

    const status = dto.status ?? EquipmentStatus.AVAILABLE;

    if (status === EquipmentStatus.DECOMMISSIONED) {
      throw new BadRequestException(
        'Нельзя создать оборудование сразу в статусе «выведено из эксплуатации»',
      );
    }

    try {
      return await this.prisma.equipment.create({
        data: {
          inventoryNumber,
          name,
          type,
          departmentId: dto.departmentId,
          status,
          commissionedAt:
            dto.commissionedAt === undefined ||
            dto.commissionedAt === null
              ? null
              : new Date(dto.commissionedAt),
        },
        include: {
          department: true,
        },
      });
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002'
      ) {
        throw new ConflictException(
          'Оборудование с таким инвентарным номером уже существует',
        );
      }

      throw error;
    }
  }

  async update(id: string, dto: UpdateEquipmentDto) {
    const equipment = await this.findOne(id);

    if (Object.values(dto).every((value) => value === undefined)) {
      throw new BadRequestException(
        'Необходимо передать хотя бы одно поле для изменения',
      );
    }

    if (
      equipment.status === EquipmentStatus.DECOMMISSIONED &&
      dto.status !== undefined &&
      dto.status !== EquipmentStatus.DECOMMISSIONED
    ) {
      throw new ConflictException(
        'Нельзя изменить статус оборудования, выведенного из эксплуатации',
      );
    }

    const data: Prisma.EquipmentUncheckedUpdateInput = {};

    if (dto.inventoryNumber !== undefined) {
      const inventoryNumber = dto.inventoryNumber.trim();

      if (inventoryNumber.length < 2) {
        throw new BadRequestException(
          'Инвентарный номер должен содержать минимум 2 символа',
        );
      }

      data.inventoryNumber = inventoryNumber;
    }

    if (dto.name !== undefined) {
      const name = dto.name.trim();

      if (name.length < 2) {
        throw new BadRequestException(
          'Название оборудования должно содержать минимум 2 символа',
        );
      }

      data.name = name;
    }

    if (dto.type !== undefined) {
      const type = dto.type.trim();

      if (type.length < 2) {
        throw new BadRequestException(
          'Тип оборудования должен содержать минимум 2 символа',
        );
      }

      data.type = type;
    }

    if (dto.departmentId !== undefined) {
      await this.validateDepartment(dto.departmentId);
      data.departmentId = dto.departmentId;
    }

    if (dto.status !== undefined) {
      await this.validateDecommissioning(id, dto.status);
      data.status = dto.status;
    }

    if (dto.commissionedAt !== undefined) {
      data.commissionedAt =
        dto.commissionedAt === null
          ? null
          : new Date(dto.commissionedAt);
    }

    try {
      return await this.prisma.equipment.update({
        where: { id },
        data,
        include: {
          department: true,
        },
      });
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002'
      ) {
        throw new ConflictException(
          'Оборудование с таким инвентарным номером уже существует',
        );
      }

      throw error;
    }
  }

  async remove(id: string) {
    const equipment = await this.findOne(id);

    if (equipment.status === EquipmentStatus.DECOMMISSIONED) {
      throw new ConflictException(
        'Оборудование уже выведено из эксплуатации',
      );
    }

    await this.validateDecommissioning(
      id,
      EquipmentStatus.DECOMMISSIONED,
    );

    return this.prisma.equipment.update({
      where: { id },
      data: {
        status: EquipmentStatus.DECOMMISSIONED,
      },
      include: {
        department: true,
      },
    });
  }
}