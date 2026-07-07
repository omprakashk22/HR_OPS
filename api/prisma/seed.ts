import { faker } from '@faker-js/faker';
import { PrismaClient, Prisma } from '@prisma/client';
import bcrypt from 'bcryptjs';
import {
  CURRENCIES,
  COUNTRIES,
  LEVELS,
  DEPARTMENTS,
  GENDERS,
  FEMALE_PENALTY_RANGE,
  SALARY_REASONS,
  TOTAL_EMPLOYEES,
  HR_USER,
} from './seedData';

const prisma = new PrismaClient();

// Fixed "now" so the seed is fully deterministic (no wall-clock randomness).
const NOW_CAP = new Date('2024-06-01T00:00:00.000Z');
const HIRE_FROM = new Date('2015-01-01T00:00:00.000Z');
const HIRE_TO = new Date('2024-01-01T00:00:00.000Z');
const BATCH_SIZE = 1000;

const rateByCurrency: Record<string, number> = Object.fromEntries(
  CURRENCIES.map((c) => [c.code, Number(c.rateToUsd)]),
);

function pick<T>(items: { weight: number; value: T }[]): T {
  return faker.helpers.weightedArrayElement(items);
}

function money(amount: number): string {
  return amount.toFixed(2);
}

/** Ascending effective dates: hireDate first, then sorted raise dates. */
function salaryDates(hireDate: Date, rows: number): Date[] {
  const dates = [hireDate];
  for (let i = 1; i < rows; i++) {
    dates.push(faker.date.between({ from: hireDate, to: NOW_CAP }));
  }
  return dates.sort((a, b) => a.getTime() - b.getTime());
}

async function seedCurrencies(): Promise<void> {
  await prisma.currencyRate.createMany({
    data: CURRENCIES.map((c) => ({ code: c.code, rateToUsd: new Prisma.Decimal(c.rateToUsd) })),
    skipDuplicates: true,
  });
}

async function seedHrUser(): Promise<string> {
  const passwordHash = await bcrypt.hash(HR_USER.password, 10);
  const user = await prisma.user.upsert({
    where: { email: HR_USER.email },
    update: { name: HR_USER.name, passwordHash },
    create: { email: HR_USER.email, name: HR_USER.name, passwordHash, role: 'HR_MANAGER' },
  });
  return user.id;
}

async function seedEmployees(changedBy: string): Promise<void> {
  let employees: Prisma.EmployeeCreateManyInput[] = [];
  let history: Prisma.SalaryHistoryCreateManyInput[] = [];

  for (let i = 1; i <= TOTAL_EMPLOYEES; i++) {
    const country = pick(COUNTRIES.map((c) => ({ weight: c.weight, value: c })));
    const level = pick(LEVELS.map((l) => ({ weight: l.weight, value: l })));
    const dept = pick(DEPARTMENTS.map((d) => ({ weight: d.weight, value: d })));
    const gender = pick(GENDERS.map((g) => ({ weight: g.weight, value: g.value })));

    const firstName =
      gender === 'FEMALE'
        ? faker.person.firstName('female')
        : gender === 'MALE'
          ? faker.person.firstName('male')
          : faker.person.firstName();
    const lastName = faker.person.lastName();
    const hireDate = faker.date.between({ from: HIRE_FROM, to: HIRE_TO });
    const id = faker.string.uuid();

    // Current (latest) target salary in USD, then converted to local currency.
    const jitter = faker.number.float({ min: 0.9, max: 1.15 });
    const genderFactor =
      gender === 'FEMALE'
        ? 1 - faker.number.float({ min: FEMALE_PENALTY_RANGE.min, max: FEMALE_PENALTY_RANGE.max })
        : 1;
    const targetUsd = level.baseUsd * country.costMultiplier * dept.multiplier * jitter * genderFactor;
    const currentLocal = targetUsd / rateByCurrency[country.currency];
    const bonusRate = level.baseUsd >= 150000 ? faker.number.float({ min: 0.1, max: 0.25 }) : faker.number.float({ min: 0, max: 0.1 });

    employees.push({
      id,
      employeeNumber: `E${String(i).padStart(5, '0')}`,
      firstName,
      lastName,
      gender,
      country: country.code,
      department: dept.name,
      jobTitle: `${level.title}, ${dept.name}`,
      level: level.level,
      localCurrency: country.currency,
      hireDate,
      status: 'ACTIVE',
    });

    // 1–3 salary rows; latest equals currentLocal, earlier rows step down.
    const rows = pick([
      { weight: 40, value: 1 },
      { weight: 40, value: 2 },
      { weight: 20, value: 3 },
    ]);
    const dates = salaryDates(hireDate, rows);
    const amounts: number[] = new Array(rows);
    amounts[rows - 1] = currentLocal;
    for (let r = rows - 2; r >= 0; r--) {
      amounts[r] = amounts[r + 1] / (1 + faker.number.float({ min: 0.04, max: 0.08 }));
    }
    for (let r = 0; r < rows; r++) {
      history.push({
        id: faker.string.uuid(),
        employeeId: id,
        baseSalary: new Prisma.Decimal(money(amounts[r])),
        bonus: new Prisma.Decimal(money(amounts[r] * bonusRate)),
        currency: country.currency,
        effectiveDate: dates[r],
        reason: r === 0 ? 'Initial hire' : faker.helpers.arrayElement(SALARY_REASONS),
        changedBy,
      });
    }

    if (employees.length >= BATCH_SIZE) {
      await prisma.employee.createMany({ data: employees });
      await prisma.salaryHistory.createMany({ data: history });
      console.log(`  seeded ${i} / ${TOTAL_EMPLOYEES} employees`);
      employees = [];
      history = [];
    }
  }
  if (employees.length) {
    await prisma.employee.createMany({ data: employees });
    await prisma.salaryHistory.createMany({ data: history });
  }
}

async function main(): Promise<void> {
  faker.seed(42); // deterministic; the ONLY source of randomness
  console.log('Seeding currencies…');
  await seedCurrencies();
  console.log('Seeding HR user…');
  const userId = await seedHrUser();

  // Idempotent: safe to run on every container start. Employee numbers are
  // unique, so re-generating would fail — skip if already populated.
  const existing = await prisma.employee.count();
  if (existing > 0) {
    console.log(`Employees already present (${existing}); skipping generation.`);
    return;
  }

  console.log(`Seeding ${TOTAL_EMPLOYEES} employees…`);
  await seedEmployees(userId);
  const [employees, currencies, salaries] = await Promise.all([
    prisma.employee.count(),
    prisma.currencyRate.count(),
    prisma.salaryHistory.count(),
  ]);
  console.log(`Done: ${employees} employees, ${currencies} currencies, ${salaries} salary rows.`);
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
