import { PrismaClient } from '@prisma/client';
import {
  PostgreSqlContainer,
  StartedPostgreSqlContainer,
} from '@testcontainers/postgresql';
import { exec } from 'child_process';
import { promisify } from 'util';

import { FixedDateGenerator } from 'src/core/adapters/fixed-date-generator';
import { FixedIdGenerator } from 'src/core/adapters/fixed-id-generator';
import { PrismaWebinarRepository } from 'src/webinars/adapters/webinar-repository.prisma';
import { OrganizeWebinars } from 'src/webinars/use-cases/organize-webinar';

const asyncExec = promisify(exec);
jest.setTimeout(60000);

describe('Integration: OrganizeWebinars', () => {
  let container: StartedPostgreSqlContainer;
  let prismaClient: PrismaClient;
  let repository: PrismaWebinarRepository;
  let useCase: OrganizeWebinars;

  beforeAll(async () => {
    container = await new PostgreSqlContainer()
      .withDatabase('test_db')
      .withUsername('user_test')
      .withPassword('password_test')
      .start();

    const dbUrl = container.getConnectionUri();

    prismaClient = new PrismaClient({
      datasources: {
        db: { url: dbUrl },
      },
    });

    await asyncExec('npx prisma migrate deploy', {
      env: { ...process.env, DATABASE_URL: dbUrl },
    });

    await prismaClient.$connect();

    repository = new PrismaWebinarRepository(prismaClient);
    useCase = new OrganizeWebinars(
      repository,
      new FixedIdGenerator(),
      new FixedDateGenerator(),
    );
  });

  beforeEach(async () => {
    await prismaClient.webinar.deleteMany();
    await prismaClient.$executeRawUnsafe('DELETE FROM "Webinar" CASCADE');
  });

  afterAll(async () => {
    if (prismaClient) await prismaClient.$disconnect();
    if (container) await container.stop();
  });

  it('should create a webinar in database and return its id', async () => {
    const payload = {
      userId: 'test-user',
      title: 'Webinar title',
      seats: 100,
      startDate: new Date('2030-01-01T00:00:00Z'),
      endDate: new Date('2030-01-01T01:00:00Z'),
    };

    const result = await useCase.execute(payload);

    expect(result).toEqual({ id: 'id-1' });

    const stored = await prismaClient.webinar.findUnique({
      where: { id: 'id-1' },
    });

    expect(stored).toEqual({
      id: 'id-1',
      organizerId: 'test-user',
      title: 'Webinar title',
      startDate: new Date('2030-01-01T00:00:00Z'),
      endDate: new Date('2030-01-01T01:00:00Z'),
      seats: 100,
    });
  });
});
