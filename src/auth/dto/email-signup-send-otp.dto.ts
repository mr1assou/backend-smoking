import { IsEmail } from 'class-validator';

export class EmailSignupSendOtpDto {
  @IsEmail()
  email!: string;
}
