import type { DiscountCode } from '@prisma/client';
import { DiscountCodeStatus, Prisma } from '@prisma/client';

import { db } from '~/server/db.server';

import Id from '../utils/Id.server';

import DiscountCodeUncheckedCreateInput = Prisma.DiscountCodeUncheckedCreateInput;

async function findDiscountCodesForOrganizer(organizerId: string) {
  return db.discountCode.findMany({
    where: {
      organizerId,
      status: { not: DiscountCodeStatus.deleted }
    },
    orderBy: {
      createdAt: 'desc'
    }
  });
}

async function upsertDiscountCode(data: DiscountCodeUncheckedCreateInput) {
  const now = new Date();

  return db.discountCode.upsert({
    where: {
      code_organizerId: { code: data.code, organizerId: data.organizerId }
    },
    update: {
      code: data.code,
      value: data.value * 1000,
      fixed: data.fixed,
      status: DiscountCodeStatus.active
    },
    create: {
      id: Id(),
      code: data.code,
      value: data.value * 1000,
      fixed: data.fixed,
      organizerId: data.organizerId,
      createdById: data.createdById,
      createdAt: now,
      updatedAt: now
    }
  });
}

async function updateDiscountCode(
  id: string,
  code: string,
  value: number,
  fixed: boolean
) {
  return db.discountCode.update({
    where: {
      id
    },
    data: {
      code,
      value: value * 1000,
      fixed
    }
  });
}

async function findDiscountCode(
  code: string,
  organizerId: string
): Promise<DiscountCode | null> {
  return db.discountCode.findUnique({
    where: { code_organizerId: { code, organizerId } }
  });
}

async function findDiscountCodeById(id: string): Promise<DiscountCode | null> {
  return db.discountCode.findUnique({
    where: { id }
  });
}

async function deleteDiscountCode(id: string) {
  return db.discountCode.update({
    where: { id },
    data: {
      status: DiscountCodeStatus.deleted
    }
  });
}

async function disableDiscountCode(id: string) {
  return db.discountCode.update({
    where: { id },
    data: {
      status: DiscountCodeStatus.disabled
    }
  });
}

async function enableDiscountCode(id: string) {
  return db.discountCode.update({
    where: { id },
    data: {
      status: DiscountCodeStatus.active
    }
  });
}

export {
  findDiscountCodesForOrganizer,
  upsertDiscountCode,
  findDiscountCodeById,
  deleteDiscountCode,
  disableDiscountCode,
  findDiscountCode,
  updateDiscountCode,
  enableDiscountCode
};
