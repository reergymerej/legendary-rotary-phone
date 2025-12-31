import 'dotenv/config';
import { app } from './app';
import { config } from './config';

const PORT = config.port || 3000;

app.listen(PORT, () => {
  console.log(`Eligibility Engine running on port ${PORT}`);
  console.log(`Environment: ${config.nodeEnv}`);
});