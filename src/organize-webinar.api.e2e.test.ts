import supertest from 'supertest';
import { TestServerFixture } from 'src/tests/fixtures';

jest.setTimeout(60000);

describe('Organize webinar Routes E2E', () => {
  let fixture: TestServerFixture;

  beforeAll(async () => {
    fixture = new TestServerFixture();
    await fixture.init();
  });

  beforeEach(async () => {
    await fixture.reset();
  });

  afterAll(async () => {
    await fixture.stop();
  });

  it('should create a webinar', async () => {
    const prisma = fixture.getPrismaClient();
    const server = fixture.getServer();

    const response = await supertest(server)
      .post('/webinars')
      .send({
        title: 'Webinar title',
        seats: '100',
        startDate: '2030-01-01T00:00:00Z',
        endDate: '2030-01-01T01:00:00Z',
      })
      .expect(201);

    expect(response.body).toEqual({ id: 'id-1' });

    const stored = await prisma.webinar.findUnique({
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

  it('should return 400 when webinar happens too soon', async () => {
    const server = fixture.getServer();

    await supertest(server)
      .post('/webinars')
      .send({
        title: 'Webinar title',
        seats: '100',
        startDate: '2024-01-03T23:59:59.000Z',
        endDate: '2024-01-03T23:59:59.000Z',
      })
      .expect(400);
  });
});
