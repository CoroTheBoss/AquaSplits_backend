import { Injectable, Logger } from '@nestjs/common';

@Injectable()
export class IngestionService {
  private readonly logger = new Logger(IngestionService.name);

  constructor() {}
}
