import { Test } from '@nestjs/testing';

import { UsersService } from './users.service';
import { PrismaService } from '../prisma/prisma.service';

describe('UsersService', () => {
  it('should be defined', async () => {
    const module = await Test.createTestingModule({
      providers: [
        UsersService,
        {
          provide: PrismaService,
          useValue: {
            user: {
              create: jest.fn()
            }
          }
        }
      ]
    }).compile();

    const service = module.get<UsersService>(UsersService);
    expect(service).toBeDefined();
  });
});
