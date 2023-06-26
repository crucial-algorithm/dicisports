import { db } from '~/server/db.server';

async function addCampaignEmail(
  email: string,
  organiserId: string
): Promise<void> {
  const now = new Date();

  await db.campaignEmail.create({
    data: {
      email,
      organiserId,
      createdAt: now
    }
  });
}

export { addCampaignEmail };
