import {
  Controller,
  Get,
  Post,
  Param,
  UseGuards,
  HttpCode,
  HttpStatus,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { ScopeService } from '../common/services/scope.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { TenantGuard } from '../common/guards/tenant.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { CsrfGuard } from '../common/guards/csrf.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser, AuthenticatedUserPayload } from '../common/decorators/current-user.decorator';
import { CurrentTenant } from '../common/decorators/current-tenant.decorator';
import { Role } from '@hrms/shared-types';

@Controller('directory')
@UseGuards(JwtAuthGuard, TenantGuard, RolesGuard)
export class DirectoryController {
  constructor(
    private readonly prisma: PrismaService,
    private readonly scopeService: ScopeService,
  ) {}

  /**
   * List employees strictly scoped to the active tenant.
   */
  @Get('employees')
  async listEmployees(
    @CurrentTenant() activeCompanyId: string,
    @CurrentUser() user: AuthenticatedUserPayload,
  ) {
    const isHrOrOwner = user.role === Role.HR_ADMIN || user.role === Role.OWNER;

    const employees = await this.prisma.employee.findMany({
      where: { companyId: activeCompanyId },
      include: {
        department: true,
      },
      orderBy: { employeeCode: 'asc' },
    });

    // Strip sensitive fields (PII) if caller is an ordinary employee
    return employees.map((emp) => {
      const isSelf = emp.userId === user.id;
      return {
        id: emp.id,
        companyId: emp.companyId,
        employeeCode: emp.employeeCode,
        firstName: emp.firstName,
        lastName: emp.lastName,
        email: emp.email,
        designation: emp.designation,
        department: emp.department?.name || null,
        managerId: emp.managerId,
        phone: isHrOrOwner || isSelf ? emp.phone : null,
        emergencyContact: isHrOrOwner || isSelf ? emp.emergencyContact : null,
      };
    });
  }

  /**
   * Retrieve single employee with strict tenant isolation and role/hierarchy scoping.
   */
  @Get('employees/:id')
  async getEmployee(
    @Param('id') id: string,
    @CurrentUser() user: AuthenticatedUserPayload,
  ) {
    const employee = await this.scopeService.validateEmployeeAccess(user, id);

    const isHrOrOwner = user.role === Role.HR_ADMIN || user.role === Role.OWNER;
    const isSelf = employee.userId === user.id;

    return {
      id: employee.id,
      companyId: employee.companyId,
      employeeCode: employee.employeeCode,
      firstName: employee.firstName,
      lastName: employee.lastName,
      email: employee.email,
      designation: employee.designation,
      department: employee.department?.name || null,
      managerId: employee.managerId,
      phone: isHrOrOwner || isSelf ? employee.phone : null,
      emergencyContact: isHrOrOwner || isSelf ? employee.emergencyContact : null,
    };
  }

  /**
   * Leave approval demonstrating manager direct-report scope enforcement.
   */
  @UseGuards(CsrfGuard)
  @Roles(Role.HR_ADMIN, Role.OWNER, Role.MANAGER)
  @Post('leave-requests/:id/approve')
  @HttpCode(HttpStatus.OK)
  async approveLeave(
    @Param('id') id: string,
    @CurrentUser() user: AuthenticatedUserPayload,
  ) {
    const leaveRequest = await this.scopeService.validateApprovalScope(user, id);

    return {
      success: true,
      message: `Leave request ${id} for employee ${leaveRequest.employee.firstName} ${leaveRequest.employee.lastName} approved successfully by ${user.role}`,
      leaveRequestId: leaveRequest.id,
    };
  }

  /**
   * Company policy settings demonstrating HR_ADMIN / OWNER exclusive permissions.
   */
  @Roles(Role.HR_ADMIN, Role.OWNER)
  @Get('company-settings')
  async getCompanySettings(@CurrentTenant() activeCompanyId: string): Promise<any> {
    const company = await this.prisma.company.findUnique({
      where: { id: activeCompanyId },
    });

    if (!company) {
      throw new NotFoundException('Company not found');
    }

    return {
      id: company.id,
      name: company.name,
      slug: company.slug,
      code: company.code,
      timezone: company.timezone,
      workDayStart: company.workDayStart,
      workDayEnd: company.workDayEnd,
      fullDayMinHours: company.fullDayMinHours,
      halfDayMinHours: company.halfDayMinHours,
      gracePeriodMinutes: company.gracePeriodMinutes,
      weeklyOffDays: company.weeklyOffDays,
      allowSelfRegularization: company.allowSelfRegularization,
      maxRegularizationDays: company.maxRegularizationDays,
    };
  }
}
