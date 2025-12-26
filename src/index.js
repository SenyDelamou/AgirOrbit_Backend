import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import { env } from './lib/env.js';
import authRoutes from './routes/auth.js';
import usersRoutes from './routes/users.js';
import fieldsRoutes from './routes/fields.js';
import notificationsRoutes from './routes/notifications.js';
import { notFound, errorHandler } from './middleware/error.js';

const app = express();

app.use(helmet());
app.use(cors({
  origin: env.FRONTEND_URL,
  credentials: false
}));
app.use(express.json({ limit: '1mb' }));
app.use(morgan('dev'));

app.get('/api/health', (_req, res) => res.json({ ok: true }));

app.use('/api/auth', authRoutes);
app.use('/api/users', usersRoutes);
app.use('/api/fields', fieldsRoutes);
app.use('/api/notifications', notificationsRoutes);

app.use(notFound);
app.use(errorHandler);

app.listen(env.PORT, () => {
  console.log(`API listening on http://localhost:${env.PORT}/api`);
});
