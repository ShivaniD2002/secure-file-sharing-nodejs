const express = require("express");
const multer = require("multer");
const bcrypt = require("bcrypt");
const { v4: uuid } = require("uuid");
const fs = require("fs");

const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static("public"));

const upload = multer({ dest: "uploads" });

const usersFile = "data/users.json";
const filesFile = "data/files.json";

if (!fs.existsSync("data")) fs.mkdirSync("data");
if (!fs.existsSync(usersFile)) fs.writeFileSync(usersFile, "[]");
if (!fs.existsSync(filesFile)) fs.writeFileSync(filesFile, "[]");

app.post("/register", async (req, res) => {
  const users = JSON.parse(fs.readFileSync(usersFile));
  const hashed = await bcrypt.hash(req.body.password, 10);
  users.push({ username: req.body.username, password: hashed });
  fs.writeFileSync(usersFile, JSON.stringify(users));
  res.send("Registration Successful");
});

app.post("/login", async (req, res) => {
  const users = JSON.parse(fs.readFileSync(usersFile));
  const user = users.find(u => u.username === req.body.username);
  if (!user || !(await bcrypt.compare(req.body.password, user.password)))
    return res.send("Invalid Credentials");
  res.redirect("/upload.html");
});

app.post("/upload", upload.single("file"), async (req, res) => {
  const files = JSON.parse(fs.readFileSync(filesFile));
  const hashedPassword = await bcrypt.hash(req.body.password, 10);
  const fileData = {
    id: uuid(),
    originalName: req.file.originalname,
    path: req.file.path,
    password: hashedPassword
  };
  files.push(fileData);
  fs.writeFileSync(filesFile, JSON.stringify(files));
  res.send(`Shareable Link: ${req.protocol}://${req.get("host")}/download.html?id=${fileData.id}`);
});

app.post("/download", async (req, res) => {
  const files = JSON.parse(fs.readFileSync(filesFile));
  const file = files.find(f => f.id === req.body.id);
  if (!file || !(await bcrypt.compare(req.body.password, file.password)))
    return res.send("Incorrect Password");
  res.download(file.path, file.originalName);
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));