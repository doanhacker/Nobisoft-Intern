import express from 'express';
import type { Express, Request, Response } from 'express';
import { PrismaClient } from './generated/prisma/client.js';
import { PrismaPg } from '@prisma/adapter-pg';
import PG from 'pg';
import type { UUID } from 'node:crypto';


const app: Express = express();

app.use(express.json());

app.get('/api/health', (req: Request, res: Response) => {
    res.status(200).json({ status: 'OK', message: 'Express server is running' });
});

const pool = new PG.Pool({ connectionString: process.env.DATABASE_URL });

const adapter = new PrismaPg(pool);

const prisma = new PrismaClient({ adapter });

async function seedData() {
    try {
        interface UserMock {
            id: UUID;
            email: string;
            password: string;
            name: string;
            role: "USER";
        }

        const users: UserMock[] = Array.from({ length: 1000 }, () => ({
            id: crypto.randomUUID(),
            email: `${crypto.randomUUID()}@gmail.com`,
            password: "66668888",
            name: "User" + crypto.randomUUID(),
            role: "USER",
        }));
        await prisma.user.createMany({
            data: users,
        })

        console.log('Seed data successfully');
    } catch (error) {
        console.error('Failed to seed data:', error);
    }
}
// seedData();
export default app;