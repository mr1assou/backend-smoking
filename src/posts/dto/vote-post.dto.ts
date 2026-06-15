import { IsIn } from 'class-validator';

export const POST_VOTE_VALUES = ['up', 'down'] as const;
export type PostVoteValue = (typeof POST_VOTE_VALUES)[number];

export class VotePostDto {
  @IsIn([...POST_VOTE_VALUES])
  vote!: PostVoteValue;
}
