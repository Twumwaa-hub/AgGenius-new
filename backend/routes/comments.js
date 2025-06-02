const express = require("express");
const router = express.Router();
const db = require("../database");

router.get("/:postId", (req, res) => {
  db.all(
    "SELECT * FROM comments WHERE post_id = ? ORDER BY created_at DESC",
    [req.params.postId],
    (err, comments) => {
      if (err) {
        return res.status(500).json({ error: err.message });
      }
      res.json(comments);
    }
  );
});

router.post("/:postId", (req, res) => {
  const { content, user_id } = req.body;
  const post_id = req.params.postId;
  db.run(
    "INSERT INTO comments (content, user_id, post_id) VALUES (?, ?, ?)",
    [content, user_id, post_id],
    function (err) {
      if (err) {
        return res.status(400).json({ error: err.message });
      }
      res.status(201).json({ id: this.lastID });
    }
  );
});

module.exports = router;
