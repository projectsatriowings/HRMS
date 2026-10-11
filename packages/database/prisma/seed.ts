import * as path from 'path';
import * as dotenv from 'dotenv';
import { PrismaClient, Role, EmployeeStatus } from '@prisma/client';

// Load environment variables from repository root .env or local .env
dotenv.config({ path: path.resolve(__dirname, '../../../.env') });
dotenv.config();

const prisma = new PrismaClient();

// Fictional standard test password hash (representing 'Password123!') verified with bcryptjs (12 rounds)
const DUMMY_PASSWORD_HASH = '$2b$12$ya9P/UNbZwT91c5yoF8sbOj44k/njgsFwvxuWJZsYw6lRI2xrs9ra';

async function main() {
  console.log('Seeding fictional HRMS development data...');

  // =========================================================================
  // 1. COMPANY 1: Acme Innovations Pvt Ltd (ACME)
  // =========================================================================
  const acmeCompany = await prisma.company.upsert({
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
  console.log(`Company 1 created: ${acmeCompany.name} (${acmeCompany.id})`);

  // Departments for Acme
  const acmeDeptEngineering = await prisma.department.upsert({
    where: {
      companyId_name: {
        companyId: acmeCompany.id,
        name: 'Engineering',
      },
    },
    update: {},
    create: {
      companyId: acmeCompany.id,
      name: 'Engineering',
      code: 'ENG',
      description: 'Software Engineering & Platform Infrastructure',
    },
  });

  const acmeDeptHR = await prisma.department.upsert({
    where: {
      companyId_name: {
        companyId: acmeCompany.id,
        name: 'Human Resources',
      },
    },
    update: {},
    create: {
      companyId: acmeCompany.id,
      name: 'Human Resources',
      code: 'HR',
      description: 'People Operations and Talent Acquisition',
    },
  });

  const acmeDeptSales = await prisma.department.upsert({
    where: {
      companyId_name: {
        companyId: acmeCompany.id,
        name: 'Sales & Growth',
      },
    },
    update: {},
    create: {
      companyId: acmeCompany.id,
      name: 'Sales & Growth',
      code: 'SALES',
      description: 'Enterprise Sales and Business Development',
    },
  });

  // Users & Memberships for Acme
  // 1. Owner: Sameer Nair
  const acmeOwnerUser = await prisma.user.upsert({
    where: { email: 'sameer.owner@acme-example.test' },
    update: { passwordHash: DUMMY_PASSWORD_HASH },
    create: {
      email: 'sameer.owner@acme-example.test',
      passwordHash: DUMMY_PASSWORD_HASH,
      firstName: 'Sameer',
      lastName: 'Nair',
      phone: '+919876543200',
    },
  });

  await prisma.membership.upsert({
    where: {
      companyId_userId: {
        companyId: acmeCompany.id,
        userId: acmeOwnerUser.id,
      },
    },
    update: { role: Role.OWNER },
    create: {
      companyId: acmeCompany.id,
      userId: acmeOwnerUser.id,
      role: Role.OWNER,
    },
  });

  // 2. HR Admin: Priya Sharma
  const acmeHrUser = await prisma.user.upsert({
    where: { email: 'priya.hr@acme-example.test' },
    update: { passwordHash: DUMMY_PASSWORD_HASH },
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
        companyId: acmeCompany.id,
        userId: acmeHrUser.id,
      },
    },
    update: { role: Role.HR_ADMIN },
    create: {
      companyId: acmeCompany.id,
      userId: acmeHrUser.id,
      role: Role.HR_ADMIN,
    },
  });

  // 3. Engineering Manager: Rajesh Kumar
  const acmeManagerUser = await prisma.user.upsert({
    where: { email: 'rajesh.manager@acme-example.test' },
    update: { passwordHash: DUMMY_PASSWORD_HASH },
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
        companyId: acmeCompany.id,
        userId: acmeManagerUser.id,
      },
    },
    update: { role: Role.MANAGER },
    create: {
      companyId: acmeCompany.id,
      userId: acmeManagerUser.id,
      role: Role.MANAGER,
    },
  });

  // 4. Employee 1 (reports to Rajesh): Ananya Iyer
  const acmeDevUser = await prisma.user.upsert({
    where: { email: 'ananya.dev@acme-example.test' },
    update: { passwordHash: DUMMY_PASSWORD_HASH },
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
        companyId: acmeCompany.id,
        userId: acmeDevUser.id,
      },
    },
    update: { role: Role.EMPLOYEE },
    create: {
      companyId: acmeCompany.id,
      userId: acmeDevUser.id,
      role: Role.EMPLOYEE,
    },
  });

  // 5. Employee 2 (reports to Owner/None, NOT to Rajesh): Kunal Sen
  const acmeSalesUser = await prisma.user.upsert({
    where: { email: 'kunal.sales@acme-example.test' },
    update: { passwordHash: DUMMY_PASSWORD_HASH },
    create: {
      email: 'kunal.sales@acme-example.test',
      passwordHash: DUMMY_PASSWORD_HASH,
      firstName: 'Kunal',
      lastName: 'Sen',
      phone: '+919876543213',
    },
  });

  await prisma.membership.upsert({
    where: {
      companyId_userId: {
        companyId: acmeCompany.id,
        userId: acmeSalesUser.id,
      },
    },
    update: { role: Role.EMPLOYEE },
    create: {
      companyId: acmeCompany.id,
      userId: acmeSalesUser.id,
      role: Role.EMPLOYEE,
    },
  });

  // Create Employee profiles for Acme
  const acmeHrEmp = await prisma.employee.upsert({
    where: {
      companyId_employeeCode: {
        companyId: acmeCompany.id,
        employeeCode: 'ACME-001',
      },
    },
    update: {},
    create: {
      companyId: acmeCompany.id,
      userId: acmeHrUser.id,
      employeeCode: 'ACME-001',
      firstName: 'Priya',
      lastName: 'Sharma',
      email: 'priya.hr@acme-example.test',
      phone: '+919876543210',
      designation: 'HR Lead',
      departmentId: acmeDeptHR.id,
      dateOfJoining: new Date('2023-01-15'),
      status: EmployeeStatus.ACTIVE,
      emergencyContact: 'Family: +919876500001',
    },
  });

  const acmeManagerEmp = await prisma.employee.upsert({
    where: {
      companyId_employeeCode: {
        companyId: acmeCompany.id,
        employeeCode: 'ACME-002',
      },
    },
    update: {},
    create: {
      companyId: acmeCompany.id,
      userId: acmeManagerUser.id,
      employeeCode: 'ACME-002',
      firstName: 'Rajesh',
      lastName: 'Kumar',
      email: 'rajesh.manager@acme-example.test',
      phone: '+919876543211',
      designation: 'Engineering Manager',
      departmentId: acmeDeptEngineering.id,
      dateOfJoining: new Date('2023-03-01'),
      status: EmployeeStatus.ACTIVE,
      emergencyContact: 'Family: +919876500002',
    },
  });

  const acmeDevEmp = await prisma.employee.upsert({
    where: {
      companyId_employeeCode: {
        companyId: acmeCompany.id,
        employeeCode: 'ACME-003',
      },
    },
    update: { managerId: acmeManagerEmp.id },
    create: {
      companyId: acmeCompany.id,
      userId: acmeDevUser.id,
      employeeCode: 'ACME-003',
      firstName: 'Ananya',
      lastName: 'Iyer',
      email: 'ananya.dev@acme-example.test',
      phone: '+919876543212',
      designation: 'Senior Frontend Engineer',
      departmentId: acmeDeptEngineering.id,
      managerId: acmeManagerEmp.id,
      dateOfJoining: new Date('2023-08-01'),
      status: EmployeeStatus.ACTIVE,
      emergencyContact: 'Family: +919876500003',
    },
  });

  const acmeSalesEmp = await prisma.employee.upsert({
    where: {
      companyId_employeeCode: {
        companyId: acmeCompany.id,
        employeeCode: 'ACME-004',
      },
    },
    update: {},
    create: {
      companyId: acmeCompany.id,
      userId: acmeSalesUser.id,
      employeeCode: 'ACME-004',
      firstName: 'Kunal',
      lastName: 'Sen',
      email: 'kunal.sales@acme-example.test',
      phone: '+919876543213',
      designation: 'Sales Lead',
      departmentId: acmeDeptSales.id,
      managerId: null, // reports to leadership, not Rajesh!
      dateOfJoining: new Date('2023-09-01'),
      status: EmployeeStatus.ACTIVE,
      emergencyContact: 'Family: +919876500004',
    },
  });

  // Leave types for Acme
  const acmeLeaveCl = await prisma.leaveType.upsert({
    where: {
      companyId_code: {
        companyId: acmeCompany.id,
        code: 'CL',
      },
    },
    update: {},
    create: {
      companyId: acmeCompany.id,
      name: 'Casual Leave',
      code: 'CL',
      daysAllowedPerYear: 12.0,
      isCarryForward: false,
      isPaid: true,
    },
  });

  // =========================================================================
  // 2. COMPANY 2: Zenith Technologies Pvt Ltd (ZENITH)
  // =========================================================================
  const zenithCompany = await prisma.company.upsert({
    where: { slug: 'zenith-tech' },
    update: {},
    create: {
      slug: 'zenith-tech',
      name: 'Zenith Technologies Pvt Ltd',
      code: 'ZENITH',
      timezone: 'Asia/Kolkata',
      workDayStart: '09:00',
      workDayEnd: '18:00',
      fullDayMinHours: 8.0,
      halfDayMinHours: 4.0,
      gracePeriodMinutes: 10,
      weeklyOffDays: [0, 6],
      allowSelfRegularization: true,
      maxRegularizationDays: 5,
    },
  });
  console.log(`Company 2 created: ${zenithCompany.name} (${zenithCompany.id})`);

  // Departments for Zenith
  const zenithDeptProduct = await prisma.department.upsert({
    where: {
      companyId_name: {
        companyId: zenithCompany.id,
        name: 'Product & Design',
      },
    },
    update: {},
    create: {
      companyId: zenithCompany.id,
      name: 'Product & Design',
      code: 'PRD',
      description: 'Product Management, UI/UX Design, and Strategy',
    },
  });

  // Users & Memberships for Zenith
  // 1. HR Admin / Owner: Vikram Patel
  const zenithHrUser = await prisma.user.upsert({
    where: { email: 'vikram.hr@zenith-example.test' },
    update: { passwordHash: DUMMY_PASSWORD_HASH },
    create: {
      email: 'vikram.hr@zenith-example.test',
      passwordHash: DUMMY_PASSWORD_HASH,
      firstName: 'Vikram',
      lastName: 'Patel',
      phone: '+919876543220',
    },
  });

  await prisma.membership.upsert({
    where: {
      companyId_userId: {
        companyId: zenithCompany.id,
        userId: zenithHrUser.id,
      },
    },
    update: { role: Role.HR_ADMIN },
    create: {
      companyId: zenithCompany.id,
      userId: zenithHrUser.id,
      role: Role.HR_ADMIN,
    },
  });

  // 2. Manager: Kavita Nair
  const zenithManagerUser = await prisma.user.upsert({
    where: { email: 'kavita.manager@zenith-example.test' },
    update: { passwordHash: DUMMY_PASSWORD_HASH },
    create: {
      email: 'kavita.manager@zenith-example.test',
      passwordHash: DUMMY_PASSWORD_HASH,
      firstName: 'Kavita',
      lastName: 'Nair',
      phone: '+919876543221',
    },
  });

  await prisma.membership.upsert({
    where: {
      companyId_userId: {
        companyId: zenithCompany.id,
        userId: zenithManagerUser.id,
      },
    },
    update: { role: Role.MANAGER },
    create: {
      companyId: zenithCompany.id,
      userId: zenithManagerUser.id,
      role: Role.MANAGER,
    },
  });

  // 3. Employee: Rohan Verma
  const zenithDevUser = await prisma.user.upsert({
    where: { email: 'rohan.dev@zenith-example.test' },
    update: { passwordHash: DUMMY_PASSWORD_HASH },
    create: {
      email: 'rohan.dev@zenith-example.test',
      passwordHash: DUMMY_PASSWORD_HASH,
      firstName: 'Rohan',
      lastName: 'Verma',
      phone: '+919876543222',
    },
  });

  await prisma.membership.upsert({
    where: {
      companyId_userId: {
        companyId: zenithCompany.id,
        userId: zenithDevUser.id,
      },
    },
    update: { role: Role.EMPLOYEE },
    create: {
      companyId: zenithCompany.id,
      userId: zenithDevUser.id,
      role: Role.EMPLOYEE,
    },
  });

  // Zenith Employees
  const zenithManagerEmp = await prisma.employee.upsert({
    where: {
      companyId_employeeCode: {
        companyId: zenithCompany.id,
        employeeCode: 'ZEN-001',
      },
    },
    update: {},
    create: {
      companyId: zenithCompany.id,
      userId: zenithManagerUser.id,
      employeeCode: 'ZEN-001',
      firstName: 'Kavita',
      lastName: 'Nair',
      email: 'kavita.manager@zenith-example.test',
      phone: '+919876543221',
      designation: 'Product Lead',
      departmentId: zenithDeptProduct.id,
      dateOfJoining: new Date('2023-04-01'),
      status: EmployeeStatus.ACTIVE,
      emergencyContact: 'Family: +919876500010',
    },
  });

  const zenithDevEmp = await prisma.employee.upsert({
    where: {
      companyId_employeeCode: {
        companyId: zenithCompany.id,
        employeeCode: 'ZEN-002',
      },
    },
    update: { managerId: zenithManagerEmp.id },
    create: {
      companyId: zenithCompany.id,
      userId: zenithDevUser.id,
      employeeCode: 'ZEN-002',
      firstName: 'Rohan',
      lastName: 'Verma',
      email: 'rohan.dev@zenith-example.test',
      phone: '+919876543222',
      designation: 'UI/UX Designer',
      departmentId: zenithDeptProduct.id,
      managerId: zenithManagerEmp.id,
      dateOfJoining: new Date('2023-05-15'),
      status: EmployeeStatus.ACTIVE,
      emergencyContact: 'Family: +919876500011',
    },
  });

  // =========================================================================
  // 3. MULTI-COMPANY USER: Neha Consultant (Member of BOTH Acme & Zenith)
  // =========================================================================
  const multiCompanyUser = await prisma.user.upsert({
    where: { email: 'neha.consultant@example.test' },
    update: { passwordHash: DUMMY_PASSWORD_HASH },
    create: {
      email: 'neha.consultant@example.test',
      passwordHash: DUMMY_PASSWORD_HASH,
      firstName: 'Neha',
      lastName: 'Chopra',
      phone: '+919876543299',
    },
  });

  // Membership in Acme (Role: EMPLOYEE)
  await prisma.membership.upsert({
    where: {
      companyId_userId: {
        companyId: acmeCompany.id,
        userId: multiCompanyUser.id,
      },
    },
    update: { role: Role.EMPLOYEE },
    create: {
      companyId: acmeCompany.id,
      userId: multiCompanyUser.id,
      role: Role.EMPLOYEE,
    },
  });

  // Membership in Zenith (Role: MANAGER)
  await prisma.membership.upsert({
    where: {
      companyId_userId: {
        companyId: zenithCompany.id,
        userId: multiCompanyUser.id,
      },
    },
    update: { role: Role.MANAGER },
    create: {
      companyId: zenithCompany.id,
      userId: multiCompanyUser.id,
      role: Role.MANAGER,
    },
  });

  // =========================================================================
  // 4. PLATFORM ADMIN USER (Separate from ordinary company administration)
  // =========================================================================
  const platformAdminUser = await prisma.user.upsert({
    where: { email: 'admin.platform@hrms-core.test' },
    update: { passwordHash: DUMMY_PASSWORD_HASH },
    create: {
      email: 'admin.platform@hrms-core.test',
      passwordHash: DUMMY_PASSWORD_HASH,
      firstName: 'Platform',
      lastName: 'Superadmin',
      phone: '+919999999999',
    },
  });

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
