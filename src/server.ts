import 'dotenv/config';
import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';

// Import routes
import projectRoutes from './routes/projects';
import apiRoutes from './routes/api';
import eventRegistryRoutes from './routes/eventRegistry';

// Import Google Drive functionality
import { syncProjectsWithDrive } from './lib/googleDriveStorage';
import { projectCache } from './lib/cache';

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Set up EJS templating
app.set('view engine', 'ejs');
app.set('views', path.join(process.cwd(), 'src', 'views'));

// Static files
app.use(express.static(path.join(process.cwd(), 'public')));

// Routes
app.use('/api', apiRoutes);
app.use('/api/event-registry', eventRegistryRoutes);
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
  
  // Initialize Google Drive sync and caching
  try {
    console.log('Initializing Google Drive sync...');
    await syncProjectsWithDrive();
    console.log('Google Drive sync initialized successfully');
    
    console.log('Cache initialized successfully');
  } catch (error) {
    console.error('Error initializing Google Drive sync:', error);
  }
});
