import { db } from '~/server/db.server';

async function addEmailToMailingList(
  email: string,
  organizerId: string
): Promise<void> {
  const now = new Date();

  await db.mailingList.create({
    data: {
      email,
      organizerId,
      createdAt: now
    }
  });
}

async function findMailingListEnrolledEmail(email: string, organizerId: string): Promise<{
  email: string;
  organizerId: string;
  createdAt: Date;
} | null> {
  return db.mailingList.findUnique({
    where: {
      email_organizerId: {
        email, organizerId
      }
    }
  });
}

export { addEmailToMailingList, findMailingListEnrolledEmail };
