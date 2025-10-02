import 'dotenv/config';
import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';

// Import routes
import projectRoutes from './routes/projects';
import apiRoutes from './routes/api';
import { projectCache } from './lib/cache';

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Set up EJS templating
app.set('view engine', 'ejs');
app.set('views', path.join(process.cwd(), 'src', 'views'));

// Static files
app.use(express.static(path.join(process.cwd(), 'public')));

// Routes
app.use('/api', apiRoutes);
app.use('/', projectRoutes);

// Error handling middleware
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error(err.stack);
  res.status(500).json({ message: 'Something went wrong!' });
});

// 404 handler
app.use((req: express.Request, res: express.Response) => {
  res.status(404).json({ message: 'Route not found' });
});

app.listen(PORT, async () => {
  console.log(`Server is running on port ${PORT}`);
  
  // Initialize cache on startup
  console.log('🔄 Initializing project cache...');
  try {
    await projectCache.syncAll();
    console.log('✅ Cache initialization complete');
  } catch (error) {
    console.error('❌ Cache initialization failed:', error);
  }
});
