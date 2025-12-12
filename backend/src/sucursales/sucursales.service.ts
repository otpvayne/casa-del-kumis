import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../infra/db/prisma.service';
import { CreateSucursalDto } from './dto/create-sucursal.dto';
import { UpdateSucursalDto } from './dto/update-sucursal.dto';
import { sucursales } from '@prisma/client';

type SucursalSafe = Omit<sucursales, 'id'> & { id: string };

@Injectable()
export class SucursalesService {
  constructor(private readonly prisma: PrismaService) {}

  private toSafe(s: sucursales): SucursalSafe {
    return {
      ...s,
      id: s.id.toString(), // ✅ evita BigInt serialization en JSON
    };
  }

  async findAll(): Promise<SucursalSafe[]> {
    const rows = await this.prisma.sucursales.findMany({
      orderBy: { created_at: 'desc' },
    });
    return rows.map((s) => this.toSafe(s));
  }

  async findOne(id: string): Promise<SucursalSafe> {
    const row = await this.prisma.sucursales.findUnique({
      where: { id: BigInt(id) },
    });
    if (!row) throw new NotFoundException('Sucursal no encontrada');
    return this.toSafe(row);
  }

  async create(dto: CreateSucursalDto): Promise<SucursalSafe> {
    const codigoComercio = dto.codigo_comercio_redeban.trim();
    const codigoBanco = dto.codigo_referencia_banco.trim();

    // Validaciones de unicidad (para devolver error claro antes de que explote en DB)
    const existsComercio = await this.prisma.sucursales.findUnique({
      where: { codigo_comercio_redeban: codigoComercio },
    });
    if (existsComercio) {
      throw new ConflictException('Ya existe una sucursal con ese código de comercio REDEBAN');
    }

    const existsBanco = await this.prisma.sucursales.findUnique({
      where: { codigo_referencia_banco: codigoBanco },
    });
    if (existsBanco) {
      throw new ConflictException('Ya existe una sucursal con ese código de referencia de banco');
    }

    const created = await this.prisma.sucursales.create({
      data: {
        nombre: dto.nombre.trim(),
        codigo_comercio_redeban: codigoComercio,
        codigo_referencia_banco: codigoBanco,
        direccion: dto.direccion?.trim(),
        estado: dto.estado ?? 'ACTIVO', // ✅ por defecto ACTIVO
      },
    });

    return this.toSafe(created);
  }

  async update(id: string, dto: UpdateSucursalDto): Promise<SucursalSafe> {
    const current = await this.prisma.sucursales.findUnique({
      where: { id: BigInt(id) },
    });
    if (!current) throw new NotFoundException('Sucursal no encontrada');

    // Si cambian códigos, verificar unicidad
    if (dto.codigo_comercio_redeban && dto.codigo_comercio_redeban !== current.codigo_comercio_redeban) {
      const exists = await this.prisma.sucursales.findUnique({
        where: { codigo_comercio_redeban: dto.codigo_comercio_redeban.trim() },
      });
      if (exists) throw new ConflictException('Ese código REDEBAN ya está en uso');
    }

    if (dto.codigo_referencia_banco && dto.codigo_referencia_banco !== current.codigo_referencia_banco) {
      const exists = await this.prisma.sucursales.findUnique({
        where: { codigo_referencia_banco: dto.codigo_referencia_banco.trim() },
      });
      if (exists) throw new ConflictException('Ese código de banco ya está en uso');
    }

    const updated = await this.prisma.sucursales.update({
      where: { id: BigInt(id) },
      data: {
        nombre: dto.nombre?.trim(),
        codigo_comercio_redeban: dto.codigo_comercio_redeban?.trim(),
        codigo_referencia_banco: dto.codigo_referencia_banco?.trim(),
        direccion: dto.direccion?.trim(),
        estado: dto.estado,
      },
    });

    return this.toSafe(updated);
  }

  async deactivate(id: string): Promise<SucursalSafe> {
    const current = await this.prisma.sucursales.findUnique({
      where: { id: BigInt(id) },
    });
    if (!current) throw new NotFoundException('Sucursal no encontrada');

    const updated = await this.prisma.sucursales.update({
      where: { id: BigInt(id) },
      data: { estado: 'INACTIVO' },
    });

    return this.toSafe(updated);
  }
}
