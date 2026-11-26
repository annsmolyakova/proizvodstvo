import { Module } from '@nestjs/common';
import { createObserveModule } from '@nestjs/observe';
import { AppController } from './app.controller.js';
import { AppService } from './app.service.js';
import { PrismaModule } from './prisma/prisma.module.js';
import { DepartmentsModule } from './departments/departments.module.js';
import { EmployeesModule } from './employees/employees.module.js';
import { EquipmentModule } from './equipment/equipment.module.js';
import { WarehousesModule } from './warehouses/warehouses.module.js';
import { MaterialsModule } from './materials/materials.module.js';

export const { ObserveModule, ObserveInstrument } = createObserveModule();

@Module({
  imports: [
    ObserveModule.forRoot({
      appKey: process.env.OBSERVE_APP_KEY ?? 'YOUR_APP_KEY',
      appSecret: process.env.OBSERVE_APP_SECRET ?? 'YOUR_APP_SECRET',
      serviceId: 'backend',
    }),
    PrismaModule,
    DepartmentsModule,
    EmployeesModule,
    EquipmentModule,
    WarehousesModule,
    MaterialsModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}