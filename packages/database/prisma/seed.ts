import { PrismaClient, Role, EmployeeStatus, AttendanceStatus } from '@prisma/client';

const prisma = new PrismaClient();

// Fictional standard test password hash (representing 'Password123!')
const DUMMY_PASSWORD_HASH = '$2b$10$EpRnTzVlqHNP0.fUbXUwSOyvr8n3vE/zG2k5z5B2jQ0gYgU9S9m.O';

async function main() {
  console.log('Seeding fictional HRMS development data...');

  // 1. Create Fictional Company
  const company = await prisma.company.upsert({
    where: { slug: 'acme-innovations' },
    update: {},
    create: {
      slug: 'acme-innovations',
      name: 'Acme Innovations Pvt Ltd',
      code: 'ACME',
      timezone: 'Asia/Kolkata',
      workDayStart: '09:30',
      workDayEnd: '18:30',
      fullDayMinHours: 8.0,
      halfDayMinHours: 4.0,
      gracePeriodMinutes: 15,
      weeklyOffDays: [0, 6], // Sunday (0) and Saturday (6)
      allowSelfRegularization: true,
      maxRegularizationDays: 7,
    },
  });

  console.log(`Company created: ${company.name} (${company.id})`);

  // 2. Create Fictional Departments
  const deptEngineering = await prisma.department.upsert({
    where: {
      companyId_name: {
        companyId: company.id,
        name: 'Engineering',
      },
    },
    update: {},
    create: {
      companyId: company.id,
      name: 'Engineering',
      code: 'ENG',
      description: 'Software Engineering & Platform Infrastructure',
    },
  });

  const deptHR = await prisma.department.upsert({
    where: {
      companyId_name: {
        companyId: company.id,
        name: 'Human Resources',
      },
    },
    update: {},
    create: {
      companyId: company.id,
      name: 'Human Resources',
      code: 'HR',
      description: 'People Operations and Talent Acquisition',
    },
  });

  // 3. Create Fictional Users & Memberships
  // HR Admin
  const hrUser = await prisma.user.upsert({
    where: { email: 'priya.hr@acme-example.test' },
    update: {},
    create: {
      email: 'priya.hr@acme-example.test',
      passwordHash: DUMMY_PASSWORD_HASH,
      firstName: 'Priya',
      lastName: 'Sharma',
      phone: '+919876543210',
    },
  });

  await prisma.membership.upsert({
    where: {
      companyId_userId: {
        companyId: company.id,
        userId: hrUser.id,
      },
    },
    update: {},
    create: {
      companyId: company.id,
      userId: hrUser.id,
      role: Role.HR_ADMIN,
    },
  });

  // Engineering Manager
  const managerUser = await prisma.user.upsert({
    where: { email: 'rajesh.manager@acme-example.test' },
    update: {},
    create: {
      email: 'rajesh.manager@acme-example.test',
      passwordHash: DUMMY_PASSWORD_HASH,
      firstName: 'Rajesh',
      lastName: 'Kumar',
      phone: '+919876543211',
    },
  });

  await prisma.membership.upsert({
    where: {
      companyId_userId: {
        companyId: company.id,
        userId: managerUser.id,
      },
    },
    update: {},
    create: {
      companyId: company.id,
      userId: managerUser.id,
      role: Role.MANAGER,
    },
  });

  // Software Engineer (Employee)
  const devUser = await prisma.user.upsert({
    where: { email: 'ananya.dev@acme-example.test' },
    update: {},
    create: {
      email: 'ananya.dev@acme-example.test',
      passwordHash: DUMMY_PASSWORD_HASH,
      firstName: 'Ananya',
      lastName: 'Iyer',
      phone: '+919876543212',
    },
  });

  await prisma.membership.upsert({
    where: {
      companyId_userId: {
        companyId: company.id,
        userId: devUser.id,
      },
    },
    update: {},
    create: {
      companyId: company.id,
      userId: devUser.id,
      role: Role.EMPLOYEE,
    },
  });

  // 4. Create Fictional Employees
  const hrEmployee = await prisma.employee.upsert({
    where: {
      companyId_employeeCode: {
        companyId: company.id,
        employeeCode: 'ACME-001',
      },
    },
    update: {},
    create: {
      companyId: company.id,
      userId: hrUser.id,
      employeeCode: 'ACME-001',
      firstName: 'Priya',
      lastName: 'Sharma',
      email: 'priya.hr@acme-example.test',
      phone: '+919876543210',
      designation: 'HR Lead',
      departmentId: deptHR.id,
      dateOfJoining: new Date('2023-01-15'),
      status: EmployeeStatus.ACTIVE,
      emergencyContact: 'Family: +919876500001',
    },
  });

  const managerEmployee = await prisma.employee.upsert({
    where: {
      companyId_employeeCode: {
        companyId: company.id,
        employeeCode: 'ACME-002',
      },
    },
    update: {},
    create: {
      companyId: company.id,
      userId: managerUser.id,
      employeeCode: 'ACME-002',
      firstName: 'Rajesh',
      lastName: 'Kumar',
      email: 'rajesh.manager@acme-example.test',
      phone: '+919876543211',
      designation: 'Engineering Manager',
      departmentId: deptEngineering.id,
      dateOfJoining: new Date('2023-03-01'),
      status: EmployeeStatus.ACTIVE,
      emergencyContact: 'Family: +919876500002',
    },
  });

  const devEmployee = await prisma.employee.upsert({
    where: {
      companyId_employeeCode: {
        companyId: company.id,
        employeeCode: 'ACME-003',
      },
    },
    update: {},
    create: {
      companyId: company.id,
      userId: devUser.id,
      employeeCode: 'ACME-003',
      firstName: 'Ananya',
      lastName: 'Iyer',
      email: 'ananya.dev@acme-example.test',
      phone: '+919876543212',
      designation: 'Senior Frontend Engineer',
      departmentId: deptEngineering.id,
      managerId: managerEmployee.id,
      dateOfJoining: new Date('2023-08-01'),
      status: EmployeeStatus.ACTIVE,
      emergencyContact: 'Family: +919876500003',
    },
  });

  // 5. Create Fictional Leave Types
  const clLeaveType = await prisma.leaveType.upsert({
    where: {
      companyId_code: {
        companyId: company.id,
        code: 'CL',
      },
    },
    update: {},
    create: {
      companyId: company.id,
      name: 'Casual Leave',
      code: 'CL',
      daysAllowedPerYear: 12.0,
      isCarryForward: false,
      isPaid: true,
    },
  });

  const slLeaveType = await prisma.leaveType.upsert({
    where: {
      companyId_code: {
        companyId: company.id,
        code: 'SL',
      },
    },
    update: {},
    create: {
      companyId: company.id,
      name: 'Sick Leave',
      code: 'SL',
      daysAllowedPerYear: 8.0,
      isCarryForward: false,
      isPaid: true,
    },
  });

  const plLeaveType = await prisma.leaveType.upsert({
    where: {
      companyId_code: {
        companyId: company.id,
        code: 'PL',
      },
    },
    update: {},
    create: {
      companyId: company.id,
      name: 'Paid Leave',
      code: 'PL',
      daysAllowedPerYear: 15.0,
      isCarryForward: true,
      maxCarryForwardDays: 10.0,
      isPaid: true,
    },
  });

  // 6. Create Fictional Leave Balances for 2026
  for (const emp of [hrEmployee, managerEmployee, devEmployee]) {
    await prisma.leaveBalance.upsert({
      where: {
        companyId_employeeId_leaveTypeId_year: {
          companyId: company.id,
          employeeId: emp.id,
          leaveTypeId: clLeaveType.id,
          year: 2026,
        },
      },
      update: {},
      create: {
        companyId: company.id,
        employeeId: emp.id,
        leaveTypeId: clLeaveType.id,
        year: 2026,
        allocatedDays: 12.0,
        usedDays: 0.0,
        pendingDays: 0.0,
      },
    });

    await prisma.leaveBalance.upsert({
      where: {
        companyId_employeeId_leaveTypeId_year: {
          companyId: company.id,
          employeeId: emp.id,
          leaveTypeId: slLeaveType.id,
          year: 2026,
        },
      },
      update: {},
      create: {
        companyId: company.id,
        employeeId: emp.id,
        leaveTypeId: slLeaveType.id,
        year: 2026,
        allocatedDays: 8.0,
        usedDays: 0.0,
        pendingDays: 0.0,
      },
    });

    await prisma.leaveBalance.upsert({
      where: {
        companyId_employeeId_leaveTypeId_year: {
          companyId: company.id,
          employeeId: emp.id,
          leaveTypeId: plLeaveType.id,
          year: 2026,
        },
      },
      update: {},
      create: {
        companyId: company.id,
        employeeId: emp.id,
        leaveTypeId: plLeaveType.id,
        year: 2026,
        allocatedDays: 15.0,
        usedDays: 0.0,
        pendingDays: 0.0,
      },
    });
  }

  // 7. Create Fictional Holidays for 2026
  const holidays = [
    { name: 'Republic Day', date: new Date('2026-01-26') },
    { name: 'May Day', date: new Date('2026-05-01') },
    { name: 'Independence Day', date: new Date('2026-08-15') },
    { name: 'Gandhi Jayanti', date: new Date('2026-10-02') },
    { name: 'Diwali', date: new Date('2026-11-08') },
  ];

  for (const h of holidays) {
    await prisma.holiday.upsert({
      where: {
        companyId_date: {
          companyId: company.id,
          date: h.date,
        },
      },
      update: {},
      create: {
        companyId: company.id,
        name: h.name,
        date: h.date,
      },
    });
  }

  console.log('Fictional seed completed successfully!');
}

main()
  .catch((e) => {
    console.error('Seed error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
