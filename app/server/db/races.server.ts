import { db } from '~/server/db.server';
import Id from '~/server/utils/Id.server';

import type {CreateRaceInput, Race} from '~/types';

async function createRace(race: CreateRaceInput): Promise<Race | void>{
    const raceId = Id();
    const raceAt = new Date();

    await db.race.create({
       data:{
           id: raceId,
           name: race.name,
           distance: race.distance,
           createdAt: raceAt,
           updatedAt: raceAt,
           startTime: race.startTime,
           elevationGain: race.elevationGain,
           elevationLoss: race.elevationLoss,
           price: race.price,
           validUntil: raceAt,
           raceDescription: race.raceDescription,
           eventId: race.eventId
       }
    });
}

export { createRace };