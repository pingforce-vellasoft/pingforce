import { IsString, IsNotEmpty, IsOptional, IsEmail, IsDateString, IsEnum } from 'class-validator';

export class CreateEmployeeDto {
  @IsString()
  @IsNotEmpty()
  employeeCode!: string;

  @IsString()
  @IsNotEmpty()
  firstName!: string;

  @IsString()
  @IsOptional()
  middleName?: string;

  @IsString()
  @IsNotEmpty()
  lastName!: string;

  @IsString()
  @IsOptional()
  displayName?: string;

  @IsEmail()
  @IsOptional()
  primaryEmail?: string;

  @IsString()
  @IsOptional()
  primaryMobile?: string;

  // Master Data Relations
  @IsString()
  @IsOptional()
  companyId?: string;

  @IsString()
  @IsOptional()
  departmentId?: string;

  @IsString()
  @IsOptional()
  designationId?: string;

  @IsString()
  @IsOptional()
  branchId?: string;

  @IsString()
  @IsOptional()
  teamId?: string;

  @IsString()
  @IsOptional()
  reportingManagerId?: string;

  @IsDateString()
  @IsOptional()
  joiningDate?: string;

  @IsString()
  @IsOptional()
  employmentType?: string;

  @IsString()
  @IsOptional()
  gender?: string;

  @IsString()
  @IsOptional()
  maritalStatus?: string;

  @IsString()
  @IsOptional()
  nationality?: string;

  @IsString()
  @IsOptional()
  bloodGroup?: string;

  @IsDateString()
  @IsOptional()
  dateOfBirth?: string;

  @IsString()
  @IsOptional()
  photograph?: string;

  @IsString()
  @IsOptional()
  alternateMobile?: string;

  @IsEmail()
  @IsOptional()
  alternateEmail?: string;

  @IsString()
  @IsOptional()
  emergencyContactName?: string;

  @IsString()
  @IsOptional()
  emergencyContactNumber?: string;

  @IsString()
  @IsOptional()
  employmentStatus?: string;

  @IsDateString()
  @IsOptional()
  confirmationDate?: string;

  @IsString()
  @IsOptional()
  workLocation?: string;

  @IsString()
  @IsOptional()
  userId?: string;
}
