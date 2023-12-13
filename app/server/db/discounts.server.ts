import { DiscountCodeStatus } from '@prisma/client';

import { db } from '~/server/db.server';
import type { DiscountCode, DiscountCodeInput } from '~/types';

import Id from '../utils/Id.server';

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

async function upsertDiscountCode(data: DiscountCodeInput) {
  const now = new Date();

  return await db.discountCode.upsert({
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
  return await db.discountCode.update({
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
  return await db.discountCode.findUnique({
    where: { code_organizerId: { code, organizerId } }
  });
}

async function findDiscountCodeById(id: string): Promise<DiscountCode | null> {
  return await db.discountCode.findUnique({
    where: { id }
  });
}

async function deleteDiscountCode(id: string) {
  return await db.discountCode.update({
    where: { id },
    data: {
      status: DiscountCodeStatus.deleted
    }
  });
}

async function disableDiscountCode(id: string) {
  return await db.discountCode.update({
    where: { id },
    data: {
      status: DiscountCodeStatus.disabled
    }
  });
}

async function enableDiscountCode(id: string) {
  return await db.discountCode.update({
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
