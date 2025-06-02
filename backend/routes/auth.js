const express = require("express");
const router = express.Router();
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const db = require("../database");
const multer = require("multer");
const path = require("path");

const storage = multer.diskStorage({
  destination: "./uploads/",
  filename: (req, file, cb) => {
    cb(null, Date.now() + path.extname(file.originalname));
  },
});
const upload = multer({ storage });

router.post("/register", upload.single('profilePicture'), async (req, res) => {
  const { fullName, phone } = req.body;
  const username = req.body.username ? req.body.username.trim() : '';
  const email = req.body.email ? req.body.email.trim() : '';
  const password = req.body.password ? req.body.password.trim() : '';
  const avatarPath = req.file ? `/uploads/${req.file.filename}` : null; // Get the path relative to the server root

  if (!username || !email || !password || !fullName || !phone) {
    return res.status(400).json({ error: "Username, email, full name, phone, and password are required." });
  }

  try {
    const hashedPassword = await bcrypt.hash(password, 10);
    db.run(
      "INSERT INTO users (username, email, full_name, phone_number, password, avatar) VALUES (?, ?, ?, ?, ?, ?)",
      [username, email, fullName, phone, hashedPassword, avatarPath],
      function (err) {
        if (err) {
          console.error("Database error during registration:", err);
          // Clean up uploaded file if database insertion fails
          if (req.file) {
            const fs = require('fs');
            fs.unlink(req.file.path, (unlinkErr) => {
              if (unlinkErr) console.error("Error deleting uploaded file:", unlinkErr);
            });
          }
          return res.status(400).json({ error: err.message });
        }
        res.status(201).json({ message: "User registered successfully" });
      }
    );
  } catch (error) {
    console.error("Server error during registration:", error);
    res.status(500).json({ error: error.message });
  }
});

router.post("/login", async (req, res) => {
  const username = req.body.username ? req.body.username.trim() : '';
  const password = req.body.password ? req.body.password.trim() : '';
  try {
    db.get(
      "SELECT * FROM users WHERE username = ?",
      [username],
      async function (err, user) {
        if (err) {
          return res.status(500).json({ error: err.message });
        }
        if (!user) {
          return res.status(401).json({ error: "Invalid credentials" });
        }
        const validPassword = await bcrypt.compare(password, user.password);
        if (!validPassword) {
          return res.status(401).json({ error: "Invalid credentials" });
        }
        const token = jwt.sign({ id: user.id }, "your-secret-key", {
          expiresIn: "1h",
        });
        res.json({ token });
      }
    );
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Middleware to verify JWT token
const verifyToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];
  if (token == null) return res.sendStatus(401); // No token

  jwt.verify(token, "your-secret-key", (err, user) => {
    if (err) return res.sendStatus(403); // Invalid token
    req.user = user; // Attach user payload to request
    next();
  });
};

// New endpoint to get user profile
router.get("/profile", verifyToken, (req, res) => {
  // req.user now contains the payload from the token (e.g., { id: user.id })
  const userId = req.user.id;

  db.get("SELECT id, username, email, full_name, phone_number, avatar FROM users WHERE id = ?", [userId], (err, user) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }
    // Return user details (excluding password or sensitive info)
    res.json(user);
  });
});

module.exports = router;
