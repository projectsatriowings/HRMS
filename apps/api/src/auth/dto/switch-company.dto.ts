import { IsNotEmpty, IsString } from 'class-validator';

export class SwitchCompanyDto {
  @IsString()
  @IsNotEmpty({ message: 'companyId is required to switch tenant context' })
  companyId!: string;
}
