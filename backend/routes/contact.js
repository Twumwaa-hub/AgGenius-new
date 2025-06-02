const express = require("express");
const router = express.Router();
const db = require("../database");

router.post("/", (req, res) => {
  const { name, email, message } = req.body;
  db.run(
    "INSERT INTO contact_submissions (name, email, message) VALUES (?, ?, ?)",
    [name, email, message],
    function (err) {
      if (err) {
        return res.status(400).json({ error: err.message });
      }
      res.status(201).json({ message: "Message sent successfully" });
    }
  );
});

module.exports = router;
