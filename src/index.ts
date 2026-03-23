import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import { PrismaClient } from '@prisma/client';

dotenv.config();

const app = express();
const prisma = new PrismaClient();
const PORT = process.env.PORT || 5000;

app.use(cors({
  origin: ['http://localhost:3000', 'http://localhost:3001', 'https://hr-saas-frontend-mu.vercel.app', /\.vercel\.app$/],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use('/uploads', express.static(path.join(process.cwd(), 'uploads')));

import authRoutes from './routes/auth.routes';
import tenantRoutes from './routes/tenant.routes';
import employeeRoutes from './routes/employee.routes';
import attendanceRoutes from './routes/attendance.routes';
import leaveRoutes from './routes/leave.routes';
import payrollRoutes from './routes/payroll.routes';
import performanceRoutes from './routes/performance.routes';
import recruitmentRoutes from './routes/recruitment.routes';
import dashboardRoutes from './routes/dashboard.routes';
import biometricRoutes from './routes/biometric.routes';
import announcementRoutes from './routes/announcement.routes';
import uploadRoutes from './routes/upload.routes';
import departmentRoutes from './routes/department.routes';
import holidayRoutes from './routes/holiday.routes';
import notificationRoutes from './routes/notification.routes';

app.use('/api/auth', authRoutes);
app.use('/api/tenant', tenantRoutes);
app.use('/api/employees', employeeRoutes);
app.use('/api/attendance', attendanceRoutes);
app.use('/api/leaves', leaveRoutes);
app.use('/api/payroll', payrollRoutes);
app.use('/api/performance', performanceRoutes);
app.use('/api/recruitment', recruitmentRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/biometric-devices', biometricRoutes);
app.use('/api/announcements', announcementRoutes);
app.use('/api/upload', uploadRoutes);
app.use('/api/departments', departmentRoutes);
app.use('/api/holidays', holidayRoutes);
app.use('/api/notifications', notificationRoutes);

app.get('/health', (req, res) => res.json({ status: 'OK', message: 'HR SaaS API running' }));
app.use((req, res) => res.status(404).json({ success: false, message: 'Route not found' }));
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error(err.stack);
  res.status(500).json({ success: false, message: 'Internal server error' });
});

app.listen(PORT, async () => {
  console.log(`🚀 Server running on port ${PORT}`);
  try { await prisma.$connect(); console.log('✅ Database connected'); }
  catch (error) { console.error('❌ Database connection failed:', error); }
});

export { prisma };
