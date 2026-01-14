import express from "express";
import { createServer } from "http";
import path from "path";
import { fileURLToPath } from "url";
import fs from "fs";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// 数据文件路径
const DATA_DIR = path.resolve(__dirname, "..", "data");
const EMPLOYEES_FILE = path.join(DATA_DIR, "employees.json");
const TEMPLATES_FILE = path.join(DATA_DIR, "templates.json");

// 确保数据目录存在
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

async function startServer() {
  const app = express();
  app.use(express.json({ limit: "50mb" }));

  // Serve static files from dist/public in production
  const staticPath =
    process.env.NODE_ENV === "production"
      ? path.resolve(__dirname, "public")
      : path.resolve(__dirname, "..", "dist", "public");

  app.use(express.static(staticPath));

  // API: 保存员工数据
  app.post("/api/employees/save", (req, res) => {
    try {
      const employees = req.body;
      fs.writeFileSync(EMPLOYEES_FILE, JSON.stringify(employees, null, 2));
      console.log("✅ Employees saved to file");
      res.json({ success: true, message: "Employees saved" });
    } catch (error) {
      console.error("❌ Failed to save employees:", error);
      res.status(500).json({ success: false, error: String(error) });
    }
  });

  // API: 加载员工数据
  app.get("/api/employees/load", (req, res) => {
    try {
      if (fs.existsSync(EMPLOYEES_FILE)) {
        const data = fs.readFileSync(EMPLOYEES_FILE, "utf-8");
        const employees = JSON.parse(data);
        console.log("✅ Employees loaded from file");
        res.json({ success: true, data: employees });
      } else {
        console.log("ℹ️ No saved employees file found");
        res.json({ success: true, data: null });
      }
    } catch (error) {
      console.error("❌ Failed to load employees:", error);
      res.status(500).json({ success: false, error: String(error) });
    }
  });

  // API: 保存模板数据
  app.post("/api/templates/save", (req, res) => {
    try {
      const templates = req.body;
      fs.writeFileSync(TEMPLATES_FILE, JSON.stringify(templates, null, 2));
      console.log("✅ Templates saved to file");
      res.json({ success: true, message: "Templates saved" });
    } catch (error) {
      console.error("❌ Failed to save templates:", error);
      res.status(500).json({ success: false, error: String(error) });
    }
  });

  // API: 加载模板数据
  app.get("/api/templates/load", (req, res) => {
    try {
      if (fs.existsSync(TEMPLATES_FILE)) {
        const data = fs.readFileSync(TEMPLATES_FILE, "utf-8");
        const templates = JSON.parse(data);
        console.log("✅ Templates loaded from file");
        res.json({ success: true, data: templates });
      } else {
        console.log("ℹ️ No saved templates file found");
        res.json({ success: true, data: null });
      }
    } catch (error) {
      console.error("❌ Failed to load templates:", error);
      res.status(500).json({ success: false, error: String(error) });
    }
  });

  // Handle client-side routing - serve index.html for all routes
  app.get("*", (_req, res) => {
    res.sendFile(path.join(staticPath, "index.html"));
  });

  const port = process.env.PORT || 3000;
  const server = createServer(app);

  server.listen(port, () => {
    console.log(`Server running on http://localhost:${port}/`);
  });
}

startServer().catch(console.error);
