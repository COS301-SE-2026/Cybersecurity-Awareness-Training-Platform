import { env } from './config/env.js';
import { createApp } from './app.js';

const app = createApp();

app.listen(env.PORT, () => {
  console.log(`Insightful Phish backend running on http://localhost:${env.PORT}`);
});
