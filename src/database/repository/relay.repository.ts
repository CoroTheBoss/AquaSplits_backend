import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Relay, RelayDocument, RelayWithId } from '../schema/relay.schema';

@Injectable()
export class RelayRepository {
  constructor(
    @InjectModel(Relay.name)
    private readonly relayModel: Model<RelayDocument>,
  ) {}

  async create(relay: Partial<Relay>): Promise<RelayWithId> {
    const created = new this.relayModel(relay);
    return created.save().then((doc) => doc.toObject() as RelayWithId);
  }

  async createMany(relays: Partial<Relay>[]): Promise<void> {
    if (relays.length === 0) return;
    await this.relayModel.insertMany(relays);
  }

  async findByCompetition(
    competitionId: Types.ObjectId | string,
  ): Promise<RelayWithId[]> {
    const id =
      typeof competitionId === 'string'
        ? new Types.ObjectId(competitionId)
        : competitionId;
    return this.relayModel
      .find({ competition: id })
      .lean<RelayWithId[]>()
      .exec();
  }

  async findByCompetitionAndRace(
    competitionId: Types.ObjectId | string,
    raceId: Types.ObjectId | string,
  ): Promise<RelayWithId[]> {
    const compId =
      typeof competitionId === 'string'
        ? new Types.ObjectId(competitionId)
        : competitionId;
    const rId =
      typeof raceId === 'string' ? new Types.ObjectId(raceId) : raceId;
    return this.relayModel
      .find({ competition: compId, race: rId })
      .lean<RelayWithId[]>()
      .exec();
  }

  async findOrCreate(relay: Partial<Relay>): Promise<{
    relay: RelayWithId;
    created: boolean;
  }> {
    if (
      !relay.competition ||
      !relay.race ||
      !relay.lane ||
      !relay.heat ||
      relay.category === undefined ||
      relay.category === null
    ) {
      throw new Error(
        'Missing required fields for relay lookup (competition, race, lane, heat, category)',
      );
    }

    const existing = await this.relayModel
      .findOne({
        competition: relay.competition,
        race: relay.race,
        lane: relay.lane,
        heat: relay.heat,
        category: relay.category,
      })
      .lean<RelayWithId>()
      .exec();

    if (existing) {
      return { relay: existing, created: false };
    }

    const created = await this.create(relay);
    return { relay: created, created: true };
  }

  async findById(id: string | Types.ObjectId): Promise<RelayWithId | null> {
    const relayId =
      typeof id === 'string' ? new Types.ObjectId(id) : id;
    return this.relayModel
      .findById(relayId)
      .lean<RelayWithId>()
      .exec();
  }

  async findByRace(raceId: string | Types.ObjectId): Promise<RelayWithId[]> {
    const rId =
      typeof raceId === 'string' ? new Types.ObjectId(raceId) : raceId;
    return this.relayModel
      .find({ race: rId })
      .sort({ rank: 1 })
      .lean<RelayWithId[]>()
      .exec();
  }
}
