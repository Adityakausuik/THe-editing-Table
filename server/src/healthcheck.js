import { createApp } from "./app.js";
import http from "node:http";

const app = createApp();
const server = app.listen(0, () => {
  const { port } = server.address();
  const request = http.get(`http://127.0.0.1:${port}/api/health`, (response) => {
    const ok = response.statusCode === 200;

    response.resume();
    response.on("end", () => {
      server.close(() => process.exit(ok ? 0 : 1));
    });
  });

  request.on("error", () => {
    server.close(() => process.exit(1));
  });
});
