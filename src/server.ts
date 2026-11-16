// `./config/env` loads the right .env file as a side effect, and every other
// module that needs configuration imports it, so it is always read first.
import { env } from './config/env';
import app from './app';
import { sequelize } from './models';

process.on('uncaughtException', (err) => {
  console.error('UNCAUGHT EXCEPTION! Shutting down...');
  console.error(err.name, err.message);
  process.exit(1);
});

async function bootstrap(): Promise<void> {
  try {
    await sequelize.authenticate();
    console.log(`MySQL connected (${env.nodeEnv}): ${env.db.host}/${env.db.name}`);

    // Production NEVER auto-alters the schema; that is what migrations are
    // for (see README). Development keeps tables in sync with the models.
    if (!env.isProduction) {
      await sequelize.sync({ alter: true });
    }

    const server = app.listen(env.port, () => {
      console.log(`Server running in ${env.nodeEnv} mode on port ${env.port}`);
    });

    process.on('unhandledRejection', (reason) => {
      console.error('UNHANDLED REJECTION! Shutting down...');
      console.error(reason);
      server.close(() => process.exit(1));
    });
  } catch (err) {
    console.error('Failed to start the server:', err instanceof Error ? err.message : err);
    process.exit(1);
  }
}

void bootstrap();

