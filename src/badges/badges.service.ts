import { Injectable } from '@nestjs/common';
import { BadgesRepository } from './badges.repository';

@Injectable()
export class BadgesService {
  constructor(private readonly badgesRepository: BadgesRepository) {}

  grantSignupBadge(userId: number): Promise<void> {
    return this.badgesRepository.grantSignupBadge(userId);
  }

  findEarnedBadgeIds(userId: number): Promise<string[]> {
    return this.badgesRepository.findEarnedBadgeIds(userId);
  }
}
