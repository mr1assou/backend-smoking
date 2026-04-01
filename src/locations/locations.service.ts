import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class LocationsService {
  constructor(private prisma: PrismaService) {}

  async findAll() {
    return this.prisma.location.findMany({
      include: { children: true },
    });
  }

  async findOne(id: string) {
    return this.prisma.location.findUnique({
      where: { id },
      include: { children: true, parent: true },
    });
  }
}
