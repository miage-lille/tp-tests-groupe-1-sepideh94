import { PrismaClient } from '@prisma/client';
import {
  PostgreSqlContainer,
  StartedPostgreSqlContainer,
} from '@testcontainers/postgresql';
import { exec } from 'child_process';
import { promisify } from 'util';

import { PrismaWebinarRepository } from 'src/webinars/adapters/webinar-repository.prisma';
import { Webinar } from 'src/webinars/entities/webinar.entity';

const asyncExec = promisify(exec);
jest.setTimeout(60000);

describe('PrismaWebinarRepository', () => {
  let container: StartedPostgreSqlContainer;
  let prismaClient: PrismaClient;
  let repository: PrismaWebinarRepository;

  beforeAll(async () => {
    container = await new PostgreSqlContainer()
      .withDatabase('test_db')
      .withUsername('user_test')
      .withPassword('password_test')
      .withExposedPorts(5432)
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

    repository = new PrismaWebinarRepository(prismaClient);
    await prismaClient.$connect();
  });

  beforeEach(async () => {
    await prismaClient.webinar.deleteMany();
    await prismaClient.$executeRawUnsafe('DELETE FROM "Webinar" CASCADE');
  });

  afterAll(async () => {
    if (prismaClient) {
      await prismaClient.$disconnect();
    }
    if (container) {
      await container.stop({ timeout: 1000 });
    }
  });

  it('should connect to the test database', async () => {
    await expect(prismaClient.$queryRaw`SELECT 1`).resolves.toBeDefined();
  });

  describe('Scenario : repository.create', () => {
    it('should create a webinar', async () => {
      // ARRANGE
      const webinar = new Webinar({
        id: 'webinar-id',
        organizerId: 'organizer-id',
        title: 'Webinar title',
        startDate: new Date('2022-01-01T00:00:00Z'),
        endDate: new Date('2022-01-01T01:00:00Z'),
        seats: 100,
      });

      // ACT
      await repository.create(webinar);

      // ASSERT (direct prisma)
      const maybeWebinar = await prismaClient.webinar.findUnique({
        where: { id: 'webinar-id' },
      });

      expect(maybeWebinar).toEqual({
        id: 'webinar-id',
        organizerId: 'organizer-id',
        title: 'Webinar title',
        startDate: new Date('2022-01-01T00:00:00Z'),
        endDate: new Date('2022-01-01T01:00:00Z'),
        seats: 100,
      });
    });
  });

  describe('Scenario : repository.findById', () => {
    it('should return a webinar when it exists', async () => {
      // ARRANGE (direct prisma)
      await prismaClient.webinar.create({
        data: {
          id: 'webinar-id',
          organizerId: 'organizer-id',
          title: 'Webinar title',
          startDate: new Date('2022-01-01T00:00:00Z'),
          endDate: new Date('2022-01-01T01:00:00Z'),
          seats: 100,
        },
      });

      // ACT
      const maybeWebinar = await repository.findById('webinar-id');

      // ASSERT (repository output)
      expect(maybeWebinar?.props).toEqual({
        id: 'webinar-id',
        organizerId: 'organizer-id',
        title: 'Webinar title',
        startDate: new Date('2022-01-01T00:00:00Z'),
        endDate: new Date('2022-01-01T01:00:00Z'),
        seats: 100,
      });
    });

    it('should return null when webinar does not exist', async () => {
      const maybeWebinar = await repository.findById('unknown-id');
      expect(maybeWebinar).toBeNull();
    });
  });

  describe('Scenario : repository.update', () => {
    it('should update a webinar', async () => {
      // ARRANGE (direct prisma)
      await prismaClient.webinar.create({
        data: {
          id: 'webinar-id',
          organizerId: 'organizer-id',
          title: 'Webinar title',
          startDate: new Date('2022-01-01T00:00:00Z'),
          endDate: new Date('2022-01-01T01:00:00Z'),
          seats: 100,
        },
      });

      const updatedEntity = new Webinar({
        id: 'webinar-id',
        organizerId: 'organizer-id',
        title: 'Webinar title (updated)',
        startDate: new Date('2022-01-01T00:00:00Z'),
        endDate: new Date('2022-01-01T01:00:00Z'),
        seats: 250,
      });

      // ACT
      await repository.update(updatedEntity);

      // ASSERT (direct prisma)
      const maybeWebinar = await prismaClient.webinar.findUnique({
        where: { id: 'webinar-id' },
      });

      expect(maybeWebinar).toEqual({
        id: 'webinar-id',
        organizerId: 'organizer-id',
        title: 'Webinar title (updated)',
        startDate: new Date('2022-01-01T00:00:00Z'),
        endDate: new Date('2022-01-01T01:00:00Z'),
        seats: 250,
      });
    });
  });
});
