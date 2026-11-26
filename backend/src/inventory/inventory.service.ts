
import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InventoryTransactionType, Prisma } from '@prisma/client';
import { validate as isValidUUID } from 'uuid';
import { PrismaService } from '../prisma/prisma.service.js';
import { CreateInventoryTransactionDto } from './dto/create-inventory-transaction.dto.js';

@Injectable()
export class InventoryService {
  constructor(private readonly prisma: PrismaService) {}

  async findBalances(warehouseId?: string, materialId?: string) {
    this.validateOptionalUUID(warehouseId, 'warehouseId');
    this.validateOptionalUUID(materialId, 'materialId');

    return this.prisma.inventoryBalance.findMany({
      where: {
        ...(warehouseId ? { warehouseId } : {}),
        ...(materialId ? { materialId } : {}),
      },
      include: {
        warehouse: true,
        material: true,
      },
      orderBy: {
        material: {
          name: 'asc',
        },
      },
    });
  }

  async findTransactions(
    warehouseId?: string,
    materialId?: string,
    transactionType?: string,
  ) {
    this.validateOptionalUUID(warehouseId, 'warehouseId');
    this.validateOptionalUUID(materialId, 'materialId');

    if (
      transactionType &&
      !Object.values(InventoryTransactionType).includes(
        transactionType as InventoryTransactionType,
      )
    ) {
      throw new BadRequestException('Invalid transaction type');
    }

    return this.prisma.inventoryTransaction.findMany({
      where: {
        ...(warehouseId ? { warehouseId } : {}),
        ...(materialId ? { materialId } : {}),
        ...(transactionType
          ? {
              transactionType:
                transactionType as InventoryTransactionType,
            }
          : {}),
      },
      include: {
        warehouse: true,
        material: true,
        user: true,
        productionOrder: true,
      },
      orderBy: {
        createdAt: 'desc',
      },
    });
  }

  async createTransaction(dto: CreateInventoryTransactionDto) {
    const amount = new Prisma.Decimal(dto.quantity);

    if (
      dto.transactionType !== InventoryTransactionType.ADJUSTMENT &&
      amount.lte(0)
    ) {
      throw new BadRequestException(
        'Quantity must be positive for this transaction type',
      );
    }

    for (let attempt = 1; attempt <= 3; attempt++) {
      try {
        return await this.prisma.$transaction(
          async (tx) => {
            const warehouse = await tx.warehouse.findUnique({
              where: { id: dto.warehouseId },
            });

            if (!warehouse || !warehouse.isActive) {
              throw new NotFoundException(
                'Active warehouse not found',
              );
            }

            const material = await tx.material.findUnique({
              where: { id: dto.materialId },
            });

            if (!material || !material.isActive) {
              throw new NotFoundException(
                'Active material not found',
              );
            }

            const user = await tx.user.findUnique({
              where: { id: dto.userId },
              include: {
                roles: true,
              },
            });

            if (!user || !user.isActive) {
              throw new ForbiddenException(
                'Active user not found',
              );
            }

            const hasPermission = user.roles.some(
              (role) =>
                role.roleName === 'STOREKEEPER' ||
                role.roleName === 'ADMIN',
            );

            if (!hasPermission) {
              throw new ForbiddenException(
                'User does not have permission to manage inventory',
              );
            }

            if (dto.productionOrderId) {
              const order = await tx.productionOrder.findUnique({
                where: {
                  id: dto.productionOrderId,
                },
              });

              if (!order) {
                throw new NotFoundException(
                  'Production order not found',
                );
              }
            }

            // Создаём запись остатка, если её ещё нет.
            const balanceReference = await tx.inventoryBalance.upsert({
              where: {
                warehouseId_materialId: {
                  warehouseId: dto.warehouseId,
                  materialId: dto.materialId,
                },
              },
              create: {
                warehouseId: dto.warehouseId,
                materialId: dto.materialId,
                quantity: new Prisma.Decimal(0),
                reservedQuantity: new Prisma.Decimal(0),
              },
              update: {},
            });

            // Блокируем строку остатка до завершения транзакции.
            const lockedBalances = await tx.$queryRaw<
              Array<{ id: string }>
            >(
              Prisma.sql`
                SELECT "id"
                FROM "inventory_balances"
                WHERE "id" = ${balanceReference.id}::uuid
                FOR UPDATE
              `,
            );

            if (lockedBalances.length === 0) {
              throw new ConflictException(
                'Unable to lock inventory balance',
              );
            }

            // Получаем актуальный остаток после блокировки строки.
            const balance = await tx.inventoryBalance.findUnique({
              where: {
                id: balanceReference.id,
              },
            });

            if (!balance) {
              throw new ConflictException(
                'Unable to obtain inventory balance',
              );
            }

            let newQuantity = new Prisma.Decimal(balance.quantity);
            let newReservedQuantity = new Prisma.Decimal(
              balance.reservedQuantity,
            );

            const availableQuantity = newQuantity.minus(
              newReservedQuantity,
            );

            switch (dto.transactionType) {
              case InventoryTransactionType.RECEIPT:
                newQuantity = newQuantity.plus(amount);
                break;

              case InventoryTransactionType.ISSUE:
                if (availableQuantity.lt(amount)) {
                  throw new BadRequestException(
                    'Insufficient available inventory quantity',
                  );
                }

                newQuantity = newQuantity.minus(amount);
                break;

              case InventoryTransactionType.RESERVATION:
                if (availableQuantity.lt(amount)) {
                  throw new BadRequestException(
                    'Insufficient available quantity for reservation',
                  );
                }

                newReservedQuantity =
                  newReservedQuantity.plus(amount);
                break;

              case InventoryTransactionType.RELEASE:
                if (newReservedQuantity.lt(amount)) {
                  throw new BadRequestException(
                    'Release quantity exceeds reserved quantity',
                  );
                }

                newReservedQuantity =
                  newReservedQuantity.minus(amount);
                break;

              case InventoryTransactionType.ADJUSTMENT:
                newQuantity = newQuantity.plus(amount);

                if (newQuantity.lt(newReservedQuantity)) {
                  throw new BadRequestException(
                    'Adjustment cannot reduce stock below reserved quantity',
                  );
                }
                break;

              default:
                throw new BadRequestException(
                  'Unsupported transaction type',
                );
            }

            // Сохраняем обновлённый остаток.
            await tx.inventoryBalance.update({
              where: {
                id: balance.id,
              },
              data: {
                quantity: newQuantity,
                reservedQuantity: newReservedQuantity,
              },
            });

            // Регистрируем операцию в журнале.
            return tx.inventoryTransaction.create({
              data: {
                warehouseId: dto.warehouseId,
                materialId: dto.materialId,
                transactionType: dto.transactionType,
                quantity: amount,
                productionOrderId: dto.productionOrderId,
                userId: dto.userId,
                comment: dto.comment,
              },
              include: {
                warehouse: true,
                material: true,
                user: true,
                productionOrder: true,
              },
            });
          },
          {
            isolationLevel:
              Prisma.TransactionIsolationLevel.Serializable,
          },
        );
      } catch (error) {
        const isPrismaError =
          error instanceof Prisma.PrismaClientKnownRequestError;

        const isSerializationConflict =
          isPrismaError &&
          (
            error.code === 'P2034' ||
            (
              error.code === 'P2010' &&
              error.meta?.code === '40001'
            )
          );

        if (isSerializationConflict) {
          if (attempt < 3) {
            continue;
          }

          throw new ConflictException(
            'Inventory balance was changed by another transaction. Please try again.',
          );
        }

        throw error;
      }
    }

    throw new ConflictException(
      'Inventory transaction could not be completed. Please try again.',
    );
  }

  private validateOptionalUUID(
    value: string | undefined,
    fieldName: string,
  ) {
    if (value && !isValidUUID(value)) {
      throw new BadRequestException(
        `${fieldName} must be a valid UUID`,
      );
    }
  }
}
