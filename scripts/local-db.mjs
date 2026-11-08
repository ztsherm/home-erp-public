import { PGlite } from "@electric-sql/pglite";
import { fromNodeSocket } from "pg-gateway/node";
import net from "node:net";

const db = new PGlite("./pgdata");

const server = net.createServer(async (socket) => {
  try {
    await fromNodeSocket(socket, {
      serverVersion: "16.3",
      auth: {
        async handleCleartextPassword(user, password) {
          return true;
        },
      },
      async handleQuery(query, { params }) {
        return await db.query(query, params);
      },
    });
  } catch (err) {
    console.error("Socket error:", err);
  }
});

server.listen(5433, "127.0.0.1", () => {
  console.log("Local embedded Postgres server listening on 127.0.0.1:5433");
});
