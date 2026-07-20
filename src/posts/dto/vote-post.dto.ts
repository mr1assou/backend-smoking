import { ValidateIf, IsIn } from 'class-validator';

export const POST_VOTE_VALUES = ['up', 'down'] as const;
export type PostVoteValue = (typeof POST_VOTE_VALUES)[number];

export class VotePostDto {
  /** Desired vote. `null` clears the user's vote. */
  @ValidateIf((_, value) => value !== null)
  @IsIn([...POST_VOTE_VALUES])
  vote!: PostVoteValue | null;
}
