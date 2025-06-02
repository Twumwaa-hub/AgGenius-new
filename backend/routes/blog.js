const express = require("express");
const router = express.Router();
const db = require("../database");

router.get("/", (req, res) => {
  db.all(
    "SELECT * FROM blog_posts ORDER BY created_at DESC",
    [],
    (err, posts) => {
      if (err) {
        return res.status(500).json({ error: err.message });
      }
      res.json(posts);
    }
  );
});

router.post("/", (req, res) => {
  const { title, content, author_id } = req.body;
  db.run(
    "INSERT INTO blog_posts (title, content, author_id) VALUES (?, ?, ?)",
    [title, content, author_id],
    function (err) {
      if (err) {
        return res.status(400).json({ error: err.message });
      }
      res.status(201).json({ id: this.lastID });
    }
  );
});

module.exports = router;
