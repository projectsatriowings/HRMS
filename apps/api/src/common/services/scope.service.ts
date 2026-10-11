import {
  Injectable,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { Role } from '@hrms/shared-types';
import { AuthenticatedUserPayload } from '../decorators/current-user.decorator';

@Injectable()
export class ScopeService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Enforces tenant and hierarchy isolation on employee access.
   */
  async validateEmployeeAccess(
    user: AuthenticatedUserPayload,
    targetEmployeeId: string,
  ): Promise<any> {
    const employee = await this.prisma.employee.findUnique({
      where: { id: targetEmployeeId },
      include: { department: true },
    });

    if (!employee || employee.companyId !== user.activeCompanyId) {
      throw new NotFoundException('Employee not found in current company scope');
    }

    // HR_ADMIN and OWNER have tenant-wide employee view permissions
    if (user.role === Role.HR_ADMIN || user.role === Role.OWNER) {
      return employee;
    }

    // EMPLOYEE is strictly restricted to their own record
    if (user.role === Role.EMPLOYEE) {
      if (employee.userId !== user.id) {
        throw new ForbiddenException(
          'Employees are restricted to their own employee records',
        );
      }
      return employee;
    }

    // MANAGER can access themselves and their authorized direct reports
    if (user.role === Role.MANAGER) {
      const managerEmp = await this.prisma.employee.findFirst({
        where: {
          userId: user.id,
          companyId: user.activeCompanyId,
        },
      });

      if (!managerEmp) {
        throw new ForbiddenException('Manager employee profile not found');
      }

      const isSelf = employee.id === managerEmp.id;
      const isDirectReport = employee.managerId === managerEmp.id;

      if (!isSelf && !isDirectReport) {
        throw new ForbiddenException(
          'Managers are restricted to their authorized direct reports',
        );
      }

      return employee;
    }

    throw new ForbiddenException('Unauthorized access to employee record');
  }

  /**
   * Enforces that leave approvals are performed only by authorized managers or HR admins.
   */
  async validateApprovalScope(
    user: AuthenticatedUserPayload,
    leaveRequestId: string,
  ): Promise<any> {
    const leaveRequest = await this.prisma.leaveRequest.findUnique({
      where: { id: leaveRequestId },
      include: { employee: true },
    });

    if (!leaveRequest || leaveRequest.companyId !== user.activeCompanyId) {
      throw new NotFoundException('Leave request not found in current company');
    }

    // HR_ADMIN and OWNER can approve any leave in company
    if (user.role === Role.HR_ADMIN || user.role === Role.OWNER) {
      return leaveRequest;
    }

    // Ordinary employees can NEVER approve leave requests
    if (user.role === Role.EMPLOYEE) {
      throw new ForbiddenException('Employees are not authorized to approve requests');
    }

    // MANAGER can ONLY approve requests for their direct reports
    if (user.role === Role.MANAGER) {
      const managerEmp = await this.prisma.employee.findFirst({
        where: {
          userId: user.id,
          companyId: user.activeCompanyId,
        },
      });

      if (!managerEmp || leaveRequest.employee.managerId !== managerEmp.id) {
        throw new ForbiddenException(
          'Managers cannot approve requests outside their authorized direct reports',
        );
      }

      return leaveRequest;
    }

    throw new ForbiddenException('Unauthorized approval action');
  }
}
