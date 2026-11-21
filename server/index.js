// Local launcher. Serves the built app from dist/.
// The built app is plain static files, so a static host can serve it later too.
import express from 'express';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const dist = path.join(__dirname, '..', 'dist');
const port = process.env.PORT || 3000;

const app = express();
app.use(express.static(dist));

// Express 5 hands startup errors to this callback. If the port is already taken
// (for example, an old PhotoMoj window is still open), say so and stop, instead of
// pretending to run while the browser opens the old copy.
app.listen(port, (error) => {
  if (error) {
    if (error.code === 'EADDRINUSE') {
      console.error(`Port ${port} is already in use. Another PhotoMoj window may still be open.`);
      console.error('Close it (or end the "node" process) and start PhotoMoj again.');
    } else {
      console.error(error.message);
    }
    process.exit(1);
  }
  console.log(`PhotoMoj running at http://localhost:${port}`);
});
