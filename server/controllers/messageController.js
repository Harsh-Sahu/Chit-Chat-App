const Messages = require("../models/messageModel");
const crypto = require("crypto");

//set encryption algorithm
const algorithm = "aes-256-cbc";

//private key
const key = "harsh-tech-programming-computers";

//random 16 digit initialization vector
const iv = crypto.randomBytes(16);

module.exports.getMessages = async (req, res, next) => {
  try {
    const { from, to } = req.body;

    const messages = await Messages.find({
      users: {
        $all: [from, to],
      },
    }).sort({ updatedAt: 1 });

    const projectedMessages = messages.map((msg) => {
      const originalData = Buffer.from(msg.message.iv, "base64");
      const decipher = crypto.createDecipheriv(algorithm, key, originalData);
      let decryptedData = decipher.update(msg.message.text, "hex", "utf-8");
      decryptedData += decipher.final("utf8");
      return {
        fromSelf: msg.sender.toString() === from,
        message: decryptedData,
      };
    });
    res.json(projectedMessages);
  } catch (ex) {
    next(ex);
  }
};

module.exports.addMessage = async (req, res, next) => {
  try {
    const { from, to, message } = req.body;

    const cipher = crypto.createCipheriv(algorithm, key, iv);
    let encryptedData = cipher.update(message, "utf-8", "hex");
    encryptedData += cipher.final("hex");

    const base64 = Buffer.from(iv, "binary").toString("base64");

    const data = await Messages.create({
      message: { text: encryptedData, iv: base64 },
      users: [from, to],
      sender: from,
    });

    if (data) return res.json({ msg: "Message added successfully." });
    else return res.json({ msg: "Failed to add message to the database" });
  } catch (ex) {
    next(ex);
  }
};
