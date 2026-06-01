import { defineConfig } from "drizzle-kit";
import path from "path";
import { DATABASE_URL } from "./src/config";

export default defineConfig({
  schema: path.join(__dirname, "./src/schema/index.ts"),
  dialect: "mysql",
  dbCredentials: {
    url: DATABASE_URL,
  },
});
